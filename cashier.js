// =====================================
// CASHIER.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { rupiah, generateInvoice, calculateTotal, showMessage } from "./utils.js";
import { refreshDashboard } from "./dashboard.js";
import { refreshProduct } from "./product.js";
import { getStoreInfo } from "./settings.js"; // Import getStoreInfo

const productRef = collection(db, "products");
const transactionRef = collection(db, "transactions");

let cart = [];
let scanner = null;
let scanBusy = false;

// =====================================
// INIT
// =====================================
export async function initCashier() {
    bindEvents();
    await loadProducts();
    renderCart();
}

// =====================================
// EVENT
// =====================================
function bindEvents() {
    const search = document.getElementById("searchCashier");
    if (search) {
        search.addEventListener("keyup", filterProducts);
    }

    const pay = document.getElementById("payBtn");
    if (pay) {
        pay.addEventListener("click", checkout);
    }

    const cancel = document.getElementById("cancelBtn");
    if (cancel) {
        cancel.addEventListener("click", clearCart);
    }

    // Tombol Scanner
    const scanBtn = document.getElementById("scanBarcodeBtn");
    if (scanBtn) {
        scanBtn.addEventListener("click", startScanner);
    }

    const stopBtn = document.getElementById("stopScannerBtn");
    if (stopBtn) {
        stopBtn.addEventListener("click", stopScanner);
    }

    // Tombol Cetak / Simpan PDF Struk
    const downloadReceipt = document.getElementById("downloadReceiptBtn");
    if (downloadReceipt) {
        downloadReceipt.addEventListener("click", () => {
            window.print(); // Memanggil fitur print bawaan browser
        });
    }
}

// =====================================
// LOAD PRODUK
// =====================================
async function loadProducts() {
    const list = document.getElementById("productList");
    if (!list) return;
    list.innerHTML = "";

    const snapshot = await getDocs(productRef);

    if (snapshot.empty) {
        list.innerHTML = `<div class="col-12"><div class="empty-data">Belum ada produk.</div></div>`;
        return;
    }

    snapshot.forEach(item => {
        const p = item.data();
        const card = document.createElement("div");
        card.className = "col-md-4";
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5>${p.nama}</h5>
                    <p class="mb-1">${p.kategori || "-"}</p>
                    <h4>${rupiah(p.harga)}</h4>
                    <small>Stok : ${p.stok}</small>
                    <button class="btn btn-primary w-100 mt-auto addCart">Tambah</button>
                </div>
            </div>
        `;
        card.querySelector(".addCart").addEventListener("click", () => {
            addToCart(item.id);
        });
        list.appendChild(card);
    });
}

// =====================================
// FILTER
// =====================================
function filterProducts() {
    const key = this.value.toLowerCase();
    document.querySelectorAll("#productList .col-md-4").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(key) ? "" : "none";
    });
}

// =====================================
// TAMBAH KERANJANG
// =====================================
async function addToCart(id) {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return;

    const data = snap.data();

    if (data.stok <= 0) {
        showMessage("Stok habis.");
        return;
    }

    const index = cart.findIndex(i => i.id === id);

    if (index >= 0) {
        if (cart[index].qty < data.stok) {
            cart[index].qty++;
        } else {
            showMessage("Stok tidak mencukupi.");
            return;
        }
    } else {
        cart.push({
            id,
            nama: data.nama,
            harga: data.harga,
            stok: data.stok,
            qty: 1
        });
    }
    renderCart();
}

// =====================================
// RENDER KERANJANG
// =====================================
function renderCart() {
    const cartList = document.getElementById("cartList");
    const totalText = document.getElementById("cartTotal");

    if (!cartList) return;
    cartList.innerHTML = "";

    if (cart.length === 0) {
        cartList.innerHTML = `<div class="empty-data">Keranjang masih kosong.</div>`;
        if (totalText) totalText.textContent = rupiah(0);
        return;
    }

    cart.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
            <div>
                <strong>${item.nama}</strong>
                <div>${rupiah(item.harga)}</div>
            </div>
            <div class="d-flex align-items-center">
                <button class="btn btn-sm btn-secondary minusBtn">−</button>
                <span class="mx-2">${item.qty}</span>
                <button class="btn btn-sm btn-secondary plusBtn">+</button>
                <button class="btn btn-sm btn-danger ms-2 removeBtn">×</button>
            </div>
        `;
        div.querySelector(".plusBtn").addEventListener("click", () => increaseQty(index));
        div.querySelector(".minusBtn").addEventListener("click", () => decreaseQty(index));
        div.querySelector(".removeBtn").addEventListener("click", () => removeItem(index));
        cartList.appendChild(div);
    });

    if (totalText) {
        totalText.textContent = rupiah(calculateTotal(cart));
    }
}

function increaseQty(index) {
    if (cart[index].qty >= cart[index].stok) {
        showMessage("Stok tidak mencukupi.");
        return;
    }
    cart[index].qty++;
    renderCart();
}

function decreaseQty(index) {
    cart[index].qty--;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

function removeItem(index) {
    cart.splice(index, 1);
    renderCart();
}

function clearCart() {
    cart = [];
    const customer = document.getElementById("customerName");
    if (customer) customer.value = "";
    const method = document.getElementById("paymentMethod");
    if (method) method.selectedIndex = 0;
    renderCart();
}

// =====================================
// CHECKOUT
// =====================================
async function checkout() {
    if (cart.length === 0) {
        showMessage("Keranjang masih kosong.");
        return;
    }

    const customer = document.getElementById("customerName").value.trim() || "Umum";
    const method = document.getElementById("paymentMethod").value;
    const invoice = generateInvoice();
    const total = calculateTotal(cart);
    const payBtn = document.getElementById("payBtn");
    
    payBtn.disabled = true;
    payBtn.innerHTML = "Memproses...";

    try {
        for (const item of cart) {
            const ref = doc(db, "products", item.id);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                showMessage(item.nama + " tidak ditemukan.");
                payBtn.disabled = false;
                payBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Bayar';
                return;
            }
            const data = snap.data();
            if (data.stok < item.qty) {
                showMessage("Stok " + data.nama + " tidak mencukupi.");
                await loadProducts();
                payBtn.disabled = false;
                payBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Bayar';
                return;
            }
        }

        await addDoc(transactionRef, {
            invoice,
            pembeli: customer,
            metode: method,
            items: cart.map(item => ({
                id: item.id,
                nama: item.nama,
                harga: item.harga,
                qty: item.qty,
                subtotal: item.harga * item.qty
            })),
            subtotal: total,
            total: total,
            createdAt: serverTimestamp()
        });

        for (const item of cart) {
            const ref = doc(db, "products", item.id);
            const snap = await getDoc(ref);
            const data = snap.data();
            await updateDoc(ref, {
                stok: data.stok - item.qty,
                terjual: (data.terjual || 0) + item.qty
            });
        }

        await refreshProduct();
        await refreshDashboard();
        await loadProducts();
        
        // =====================
        // TAMPILKAN STRUK DIGITAL
        // =====================
        const storeInfo = await getStoreInfo();
        
        document.getElementById("receiptStoreName").textContent = storeInfo.namaToko || "Warungan POS";
        document.getElementById("receiptStoreAddress").textContent = storeInfo.alamat || "-";
        document.getElementById("receiptStorePhone").textContent = storeInfo.telepon || "-";
        
        document.getElementById("receiptInvoice").textContent = invoice;
        document.getElementById("receiptDate").textContent = new Date().toLocaleString("id-ID");
        document.getElementById("receiptCustomer").textContent = customer;
        
        const receiptItems = document.getElementById("receiptItems");
        receiptItems.innerHTML = "";
        cart.forEach(item => {
            receiptItems.innerHTML += `
                <div class="mb-1" style="font-size: 13px;">
                    <div class="fw-bold">${item.nama}</div>
                    <div class="d-flex justify-content-between">
                        <span>${item.qty} x ${rupiah(item.harga)}</span>
                        <span>${rupiah(item.harga * item.qty)}</span>
                    </div>
                </div>
            `;
        });
        
        document.getElementById("receiptTotalAmount").textContent = rupiah(total);
        document.getElementById("receiptMethod").textContent = method;
        
        clearCart();
        const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
        receiptModal.show();
        // =====================

    } catch (err) {
        console.error(err);
        showMessage("Transaksi gagal : " + err.message);
    } finally {
        payBtn.disabled = false;
        payBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Bayar';
    }
}

export async function refreshCashier() {
    await loadProducts();
    renderCart();
}

// =====================================
// FUNGSI SCANNER KASIR
// =====================================
async function startScanner() {
    if(scanner) return;
    
    document.getElementById("reader").style.display = "block";
    document.getElementById("stopScannerBtn").classList.remove("d-none");
    document.getElementById("scanBarcodeBtn").classList.add("d-none");

    scanner = new Html5Qrcode("reader");

    try {
        await scanner.start(
            { facingMode: "environment" },
            { fps: 15, qrbox: { width: 250, height: 250 } },
            scanSuccess
        );
    } catch (err) {
        console.error(err);
        showMessage("Kamera tidak dapat diakses atau diblokir oleh browser.");
        stopScanner();
    }
}

async function stopScanner() {
    if (scanner) {
        await scanner.stop().catch(e => console.error(e));
        scanner.clear();
        scanner = null;
    }
    document.getElementById("reader").style.display = "none";
    document.getElementById("stopScannerBtn").classList.add("d-none");
    document.getElementById("scanBarcodeBtn").classList.remove("d-none");
}

async function scanSuccess(code) {
    if (scanBusy) return;
    scanBusy = true;

    // Bunyikan Audio
    const beep = document.getElementById("scanBeep");
    if(beep) beep.play().catch(e => console.error(e));

    const q = query(productRef, where("barcode", "==", code));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const docSnap = snap.docs[0];
        await addToCart(docSnap.id);
    } else {
        showMessage("Produk dengan barcode tersebut tidak ditemukan.");
    }

    setTimeout(() => {
        scanBusy = false;
    }, 1500); 
}

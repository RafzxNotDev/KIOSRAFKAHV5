// =====================================
// CASHIER.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";
import {
    collection, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { rupiah, generateInvoice, calculateTotal, showMessage } from "./utils.js";
import { refreshDashboard } from "./dashboard.js";
import { refreshProduct } from "./product.js";
import { getStoreInfo } from "./settings.js";

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
    if (search) search.addEventListener("keyup", filterProducts);

    const pay = document.getElementById("payBtn");
    if (pay) pay.addEventListener("click", checkout);

    const cancel = document.getElementById("cancelBtn");
    if (cancel) cancel.addEventListener("click", clearCart);

    const scanBtn = document.getElementById("scanBarcodeBtn");
    if (scanBtn) scanBtn.addEventListener("click", startScanner);

    const stopBtn = document.getElementById("stopScannerBtn");
    if (stopBtn) stopBtn.addEventListener("click", stopScanner);

    const downloadReceipt = document.getElementById("downloadReceiptBtn");
    if (downloadReceipt) {
        downloadReceipt.addEventListener("click", () => window.print());
    }
}

// =====================================
// LOAD PRODUK (TANPA INFO STOK)
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
        card.className = "col-lg-3 col-md-4 col-sm-6 mb-3 product-item-container";
        card.innerHTML = `
            <div class="card product-card h-100 shadow-sm border-0">
                <div class="card-body p-2 d-flex flex-column justify-content-between">
                    <div>
                        <div class="fw-bold text-truncate" style="font-size: 13px;" title="${p.nama}">${p.nama}</div>
                        <!-- Info Stok dihapus -->
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <div class="text-primary fw-bold" style="font-size: 14px;">${rupiah(p.harga)}</div>
                        <button class="btn btn-sm btn-primary addCart px-2 py-1"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
        card.querySelector(".addCart").addEventListener("click", () => addToCart(item.id));
        list.appendChild(card);
    });
}

// =====================================
// FILTER
// =====================================
function filterProducts() {
    const key = this.value.toLowerCase();
    document.querySelectorAll(".product-item-container").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(key) ? "" : "none";
    });
}

// =====================================
// TAMBAH KERANJANG (TANPA VALIDASI STOK)
// =====================================
async function addToCart(id) {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return;
    const data = snap.data();

    const index = cart.findIndex(i => i.id === id);
    if (index >= 0) {
        cart[index].qty++;
    } else {
        cart.push({ id, nama: data.nama, harga: data.harga, qty: 1 });
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
        cartList.innerHTML = `<div class="empty-data py-4"><i class="fa-solid fa-cart-shopping fs-1 text-light mb-2"></i><br>Keranjang kosong.</div>`;
        if (totalText) totalText.textContent = rupiah(0);
        return;
    }

    cart.forEach((item, index) => {
        const div = document.createElement("div");
        div.className = "cart-item py-2 px-2 border-bottom mb-1";
        div.style.background = "#fff";
        div.style.borderRadius = "8px";
        div.innerHTML = `
            <div class="mb-1">
                <strong style="font-size: 13px;">${item.nama}</strong>
                <div class="text-primary" style="font-size: 12px;">${rupiah(item.harga)}</div>
            </div>
            <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                    <button class="btn btn-sm btn-outline-secondary minusBtn px-2 py-0">−</button>
                    <span class="mx-2 fw-bold" style="font-size:14px;">${item.qty}</span>
                    <button class="btn btn-sm btn-outline-secondary plusBtn px-2 py-0">+</button>
                </div>
                <button class="btn btn-sm btn-danger removeBtn px-2 py-0"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
        // Hapus batasan tambah Qty
        div.querySelector(".plusBtn").addEventListener("click", () => {
            cart[index].qty++; renderCart();
        });
        div.querySelector(".minusBtn").addEventListener("click", () => {
            cart[index].qty--; if (cart[index].qty <= 0) cart.splice(index, 1); renderCart();
        });
        div.querySelector(".removeBtn").addEventListener("click", () => {
            cart.splice(index, 1); renderCart();
        });
        cartList.appendChild(div);
    });

    if (totalText) totalText.textContent = rupiah(calculateTotal(cart));
}

function clearCart() {
    cart = [];
    const customer = document.getElementById("customerName"); if (customer) customer.value = "";
    const method = document.getElementById("paymentMethod"); if (method) method.selectedIndex = 0;
    renderCart();
}

// =====================================
// CHECKOUT (TANPA POTONG STOK DB)
// =====================================
async function checkout() {
    if (cart.length === 0) { showMessage("Keranjang masih kosong."); return; }

    const customer = document.getElementById("customerName").value.trim() || "Umum";
    const method = document.getElementById("paymentMethod").value;
    const invoice = generateInvoice();
    const total = calculateTotal(cart);
    const payBtn = document.getElementById("payBtn");
    
    payBtn.disabled = true;
    payBtn.innerHTML = "Memproses...";

    try {
        // Hanya cek apakah produk masih ada di database
        for (const item of cart) {
            const ref = doc(db, "products", item.id);
            const snap = await getDoc(ref);
            if (!snap.exists()) {
                showMessage(item.nama + " tidak ditemukan di sistem.");
                payBtn.disabled = false; payBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Proses Bayar';
                return;
            }
        }

        // Catat Riwayat Transaksi
        await addDoc(transactionRef, {
            invoice, pembeli: customer, metode: method,
            items: cart.map(item => ({
                id: item.id, nama: item.nama, harga: item.harga, qty: item.qty, subtotal: item.harga * item.qty
            })),
            subtotal: total, total: total, createdAt: serverTimestamp()
        });

        // Hanya Update Angka "Terjual", stok diabaikan
        for (const item of cart) {
            const ref = doc(db, "products", item.id);
            const snap = await getDoc(ref);
            await updateDoc(ref, { terjual: (snap.data().terjual || 0) + item.qty });
        }

        await refreshDashboard();
        
        // BUAT STRUK
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
                    <div class="d-flex justify-content-between"><span>${item.qty} x ${rupiah(item.harga)}</span><span>${rupiah(item.harga * item.qty)}</span></div>
                </div>`;
        });
        
        document.getElementById("receiptTotalAmount").textContent = rupiah(total);
        document.getElementById("receiptMethod").textContent = method;
        
        clearCart();
        new bootstrap.Modal(document.getElementById('receiptModal')).show();

    } catch (err) {
        console.error(err); showMessage("Transaksi gagal : " + err.message);
    } finally {
        payBtn.disabled = false; payBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Proses Bayar';
    }
}

export async function refreshCashier() {
    await loadProducts(); renderCart();
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
        await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 200, height: 200 } }, scanSuccess);
    } catch (err) {
        console.error(err); showMessage("Kamera tidak dapat diakses."); stopScanner();
    }
}

async function stopScanner() {
    if (scanner) {
        await scanner.stop().catch(e => console.error(e));
        scanner.clear(); scanner = null;
    }
    document.getElementById("reader").style.display = "none";
    document.getElementById("stopScannerBtn").classList.add("d-none");
    document.getElementById("scanBarcodeBtn").classList.remove("d-none");
}

async function scanSuccess(code) {
    if (scanBusy) return;
    scanBusy = true;
    const beep = document.getElementById("scanBeep");
    if(beep) beep.play().catch(e => console.error(e));

    const q = query(productRef, where("barcode", "==", code));
    const snap = await getDocs(q);
    if (!snap.empty) {
        await addToCart(snap.docs[0].id);
    } else {
        showMessage("Barcode tidak ditemukan.");
    }
    setTimeout(() => { scanBusy = false; }, 1500); 
}

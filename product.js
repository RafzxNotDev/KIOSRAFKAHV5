// =====================================
// PRODUCT.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showMessage, confirmAction, rupiah, isEmpty } from "./utils.js";
import { refreshDashboard } from "./dashboard.js";

const productRef = collection(db, "products");
let productModal;
let editingId = null;
let productScanner = null;
let isProductScanning = false;

// =====================================
// INIT
// =====================================
export async function initProduct() {
    const modal = document.getElementById("productModal");
    if (modal) {
        productModal = new bootstrap.Modal(modal);
        modal.addEventListener('hidden.bs.modal', stopProductScanner);
    }
    bindEvents();
    bindScannerEvents();
    await loadProducts();
}

// =====================================
// EVENT
// =====================================
function bindEvents() {
    const save = document.getElementById("saveProduct");
    if (save) save.addEventListener("click", saveProduct);
    const search = document.getElementById("searchProduct");
    if (search) search.addEventListener("keyup", searchProduct);
}

function bindScannerEvents() {
    const scanBtn = document.getElementById("scanProductBtn");
    if (scanBtn) scanBtn.addEventListener("click", startProductScanner);
    const stopBtn = document.getElementById("stopProductBtn");
    if (stopBtn) stopBtn.addEventListener("click", stopProductScanner);
}

// =====================================
// SIMPAN
// =====================================
async function saveProduct() {
    const nama = document.getElementById("productName").value.trim();
    const kategori = document.getElementById("productCategory").value.trim();
    const barcode = document.getElementById("productBarcode").value.trim();
    const harga = Number(document.getElementById("productSellPrice").value);

    if (isEmpty(nama)) { showMessage("Nama produk wajib diisi"); return; }
    if (harga <= 0) { showMessage("Harga tidak valid"); return; }

    const btn = document.getElementById("saveProduct");
    btn.disabled = true;
    btn.textContent = "Menyimpan...";

    // Hapus variabel stok dari database
    const data = {
        nama,
        kategori,
        barcode,
        harga,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, "products", editingId), data);
            showMessage("Produk berhasil diperbarui");
        } else {
            await addDoc(productRef, {
                ...data,
                terjual: 0,
                createdAt: serverTimestamp()
            });
            showMessage("Produk berhasil ditambahkan");
        }

        clearForm();
        productModal.hide();
        await loadProducts();
        await refreshDashboard();
        editingId = null;
    } catch (err) {
        console.error(err); showMessage(err.message);
    } finally {
        btn.disabled = false; btn.textContent = "Simpan";
    }
}

// =====================================
// EDIT
// =====================================
async function editProduct(id) {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) return;
    const p = snap.data();
    editingId = id;

    document.getElementById("productModalTitle").textContent = "Edit Produk";
    document.getElementById("productName").value = p.nama;
    document.getElementById("productCategory").value = p.kategori || "";
    document.getElementById("productBarcode").value = p.barcode || "";
    document.getElementById("productSellPrice").value = p.harga;

    productModal.show();
}

// =====================================
// SEARCH
// =====================================
function searchProduct() {
    const key = this.value.toLowerCase();
    document.querySelectorAll("#productTable tr").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(key) ? "" : "none";
    });
}

// =====================================
// LOAD PRODUK
// =====================================
async function loadProducts() {
    const tbody = document.getElementById("productTable");
    if (!tbody) return;
    tbody.innerHTML = "";

    try {
        const snapshot = await getDocs(productRef);
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada produk.</td></tr>`;
            return;
        }
        snapshot.forEach((item) => { renderProduct(item.id, item.data()); });
        bindTableEvents();
    } catch (err) {
        console.error(err); showMessage("Gagal memuat produk.");
    }
}

// =====================================
// RENDER PRODUK
// =====================================
function renderProduct(id, data) {
    const tbody = document.getElementById("productTable");
    const tr = document.createElement("tr");
    tr.dataset.id = id;

    // Tidak ada stok
    tr.innerHTML = `
        <td>${data.nama}</td>
        <td>${data.kategori || "-"}</td>
        <td>${data.barcode || "-"}</td>
        <td>${rupiah(data.harga)}</td>
        <td>
            <button class="btn btn-warning btn-sm edit-btn">Edit</button>
            <button class="btn btn-danger btn-sm delete-btn">Hapus</button>
        </td>
    `;
    tbody.appendChild(tr);
}

// =====================================
// EVENT TABEL & HAPUS
// =====================================
function bindTableEvents() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.closest("tr").dataset.id; await editProduct(id);
        });
    });
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.closest("tr").dataset.id; await deleteProduct(id);
        });
    });
}

async function deleteProduct(id) {
    const ok = confirmAction("Hapus produk ini?");
    if (!ok) return;
    try {
        await deleteDoc(doc(db, "products", id));
        showMessage("Produk berhasil dihapus.");
        await loadProducts(); await refreshDashboard();
    } catch (err) {
        console.error(err); showMessage("Gagal menghapus produk.");
    }
}

// =====================================
// CLEAR FORM
// =====================================
function clearForm() {
    editingId = null;
    document.getElementById("productModalTitle").textContent = "Tambah Produk";
    document.getElementById("productName").value = "";
    document.getElementById("productCategory").value = "";
    document.getElementById("productBarcode").value = "";
    document.getElementById("productSellPrice").value = "";
}

export async function refreshProduct() { await loadProducts(); }

// =====================================
// FUNGSI SCANNER PRODUK
// =====================================
async function startProductScanner() {
    if (isProductScanning) return;
    document.getElementById("productReader").style.display = "block";
    document.getElementById("stopProductBtn").classList.remove("d-none");
    document.getElementById("scanProductBtn").classList.add("d-none");
    isProductScanning = true;
    productScanner = new Html5Qrcode("productReader");

    try {
        await productScanner.start({ facingMode: "environment" }, { fps: 15, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                const beep = document.getElementById("scanBeep");
                if(beep) beep.play().catch(e => console.error(e));
                
                document.getElementById("productBarcode").value = decodedText;
                await stopProductScanner();
                fetchProductName(decodedText); // Auto cari nama dan kategori
            }
        );
    } catch (err) {
        console.error("Gagal memulai scanner:", err);
        showMessage("Kamera tidak dapat diakses atau diblokir browser.");
        await stopProductScanner();
    }
}

async function stopProductScanner() {
    if (productScanner) {
        await productScanner.stop().catch(e => console.error(e));
        productScanner.clear(); productScanner = null;
    }
    document.getElementById("productReader").style.display = "none";
    document.getElementById("stopProductBtn").classList.add("d-none");
    document.getElementById("scanProductBtn").classList.remove("d-none");
    isProductScanning = false;
}

// =====================================
// CARI NAMA & KATEGORI PRODUK OTOMATIS
// =====================================
async function fetchProductName(barcode) {
    const nameInput = document.getElementById("productName");
    const categoryInput = document.getElementById("productCategory");
    
    const originalNamePlaceholder = nameInput.placeholder;
    const originalCatPlaceholder = categoryInput.placeholder;
    
    nameInput.placeholder = "Mencari data produk...";
    categoryInput.placeholder = "Mencari data kategori...";
    nameInput.value = ""; 
    categoryInput.value = "";

    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product && data.product.product_name) {
            
            // 1. Set Nama Produk
            nameInput.value = data.product.product_name;
            if (data.product.brands) { 
                nameInput.value = data.product.brands + " - " + data.product.product_name; 
            }
            
            // 2. Set Kategori (Ambil kategori pertama agar tidak terlalu panjang)
            if (data.product.categories) {
                let catList = data.product.categories.split(",");
                categoryInput.value = catList[0].trim();
            } else {
                categoryInput.value = "Umum";
            }
            
            showMessage("✅ Produk & Kategori otomatis ditemukan!");
        } else {
            nameInput.placeholder = originalNamePlaceholder;
            categoryInput.placeholder = originalCatPlaceholder;
            showMessage("⚠️ Produk belum terdaftar di database online. Silakan ketik manual.");
        }
    } catch (err) {
        console.error("Error fetching product data:", err);
        nameInput.placeholder = originalNamePlaceholder; 
        categoryInput.placeholder = originalCatPlaceholder;
        showMessage("Gagal terhubung ke server pencarian.");
    }
}

// =====================================
// UTILS.JS
// Warungan POS
// =====================================

// ================================
// FORMAT RUPIAH
// ================================

export function rupiah(angka = 0) {

return "Rp " + Number(angka).toLocaleString("id-ID");

}

// ================================
// FORMAT TANGGAL
// ================================

export function formatTanggal(timestamp) {

if (!timestamp) return "-";

let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

return date.toLocaleDateString("id-ID", {

day: "2-digit",

month: "long",

year: "numeric"

});

}

// ================================
// FORMAT JAM
// ================================

export function formatJam(timestamp) {

if (!timestamp) return "-";

let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

return date.toLocaleTimeString("id-ID", {

hour: "2-digit",

minute: "2-digit"

});

}

// ================================
// FORMAT TANGGAL + JAM
// ================================

export function formatDateTime(timestamp) {

if (!timestamp) return "-";

let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

return date.toLocaleString("id-ID");

}

// ================================
// GENERATE INVOICE
// ================================

export function generateInvoice() {

const now = new Date();

const y = now.getFullYear();

const m = String(now.getMonth() + 1).padStart(2, "0");

const d = String(now.getDate()).padStart(2, "0");

const h = String(now.getHours()).padStart(2, "0");

const i = String(now.getMinutes()).padStart(2, "0");

const s = String(now.getSeconds()).padStart(2, "0");

return `INV-${y}${m}${d}-${h}${i}${s}`;

}

// ================================
// NOTIFIKASI
// ================================

export function showMessage(text) {

alert(text);

}

// ================================
// KONFIRMASI
// ================================

export function confirmAction(text) {

return confirm(text);

}

// ================================
// CEK INPUT KOSONG
// ================================

export function isEmpty(value) {

return value === null || value === undefined || value.toString().trim() === "";

}

// ================================
// HITUNG TOTAL KERANJANG
// ================================

export function calculateTotal(items) {

let total = 0;

items.forEach(item => {

total += item.harga * item.qty;

});

return total;

}
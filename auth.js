// =====================================
// AUTH.JS
// WARUNGAN POS
// =====================================

import { auth } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =====================================
// LOGIN
// =====================================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", loginUser);
}

async function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const loginBtn = document.getElementById("loginBtn");
    const status = document.getElementById("status");

    loginBtn.disabled = true;
    loginBtn.innerHTML = "Sedang Login...";
    status.innerHTML = "";

    try {
        await signInWithEmailAndPassword(auth, email, password);
        status.style.color = "green";
        status.innerHTML = "Login berhasil...";
        // Catatan: Redirect akan ditangani secara otomatis oleh onAuthStateChanged di bawah
    } catch (err) {
        status.style.color = "red";
        status.innerHTML = "Gagal: Email atau Password salah.";
        loginBtn.disabled = false;
        loginBtn.innerHTML = "LOGIN";
    }
}

// =====================================
// LOGOUT
// =====================================
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
}

async function logoutUser() {
    const yakin = confirm("Yakin ingin logout?");
    if (!yakin) return;
    try {
        await signOut(auth);
        // Catatan: Redirect akan ditangani secara otomatis oleh onAuthStateChanged di bawah
    } catch (err) {
        alert(err.message);
    }
}

// =====================================
// SESSION CHECK (PERLINDUNGAN HALAMAN)
// =====================================
onAuthStateChanged(auth, (user) => {
    const page = location.pathname.split("/").pop();

    if (user) {
        // --- JIKA USER SUDAH LOGIN ---
        
        // 1. Tampilkan email user di topbar (jika ada)
        const emailUser = document.getElementById("userEmail");
        if (emailUser) {
            emailUser.textContent = user.email;
        }

        // 2. Jika user yang sudah login malah membuka halaman login, lempar ke dashboard
        if (page === "login.html") {
            window.location.replace("index.html"); 
        }

    } else {
        // --- JIKA USER BELUM LOGIN ---
        
        // Lempar paksa ke login.html, kecuali dia memang sedang berada di login.html
        if (page !== "login.html") {
            window.location.replace("login.html");
        }
    }
});

// =====================================
// GET USER
// =====================================
export function getCurrentUser() {
    return auth.currentUser;
}

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

window.location.href = "index.html";

} catch (err) {

status.style.color = "red";

status.innerHTML = err.message;

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

window.location.href = "index.html";

} catch (err) {

alert(err.message);

}

}

// =====================================
// SESSION CHECK
// =====================================

onAuthStateChanged(auth, (user) => {

const page = location.pathname.split("/").pop();

if (user) {

const emailUser = document.getElementById("userEmail");

if (emailUser) {

emailUser.textContent = user.email;

}

if (page === "" || page === "index.html") {

window.location.href = "index.html";

}

} else {

if (page === "index.html") {

window.location.href = "index.html";

}

}

});

// =====================================
// GET USER
// =====================================

export function getCurrentUser() {

return auth.currentUser;

}

// =====================================
// REQUIRE LOGIN
// =====================================

export function requireLogin() {

if (!auth.currentUser) {

window.location.href = "index.html";

}

}
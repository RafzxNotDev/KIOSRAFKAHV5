// =====================================
// FIREBASE
// =====================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {

apiKey: "AIzaSyDhxN2mt4T-50bksGkPeEkFr5xdPGo8Q1U",

authDomain: "webkasir-3a2ff.firebaseapp.com",

projectId: "webkasir-3a2ff",

storageBucket: "webkasir-3a2ff.firebasestorage.app",

messagingSenderId: "767211788078",

appId: "1:767211788078:web:ea4563e6ebfac5d2f70cbf"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export {

app,

auth,

db

};
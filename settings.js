// =====================================
// SETTINGS.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";

import {
doc,
getDoc,
setDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
showMessage,
isEmpty
} from "./utils.js";

const settingRef = doc(db,"settings","store");

// =====================================
// INIT
// =====================================

export async function initSettings(){

bindEvents();

await loadSettings();

}

// =====================================
// EVENT
// =====================================

function bindEvents(){

const btn=document.getElementById("saveSettings");

if(btn){

btn.addEventListener("click",saveSettings);

}

}

// =====================================
// LOAD
// =====================================

async function loadSettings(){

try{

const snap=await getDoc(settingRef);

if(!snap.exists()) return;

const data=snap.data();

document.getElementById("storeName").value=data.namaToko || "";

document.getElementById("storeAddress").value=data.alamat || "";

document.getElementById("storePhone").value=data.telepon || "";

}catch(err){

console.error(err);

showMessage("Gagal memuat pengaturan.");

}

}

// =====================================
// SIMPAN
// =====================================

async function saveSettings(){

const nama=document.getElementById("storeName").value.trim();

const alamat=document.getElementById("storeAddress").value.trim();

const telepon=document.getElementById("storePhone").value.trim();

if(isEmpty(nama)){

showMessage("Nama toko wajib diisi.");

return;

}

try{

await setDoc(settingRef,{

namaToko:nama,

alamat,

telepon,

updatedAt:serverTimestamp()

});

showMessage("Pengaturan berhasil disimpan.");

}catch(err){

console.error(err);

showMessage("Gagal menyimpan pengaturan.");

}

}
// =====================================
// REFRESH
// =====================================

export async function refreshSettings(){

await loadSettings();

}

// =====================================
// GET DATA
// =====================================

export async function getStoreInfo(){

const snap=await getDoc(settingRef);

if(!snap.exists()){

return{

namaToko:"Warungan POS",

alamat:"",

telepon:""

};

}

return snap.data();

}
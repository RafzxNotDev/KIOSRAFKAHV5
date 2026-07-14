// =====================================
// DASHBOARD.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { rupiah } from "./utils.js";

// =====================================
// COLLECTION
// =====================================

const productRef = collection(db, "products");
const transactionRef = collection(db, "transactions");

// =====================================
// INIT
// =====================================

export async function initDashboard() {

showDate();

await refreshDashboard();

}

// =====================================
// REFRESH
// =====================================

export async function refreshDashboard() {

try{

await loadStatistics();

}catch(error){

console.error("Dashboard :",error);

}

}

// =====================================
// LOAD DATA
// =====================================

async function loadStatistics(){

const productSnap=await getDocs(productRef);

const transactionSnap=await getDocs(transactionRef);

let totalHariIni=0;
let totalBulanIni=0;

const sekarang=new Date();

transactionSnap.forEach((doc)=>{

const data=doc.data();

if(!data.createdAt) return;

const tanggal=data.createdAt.toDate();

const total=Number(data.total||0);

const samaTahun=
tanggal.getFullYear()===sekarang.getFullYear();

const samaBulan=
tanggal.getMonth()===sekarang.getMonth();

const samaHari=
tanggal.getDate()===sekarang.getDate();

if(samaTahun && samaBulan){

totalBulanIni+=total;

if(samaHari){

totalHariIni+=total;

}

}

});

setText("totalProduct",productSnap.size);

setText("totalTransaction",transactionSnap.size);

setText("todayIncome",rupiah(totalHariIni));

setText("monthIncome",rupiah(totalBulanIni));

}

// =====================================
// TANGGAL
// =====================================

function showDate(){

const el=document.getElementById("tanggalSekarang");

if(!el) return;

const sekarang=new Date();

el.textContent=sekarang.toLocaleDateString("id-ID",{

weekday:"long",

day:"numeric",

month:"long",

year:"numeric"

});

}

// =====================================
// HELPER
// =====================================

function setText(id,value){

const el=document.getElementById(id);

if(el){

el.textContent=value;

}

}
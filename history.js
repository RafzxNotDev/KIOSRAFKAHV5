// =====================================
// HISTORY.JS
// WARUNGAN POS
// =====================================

import { db } from "./firebase.js";

import {
collection,
getDocs,
query,
orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { rupiah } from "./utils.js";

const transactionRef = collection(db,"transactions");

let transactions=[];

// =====================================
// INIT
// =====================================

export async function initHistory(){

bindEvents();

await loadHistory();

}

// =====================================
// EVENT
// =====================================

function bindEvents(){

const search=document.getElementById("searchHistory");

if(search){

search.addEventListener("keyup",searchHistory);

}

}

// =====================================
// LOAD
// =====================================

async function loadHistory(){

const tbody=document.getElementById("historyTable");

if(!tbody) return;

tbody.innerHTML="";

transactions=[];

try{

const q=query(

transactionRef,

orderBy("createdAt","desc")

);

const snapshot=await getDocs(q);

if(snapshot.empty){

tbody.innerHTML=`

<tr>

<td colspan="6" class="text-center">

Belum ada transaksi.

</td>

</tr>

`;

return;

}

snapshot.forEach(doc=>{

transactions.push({

id:doc.id,

...doc.data()

});

});

renderHistory(transactions);

}catch(err){

console.error(err);

}

}

// =====================================
// RENDER
// =====================================

function renderHistory(data){

const tbody=document.getElementById("historyTable");

tbody.innerHTML="";

data.forEach(item=>{

const tanggal=item.createdAt

? item.createdAt.toDate().toLocaleString("id-ID")

: "-";

const tr=document.createElement("tr");

tr.dataset.id=item.id;

tr.innerHTML=`

<td>${item.invoice}</td>

<td>${item.pembeli}</td>

<td>${rupiah(item.total)}</td>

<td>${item.metode}</td>

<td>${tanggal}</td>

<td>

<button
class="btn btn-primary btn-sm detailBtn">

Detail

</button>

</td>

`;

tbody.appendChild(tr);

});

bindDetailButtons();

}

// =====================================
// SEARCH
// =====================================

function searchHistory(){

const key=this.value.toLowerCase();

const result=transactions.filter(item=>{

return(

(item.invoice||"")

.toLowerCase()

.includes(key)

||

(item.pembeli||"")

.toLowerCase()

.includes(key)

);

});

renderHistory(result);

}
// =====================================
// DETAIL TRANSAKSI
// =====================================

function bindDetailButtons() {

document.querySelectorAll(".detailBtn").forEach(btn => {

btn.addEventListener("click", (e) => {

const id = e.target.closest("tr").dataset.id;

showDetail(id);

});

});

}

function showDetail(id) {

const trx = transactions.find(item => item.id === id);

if (!trx) return;

let detail = "";

trx.items.forEach(item => {

detail +=
`${item.nama}
Qty : ${item.qty}
Harga : ${rupiah(item.harga)}
Subtotal : ${rupiah(item.subtotal)}

`;

});

const tanggal = trx.createdAt
? trx.createdAt.toDate().toLocaleString("id-ID")
: "-";

alert(

`INVOICE : ${trx.invoice}

Pembeli : ${trx.pembeli}

Metode : ${trx.metode}

Tanggal :
${tanggal}

----------------------------

${detail}

----------------------------

TOTAL :
${rupiah(trx.total)}`

);

}

// =====================================
// REFRESH
// =====================================

export async function refreshHistory(){

await loadHistory();

}

// =====================================
// HELPER
// =====================================

export function getTransactions(){

return transactions;

}
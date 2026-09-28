function renderSales(){

let box=document.getElementById("sales");
let stats=document.getElementById("salesStats");

let q=
(document.getElementById("saleSearch")?.value||"")
.toLowerCase();

let sales=getOrders()
.filter(o=>o.status==="sold")
.filter(o=>
(o.orderNumber+" "+o.customer.name)
.toLowerCase().includes(q)
)
.sort((a,b)=>
new Date(b.createdAt)-new Date(a.createdAt)
);

let revenue=sales.reduce(
(a,o)=>a+Number(o.total),0
);

let cost=sales.reduce(
(a,o)=>a+Number(o.costTotal||0),0
);

let profit=sales.reduce(
(a,o)=>a+Number(o.profit||0),0
);

stats.innerHTML=`
<div class="stat">
<span>💰 Chiffre d'affaires</span>
<strong>${money(revenue)}</strong>
</div>

<div class="stat">
<span>🏷️ Coût d'achat</span>
<strong>${money(cost)}</strong>
</div>

<div class="stat">
<span>📈 Bénéfice</span>
<strong>${money(profit)}</strong>
</div>

<div class="stat">
<span>🧾 Ventes</span>
<strong>${sales.length}</strong>
</div>
`;

if(!sales.length){
box.innerHTML="<p>Aucune vente enregistrée.</p>";
return;
}

box.innerHTML=sales.map(o=>`

<div class="sale-card">

<div>
<h2>${o.orderNumber}</h2>
<p>${o.customer.name}</p>
<p>${dateText(o.createdAt)}</p>
</div>

<div>
<p>CA : <strong>${money(o.total)}</strong></p>
<p>Coût : <strong>${money(o.costTotal||0)}</strong></p>
<p class="profit">
Bénéfice : <strong>${money(o.profit||0)}</strong>
</p>
</div>

<a class="btn"
href="facture.html?id=${encodeURIComponent(o.id)}">
🧾 Télécharger
</a>

</div>

`).join("");
}

document.addEventListener("DOMContentLoaded",()=>{

renderSales();

document.getElementById("saleSearch")
?.addEventListener("input",renderSales);

});

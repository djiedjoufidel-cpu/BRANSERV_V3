const STATUS={
new:["Nouvelle","status-new"],
confirmed:["Confirmée","status-confirmed"],
sold:["Vendue","status-sold"],
rejected:["Rejetée","status-rejected"],
abandoned:["Abandonnée","status-abandoned"]
};

function statusLabel(s){
return STATUS[s]?STATUS[s][0]:s;
}

function renderOrders(){

let box=document.getElementById("orders");
if(!box)return;

let q=
(document.getElementById("orderSearch")?.value||"")
.toLowerCase();

let orders=getOrders()
.filter(o=>{
let text=
o.orderNumber+" "+
o.customer.name+" "+
o.customer.phone;

return text.toLowerCase().includes(q);
})
.sort((a,b)=>
new Date(b.createdAt)-new Date(a.createdAt)
);

if(!orders.length){
box.innerHTML="<p>Aucune commande.</p>";
return;
}

box.innerHTML=orders.map(o=>`

<div class="order-card">

<div class="order-head">
<div>
<h2>${o.orderNumber}</h2>
<small>${dateText(o.createdAt)}</small>
</div>

<span class="status ${STATUS[o.status]?.[1]||""}">
${statusLabel(o.status)}
</span>
</div>

<div class="customer-box">
<strong>${o.customer.name}</strong><br>
📞 ${o.customer.phone}<br>
📍 ${o.customer.city||""}
${o.customer.district?" - "+o.customer.district:""}
${o.customer.address?"<br>🏠 "+o.customer.address:""}
</div>

<h3>Produits</h3>

${o.items.map(i=>`
<div class="order-item">
<span>${i.productName} × ${i.quantity}</span>
<strong>${money(i.lineTotal)}</strong>
</div>
`).join("")}

<div class="order-total">
Total : ${money(o.total)}
</div>

<div class="order-actions">

${o.status==="new"?
`<button class="btn"
onclick="changeOrderStatus('${o.id}','confirmed')">
Confirmer
</button>`:""}

${o.status==="new"||o.status==="confirmed"?
`<button class="btn success"
onclick="changeOrderStatus('${o.id}','sold')">
✓ Vendu
</button>`:""}

${o.status!=="sold"?
`<button class="btn danger"
onclick="changeOrderStatus('${o.id}','rejected')">
✕ Rejetée
</button>`:""}

${o.status!=="sold"?
`<button class="btn dark"
onclick="changeOrderStatus('${o.id}','abandoned')">
Abandonnée
</button>`:""}

${o.status==="sold"?
`<a class="btn"
href="facture.html?id=${encodeURIComponent(o.id)}">
🧾 Télécharger la facture
</a>`:""}

</div>

</div>

`).join("");
}

function changeOrderStatus(id,status){

let orders=getOrders();
let o=orders.find(x=>x.id===id);

if(!o)return;

if(status==="sold"&&o.status!=="sold"){

let products=getProducts();

let costTotal=0;

for(let item of o.items){

let p=products.find(x=>x.id===item.productId);

if(!p||p.stock<item.quantity){

alert(
"Stock insuffisant pour : "+
item.productName
);

return;
}

costTotal+=
Number(p.purchasePrice||0)*
Number(item.quantity);

item.purchasePrice=
Number(p.purchasePrice||0);
}

for(let item of o.items){

let p=products.find(x=>x.id===item.productId);

p.stock-=item.quantity;
}

o.costTotal=costTotal;
o.profit=Number(o.total)-costTotal;
o.invoice=true;
}

o.status=status;

saveOrders(orders);
renderOrders();

alert("Commande mise à jour.");
}

document.addEventListener("DOMContentLoaded",()=>{

renderOrders();

document.getElementById("orderSearch")
?.addEventListener("input",renderOrders);

});

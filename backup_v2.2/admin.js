function renderStats(){

let orders=getOrders();

let sold=orders.filter(o=>o.status==="sold");

let revenue=sold.reduce(
(a,o)=>a+Number(o.total),0
);

let cost=sold.reduce(
(a,o)=>a+Number(o.costTotal||0),0
);

let profit=revenue-cost;

let stats=[
["📦 Commandes",orders.length],
["🟡 Nouvelles",orders.filter(o=>o.status==="new").length],
["🔵 Confirmées",orders.filter(o=>o.status==="confirmed").length],
["🟢 Vendues",sold.length],
["🔴 Rejetées",orders.filter(o=>o.status==="rejected").length],
["⚫ Abandonnées",orders.filter(o=>o.status==="abandoned").length],
["💰 Chiffre d'affaires",money(revenue)],
["🏷️ Coût d'achat",money(cost)],
["📈 Bénéfice",money(profit)]
];

document.getElementById("stats").innerHTML=
stats.map(x=>`
<div class="stat">
<span>${x[0]}</span>
<strong>${x[1]}</strong>
</div>
`).join("");
}

function renderAdminProducts(){

let box=document.getElementById("adminProducts");
if(!box)return;

box.innerHTML=getProducts().map(p=>`

<div class="admin-product">

<h3>${p.name}</h3>

<div class="admin-grid">

<label>Nom
<input id="n_${p.id}" value="${p.name}">
</label>

<label>Catégorie
<input id="c_${p.id}" value="${p.category}">
</label>

<label>Prix de vente
<input id="p_${p.id}" type="number" value="${p.price}">
</label>

<label>Prix d'achat
<input id="pa_${p.id}" type="number" value="${p.purchasePrice||0}">
</label>

<label>Ancien prix
<input id="o_${p.id}" type="number" value="${p.oldPrice}">
</label>

<label>Stock
<input id="s_${p.id}" type="number" min="0" value="${p.stock}">
</label>

<label>Image
<input id="i_${p.id}" value="${p.image}">
</label>

</div>

<p class="private-note">
🔒 Prix d'achat privé — visible uniquement par l'administration.
</p>

<label class="check">
<input id="pr_${p.id}" type="checkbox"
${p.promo?"checked":""}>
🔥 Promotion
</label>

<label class="check">
<input id="a_${p.id}" type="checkbox"
${p.active!==false?"checked":""}>
👁️ Visible
</label>

<button class="btn"
onclick="updateProduct(${p.id})">
Enregistrer
</button>

<button class="btn danger"
onclick="deleteProduct(${p.id})">
Supprimer
</button>

</div>
`).join("");
}

function addProduct(){

let p={
id:Date.now(),
name:document.getElementById("name").value.trim(),
category:document.getElementById("category").value.trim()||"Autres",
price:Number(document.getElementById("price").value),
purchasePrice:Number(document.getElementById("purchasePrice").value)||0,
oldPrice:Number(document.getElementById("oldPrice").value)||0,
stock:Number(document.getElementById("stock").value)||0,
image:document.getElementById("image").value.trim()||
"https://via.placeholder.com/600x500?text=BRANSERV",
promo:document.getElementById("promo").checked,
active:document.getElementById("active").checked
};

if(!p.name||p.price<=0){
alert("Nom et prix de vente obligatoires.");
return;
}

if(p.purchasePrice<0){
alert("Le prix d'achat est invalide.");
return;
}

if(p.purchasePrice>p.price){
if(!confirm(
"Le prix d'achat est supérieur au prix de vente.\n"+
"Continuer quand même ?"
))return;
}

let products=getProducts();
products.push(p);
saveProducts(products);

[
"name","category","price","purchasePrice",
"oldPrice","stock","image"
].forEach(id=>{
document.getElementById(id).value="";
});

document.getElementById("promo").checked=false;
document.getElementById("active").checked=true;

renderAdminProducts();
renderStats();

alert("Produit ajouté.");
}

function updateProduct(id){

let products=getProducts();
let p=products.find(x=>x.id===id);

if(!p)return;

p.name=document.getElementById("n_"+id).value;
p.category=document.getElementById("c_"+id).value;
p.price=Number(document.getElementById("p_"+id).value);
p.purchasePrice=Number(
document.getElementById("pa_"+id).value
)||0;
p.oldPrice=Number(document.getElementById("o_"+id).value);
p.stock=Number(document.getElementById("s_"+id).value);
p.image=document.getElementById("i_"+id).value;
p.promo=document.getElementById("pr_"+id).checked;
p.active=document.getElementById("a_"+id).checked;

saveProducts(products);
renderAdminProducts();

alert("Produit mis à jour.");
}

function deleteProduct(id){

if(!confirm("Supprimer ce produit ?"))return;

saveProducts(
getProducts().filter(p=>p.id!==id)
);

renderAdminProducts();
}

document.addEventListener("DOMContentLoaded",()=>{
renderStats();
renderAdminProducts();
});

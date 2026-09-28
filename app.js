const WHATSAPP="237651715307";

const DEFAULT_PRODUCTS=[
{
id:1,
name:"T-shirt Nike",
category:"Vêtements",
price:2500,
oldPrice:3000,
purchasePrice:1500,
stock:13,
promo:true,
active:true,
image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"
},
{
id:2,
name:"Chaussures Vans",
category:"Chaussures",
price:12000,
oldPrice:16000,
purchasePrice:8000,
stock:8,
promo:true,
active:true,
image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"
},
{
id:3,
name:"Montre Curen",
category:"Montres",
price:4000,
oldPrice:5000,
purchasePrice:2000,
stock:8,
promo:true,
active:true,
image:"https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80"
}
];

function getProducts(){
let x=localStorage.getItem("branserv_products");

if(!x){
localStorage.setItem(
"branserv_products",
JSON.stringify(DEFAULT_PRODUCTS)
);
return DEFAULT_PRODUCTS;
}

return JSON.parse(x);
}

function saveProducts(x){
localStorage.setItem("branserv_products",JSON.stringify(x));
}

function getCart(){
return JSON.parse(
localStorage.getItem("branserv_cart")||"[]"
);
}

function saveCart(x){
localStorage.setItem("branserv_cart",JSON.stringify(x));
updateCartCount();
}

function getOrders(){
return JSON.parse(
localStorage.getItem("branserv_orders")||"[]"
);
}

function saveOrders(x){
localStorage.setItem("branserv_orders",JSON.stringify(x));
}

function money(n){
return Number(n||0).toLocaleString("fr-FR")+" FCFA";
}

function dateText(d){
return new Date(d).toLocaleString("fr-FR");
}

function updateCartCount(){

let el=document.getElementById("cartCount");
if(!el)return;

el.textContent=getCart().reduce(
(a,b)=>a+b.quantity,0
);
}

function renderProducts(list=getProducts()){

let box=document.getElementById("products");
if(!box)return;

box.innerHTML="";

list
.filter(p=>p.active!==false)
.forEach(p=>{

box.innerHTML+=`
<article class="product">

<img src="${p.image}" alt="${p.name}">

<div class="product-content">

${p.promo?'<span class="promo">PROMOTION</span>':''}

<h3>${p.name}</h3>

<p>
${p.promo?
`<span class="old-price">${money(p.oldPrice)}</span>`:""}

<span class="price">${money(p.price)}</span>
</p>

<p class="stock">
Stock : ${p.stock}
</p>

<button class="btn"
onclick="addToCart(${p.id})"
${p.stock<=0?"disabled":""}>
Ajouter au panier
</button>

</div>
</article>`;
});
}

function addToCart(id){

let p=getProducts().find(x=>x.id===id);

if(!p||p.stock<=0)return;

let cart=getCart();
let item=cart.find(x=>x.id===id);

if(item){
if(item.quantity<p.stock)item.quantity++;
else{
alert("Stock maximum atteint.");
return;
}
}else{
cart.push({id,quantity:1});
}

saveCart(cart);
alert("Produit ajouté au panier.");
}

function renderCart(){

let box=document.getElementById("cart");
if(!box)return;

let products=getProducts();
let cart=getCart();

if(!cart.length){

box.innerHTML="<p>Votre panier est vide.</p>";

let t=document.getElementById("cartTotal");
if(t)t.textContent="";

return;
}

let total=0;

box.innerHTML="";

cart.forEach(item=>{

let p=products.find(x=>x.id===item.id);
if(!p)return;

let subtotal=p.price*item.quantity;
total+=subtotal;

box.innerHTML+=`
<div class="cart-item">

<div>
<strong>${p.name}</strong>
<p>${money(p.price)} × ${item.quantity}</p>
<p><strong>${money(subtotal)}</strong></p>
</div>

<div>
<input
class="qty"
type="number"
min="1"
max="${p.stock}"
value="${item.quantity}"
onchange="changeQuantity(${p.id},this.value)">

<button class="btn danger"
onclick="removeFromCart(${p.id})">
Supprimer
</button>
</div>

</div>`;
});

let t=document.getElementById("cartTotal");
if(t)t.textContent="Total : "+money(total);
}

function changeQuantity(id,value){

let p=getProducts().find(x=>x.id===id);
if(!p)return;

value=Math.max(
1,
Math.min(Number(value),p.stock)
);

let cart=getCart();
let item=cart.find(x=>x.id===id);

if(item)item.quantity=value;

saveCart(cart);
renderCart();
}

function removeFromCart(id){

saveCart(
getCart().filter(x=>x.id!==id)
);

renderCart();
}

document.addEventListener("DOMContentLoaded",()=>{

updateCartCount();
renderProducts();
renderCart();

let search=document.getElementById("search");

if(search){

search.addEventListener("input",()=>{

let v=search.value.toLowerCase();

renderProducts(
getProducts().filter(p=>
p.name.toLowerCase().includes(v)||
p.category.toLowerCase().includes(v)
)
);

});
}

});

/* =========================================================
   BRANSERV — SUPABASE SOURCE PRINCIPALE
   ========================================================= */

(function () {

  const SUPABASE_URL =
    "https://lsaykyehbfgfpoqwsmto.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

  async function synchroniserProduitsSupabase() {

    if (!window.supabase) {
      console.error("❌ SDK Supabase absent");
      return;
    }

    try {

      const client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );

      console.log("☁️ Connexion à Supabase...");

      const result = await client
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", {
          ascending: false
        });

      if (result.error) {
        console.error(
          "❌ ERREUR SUPABASE :",
          result.error
        );
        return;
      }

      const data = result.data || [];

      console.log(
        "✅ Produits récupérés depuis Supabase :",
        data.length
      );

      console.table(data);

      const produits = data.map(p => ({

        id: p.id,

        name: p.name || "Produit",

        category: p.category || "Autre",

        price: Number(p.price || 0),

        purchasePrice:
          Number(p.purchase_price || 0),

        oldPrice:
          p.old_price !== null
            ? Number(p.old_price)
            : null,

        stock:
          Number(p.stock || 0),

        promo:
          Boolean(p.promo),

        active:
          Boolean(p.active),

        image:
          p.image_url ||
          p.image ||
          "",

        image_url:
          p.image_url ||
          p.image ||
          "",

        description:
          p.description || ""

      }));

      /*
       * SUPABASE DEVIENT LA SOURCE PRINCIPALE
       */
      localStorage.setItem(
        "branserv_products",
        JSON.stringify(produits)
      );

      /*
       * Affichage immédiat
       */
      if (typeof window.renderProducts === "function") {

        window.renderProducts(produits);

      } else if (typeof renderProducts === "function") {

        renderProducts(produits);

      }

      console.log(
        "🛍️ BRANSERV : boutique synchronisée avec Supabase."
      );

    } catch (error) {

      console.error(
        "❌ Impossible de synchroniser Supabase :",
        error
      );

    }

  }

  /*
   * Lancer après chargement complet
   */
  window.addEventListener("load", function () {

    setTimeout(
      synchroniserProduitsSupabase,
      500
    );

  });

  window.synchroniserProduitsSupabase =
    synchroniserProduitsSupabase;

})();

window.addEventListener("load", async () => {
  try {
    const sb = window.supabase.createClient(
      "https://lsaykyehbfgfpoqwsmto.supabase.co",
      "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ"
    );

    const { data, error } = await sb
      .from("products")
      .select("id,name,active,stock,image_url")
      .eq("active", true)
      .order("id", { ascending: true });

    console.log("===== BRANSERV TEST SUPABASE =====");
    console.log("Nombre :", data ? data.length : 0);
    console.table(data || []);
    console.log("Erreur :", error);
  } catch (e) {
    console.error("TEST SUPABASE :", e);
  }
});

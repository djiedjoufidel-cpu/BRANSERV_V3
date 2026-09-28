/* =========================================================
   BRANSERV — ADMIN SUPABASE
   Catalogue produits
   ========================================================= */

function getSB() {
    if (!window.branservSupabase) {
        throw new Error("Supabase n'est pas initialisé.");
    }
    return window.branservSupabase;
}

const STORAGE_KEY = "branserv_products";
const BUCKET = "Branserv.b";

let supabaseProducts = [];


/* =========================
   UTILITAIRES
========================= */

function money(value){
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function getProducts(){
  try{
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    ) || [];
  }catch(e){
    return [];
  }
}

function saveLocalBackup(products){
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(products)
  );
}


/* =========================
   SESSION ADMIN
========================= */

async function requireAdmin(){

  if(!SB){
    throw new Error(
      "Supabase n'est pas chargé."
    );
  }

  const {data,error} =
    await getSB().auth.getSession();

  if(error){
    throw error;
  }

  if(!data.session){
    throw new Error(
      "Session administrateur absente."
    );
  }

  const userId =
    data.session.user.id;

  const {data:admin,error:adminError} =
    await SB
      .from("admin_users")
      .select("user_id")
      .eq("user_id",userId)
      .maybeSingle();

  if(adminError){
    throw adminError;
  }

  if(!admin){
    throw new Error(
      "Ce compte n'est pas administrateur BRANSERV."
    );
  }

  return data.session;
}


/* =========================
   CHARGER PRODUITS
========================= */

async function loadSupabaseProducts(){

  const {data,error} =
    await SB
      .from("products")
      .select(`
        id,
        name,
        category,
        price,
        purchase_price,
        old_price,
        stock,
        promo,
        active,
        image_url,
        description,
        created_at,
        updated_at
      `)
      .order("id",{ascending:false});

  if(error){
    throw error;
  }

  supabaseProducts = data || [];

  /*
   * Sauvegarde locale de secours.
   */
  const backup =
    supabaseProducts.map(p => ({
      id:p.id,
      name:p.name,
      category:p.category || "Autres",
      price:Number(p.price || 0),
      purchasePrice:Number(p.purchase_price || 0),
      oldPrice:Number(p.old_price || 0),
      stock:Number(p.stock || 0),
      promo:Boolean(p.promo),
      active:p.active !== false,
      image:p.image_url || "",
      image_url:p.image_url || "",
      description:p.description || ""
    }));

  saveLocalBackup(backup);

  return supabaseProducts;
}


/* =========================
   STATS
========================= */

async function renderStats(){

  const statsBox =
    document.getElementById("stats");

  if(!statsBox) return;

  try{

    const {data:orders,error} =
      await SB
        .from("orders")
        .select("*");

    if(error) throw error;

    const list = orders || [];

    const sold =
      list.filter(o =>
        o.status === "sold"
      );

    const revenue =
      sold.reduce(
        (a,o)=>a+Number(o.total || 0),
        0
      );

    const cost =
      sold.reduce(
        (a,o)=>a+Number(o.cost_total || o.costTotal || 0),
        0
      );

    const profit =
      revenue - cost;

    const stats = [
      ["📦 Commandes",list.length],
      ["🟡 Nouvelles",
        list.filter(o=>o.status==="new").length],
      ["🔵 Confirmées",
        list.filter(o=>o.status==="confirmed").length],
      ["🟢 Vendues",sold.length],
      ["🔴 Rejetées",
        list.filter(o=>o.status==="rejected").length],
      ["⚫ Abandonnées",
        list.filter(o=>o.status==="abandoned").length],
      ["💰 Chiffre d'affaires",money(revenue)],
      ["🏷️ Coût d'achat",money(cost)],
      ["📈 Bénéfice",money(profit)]
    ];

    statsBox.innerHTML =
      stats.map(s=>`
        <div class="stat">
          <strong>${escapeHtml(s[0])}</strong>
          <span>${escapeHtml(s[1])}</span>
        </div>
      `).join("");

  }catch(error){

    console.error(
      "Erreur statistiques:",
      error
    );

    statsBox.innerHTML =
      `<div class="stat">
        <strong>⚠️ Statistiques</strong>
        <span>Erreur de chargement</span>
      </div>`;

  }
}


/* =========================
   AFFICHAGE PRODUITS
========================= */

function renderAdminProducts(){

  const box =
    document.getElementById("adminProducts");

  if(!box) return;

  if(!supabaseProducts.length){

    box.innerHTML =
      `<div class="admin-product">
        <h3>Aucun produit</h3>
        <p>Ajoute ton premier produit.</p>
      </div>`;

    return;
  }

  box.innerHTML =
    supabaseProducts.map(p=>{

      const image =
        p.image_url ||
        "https://via.placeholder.com/300x220?text=BRANSERV";

      return `

      <div class="admin-product">

        <div style="
          display:flex;
          gap:15px;
          align-items:center;
          margin-bottom:15px;
        ">

          <img
            src="${escapeHtml(image)}"
            alt="${escapeHtml(p.name)}"
            style="
              width:90px;
              height:75px;
              object-fit:cover;
              border-radius:10px;
              background:#eee;
            "
          >

          <div>
            <h3 style="margin:0">
              ${escapeHtml(p.name)}
            </h3>

            <small>
              ID Supabase : ${p.id}
            </small>
          </div>

        </div>

        <div class="admin-grid">

          <label>
            Nom
            <input
              id="n_${p.id}"
              value="${escapeHtml(p.name)}"
            >
          </label>

          <label>
            Catégorie
            <input
              id="c_${p.id}"
              value="${escapeHtml(p.category || "")}"
            >
          </label>

          <label>
            Prix de vente
            <input
              id="p_${p.id}"
              type="number"
              value="${Number(p.price || 0)}"
            >
          </label>

          <label>
            Prix d'achat
            <input
              id="pa_${p.id}"
              type="number"
              value="${Number(p.purchase_price || 0)}"
            >
          </label>

          <label>
            Ancien prix
            <input
              id="o_${p.id}"
              type="number"
              value="${Number(p.old_price || 0)}"
            >
          </label>

          <label>
            Stock
            <input
              id="s_${p.id}"
              type="number"
              min="0"
              value="${Number(p.stock || 0)}"
            >
          </label>

          <label>
            Description
            <textarea
              id="d_${p.id}"
              rows="3"
            >${escapeHtml(p.description || "")}</textarea>
          </label>

          <label>
            Image URL Supabase
            <input
              id="i_${p.id}"
              value="${escapeHtml(p.image_url || "")}"
              readonly
            >
          </label>

        </div>

        <p class="private-note">
          🔒 Prix d'achat privé — administration uniquement.
        </p>

        <label class="check">
          <input
            id="pr_${p.id}"
            type="checkbox"
            ${p.promo ? "checked" : ""}
          >
          🔥 Promotion
        </label>

        <label class="check">
          <input
            id="a_${p.id}"
            type="checkbox"
            ${p.active !== false ? "checked" : ""}
          >
          👁️ Visible
        </label>

        <button
          class="btn"
          onclick="updateProduct(${p.id})"
        >
          💾 Enregistrer
        </button>

        <button
          class="btn danger"
          onclick="deleteProduct(${p.id})"
        >
          🗑️ Supprimer
        </button>

      </div>

      `;

    }).join("");
}


/* =========================
   AJOUTER PRODUIT
========================= */

async function addProduct(){

  try{

    await requireAdmin();

    const name =
      document
        .getElementById("name")
        .value
        .trim();

    const category =
      document
        .getElementById("category")
        .value
        .trim() || "Autres";

    const price =
      Number(
        document
          .getElementById("price")
          .value
      );

    const purchasePrice =
      Number(
        document
          .getElementById("purchasePrice")
          .value
      ) || 0;

    const oldPrice =
      Number(
        document
          .getElementById("oldPrice")
          .value
      ) || 0;

    const stock =
      Number(
        document
          .getElementById("stock")
          .value
      ) || 0;

    const image =
      document
        .getElementById("image")
        .value
        .trim();

    const promo =
      document
        .getElementById("promo")
        .checked;

    const active =
      document
        .getElementById("active")
        .checked;

    if(!name || price <= 0){

      alert(
        "Nom et prix de vente obligatoires."
      );

      return;
    }

    if(purchasePrice < 0){

      alert(
        "Le prix d'achat est invalide."
      );

      return;
    }

    if(
      purchasePrice > price &&
      !confirm(
        "Le prix d'achat est supérieur au prix de vente.\nContinuer ?"
      )
    ){
      return;
    }

    const product = {

      name,
      category,
      price,
      purchase_price:purchasePrice,
      old_price:oldPrice,
      stock,
      promo,
      active,
      image_url:image || null

    };

    const {data,error} =
      await SB
        .from("products")
        .insert(product)
        .select()
        .single();

    if(error) throw error;

    alert(
      "✅ Produit ajouté dans Supabase."
    );

    clearAddForm();

    await refreshAdmin();

  }catch(error){

    console.error(error);

    alert(
      "❌ Impossible d'ajouter le produit :\n\n" +
      error.message
    );

  }

}


/* =========================
   MODIFIER PRODUIT
========================= */

async function updateProduct(id){

  try{

    await requireAdmin();

    const name =
      document.getElementById("n_"+id).value.trim();

    const category =
      document.getElementById("c_"+id).value.trim();

    const price =
      Number(
        document.getElementById("p_"+id).value
      );

    const purchasePrice =
      Number(
        document.getElementById("pa_"+id).value
      ) || 0;

    const oldPrice =
      Number(
        document.getElementById("o_"+id).value
      ) || 0;

    const stock =
      Number(
        document.getElementById("s_"+id).value
      );

    const description =
      document.getElementById("d_"+id).value;

    const promo =
      document.getElementById("pr_"+id).checked;

    const active =
      document.getElementById("a_"+id).checked;

    if(!name || price <= 0){

      alert(
        "Nom et prix de vente obligatoires."
      );

      return;
    }

    const {error} =
      await SB
        .from("products")
        .update({

          name,
          category,
          price,
          purchase_price:purchasePrice,
          old_price:oldPrice,
          stock,
          description,
          promo,
          active

        })
        .eq("id",id);

    if(error) throw error;

    alert(
      "✅ Produit mis à jour dans Supabase."
    );

    await refreshAdmin();

  }catch(error){

    console.error(error);

    alert(
      "❌ Erreur de modification :\n\n" +
      error.message
    );

  }

}


/* =========================
   SUPPRIMER PRODUIT
========================= */

async function deleteProduct(id){

  if(!confirm(
    "Supprimer définitivement ce produit de Supabase ?"
  )){
    return;
  }

  try{

    await requireAdmin();

    const {error} =
      await SB
        .from("products")
        .delete()
        .eq("id",id);

    if(error) throw error;

    alert(
      "✅ Produit supprimé de Supabase."
    );

    await refreshAdmin();

  }catch(error){

    console.error(error);

    alert(
      "❌ Erreur de suppression :\n\n" +
      error.message
    );

  }

}


/* =========================
   VIDER FORMULAIRE
========================= */

function clearAddForm(){

  [
    "name",
    "category",
    "price",
    "purchasePrice",
    "oldPrice",
    "stock",
    "image"
  ].forEach(id=>{

    const el =
      document.getElementById(id);

    if(el) el.value="";

  });

  const promo =
    document.getElementById("promo");

  if(promo) promo.checked=false;

  const active =
    document.getElementById("active");

  if(active) active.checked=true;

}


/* =========================
   RAFRAÎCHISSEMENT COMPLET
========================= */

async function refreshAdmin(){

  try{

    await loadSupabaseProducts();

    renderAdminProducts();

    await renderStats();

  }catch(error){

    console.error(error);

    const box =
      document.getElementById("adminProducts");

    if(box){

      box.innerHTML =
        `<div class="admin-product">
          <h3>❌ Erreur Supabase</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>`;

    }

  }

}


/* =========================
   INITIALISATION
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async ()=>{

    try{

      await requireAdmin();

      console.log(
        "✅ Administrateur BRANSERV connecté"
      );

      await refreshAdmin();

    }catch(error){

      console.error(error);

      alert(
        "⚠️ " +
        error.message +
        "\n\nConnecte-toi avec ton compte administrateur Supabase."
      );

    }

  }
);


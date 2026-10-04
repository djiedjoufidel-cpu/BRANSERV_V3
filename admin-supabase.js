
(function () {
  "use strict";

  const SUPABASE_URL =
    window.BRANSERV_SUPABASE_URL ||
    "https://lsaykyehbfgfpoqwsmto.supabase.co";

  const SUPABASE_KEY =
    window.BRANSERV_SUPABASE_KEY ||
    "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

  let client = null;

  function getClient() {
    if (!window.supabase) {
      throw new Error("Le SDK Supabase n'est pas chargé.");
    }

    if (!client) {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
    }

    return client;
  }

  function showLogin() {
    const box = document.getElementById("branservLogin");
    if (box) box.style.display = "flex";
  }

  function hideLogin() {
    const box = document.getElementById("branservLogin");
    if (box) box.style.display = "none";
  }

  function showError(message) {
    const error = document.getElementById("branservLoginError");
    if (error) error.textContent = message;
  }

  async function login(email, password) {
    const supabase = getClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("Aucune session Supabase créée.");
    }

    return data.session;
  }

  async function checkAdmin() {
    const supabase = getClient();

    console.log("🔐 Vérification de la session...");

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Erreur session :", error);
      showLogin();
      return false;
    }

    if (!session) {
      console.log("ℹ️ Aucune session administrateur.");
      showLogin();
      return false;
    }

    console.log("👤 Connecté :", session.user.email);
    console.log("🆔 UID :", session.user.id);

    const { data: admin, error: adminError } =
      await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

    if (adminError) {
      console.error("Erreur vérification admin :", adminError);
      showLogin();
      showError(
        "Impossible de vérifier les droits administrateur."
      );
      return false;
    }

    if (!admin) {
      console.error("❌ Utilisateur non administrateur.");
      await supabase.auth.signOut();
      showLogin();
      showError(
        "Ce compte n'est pas autorisé comme administrateur."
      );
      return false;
    }

    console.log("✅ Administrateur confirmé :", session.user.email);

    hideLogin();

    window.BRANSERV_ADMIN_AUTH = {
      client: supabase,
      session: session,
      user: session.user
    };

    return true;
  }

  async function setupLoginForm() {
    const form = document.getElementById("branservLoginForm");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const email =
        document.getElementById("branservEmail").value.trim();

      const password =
        document.getElementById("branservPassword").value;

      const button =
        document.getElementById("branservLoginButton");

      if (!email || !password) {
        showError("Veuillez remplir les deux champs.");
        return;
      }

      button.disabled = true;
      button.textContent = "Connexion...";

      showError("");

      try {
        await login(email, password);

        const ok = await checkAdmin();

        if (!ok) {
          button.disabled = false;
          button.textContent = "Se connecter";
          return;
        }

        location.reload();

      } catch (error) {
        console.error("❌ Connexion impossible :", error);

        let message = error.message || "Connexion impossible.";

        if (
          message.toLowerCase().includes("invalid login credentials")
        ) {
          message = "Email ou mot de passe incorrect.";
        }

        showError(message);

        button.disabled = false;
        button.textContent = "Se connecter";
      }
    });
  }

  async function init() {
    try {
      await setupLoginForm();
      await checkAdmin();
    } catch (error) {
      console.error("Erreur initialisation admin :", error);
      showLogin();
      showError(error.message);
    }
  }

  window.branservAdminLogout = async function () {
    try {
      const supabase = getClient();
      await supabase.auth.signOut();
      location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  window.branservSupabase = getClient();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* =========================================================
   GESTION DES PRODUITS BRANSERV
   ========================================================= */

async function addProduct() {
  const supabase = window.branservSupabase;

  if (!supabase) {
    alert("❌ Supabase n'est pas initialisé.");
    return;
  }

  const name = document.getElementById("name")?.value.trim();
  const category = document.getElementById("category")?.value.trim();
  const price = Number(document.getElementById("price")?.value || 0);
  const purchasePrice = Number(document.getElementById("purchasePrice")?.value || 0);
  const oldPrice = Number(document.getElementById("oldPrice")?.value || 0);
  const stock = Number(document.getElementById("stock")?.value || 0);
  const promo = !!document.getElementById("promo")?.checked;
  const active = document.getElementById("active")
    ? !!document.getElementById("active").checked
    : true;

  const fileInput = document.getElementById("imageFile");
  const file = fileInput?.files?.[0];

  if (!name) {
    alert("❌ Entre le nom du produit.");
    return;
  }

  if (price <= 0) {
    alert("❌ Entre un prix de vente valide.");
    return;
  }

  if (!file) {
    alert("❌ Choisis une image depuis la galerie.");
    return;
  }

  if (!file.type.startsWith("image/")) {
    alert("❌ Le fichier choisi n'est pas une image.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("❌ Image trop lourde. Maximum : 5 Mo.");
    return;
  }

  const button =
    document.querySelector('button[onclick="addProduct()"]');

  const oldText = button ? button.textContent : "";

  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Upload de l'image...";
  }

  try {

    const extension =
      (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";

    const safeName =
      name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "produit";

    const filePath =
      `products/${Date.now()}-${safeName}.${extension}`;

    console.log("📷 Upload :", filePath);

    const { error: uploadError } =
      await supabase.storage
        .from("Branserv.b")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

    if (uploadError) {
      throw new Error(
        "Upload image : " + uploadError.message
      );
    }

    const { data: publicData } =
      supabase.storage
        .from("Branserv.b")
        .getPublicUrl(filePath);

    const imageUrl = publicData?.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "Impossible de récupérer l'URL de l'image."
      );
    }

    console.log("🖼️ URL image :", imageUrl);

    if (button) {
      button.textContent = "⏳ Enregistrement...";
    }

    const product = {
      name: name,
      category: category || "Autre",
      price: price,
      purchase_price: purchasePrice,
      old_price: oldPrice || null,
      stock: stock,
      promo: promo,
      active: active,
      image_url: imageUrl,
      image: imageUrl
    };

    const { data, error } =
      await supabase
        .from("products")
        .insert(product)
        .select()
        .single();

    if (error) {
      throw new Error(
        "Enregistrement produit : " + error.message
      );
    }

    console.log("✅ Produit :", data);

    alert("✅ Produit ajouté avec succès !");

    document.getElementById("name").value = "";
    document.getElementById("category").value = "";
    document.getElementById("price").value = "";
    document.getElementById("purchasePrice").value = "";
    document.getElementById("oldPrice").value = "";
    document.getElementById("stock").value = "";

    if (document.getElementById("promo")) {
      document.getElementById("promo").checked = false;
    }

    if (document.getElementById("active")) {
      document.getElementById("active").checked = true;
    }

    if (fileInput) {
      fileInput.value = "";
    }

    const preview =
      document.getElementById("imagePreview");

    if (preview) {
      preview.innerHTML = "";
    }

    if (typeof loadAdminProducts === "function") {
      await loadAdminProducts();
    }

    return data;

  } catch (err) {

    console.error("❌ Erreur :", err);

    alert(
      "❌ " +
      (err?.message || err)
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = oldText || "Ajouter";
    }

  }
}

async function loadAdminProducts() {
  const box = document.getElementById("adminProducts");

  if (!box) return;

  try {
    const supabase = window.branservSupabase;

    if (!supabase) {
      box.innerHTML = "<p>❌ Supabase non initialisé.</p>";
      return;
    }

    const { data: { session } } =
      await supabase.auth.getSession();

    if (!session) {
      box.innerHTML =
        "<p>Connectez-vous pour gérer les produits.</p>";
      return;
    }

    const { data, error } =
      await supabase
        .from("products")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
      console.error("Erreur chargement produits :", error);
      box.innerHTML =
        "<p>❌ Impossible de charger les produits.</p>";
      return;
    }

    if (!data || data.length === 0) {
      box.innerHTML =
        "<p>Aucun produit enregistré.</p>";
      return;
    }

    box.innerHTML = data.map(product => {

      const image =
        product.image_url ||
        product.image ||
        "";

      return `
        <div class="admin-card"
             style="
               margin-top:15px;
               padding:15px;
               border:1px solid #ddd;
               border-radius:15px;
             ">

          <div style="
            display:flex;
            gap:15px;
            align-items:center;
            flex-wrap:wrap;
          ">

            ${
              image
              ?
              `<img
                src="${escapeHtml(image)}"
                alt="${escapeHtml(product.name || "")}"
                style="
                  width:90px;
                  height:90px;
                  object-fit:cover;
                  border-radius:12px;
                "
              >`
              :
              `<div style="
                width:90px;
                height:90px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#f1f1f1;
                border-radius:12px;
                font-size:30px;
              ">🛍️</div>`
            }

            <div style="flex:1;min-width:220px;">

              <h3>
                ${escapeHtml(product.name || "")}
              </h3>

              <p>
                ${escapeHtml(product.category || "Autre")}
              </p>

              <p>
                💰
                ${Number(product.price || 0)
                  .toLocaleString("fr-FR")}
                FCFA
              </p>

              <p>
                📦 Stock :
                ${Number(product.stock || 0)}
              </p>

              <p>
                ${
                  product.promo
                  ? "🔥 En promotion"
                  : "Produit normal"
                }

                ${
                  product.active
                  ? " · 🟢 Visible"
                  : " · 🔴 Masqué"
                }
              </p>

            </div>

          </div>

          <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:15px;
          ">

            <button
              class="btn"
              onclick="editProduct(${product.id})">
              ✏️ Modifier
            </button>

            <button
              class="btn"
              onclick="changeStock(${product.id}, 1)">
              ➕ Stock
            </button>

            <button
              class="btn"
              onclick="changeStock(${product.id}, -1)">
              ➖ Stock
            </button>

            <button
              class="btn"
              onclick="toggleProductPromo(
                ${product.id},
                ${product.promo ? "true" : "false"}
              )">
              ${
                product.promo
                ? "🔥 Retirer promo"
                : "🔥 Promotion"
              }
            </button>

            <button
              class="btn"
              onclick="toggleProductActive(
                ${product.id},
                ${product.active ? "true" : "false"}
              )">
              ${
                product.active
                ? "👁️ Masquer"
                : "👁️ Afficher"
              }
            </button>

            <button
              class="btn"
              onclick="changeProductImage(${product.id})">
              📷 Image
            </button>

            <button
              class="btn"
              style="background:#c62828;color:white;"
              onclick="deleteProduct(${product.id})">
              🗑️ Supprimer
            </button>

          </div>

        </div>
      `;

    }).join("");

  } catch (error) {

    console.error(error);

    box.innerHTML =
      "<p>❌ Erreur lors du chargement.</p>";
  }
}


/* =========================================================
   MODIFIER UN PRODUIT
   ========================================================= */

async function editProduct(id) {

  const supabase = window.branservSupabase;

  const { data: product, error: getError } =
    await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

  if (getError || !product) {
    alert("❌ Produit introuvable.");
    return;
  }

  const name =
    prompt(
      "Nom du produit :",
      product.name || ""
    );

  if (name === null) return;

  const category =
    prompt(
      "Catégorie :",
      product.category || ""
    );

  if (category === null) return;

  const priceText =
    prompt(
      "Prix de vente :",
      product.price || 0
    );

  if (priceText === null) return;

  const purchaseText =
    prompt(
      "Prix d'achat :",
      product.purchase_price || 0
    );

  if (purchaseText === null) return;

  const oldPriceText =
    prompt(
      "Ancien prix / prix avant promotion :",
      product.old_price || ""
    );

  if (oldPriceText === null) return;

  const stockText =
    prompt(
      "Stock :",
      product.stock || 0
    );

  if (stockText === null) return;

  const { error } =
    await supabase
      .from("products")
      .update({
        name: name.trim(),
        category: category.trim(),
        price: Number(priceText) || 0,
        purchase_price: Number(purchaseText) || 0,
        old_price:
          oldPriceText === ""
          ? null
          : Number(oldPriceText),
        stock:
          Math.max(0, Number(stockText) || 0),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

  if (error) {
    console.error(error);
    alert("❌ Modification impossible : " + error.message);
    return;
  }

  alert("✅ Produit modifié avec succès.");

  await loadAdminProducts();
}


/* =========================================================
   MODIFIER LE STOCK
   ========================================================= */

async function changeStock(id, amount) {

  const supabase = window.branservSupabase;

  const { data: product, error } =
    await supabase
      .from("products")
      .select("stock,name")
      .eq("id", id)
      .single();

  if (error || !product) {
    alert("❌ Produit introuvable.");
    return;
  }

  const newStock =
    Math.max(
      0,
      Number(product.stock || 0) + amount
    );

  const { error: updateError } =
    await supabase
      .from("products")
      .update({
        stock: newStock,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

  if (updateError) {
    alert(
      "❌ Impossible de modifier le stock : " +
      updateError.message
    );
    return;
  }

  await loadAdminProducts();
}


/* =========================================================
   PROMOTION
   ========================================================= */

async function toggleProductPromo(id, current) {

  const supabase = window.branservSupabase;

  const { error } =
    await supabase
      .from("products")
      .update({
        promo: !current,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

  if (error) {
    alert(
      "❌ Impossible de modifier la promotion : " +
      error.message
    );
    return;
  }

  await loadAdminProducts();
}


/* =========================================================
   VISIBILITÉ
   ========================================================= */

async function toggleProductActive(id, current) {

  const supabase = window.branservSupabase;

  const { error } =
    await supabase
      .from("products")
      .update({
        active: !current,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

  if (error) {
    alert(
      "❌ Impossible de modifier la visibilité : " +
      error.message
    );
    return;
  }

  await loadAdminProducts();
}


/* =========================================================
   CHANGER L'IMAGE
   ========================================================= */

async function changeProductImage(id) {

  const supabase = window.branservSupabase;

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = "image/*";

  input.onchange = async function () {

    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("❌ Choisis une image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("❌ Image trop lourde. Maximum : 5 Mo.");
      return;
    }

    try {

      alert("⏳ Upload de la nouvelle image...");

      const extension =
        (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "jpg";

      const filePath =
        `products/${Date.now()}-product-${id}.${extension}`;

      const { error: uploadError } =
        await supabase.storage
          .from("Branserv.b")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } =
        supabase.storage
          .from("Branserv.b")
          .getPublicUrl(filePath);

      const imageUrl =
        publicData.publicUrl;

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            image_url: imageUrl,
            image: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      alert("✅ Image modifiée avec succès.");

      await loadAdminProducts();

    } catch (error) {

      console.error(error);

      alert(
        "❌ Erreur image : " +
        (error.message || error)
      );
    }
  };

  input.click();
}


/* =========================================================
   SUPPRIMER
   ========================================================= */

async function deleteProduct(id) {

  const supabase = window.branservSupabase;

  const { data: product, error: getError } =
    await supabase
      .from("products")
      .select("name")
      .eq("id", id)
      .single();

  if (getError || !product) {
    alert("❌ Produit introuvable.");
    return;
  }

  const confirmed =
    confirm(
      `⚠️ Supprimer définitivement "${product.name}" ?`
    );

  if (!confirmed) return;

  const { error } =
    await supabase
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {
    alert(
      "❌ Suppression impossible : " +
      error.message
    );
    return;
  }

  alert("✅ Produit supprimé.");

  await loadAdminProducts();
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Exposer la fonction au bouton onclick="addProduct()"
window.addProduct = addProduct;
window.editProduct = editProduct;
window.changeStock = changeStock;
window.toggleProductPromo = toggleProductPromo;
window.toggleProductActive = toggleProductActive;
window.changeProductImage = changeProductImage;
window.deleteProduct = deleteProduct;
window.loadAdminProducts = loadAdminProducts;

const previousInit = window.branservAdminProductsInit;

window.branservAdminProductsInit = async function () {
  await loadAdminProducts();
};



// =========================================================
// CHARGEMENT FORCÉ DE LA LISTE DES PRODUITS
// =========================================================
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(async function () {
    try {
      if (typeof window.loadAdminProducts === "function") {
        console.log("🔄 Chargement forcé des produits...");
        await window.loadAdminProducts();
      }
    } catch (e) {
      console.error("❌ Erreur chargement produits :", e);
    }
  }, 1200);
});

// ==================== BRANSERV DASHBOARD V1 ====================

// ==================== BRANSERV DASHBOARD V1 ====================
(function () {
  "use strict";

  function money(value) {
    return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectDashboardStyles() {
    if (document.getElementById("branservDashboardStyles")) return;

    const style = document.createElement("style");
    style.id = "branservDashboardStyles";

    style.textContent = `
      .branserv-dashboard {
        margin: 20px 0 30px;
      }

      .branserv-dashboard-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
        flex-wrap:wrap;
        margin-bottom:15px;
      }

      .branserv-dashboard-title h2 {
        margin:0;
      }

      .dashboard-refresh {
        border:0;
        cursor:pointer;
        padding:10px 15px;
        border-radius:10px;
        background:linear-gradient(135deg,#4C1D95,#7C3AED);
        color:#fff;
        font-weight:600;
      }

      .dashboard-refresh:hover {
        opacity:.9;
      }

      .branserv-stat-grid {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:15px;
      }

      .branserv-stat-card {
        background:#fff;
        border:1px solid #e5e5e5;
        border-radius:16px;
        padding:18px;
        box-shadow:0 4px 15px rgba(0,0,0,.05);
      }

      .branserv-stat-icon {
        font-size:28px;
        margin-bottom:8px;
      }

      .branserv-stat-label {
        color:#666;
        font-size:14px;
      }

      .branserv-stat-value {
        font-size:24px;
        font-weight:800;
        margin-top:5px;
        word-break:break-word;
      }

      .branserv-dashboard-panels {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
        gap:15px;
        margin-top:15px;
      }

      .branserv-dashboard-panel {
        background:#fff;
        border:1px solid #e5e5e5;
        border-radius:16px;
        padding:18px;
        box-shadow:0 4px 15px rgba(0,0,0,.05);
      }

      .branserv-dashboard-panel h3 {
        margin-top:0;
      }

      .dashboard-row {
        display:flex;
        justify-content:space-between;
        gap:10px;
        padding:10px 0;
        border-bottom:1px solid #eee;
      }

      .dashboard-row:last-child {
        border-bottom:0;
      }

      .dashboard-warning {
        color:#b71c1c;
        font-weight:700;
      }

      .dashboard-success {
        color:#16803c;
        font-weight:700;
      }

      .dashboard-empty {
        color:#777;
      }

      @media(max-width:600px) {
        .branserv-stat-value {
          font-size:20px;
        }

        .branserv-stat-card {
          padding:15px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createDashboardContainer() {
    const stats = document.getElementById("stats");
    if (!stats) return null;

    let dashboard = document.getElementById("branservDashboard");

    if (!dashboard) {
      dashboard = document.createElement("div");
      dashboard.id = "branservDashboard";
      dashboard.className = "branserv-dashboard";

      stats.innerHTML = "";

      stats.parentNode.insertBefore(dashboard, stats);
      stats.style.display = "none";
    }

    return dashboard;
  }

  function statCard(icon, label, value) {
    return `
      <div class="branserv-stat-card">
        <div class="branserv-stat-icon">${icon}</div>
        <div class="branserv-stat-label">${label}</div>
        <div class="branserv-stat-value">${value}</div>
      </div>
    `;
  }

  async function countTable(supabase, table) {
    try {
      const result = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });

      return {
        count: Number(result.count || 0),
        error: result.error
      };
    } catch (e) {
      return {
        count: 0,
        error: e
      };
    }
  }

  async function loadDashboardStats() {
    const supabase = window.branservSupabase;

    if (!supabase) {
      console.error("❌ Supabase non disponible pour le dashboard.");
      return;
    }

    injectDashboardStyles();

    const dashboard = createDashboardContainer();

    if (!dashboard) {
      console.warn("⚠️ Élément #stats introuvable.");
      return;
    }

    dashboard.innerHTML = `
      <div class="branserv-dashboard-title">
        <h2>📊 Vue générale</h2>
        <button class="dashboard-refresh" id="refreshDashboard">
          🔄 Actualiser
        </button>
      </div>

      <div class="branserv-stat-grid">
        <div class="branserv-stat-card">
          <div class="branserv-stat-icon">⏳</div>
          <div class="branserv-stat-label">Chargement</div>
          <div class="branserv-stat-value">...</div>
        </div>
      </div>
    `;

    const refreshButton = document.getElementById("refreshDashboard");

    if (refreshButton) {
      refreshButton.onclick = loadDashboardStats;
    }

    try {
      const [
        productsResult,
        ordersResult,
        salesResult,
        customersResult,
        servicesResult
      ] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,stock,active,price,purchase_price"),

        supabase
          .from("orders")
          .select("id,status,total,cost_total,profit,created_at"),

        supabase
          .from("sales")
          .select("id,order_id,total,profit,status,sold_at,returned_at"),

        countTable(supabase, "customers"),

        countTable(supabase, "service_requests")
      ]);

      if (productsResult.error) {
        console.error("Erreur produits :", productsResult.error);
      }

      if (ordersResult.error) {
        console.error("Erreur commandes :", ordersResult.error);
      }

      if (salesResult.error) {
        console.error("Erreur ventes :", salesResult.error);
      }

      const products = productsResult.data || [];
      const orders = ordersResult.data || [];
      const sales = salesResult.data || [];

      const customersCount = customersResult.count;
      const servicesCount = servicesResult.count;

      const totalProducts = products.length;

      const totalStock = products.reduce(
        (sum, p) => sum + Number(p.stock || 0),
        0
      );

      const lowStockProducts = products.filter(
        p => Number(p.stock || 0) <= 5
      );

      const activeProducts = products.filter(
        p => p.active !== false
      ).length;

      const newOrders = orders.filter(
        o => String(o.status || "").toLowerCase() === "new"
      ).length;

      const confirmedOrders = orders.filter(
        o => String(o.status || "").toLowerCase() === "confirmed"
      ).length;

      const soldOrders = orders.filter(
        o => String(o.status || "").toLowerCase() === "sold"
      ).length;

      const rejectedOrders = orders.filter(
        o => {
          const s = String(o.status || "").toLowerCase();
          return s === "rejected" || s === "reject";
        }
      ).length;

      const returnedOrders = orders.filter(
        o => String(o.status || "").toLowerCase() === "returned"
      ).length;

      const totalRevenue = sales
        .filter(s => String(s.status || "").toLowerCase() !== "returned")
        .reduce(
          (sum, s) => sum + Number(s.total || 0),
          0
        );

      const totalProfit = sales
        .filter(s => String(s.status || "").toLowerCase() !== "returned")
        .reduce(
          (sum, s) => sum + Number(s.profit || 0),
          0
        );

      const totalSales = sales.filter(
        s => String(s.status || "").toLowerCase() !== "returned"
      ).length;

      const averageSale =
        totalSales > 0
          ? totalRevenue / totalSales
          : 0;

      dashboard.innerHTML = `
        <div class="branserv-dashboard-title">
          <div>
            <h2>📊 Vue générale BRANSERV</h2>
            <small>Informations en temps réel depuis Supabase</small>
          </div>

          <button class="dashboard-refresh" id="refreshDashboard">
            🔄 Actualiser
          </button>
        </div>

        <div class="branserv-stat-grid">

          ${statCard(
            "💰",
            "Chiffre d'affaires",
            money(totalRevenue)
          )}

          ${statCard(
            "📈",
            "Bénéfice",
            money(totalProfit)
          )}

          ${statCard(
            "📦",
            "Commandes",
            orders.length
          )}

          ${statCard(
            "🛍️",
            "Produits",
            totalProducts
          )}

          ${statCard(
            "📊",
            "Stock total",
            totalStock
          )}

          ${statCard(
            "👥",
            "Clients",
            customersCount
          )}

          ${statCard(
            "🛠️",
            "Demandes services",
            servicesCount
          )}

          ${statCard(
            "🧾",
            "Ventes enregistrées",
            totalSales
          )}

        </div>

        <div class="branserv-dashboard-panels">

          <div class="branserv-dashboard-panel">
            <h3>📦 État des commandes</h3>

            <div class="dashboard-row">
              <span>🆕 Nouvelles</span>
              <strong>${newOrders}</strong>
            </div>

            <div class="dashboard-row">
              <span>✅ Confirmées</span>
              <strong>${confirmedOrders}</strong>
            </div>

            <div class="dashboard-row">
              <span>💰 Vendues</span>
              <strong>${soldOrders}</strong>
            </div>

            <div class="dashboard-row">
              <span>❌ Refusées</span>
              <strong>${rejectedOrders}</strong>
            </div>

            <div class="dashboard-row">
              <span>↩️ Retournées</span>
              <strong>${returnedOrders}</strong>
            </div>
          </div>

          <div class="branserv-dashboard-panel">
            <h3>🛍️ État du catalogue</h3>

            <div class="dashboard-row">
              <span>Produits actifs</span>
              <strong>${activeProducts}</strong>
            </div>

            <div class="dashboard-row">
              <span>Produits masqués</span>
              <strong>${Math.max(0, totalProducts - activeProducts)}</strong>
            </div>

            <div class="dashboard-row">
              <span>Stock total</span>
              <strong>${totalStock}</strong>
            </div>

            <div class="dashboard-row">
              <span>Stock faible ≤ 5</span>
              <strong class="${
                lowStockProducts.length > 0
                  ? "dashboard-warning"
                  : "dashboard-success"
              }">
                ${lowStockProducts.length}
              </strong>
            </div>
          </div>

          <div class="branserv-dashboard-panel">
            <h3>💰 Résumé financier</h3>

            <div class="dashboard-row">
              <span>Chiffre d'affaires</span>
              <strong>${money(totalRevenue)}</strong>
            </div>

            <div class="dashboard-row">
              <span>Bénéfice</span>
              <strong class="dashboard-success">
                ${money(totalProfit)}
              </strong>
            </div>

            <div class="dashboard-row">
              <span>Nombre de ventes</span>
              <strong>${totalSales}</strong>
            </div>

            <div class="dashboard-row">
              <span>Vente moyenne</span>
              <strong>${money(averageSale)}</strong>
            </div>
          </div>

          <div class="branserv-dashboard-panel">
            <h3>⚠️ Alertes stock</h3>

            ${
              lowStockProducts.length === 0
                ? `
                  <p class="dashboard-success">
                    ✅ Aucun produit avec un stock faible.
                  </p>
                `
                : lowStockProducts
                    .sort(
                      (a, b) =>
                        Number(a.stock || 0) -
                        Number(b.stock || 0)
                    )
                    .slice(0, 8)
                    .map(
                      p => `
                        <div class="dashboard-row">
                          <span>${esc(p.name)}</span>
                          <strong class="dashboard-warning">
                            ${Number(p.stock || 0)}
                          </strong>
                        </div>
                      `
                    )
                    .join("")
            }
          </div>

        </div>
      `;

      const newRefreshButton =
        document.getElementById("refreshDashboard");

      if (newRefreshButton) {
        newRefreshButton.onclick = loadDashboardStats;
      }

      console.log("✅ Dashboard BRANSERV chargé.");
    } catch (error) {
      console.error("❌ Erreur dashboard :", error);

      dashboard.innerHTML = `
        <div class="branserv-dashboard-panel">
          <h2>📊 Tableau de bord</h2>
          <p class="dashboard-warning">
            ❌ Impossible de charger les statistiques.
          </p>
          <p>${esc(error.message || error)}</p>
          <button class="dashboard-refresh"
                  onclick="window.loadBranservDashboard()">
            🔄 Réessayer
          </button>
        </div>
      `;
    }
  }

  window.loadBranservDashboard = loadDashboardStats;

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      loadDashboardStats();
    }, 1500);
  });

})();

// ==================== BRANSERV CLIENTS V1 ====================

// ==================== BRANSERV CLIENTS V1 ====================
(function () {
  "use strict";

  let allBranservCustomers = [];

  function customerEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function customerMoney(value) {
    return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
  }

  async function loadBranservCustomers() {
    const supabase = window.branservSupabase;
    const box = document.getElementById("customersList");

    if (!box) return;

    if (!supabase) {
      box.innerHTML = "<p>❌ Supabase non initialisé.</p>";
      return;
    }

    box.innerHTML = "<p>⏳ Chargement des clients...</p>";

    try {
      const customersResult = await supabase
        .from("customers")
        .select("*")
        .order("id", { ascending: false });

      if (customersResult.error) {
        throw customersResult.error;
      }

      const customers = customersResult.data || [];

      const ordersResult = await supabase
        .from("orders")
        .select("id,customer_id,total,status,created_at")
        .order("created_at", { ascending: false });

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const orders = ordersResult.data || [];

      allBranservCustomers = customers.map(customer => {
        const customerOrders = orders.filter(
          order => Number(order.customer_id) === Number(customer.id)
        );

        const validOrders = customerOrders.filter(order => {
          const status = String(order.status || "").toLowerCase();

          return status !== "rejected" &&
                 status !== "abandoned";
        });

        const totalBought = validOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const lastOrder = customerOrders.length
          ? customerOrders[0]
          : null;

        return {
          ...customer,
          orderCount: validOrders.length,
          totalBought,
          lastOrderDate: lastOrder
            ? lastOrder.created_at
            : null
        };
      });

      renderBranservCustomers();

      const search = document.getElementById("customerSearch");

      if (search && !search.dataset.ready) {
        search.dataset.ready = "1";

        search.addEventListener("input", function () {
          renderBranservCustomers(this.value);
        });
      }

      console.log(
        "✅ Clients chargés :",
        allBranservCustomers.length
      );

    } catch (error) {
      console.error("❌ Erreur clients :", error);

      box.innerHTML = `
        <div style="
          padding:15px;
          border-radius:12px;
          background:#fff3f3;
          color:#b71c1c;
        ">
          ❌ Impossible de charger les clients.<br>
          <small>${customerEscape(error.message || error)}</small>
        </div>
      `;
    }
  }

  function renderBranservCustomers(searchText = "") {
    const box = document.getElementById("customersList");

    if (!box) return;

    const query = String(searchText || "")
      .trim()
      .toLowerCase();

    const filtered = allBranservCustomers.filter(customer => {
      if (!query) return true;

      return (
        String(customer.name || "").toLowerCase().includes(query) ||
        String(customer.phone || "").toLowerCase().includes(query) ||
        String(customer.email || "").toLowerCase().includes(query)
      );
    });

    if (!filtered.length) {
      box.innerHTML = `
        <div style="padding:20px;text-align:center;color:#777;">
          👥 Aucun client trouvé.
        </div>
      `;
      return;
    }

    box.innerHTML = `
      <div style="display:grid;gap:12px;">
        ${filtered.map(customer => {

          const date = customer.lastOrderDate
            ? new Date(customer.lastOrderDate).toLocaleDateString("fr-FR")
            : "Aucune commande";

          return `
            <div style="
              border:1px solid #ddd;
              border-radius:14px;
              padding:15px;
              background:#fff;
            ">

              <div style="
                display:flex;
                justify-content:space-between;
                gap:10px;
                flex-wrap:wrap;
              ">

                <div>
                  <h3 style="margin:0 0 8px;">
                    👤 ${customerEscape(customer.name || "Client sans nom")}
                  </h3>

                  <div style="color:#555;line-height:1.7;">
                    📞 ${customerEscape(customer.phone || "Non renseigné")}<br>
                    📧 ${customerEscape(customer.email || "Non renseigné")}<br>
                    📍 ${customerEscape(customer.address || "Non renseignée")}
                  </div>
                </div>

                <div style="min-width:150px;text-align:right;">
                  <strong>${customerMoney(customer.totalBought)}</strong>

                  <div style="
                    color:#666;
                    font-size:13px;
                    margin-top:5px;
                  ">
                    ${customer.orderCount} commande(s)
                  </div>
                </div>

              </div>

              <div style="
                margin-top:12px;
                padding-top:10px;
                border-top:1px solid #eee;
                color:#666;
                font-size:13px;
              ">
                📅 Dernière commande :
                <strong>${customerEscape(date)}</strong>
              </div>

            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  window.loadBranservCustomers = loadBranservCustomers;
  window.renderBranservCustomers = renderBranservCustomers;

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      loadBranservCustomers();
    }, 1800);
  });

})();



// ============================================================
// BRANSERV CLIENTS V2 - FICHE COMMANDES
// ============================================================

(function () {
  'use strict';

  function bcEscape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function bcMoney(value) {
    return Number(value || 0).toLocaleString('fr-FR') + ' FCFA';
  }

  function bcDate(value) {
    if (!value) return 'Non renseignée';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Non renseignée';
    return d.toLocaleDateString('fr-FR');
  }

  function bcStatus(status) {
    const labels = {
      new: '🆕 Nouvelle',
      pending: '🆕 Nouvelle',
      confirmed: '✅ Confirmée',
      sold: '💰 Vendue',
      delivered: '🚚 Livrée',
      rejected: '❌ Rejetée',
      abandoned: '⚠️ Abandonnée',
      returned: '↩️ Retournée'
    };
    return labels[status] || ('📌 ' + (status || 'Inconnu'));
  }

  // ----------------------------------------------------------
  // Recharge la liste des clients avec leur ID Supabase
  // ----------------------------------------------------------
  window.loadBranservCustomers = async function () {
    const list = document.getElementById('customersList');

    if (!list) return;

    list.innerHTML = '<p>⏳ Chargement des clients...</p>';

    try {
      const sb = window.branservSupabase;

      if (!sb) {
        list.innerHTML = '<p style="color:red;">❌ Client Supabase non disponible.</p>';
        return;
      }

      const customersResult = await sb
        .from('customers')
        .select('*')
        .order('id', { ascending: false });

      if (customersResult.error) {
        throw customersResult.error;
      }

      const ordersResult = await sb
        .from('orders')
        .select('id,customer_id,total,status,created_at,sold_at');

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const customers = customersResult.data || [];
      const orders = ordersResult.data || [];

      const ignoredStatuses = ['rejected', 'abandoned'];

      const ordersByCustomer = {};

      orders.forEach(order => {
        if (ignoredStatuses.includes(order.status)) return;

        const cid = String(order.customer_id || '');

        if (!cid) return;

        if (!ordersByCustomer[cid]) {
          ordersByCustomer[cid] = [];
        }

        ordersByCustomer[cid].push(order);
      });

      window.allBranservCustomers = customers.map(customer => {
        const customerOrders =
          ordersByCustomer[String(customer.id)] || [];

        const totalBought = customerOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        customerOrders.sort(
          (a, b) =>
            new Date(b.created_at || 0) -
            new Date(a.created_at || 0)
        );

        return {
          ...customer,
          orderCount: customerOrders.length,
          totalBought,
          lastOrderDate:
            customerOrders.length
              ? customerOrders[0].created_at
              : null
        };
      });

      window.renderBranservCustomers();

    } catch (error) {
      console.error('Erreur chargement clients:', error);

      list.innerHTML = `
        <div style="
          padding:15px;
          border-radius:12px;
          background:#fff0f0;
          color:#b00020;
        ">
          ❌ Impossible de charger les clients.<br>
          <small>${bcEscape(error.message || error)}</small>
        </div>
      `;
    }
  };


  // ----------------------------------------------------------
  // Affichage des clients
  // ----------------------------------------------------------
  window.renderBranservCustomers = function () {

    const list = document.getElementById('customersList');

    if (!list) return;

    const searchInput =
      document.getElementById('customerSearch');

    const query =
      String(searchInput?.value || '')
        .trim()
        .toLowerCase();

    const customers =
      window.allBranservCustomers || [];

    const filtered = customers.filter(customer => {

      const text = [
        customer.name,
        customer.phone,
        customer.email,
        customer.address
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !query || text.includes(query);
    });

    if (!filtered.length) {
      list.innerHTML = `
        <div style="
          padding:25px;
          text-align:center;
          color:#777;
        ">
          👤 Aucun client trouvé.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(customer => {

      const id = Number(customer.id);

      return `
        <button
          type="button"
          onclick="viewBranservCustomer(${id})"
          style="display:block;width:100%;text-align:left;cursor:pointer;border:1px solid #E7E4EF;background:#fff;border-radius:16px;padding:18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.05);"
        >
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
          ">

            <strong style="font-size:18px;color:#4C1D95;">
              👤 ${bcEscape(customer.name || 'Client')}
            </strong>

            <div style="display:inline-block;background:#F43F5E;color:#fff;padding:8px 12px;border-radius:10px;font-size:13px;font-weight:800;white-space:nowrap;">🟢 TEST FICHE CLIENT</div>

          </div>

          <div style="
            margin-top:12px;
            color:#555;
            line-height:1.7;
          ">
            📞 ${bcEscape(customer.phone || 'Non renseigné')}<br>
            📧 ${bcEscape(customer.email || 'Non renseigné')}<br>
            📍 ${bcEscape(customer.address || 'Non renseignée')}
          </div>

          <div style="
            margin-top:12px;
            padding-top:12px;
            border-top:1px solid #eee;
            text-align:center;
          ">
            <strong style="font-size:18px;">
              ${bcMoney(customer.totalBought)}
            </strong>

            <div style="color:#777;margin-top:4px;">
              ${customer.orderCount || 0} commande(s)
            </div>
          </div>

          <div style="
            margin-top:10px;
            color:#777;
            font-size:13px;
          ">
            📅 Dernière commande :
            ${bcDate(customer.lastOrderDate)}
          </div>

        </button>
      `;

    }).join('');
  };


  // ----------------------------------------------------------
  // Fiche détaillée du client
  // ----------------------------------------------------------
  window.viewBranservCustomer = async function (customerId) {

    try {

      const sb = window.branservSupabase;

      if (!sb) {
        alert('❌ Client Supabase non disponible.');
        return;
      }

      const customerResult = await sb
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerResult.error) {
        throw customerResult.error;
      }

      const customer = customerResult.data;

      const ordersResult = await sb
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const orders = ordersResult.data || [];

      const validOrders = orders.filter(
        order =>
          !['rejected', 'abandoned'].includes(order.status)
      );

      const total = validOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      let ordersHTML = '';

      if (!validOrders.length) {

        ordersHTML = `
          <div style="
            padding:20px;
            text-align:center;
            color:#777;
          ">
            📭 Aucune commande enregistrée.
          </div>
        `;

      } else {

        ordersHTML = '<div>';

        for (const order of validOrders) {

          const itemsResult = await sb
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
            .order('id', { ascending: true });

          const items = itemsResult.data || [];

          const status = String(order.status || '').toLowerCase();

          const canInvoice = true;

          const invoiceHTML = canInvoice
            ? `
              <a
                href="facture.html?id=${encodeURIComponent(order.id)}"
                target="_blank"
                style="
                  display:inline-block;
                  margin-top:12px;
                  padding:10px 14px;
                  background:#4C1D95;
                  color:#fff;
                  border-radius:10px;
                  text-decoration:none;
                  font-weight:700;
                "
              >
                🧾 Ouvrir la facture
              </a>
            `
            : `
              <div style="
                margin-top:12px;
                padding:9px 12px;
                background:#f5f5f5;
                color:#777;
                border-radius:9px;
                font-size:13px;
              ">
                🧾 Facture disponible après validation de la vente
              </div>
            `;

          const itemsHTML = items.length
            ? items.map(item => `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  padding:7px 0;
                  border-bottom:1px solid #eee;
                ">
                  <span>
                    ${bcEscape(item.product_name)}
                    × ${Number(item.quantity || 0)}
                  </span>
                  <strong>
                    ${bcMoney(item.total)}
                  </strong>
                </div>
              `).join('')
            : '<div style="color:#777;">Produits non disponibles</div>';

          ordersHTML += `
            <div style="
              border:1px solid #ddd;
              border-radius:14px;
              padding:15px;
              margin-bottom:12px;
              background:#fff;
            ">

              <div style="
                display:flex;
                justify-content:space-between;
                gap:10px;
                flex-wrap:wrap;
              ">

                <strong>
                  🧾 Commande #${bcEscape(order.id)}
                </strong>

                <span>
                  ${bcStatus(order.status)}
                </span>

              </div>

              <div style="
                color:#777;
                margin:8px 0 12px;
              ">
                📅 ${bcDate(order.created_at)}
              </div>

              ${itemsHTML}

              <div style="
                margin-top:12px;
                padding-top:10px;
                border-top:1px solid #ddd;
                text-align:right;
              ">
                <strong>
                  Total : ${bcMoney(order.total)}
                </strong>
              </div>

              ${invoiceHTML}

            </div>
          `;
        }

        ordersHTML += '</div>';
      }


      // --------------------------------------------------------
      // Modal
      // --------------------------------------------------------
      const oldModal =
        document.getElementById('branservCustomerModal');

      if (oldModal) oldModal.remove();

      const modal = document.createElement('div');

      modal.id = 'branservCustomerModal';

      modal.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99999;
        background:rgba(23,21,33,.72);
        padding:20px;
        overflow:auto;
        box-sizing:border-box;
      `;

      modal.innerHTML = `
        <div style="
          max-width:720px;
          margin:20px auto;
          background:#FAFAFF;
          border-radius:20px;
          overflow:hidden;
          box-shadow:0 15px 50px rgba(0,0,0,.3);
        ">

          <div style="
            background:#111;
            color:#fff;
            padding:20px;
            position:relative;
          ">

            <button
              type="button"
              onclick="document.getElementById('branservCustomerModal').remove()"
              style="
                position:absolute;
                right:15px;
                top:15px;
                border:0;
                background:#F43F5E;
                color:#111;
                width:38px;
                height:38px;
                border-radius:50%;
                font-size:20px;
                font-weight:bold;
              "
            >
              ×
            </button>

            <h2 style="margin:0 45px 8px 0;">
              👤 ${bcEscape(customer.name || 'Client')}
            </h2>

            <div style="line-height:1.7;color:#ddd;">
              📞 ${bcEscape(customer.phone || 'Non renseigné')}<br>
              📧 ${bcEscape(customer.email || 'Non renseigné')}<br>
              📍 ${bcEscape(customer.address || 'Non renseignée')}
            </div>

          </div>

          <div style="padding:20px;">

            <div style="
              display:grid;
              grid-template-columns:1fr 1fr;
              gap:10px;
              margin-bottom:20px;
            ">

              <div style="
                background:#fff;
                border-radius:12px;
                padding:15px;
                text-align:center;
              ">
                <small>💰 Total acheté</small>
                <strong style="
                  display:block;
                  font-size:20px;
                  margin-top:5px;
                ">
                  ${bcMoney(total)}
                </strong>
              </div>

              <div style="
                background:#fff;
                border-radius:12px;
                padding:15px;
                text-align:center;
              ">
                <small>📦 Commandes</small>
                <strong style="
                  display:block;
                  font-size:20px;
                  margin-top:5px;
                ">
                  ${validOrders.length}
                </strong>
              </div>

            </div>

            <h3 style="margin-top:0;">
              🧾 Historique des commandes
            </h3>

            ${ordersHTML}

            <button
              type="button"
              onclick="document.getElementById('branservCustomerModal').remove()"
              style="
                width:100%;
                border:0;
                background:#ffd400;
                color:#111;
                padding:14px;
                border-radius:12px;
                font-size:16px;
                font-weight:bold;
                margin-top:10px;
              "
            >
              Fermer
            </button>

          </div>
        </div>
      `;

      document.body.appendChild(modal);

    } catch (error) {

      console.error('Erreur fiche client:', error);

      alert(
        '❌ Impossible de charger les commandes du client.\n\n' +
        (error.message || error)
      );
    }
  };


  // ----------------------------------------------------------
  // Recherche instantanée
  // ----------------------------------------------------------
  document.addEventListener('input', function (event) {

    if (event.target && event.target.id === 'customerSearch') {
      window.renderBranservCustomers();
    }

  });

  console.log('✅ BRANSERV CLIENTS V2 chargé');

})();

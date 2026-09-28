
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

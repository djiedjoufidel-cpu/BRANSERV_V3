/* ============================================================
   BRANSERV - FACTURE
   LocalStorage + Supabase + téléchargement PDF
   ============================================================ */

const SUPABASE_URL =
  "https://lsaykyehbfgfpoqwsmto.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

let factureOrder = null;
let factureItems = [];

/* ------------------------------------------------------------
   Supabase
------------------------------------------------------------ */
function getSupabaseClient() {
  if (!window.supabase) {
    console.error("❌ SDK Supabase absent");
    return null;
  }

  return window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

/* ------------------------------------------------------------
   ID de commande depuis l'URL
------------------------------------------------------------ */
function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("id") ||
    params.get("orderId") ||
    params.get("order") ||
    params.get("invoice")
  );
}

/* ------------------------------------------------------------
   Recherche locale
------------------------------------------------------------ */
function findLocalOrder(orderId) {
  try {
    const orders =
      JSON.parse(localStorage.getItem("brans_orders") || "[]");

    return orders.find(order =>
      String(order.id) === String(orderId) ||
      String(order.orderNumber) === String(orderId) ||
      String(order.invoice) === String(orderId)
    );
  } catch (error) {
    console.error("Erreur localStorage :", error);
    return null;
  }
}

/* ------------------------------------------------------------
   Recherche Supabase
------------------------------------------------------------ */
async function findSupabaseOrder(orderId) {
  const client = getSupabaseClient();

  if (!client || !orderId) return null;

  console.log("🔎 Recherche commande Supabase :", orderId);

  /* Recherche par ID numérique */
  if (/^\d+$/.test(String(orderId))) {
    const { data, error } = await client
      .from("orders")
      .select("*")
      .eq("id", Number(orderId))
      .maybeSingle();

    if (error) {
      console.error("Erreur recherche orders :", error);
      return null;
    }

    if (data) return data;
  }

  /* Recherche de secours par customer_name/phone
     ou autres valeurs éventuelles */
  const { data, error } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Erreur récupération commandes :", error);
    return null;
  }

  const found = (data || []).find(order =>
    String(order.id) === String(orderId) ||
    String(order.invoice) === String(orderId)
  );

  return found || null;
}

/* ------------------------------------------------------------
   Récupérer les articles Supabase
------------------------------------------------------------ */
async function getSupabaseItems(orderId) {
  const client = getSupabaseClient();

  if (!client || !orderId) return [];

  const { data, error } = await client
    .from("order_items")
    .select("*")
    .eq("order_id", Number(orderId))
    .order("id", { ascending: true });

  if (error) {
    console.error("Erreur order_items :", error);
    return [];
  }

  return data || [];
}

/* ------------------------------------------------------------
   Conversion commande Supabase -> format facture
------------------------------------------------------------ */
function normalizeSupabaseOrder(order, items) {
  return {
    id: order.id,
    orderNumber:
      order.invoice ||
      `BR-${String(order.id).padStart(5, "0")}`,

    customerName:
      order.customer_name || "Client",

    customerPhone:
      order.customer_phone || "",

    customerAddress:
      order.customer_address || "",

    status:
      order.status || "En attente",

    total:
      Number(order.total || 0),

    createdAt:
      order.created_at || new Date().toISOString(),

    soldAt:
      order.sold_at || null,

    items: items.map(item => ({
      name:
        item.product_name || "Produit",

      quantity:
        Number(item.quantity || 1),

      price:
        Number(item.unit_price || 0),

      total:
        Number(
          item.total ||
          (Number(item.quantity || 1) *
           Number(item.unit_price || 0))
        )
    }))
  };
}

/* ------------------------------------------------------------
   Affichage
------------------------------------------------------------ */
function money(value) {
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function renderInvoice(order) {
  const invoiceNumber =
    order.orderNumber ||
    order.invoice ||
    `BR-${order.id || ""}`;

  const invoiceNumberEl =
    document.getElementById("invoiceNumber");

  const invoiceDateEl =
    document.getElementById("invoiceDate");

  const clientInfoEl =
    document.getElementById("clientInfo");

  const deliveryInfoEl =
    document.getElementById("deliveryInfo");

  const itemsEl =
    document.getElementById("items");

  const subtotalEl =
    document.getElementById("subtotal");

  const deliveryFeeEl =
    document.getElementById("deliveryFee");

  const totalEl =
    document.getElementById("total");

  if (invoiceNumberEl)
    invoiceNumberEl.textContent = invoiceNumber;

  if (invoiceDateEl)
    invoiceDateEl.textContent =
      formatDate(order.createdAt || order.soldAt);

  if (clientInfoEl) {
    clientInfoEl.innerHTML = `
      <strong>${order.customerName || "Client"}</strong><br>
      ${order.customerPhone || ""}<br>
      ${order.customerAddress || ""}
    `;
  }

  if (deliveryInfoEl) {
    deliveryInfoEl.innerHTML = `
      ${order.customerAddress || "Adresse non renseignée"}
    `;
  }

  const items =
    order.items ||
    order.products ||
    [];

  if (itemsEl) {
    itemsEl.innerHTML = "";

    items.forEach(item => {
      const quantity = Number(item.quantity || 1);
      const price = Number(item.price || item.unit_price || 0);
      const total =
        Number(item.total || (quantity * price));

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${item.name || item.product_name || "Produit"}</td>
        <td>${quantity}</td>
        <td>${money(price)}</td>
        <td>${money(total)}</td>
      `;

      itemsEl.appendChild(row);
    });
  }

  const subtotal =
    items.reduce((sum, item) => {
      return sum +
        Number(
          item.total ||
          (
            Number(item.quantity || 1) *
            Number(item.price || item.unit_price || 0)
          )
        );
    }, 0);

  const total =
    Number(order.total || subtotal);

  const deliveryFee =
    Math.max(0, total - subtotal);

  if (subtotalEl)
    subtotalEl.textContent = money(subtotal);

  if (deliveryFeeEl)
    deliveryFeeEl.textContent = money(deliveryFee);

  if (totalEl)
    totalEl.textContent = money(total);
}

/* ------------------------------------------------------------
   Chargement facture
------------------------------------------------------------ */
async function loadInvoice() {
  const orderId = getOrderIdFromUrl();

  console.log("🧾 ID facture :", orderId);

  if (!orderId) {
    showNotFound();
    return;
  }

  /* 1. LocalStorage */
  const localOrder = findLocalOrder(orderId);

  if (localOrder) {
    console.log("✅ Commande trouvée dans localStorage");

    factureOrder = localOrder;

    factureItems =
      localOrder.items ||
      localOrder.products ||
      [];

    renderInvoice(localOrder);
    showInvoice();
    return;
  }

  /* 2. Supabase */
  console.log("☁️ Recherche dans Supabase...");

  const supabaseOrder =
    await findSupabaseOrder(orderId);

  if (!supabaseOrder) {
    console.error("❌ Commande introuvable");
    showNotFound();
    return;
  }

  const items =
    await getSupabaseItems(supabaseOrder.id);

  console.log(
    "✅ Commande Supabase trouvée :",
    supabaseOrder
  );

  console.log(
    "📦 Articles :",
    items
  );

  const normalized =
    normalizeSupabaseOrder(
      supabaseOrder,
      items
    );

  factureOrder = normalized;
  factureItems = normalized.items;

  renderInvoice(normalized);
  showInvoice();
}

/* ------------------------------------------------------------
   États interface
------------------------------------------------------------ */
function showInvoice() {
  const facture =
    document.getElementById("facture");

  const returnedBanner =
    document.getElementById("returnedBanner");

  if (facture)
    facture.style.display = "";

  if (returnedBanner &&
      factureOrder &&
      factureOrder.status === "returned") {
    returnedBanner.style.display = "";
  }
}

function showNotFound() {
  const facture =
    document.getElementById("facture");

  if (facture)
    facture.style.display = "none";

  const button =
    document.getElementById("pdfButton");

  if (button)
    button.style.display = "none";

  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <div id="invoiceError"
      style="
        padding:30px;
        text-align:center;
        font-family:Arial,sans-serif;
      ">
      <h2>❌ Facture introuvable</h2>
      <p>
        Cette commande n'existe pas dans les données
        disponibles.
      </p>
      <a href="index.html">
        ← Retour
      </a>
    </div>
    `
  );
}

/* ------------------------------------------------------------
   Téléchargement PDF
------------------------------------------------------------ */
window.downloadInvoice = async function () {

  if (!window.html2pdf) {
    alert(
      "❌ Le générateur PDF n'est pas chargé."
    );
    return;
  }

  const facture =
    document.getElementById("facture");

  const button =
    document.getElementById("pdfButton");

  if (!facture) {
    alert("❌ Zone facture introuvable.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent =
      "⏳ Génération du PDF...";
  }

  try {

    const number =
      factureOrder?.orderNumber ||
      factureOrder?.id ||
      "BRANSERV";

    const options = {
      margin: 0,
      filename:
        `Facture-BRANSERV-${number}.pdf`,

      image: {
        type: "jpeg",
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },

      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait"
      }
    };

    await html2pdf()
      .set(options)
      .from(facture)
      .save();

    if (button) {
      button.textContent =
        "✅ PDF téléchargé";
    }

  } catch (error) {

    console.error(
      "Erreur génération PDF :",
      error
    );

    alert(
      "❌ Impossible de générer le PDF."
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        "📄 Télécharger la facture PDF";
    }
  }
};

/* ------------------------------------------------------------
   Démarrage
------------------------------------------------------------ */
document.addEventListener(
  "DOMContentLoaded",
  loadInvoice
);

/* =========================================================
   BRANSERV — GESTION DES COMMANDES
   Supabase + Admin
   ========================================================= */

const SUPABASE_URL =
  window.BRANSERV_SUPABASE_URL ||
  "https://lsaykyehbfgfpoqwsmto.supabase.co";

const SUPABASE_KEY =
  window.BRANSERV_SUPABASE_KEY ||
  "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

let supabaseClient = null;
let allOrders = [];
let currentFilter = "all";

const STATUS = {
  new: ["🟡 Nouvelle", "status-new"],
  confirmed: ["🔵 Confirmée", "status-confirmed"],
  sold: ["🟢 Vendue", "status-sold"],
  returned: ["↩️ Retournée", "status-returned"],
  rejected: ["🔴 Rejetée", "status-rejected"],
  abandoned: ["⚫ Abandonnée", "status-abandoned"]
};

function getClient() {
  if (window.branservSupabase) {
    return window.branservSupabase;
  }

  if (!supabaseClient) {
    if (!window.supabase) {
      throw new Error("Bibliothèque Supabase non chargée.");
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  }

  return supabaseClient;
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

function dateText(value) {
  if (!value) return "Date inconnue";

  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function safe(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function orderNumber(order) {
  const year = order.created_at
    ? new Date(order.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    "BR-" +
    year +
    "-" +
    String(order.id).padStart(6, "0")
  );
}

/* =========================================================
   CHARGEMENT SUPABASE
   ========================================================= */

async function loadOrdersFromSupabase() {

  const client = getClient();

  const {
    data: orders,
    error: ordersError
  } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Erreur chargement commandes :", ordersError);
    throw ordersError;
  }

  const {
    data: items,
    error: itemsError
  } = await client
    .from("order_items")
    .select("*")
    .order("id", { ascending: true });

  if (itemsError) {
    console.error("Erreur chargement articles :", itemsError);
    throw itemsError;
  }

  const itemMap = {};

  (items || []).forEach(item => {

    const key = String(item.order_id);

    if (!itemMap[key]) {
      itemMap[key] = [];
    }

    itemMap[key].push({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name,
      name: item.product_name,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0),
      price: Number(item.unit_price || 0),
      purchasePrice: Number(item.purchase_price || 0),
      total: Number(item.total || 0)
    });
  });

  allOrders = (orders || []).map(order => {

    const itemsForOrder =
      itemMap[String(order.id)] || [];

    return {
      ...order,

      id: Number(order.id),

      orderNumber: orderNumber(order),

      customer: {
        id: order.customer_id,
        name: order.customer_name || "",
        phone: order.customer_phone || "",
        address: order.customer_address || ""
      },

      total: Number(order.total || 0),

      costTotal: Number(order.cost_total || 0),

      profit: Number(order.profit || 0),

      invoice: Boolean(order.invoice),

      items: itemsForOrder
    };
  });

  console.log(
    "✅ Commandes Supabase chargées :",
    allOrders.length
  );

  renderOrders();

  return allOrders;
}

/* =========================================================
   AFFICHAGE
   ========================================================= */

function statusHTML(status) {

  const info =
    STATUS[status] ||
    ["⚪ Inconnu", ""];

  return `
    <span class="status ${info[1]}">
      ${info[0]}
    </span>
  `;
}

function renderOrders() {

  const container =
    document.getElementById("ordersList");

  if (!container) {
    console.error(
      "❌ Élément #ordersList introuvable."
    );
    return;
  }

  const searchElement =
    document.getElementById("search");

  const search =
    searchElement
      ? searchElement.value.toLowerCase().trim()
      : "";

  let orders = [...allOrders];

  if (currentFilter !== "all") {
    orders = orders.filter(
      order => order.status === currentFilter
    );
  }

  if (search) {

    orders = orders.filter(order => {

      const number =
        orderNumber(order).toLowerCase();

      const name =
        String(
          order.customer_name || ""
        ).toLowerCase();

      const phone =
        String(
          order.customer_phone || ""
        ).toLowerCase();

      return (
        number.includes(search) ||
        name.includes(search) ||
        phone.includes(search)
      );
    });
  }

  if (!orders.length) {

    container.innerHTML = `
      <div class="empty-orders">
        <h3>📦 Aucune commande</h3>
        <p>
          Aucune commande ne correspond
          aux critères actuels.
        </p>
      </div>
    `;

    updateNewAlert();
    return;
  }

  container.innerHTML = orders.map(order => {

    const customer = order.customer || {};

    const items =
      Array.isArray(order.items)
        ? order.items
        : [];

    const itemsHTML =
      items.map(item => `
        <div class="order-item">
          <span>
            ${safe(item.productName)}
            × ${Number(item.quantity || 0)}
          </span>

          <strong>
            ${money(item.total)}
          </strong>
        </div>
      `).join("");

    let buttons = "";

    if (order.status === "new") {

      buttons = `
        <button
          class="btn-confirm"
          onclick="confirmOrder(${order.id})">
          ✅ Valider la commande
        </button>

        <button
          class="btn-reject"
          onclick="rejectOrder(${order.id})">
          ❌ Rejeter
        </button>
      `;
    }

    else if (order.status === "confirmed") {

      buttons = `
        <button
          class="btn-sold"
          onclick="sellOrder(${order.id})">
          💰 Marquer comme vendue
        </button>

        <button
          class="btn-reject"
          onclick="rejectOrder(${order.id})">
          ❌ Rejeter
        </button>
      `;
    }

    else if (order.status === "sold") {

      buttons = `
        <a
          class="btn-invoice"
          href="facture.html?id=${encodeURIComponent(order.id)}">
          🧾 Voir / télécharger facture
        </a>

        <button
          class="btn-return"
          onclick="returnOrder(${order.id})">
          ↩️ Retour produit
        </button>
      `;
    }

    else if (order.status === "returned") {

      buttons = `
        <span class="returned-info">
          ↩️ Produit retourné
        </span>
      `;
    }

    else {

      buttons = `
        <span class="order-finished">
          Commande terminée
        </span>
      `;
    }

    return `
      <article class="order-card">

        <div class="order-header">

          <div>
            <h3>
              📦 ${safe(orderNumber(order))}
            </h3>

            <small>
              ${dateText(order.created_at)}
            </small>
          </div>

          <div>
            ${statusHTML(order.status)}
          </div>

        </div>

        <div class="customer-info">

          <h4>👤 Client</h4>

          <p>
            <strong>${safe(customer.name)}</strong>
          </p>

          <p>
            📞 ${safe(customer.phone)}
          </p>

          ${
            customer.address
              ? `<p>📍 ${safe(customer.address)}</p>`
              : ""
          }

        </div>

        <div class="order-items">

          <h4>🛍️ Produits</h4>

          ${
            itemsHTML ||
            "<p>Aucun article enregistré.</p>"
          }

        </div>

        <div class="order-total">

          <span>Total</span>

          <strong>
            ${money(order.total)}
          </strong>

        </div>

        ${
          order.status === "sold"
            ? `
              <div class="profit-info">

                <span>
                  Coût d'achat :
                  ${money(order.cost_total)}
                </span>

                <span>
                  Bénéfice :
                  ${money(order.profit)}
                </span>

              </div>
            `
            : ""
        }

        <div class="order-actions">
          ${buttons}
        </div>

      </article>
    `;

  }).join("");

  updateNewAlert();
}

/* =========================================================
   ALERTES
   ========================================================= */

function updateNewAlert() {

  const element =
    document.getElementById("newAlert");

  if (!element) return;

  const count =
    allOrders.filter(
      order => order.status === "new"
    ).length;

  element.innerHTML =
    count > 0
      ? `
        <div class="new-order-alert">
          🔔 ${count}
          nouvelle${count > 1 ? "s" : ""}
          commande${count > 1 ? "s" : ""}
        </div>
      `
      : "";
}

/* =========================================================
   FILTRES
   ========================================================= */

function setFilter(filter, button) {

  currentFilter = filter;

  document
    .querySelectorAll(".filters button")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }

  renderOrders();
}

/* =========================================================
   TROUVER UNE COMMANDE
   ========================================================= */

function findOrder(id) {

  return allOrders.find(
    order => String(order.id) === String(id)
  );
}

/* =========================================================
   CONFIRMER
   ========================================================= */

async function confirmOrder(id) {

  const order = findOrder(id);

  if (!order) {
    alert("❌ Commande introuvable.");
    return;
  }

  if (order.status !== "new") {
    alert(
      "⚠️ Cette commande n'est plus nouvelle."
    );
    return;
  }

  if (
    !confirm(
      "Valider cette commande ?"
    )
  ) {
    return;
  }

  try {

    const client = getClient();

    const { error } =
      await client
        .from("orders")
        .update({
          status: "confirmed"
        })
        .eq("id", order.id);

    if (error) throw error;

    order.status = "confirmed";

    renderOrders();

    alert("✅ Commande validée.");

  } catch (error) {

    console.error(error);

    alert(
      "❌ Impossible de valider la commande.\n\n" +
      error.message
    );
  }
}

/* =========================================================
   REJETER
   ========================================================= */

async function rejectOrder(id) {

  const order = findOrder(id);

  if (!order) {
    alert("❌ Commande introuvable.");
    return;
  }

  if (
    !confirm(
      "Rejeter cette commande ?"
    )
  ) {
    return;
  }

  try {

    const client = getClient();

    const { error } =
      await client
        .from("orders")
        .update({
          status: "rejected"
        })
        .eq("id", order.id);

    if (error) throw error;

    order.status = "rejected";

    renderOrders();

    alert("❌ Commande rejetée.");

  } catch (error) {

    console.error(error);

    alert(
      "❌ Erreur lors du rejet.\n\n" +
      error.message
    );
  }
}

/* =========================================================
   VENDRE
   ========================================================= */

async function sellOrder(id) {

  const order = findOrder(id);

  if (!order) {
    alert("❌ Commande introuvable.");
    return;
  }

  if (
    order.status !== "new" &&
    order.status !== "confirmed"
  ) {
    alert(
      "⚠️ Cette commande ne peut plus être vendue."
    );
    return;
  }

  if (!order.items.length) {
    alert(
      "❌ Cette commande ne contient aucun produit."
    );
    return;
  }

  const client = getClient();

  try {

    /*
      Vérification des produits et du stock
    */

    const productIds =
      order.items
        .map(item => Number(item.productId))
        .filter(Boolean);

    const {
      data: products,
      error: productsError
    } = await client
      .from("products")
      .select(
        "id,name,stock,purchase_price,active"
      )
      .in("id", productIds);

    if (productsError) {
      throw productsError;
    }

    if (!products || !products.length) {
      throw new Error(
        "Produits de la commande introuvables."
      );
    }

    let costTotal = 0;

    for (const item of order.items) {

      const product =
        products.find(
          p =>
            Number(p.id) ===
            Number(item.productId)
        );

      if (!product) {

        throw new Error(
          "Produit introuvable : " +
          item.productName
        );
      }

      const quantity =
        Number(item.quantity || 0);

      const stock =
        Number(product.stock || 0);

      if (stock < quantity) {

        throw new Error(
          `Stock insuffisant pour "${product.name}".\n` +
          `Stock disponible : ${stock}\n` +
          `Demandé : ${quantity}`
        );
      }

      const purchasePrice =
        Number(
          product.purchase_price || 0
        );

      costTotal +=
        purchasePrice * quantity;
    }

    if (
      !confirm(
        "Confirmer que cette commande est vendue ?\n\n" +
        "Le stock sera diminué."
      )
    ) {
      return;
    }

    /*
      Mise à jour du stock
    */

    for (const item of order.items) {

      const product =
        products.find(
          p =>
            Number(p.id) ===
            Number(item.productId)
        );

      const quantity =
        Number(item.quantity || 0);

      const newStock =
        Number(product.stock || 0) -
        quantity;

      const { error } =
        await client
          .from("products")
          .update({
            stock: newStock
          })
          .eq("id", product.id);

      if (error) {
        throw error;
      }

      item.purchasePrice =
        Number(
          product.purchase_price || 0
        );
    }

    const total =
      Number(order.total || 0);

    const profit =
      total - costTotal;

    /*
      Enregistrement des ventes
    */

    for (const item of order.items) {

      const product =
        products.find(
          p =>
            Number(p.id) ===
            Number(item.productId)
        );

      const quantity =
        Number(item.quantity || 0);

      const purchasePrice =
        Number(
          product.purchase_price || 0
        );

      const saleTotal =
        Number(item.unitPrice || 0) *
        quantity;

      const saleProfit =
        saleTotal -
        purchasePrice * quantity;

      const { error } =
        await client
          .from("sales")
          .insert({
            order_id: order.id,
            product_id: product.id,
            product_name: product.name,
            quantity: quantity,
            sale_price: Number(item.unitPrice || 0),
            purchase_price: purchasePrice,
            total: saleTotal,
            profit: saleProfit,
            status: "sold",
            sold_at: new Date().toISOString()
          });

      if (error) {
        throw error;
      }
    }

    /*
      Mise à jour commande
    */

    const { error: orderError } =
      await client
        .from("orders")
        .update({
          status: "sold",
          cost_total: costTotal,
          profit: profit,
          invoice: true,
          sold_at: new Date().toISOString()
        })
        .eq("id", order.id);

    if (orderError) {
      throw orderError;
    }

    order.status = "sold";
    order.cost_total = costTotal;
    order.profit = profit;
    order.invoice = true;
    order.sold_at = new Date().toISOString();

    renderOrders();

    alert(
      "✅ VENTE ENREGISTRÉE\n\n" +
      "Chiffre d'affaires : " +
      money(total) +
      "\nCoût d'achat : " +
      money(costTotal) +
      "\nBénéfice : " +
      money(profit)
    );

  } catch (error) {

    console.error(
      "Erreur vente :",
      error
    );

    alert(
      "❌ Impossible d'enregistrer la vente.\n\n" +
      error.message
    );

    await loadOrdersFromSupabase();
  }
}

/* =========================================================
   RETOUR
   ========================================================= */

async function returnOrder(id) {

  const order = findOrder(id);

  if (!order) {
    alert("❌ Commande introuvable.");
    return;
  }

  if (order.status !== "sold") {
    alert(
      "⚠️ Seule une commande vendue peut être retournée."
    );
    return;
  }

  const reason =
    prompt(
      "Motif du retour :",
      "Retour produit"
    );

  if (reason === null) {
    return;
  }

  if (
    !confirm(
      "Confirmer le retour ?\n\n" +
      "Le stock sera restauré."
    )
  ) {
    return;
  }

  const client = getClient();

  try {

    /*
      Récupérer les produits
    */

    const productIds =
      order.items
        .map(item => Number(item.productId))
        .filter(Boolean);

    const {
      data: products,
      error: productsError
    } = await client
      .from("products")
      .select("id,name,stock")
      .in("id", productIds);

    if (productsError) {
      throw productsError;
    }

    /*
      Restaurer le stock
    */

    for (const item of order.items) {

      const product =
        products.find(
          p =>
            Number(p.id) ===
            Number(item.productId)
        );

      if (!product) {
        throw new Error(
          "Produit introuvable : " +
          item.productName
        );
      }

      const newStock =
        Number(product.stock || 0) +
        Number(item.quantity || 0);

      const { error } =
        await client
          .from("products")
          .update({
            stock: newStock
          })
          .eq("id", product.id);

      if (error) {
        throw error;
      }
    }

    /*
      Marquer les ventes comme retournées
    */

    const { error: salesError } =
      await client
        .from("sales")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
          return_reason: reason
        })
        .eq("order_id", order.id);

    if (salesError) {
      throw salesError;
    }

    /*
      Mise à jour commande
    */

    const { error: orderError } =
      await client
        .from("orders")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
          return_reason: reason
        })
        .eq("id", order.id);

    if (orderError) {
      throw orderError;
    }

    order.status = "returned";
    order.returned_at = new Date().toISOString();
    order.return_reason = reason;

    renderOrders();

    alert(
      "↩️ Retour enregistré.\n\n" +
      "Le stock a été restauré."
    );

  } catch (error) {

    console.error(
      "Erreur retour :",
      error
    );

    alert(
      "❌ Impossible d'enregistrer le retour.\n\n" +
      error.message
    );

    await loadOrdersFromSupabase();
  }
}

/* =========================================================
   INITIALISATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const search =
      document.getElementById("search");

    if (search) {
      search.addEventListener(
        "input",
        renderOrders
      );
    }

    try {

      await loadOrdersFromSupabase();

    } catch (error) {

      console.error(error);

      const container =
        document.getElementById("ordersList");

      if (container) {
        container.innerHTML = `
          <div class="empty-orders">

            <h3>
              ❌ Impossible de charger les commandes
            </h3>

            <p>
              ${safe(error.message)}
            </p>

          </div>
        `;
      }
    }
  }
);

/* =========================================================
   EXPORTS
   ========================================================= */

window.loadOrdersFromSupabase =
  loadOrdersFromSupabase;

window.renderOrders =
  renderOrders;

window.setFilter =
  setFilter;

window.confirmOrder =
  confirmOrder;

window.rejectOrder =
  rejectOrder;

window.sellOrder =
  sellOrder;

window.returnOrder =
  returnOrder;

/* ============================================================
   BRANSERV - CREATION COMMANDE
   Supabase + LocalStorage + WhatsApp
   ============================================================ */

const BRANSERV_SUPABASE_URL =
  "https://lsaykyehbfgfpoqwsmto.supabase.co";

const BRANSERV_SUPABASE_KEY =
  "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

const ORDERS_KEY = "brans_orders";

let branservSupabase = null;

/* ============================================================
   SUPABASE
   ============================================================ */

function getBranservSupabase() {
  if (!window.supabase) {
    throw new Error("Le SDK Supabase n'est pas chargé.");
  }

  if (!branservSupabase) {
    branservSupabase = window.supabase.createClient(
      BRANSERV_SUPABASE_URL,
      BRANSERV_SUPABASE_KEY
    );
  }

  return branservSupabase;
}

/* ============================================================
   RESUME COMMANDE
   ============================================================ */

function renderOrderSummary() {
  const box = document.getElementById("orderSummary");

  if (!box) return;

  const cart = getCart();
  const products = getProducts();

  let total = 0;

  cart.forEach(item => {
    const product = products.find(
      p => String(p.id) === String(item.id)
    );

    if (product) {
      total +=
        Number(product.price || 0) *
        Number(item.quantity || 0);
    }
  });

  box.innerHTML = `
    <div class="summary">
      <h3>Résumé</h3>

      <p>
        Articles :
        ${cart.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        )}
      </p>

      <p>
        <strong>Total : ${money(total)}</strong>
      </p>
    </div>
  `;
}

/* ============================================================
   SAUVEGARDE LOCALE DE SECOURS
   ============================================================ */

function getLocalOrders() {
  try {
    const data = localStorage.getItem(ORDERS_KEY);

    if (!data) return [];

    const orders = JSON.parse(data);

    return Array.isArray(orders)
      ? orders
      : [];

  } catch (error) {
    console.error(
      "Erreur lecture commandes locales :",
      error
    );

    return [];
  }
}

function saveLocalOrder(order) {
  const orders = getLocalOrders();

  orders.push(order);

  localStorage.setItem(
    ORDERS_KEY,
    JSON.stringify(orders)
  );
}

/* ============================================================
   CLIENT
   IMPORTANT :
   Aucun SELECT sur customers pour un visiteur.
   La RPC crée le client de façon sécurisée.
   ============================================================ */

async function createCustomerForOrder({
  name,
  phone,
  email,
  address
}) {
  const supabase = getBranservSupabase();

  const {
    data: customerId,
    error
  } = await supabase.rpc(
    "create_customer_for_order",
    {
      p_name: name,
      p_phone: phone,
      p_email: email || null,
      p_address: address || null
    }
  );

  if (error) {
    console.error(
      "Erreur création client :",
      error
    );

    throw new Error(
      "Impossible d'enregistrer le client : " +
      error.message
    );
  }

  if (!customerId) {
    throw new Error(
      "Supabase n'a pas retourné l'identifiant du client."
    );
  }

  return Number(customerId);
}

/* ============================================================
   CREATION COMMANDE SUPABASE
   ============================================================ */

async function createSupabaseOrder({
  customerId,
  customer,
  items,
  total
}) {
  const supabase = getBranservSupabase();

  /* ----------------------------------------------------------
     1. Création de la commande
     ---------------------------------------------------------- */

  const {
    data: order,
    error: orderError
  } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address || null,

      status: "new",

      total: Number(total),

      cost_total: 0,
      profit: 0,

      invoice: false
    })
    .select()
    .single();

  if (orderError) {
    console.error(
      "Erreur création commande :",
      orderError
    );

    throw new Error(
      "Impossible d'enregistrer la commande : " +
      orderError.message
    );
  }

  /* ----------------------------------------------------------
     2. Articles de la commande
     ---------------------------------------------------------- */

  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: Number(item.productId),
    product_name: item.productName,
    quantity: Number(item.quantity),
    unit_price: Number(item.unitPrice),
    purchase_price: Number(item.purchasePrice || 0),
    total: Number(item.lineTotal)
  }));

  const {
    error: itemsError
  } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) {
    console.error(
      "Erreur articles :",
      itemsError
    );

    throw new Error(
      "Impossible d'enregistrer les articles : " +
      itemsError.message
    );
  }

  return order;
}

/* ============================================================
   ENVOI DE LA COMMANDE
   ============================================================ */

async function submitOrder() {

  const cart = getCart();

  if (!cart.length) {
    alert("Votre panier est vide.");
    return;
  }

  /* ----------------------------------------------------------
     Informations client
     ---------------------------------------------------------- */

  const name =
    document
      .getElementById("customerName")
      ?.value
      ?.trim() || "";

  const phone =
    document
      .getElementById("customerPhone")
      ?.value
      ?.trim() || "";

  if (!name || !phone) {
    alert(
      "Veuillez renseigner votre nom et votre téléphone."
    );

    return;
  }

  /* ----------------------------------------------------------
     Produits
     ---------------------------------------------------------- */

  const products = getProducts();

  const items = [];

  let subtotal = 0;

  for (const cartItem of cart) {

    const product =
      products.find(
        p =>
          String(p.id) ===
          String(cartItem.id)
      );

    if (!product) {
      alert(
        "Le produit \"" +
        (cartItem.name || "inconnu") +
        "\" n'existe plus."
      );

      return;
    }

    const quantity =
      Number(cartItem.quantity || 0);

    const stock =
      Number(product.stock || 0);

    if (quantity <= 0) {
      alert(
        "Quantité invalide pour : " +
        product.name
      );

      return;
    }

    if (quantity > stock) {
      alert(
        "Stock insuffisant pour : " +
        product.name +
        "\nStock disponible : " +
        stock
      );

      return;
    }

    const unitPrice =
      Number(product.price || 0);

    const purchasePrice =
      Number(product.purchase_price || 0);

    const lineTotal =
      unitPrice * quantity;

    items.push({
      productId: product.id,

      productName:
        product.name,

      quantity,

      unitPrice,

      purchasePrice,

      lineTotal
    });

    subtotal += lineTotal;
  }

  /* ----------------------------------------------------------
     Livraison / adresse
     ---------------------------------------------------------- */

  const delivery =
    document
      .getElementById("delivery")
      ?.value || "";

  const comment =
    document
      .getElementById("comment")
      ?.value
      ?.trim() || "";

  const city =
    document
      .getElementById("city")
      ?.value
      ?.trim() || "";

  const district =
    document
      .getElementById("district")
      ?.value
      ?.trim() || "";

  const address =
    document
      .getElementById("address")
      ?.value
      ?.trim() || "";

  const fullAddress =
    [address, district, city]
      .filter(Boolean)
      .join(", ");

  /* Pour l'instant livraison gratuite */
  const deliveryFee = 0;

  const total =
    subtotal + deliveryFee;

  /* ----------------------------------------------------------
     ENREGISTREMENT
     ---------------------------------------------------------- */

  try {

    console.log(
      "☁️ Création du client..."
    );

    const customerId =
      await createCustomerForOrder({
        name,
        phone,
        email: "",
        address: fullAddress
      });

    console.log(
      "✅ Client créé :",
      customerId
    );

    console.log(
      "☁️ Création de la commande..."
    );

    const supabaseOrder =
      await createSupabaseOrder({
        customerId,

        customer: {
          name,
          phone,
          address: fullAddress
        },

        items,

        total
      });

    console.log(
      "✅ Commande Supabase :",
      supabaseOrder.id
    );

    /* --------------------------------------------------------
       NUMERO DE COMMANDE
       -------------------------------------------------------- */

    const orderNumber =
      "BR-" +
      new Date().getFullYear() +
      "-" +
      String(
        supabaseOrder.id
      ).padStart(6, "0");

    /* --------------------------------------------------------
       COMMANDE LOCALE DE COMPATIBILITE
       -------------------------------------------------------- */

    const order = {

      id:
        supabaseOrder.id,

      orderNumber,

      createdAt:
        supabaseOrder.created_at ||
        new Date().toISOString(),

      customer: {
        name,
        phone,
        city,
        district,
        address
      },

      delivery,

      comment,

      items,

      subtotal,

      deliveryFee,

      total,

      status: "new",

      invoice: false,

      supabaseId:
        supabaseOrder.id,

      customerId
    };

    saveLocalOrder(order);

    /* --------------------------------------------------------
       WHATSAPP
       -------------------------------------------------------- */

    let message =
      "Bonjour BRANSERV 👋\n\n" +

      "Nouvelle commande : " +
      orderNumber +
      "\n\n" +

      "Client : " +
      name +
      "\n" +

      "Téléphone : " +
      phone +
      "\n";

    items.forEach(item => {

      message +=
        "- " +
        item.productName +
        " x" +
        item.quantity +
        " = " +
        money(item.lineTotal) +
        "\n";

    });

    message +=
      "\nTotal : " +
      money(total) +
      "\nStatut : Nouvelle";

    if (delivery) {
      message +=
        "\nLivraison : " +
        delivery;
    }

    if (fullAddress) {
      message +=
        "\nAdresse : " +
        fullAddress;
    }

    if (comment) {
      message +=
        "\nCommentaire : " +
        comment;
    }

    /* --------------------------------------------------------
       Vider le panier uniquement après réussite Supabase
       -------------------------------------------------------- */

    localStorage.removeItem(
      "branserv_cart"
    );

    alert(
      "✅ Commande enregistrée !\n\n" +
      "Numéro : " +
      orderNumber +
      "\n\n" +
      "La commande est maintenant enregistrée dans BRANSERV."
    );

    /* --------------------------------------------------------
       WhatsApp
       -------------------------------------------------------- */

    window.location.href =
      "https://wa.me/" +
      WHATSAPP +
      "?text=" +
      encodeURIComponent(message);

  } catch (error) {

    console.error(
      "❌ ERREUR COMMANDE :",
      error
    );

    alert(
      "❌ La commande n'a pas pu être enregistrée.\n\n" +
      (error?.message || error)
    );
  }
}

/* ============================================================
   EXPOSITION
   ============================================================ */

window.submitOrder = submitOrder;
window.renderOrderSummary = renderOrderSummary;

/* ============================================================
   DEMARRAGE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  renderOrderSummary
);

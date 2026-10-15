const crypto = require("crypto");
const webpush = require("web-push");

const SUPABASE_URL =
process.env.SUPABASE_URL ||
"https://lsaykyehbfgfpoqwsmto.supabase.co";

module.exports = async function handler(req, res) {
res.setHeader("Cache-Control", "no-store");

if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({ error: "Méthode non autorisée." });
}

const secret = process.env.PUSH_WEBHOOK_SECRET;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (!secret || !serviceKey || !publicKey || !privateKey || !subject) {
console.error("Configuration webhook push incomplète.");
return res.status(500).json({ error: "Configuration serveur incomplète." });
}

const received = req.headers["x-branserv-secret"];
const expectedBuffer = Buffer.from(secret, "utf8");
const receivedBuffer = Buffer.from(
  typeof received === "string" ? received : "",
  "utf8"
);

if (
  typeof received !== "string" ||
  receivedBuffer.length !== expectedBuffer.length ||
  !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
) {
  return res.status(401).json({ error: "Accès non autorisé." });
}

try {
let payload = req.body || {};
if (typeof payload === "string") {
payload = JSON.parse(payload);
}

if (payload.type && payload.type !== "INSERT") {
  return res.status(200).json({ success: true, ignored: true });
}

if (payload.table && payload.table !== "orders") {
  return res.status(400).json({ error: "Événement non pris en charge." });
}

const order = payload.record || payload.new || payload;

if (!order.id) {
  return res.status(400).json({ error: "Commande absente de l'événement." });
}

if (order.status && order.status !== "new") {
  return res.status(200).json({ success: true, ignored: true });
}

const response = await fetch(
  `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,subscription`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  }
);

if (!response.ok) {
  console.error("Lecture abonnements impossible :", response.status);
  return res.status(500).json({ error: "Impossible de récupérer les abonnements." });
}

const subscriptions = await response.json();
webpush.setVapidDetails(subject, publicKey, privateKey);

const customerName = String(order.customer_name || "Un client").slice(0, 100);
let sent = 0;
let failed = 0;

for (const item of subscriptions) {
  try {
    await webpush.sendNotification(
      item.subscription,
      JSON.stringify({
        title: "Nouvelle commande BRANSERV",
        body: `Commande de ${customerName}`,
        url: "/commandes.html",
        tag: `branserv-order-${order.id}`
      })
    );
    sent++;
  } catch (error) {
    failed++;
    console.error("Échec d'une notification push :", error.statusCode || error.message);

    if (error.statusCode === 404 || error.statusCode === 410) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${item.id}`,
        {
          method: "DELETE",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`
          }
        }
      );
    }
  }
}

return res.status(200).json({
  success: true,
  orderId: order.id,
  sent,
  failed,
  total: subscriptions.length
});

} catch (error) {
console.error("Erreur webhook push :", error.message);
return res.status(500).json({ error: "Erreur lors de l'envoi des notifications." });
}
};

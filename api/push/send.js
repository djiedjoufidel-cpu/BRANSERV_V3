const webpush = require("web-push");

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  "https://lsaykyehbfgfpoqwsmto.supabase.co";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!SERVICE_KEY || !publicKey || !privateKey || !subject) {
    return res.status(500).json({
      error: "Configuration serveur incomplète."
    });
  }

  const match = (req.headers.authorization || "")
    .match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: "Session requise." });
  }

  try {
    const token = match[1];

    const authResponse = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!authResponse.ok) {
      return res.status(401).json({ error: "Session invalide." });
    }

    const user = await authResponse.json();

    const adminResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/admin_users?user_id=eq.${encodeURIComponent(user.id)}&select=user_id&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`
        }
      }
    );

    if (!adminResponse.ok) {
      return res.status(500).json({
        error: "Vérification administrateur impossible."
      });
    }

    const admins = await adminResponse.json();

    if (!Array.isArray(admins) || admins.length === 0) {
      return res.status(403).json({
        error: "Accès réservé aux administrateurs."
      });
    }

    const body = req.body || {};
    const title = typeof body.title === "string"
      ? body.title.slice(0, 100)
      : "BRANSERV";

    const message = typeof body.body === "string"
      ? body.body.slice(0, 300)
      : "Vous avez une nouvelle notification.";

    const url = typeof body.url === "string" &&
      body.url.startsWith("/") &&
      !body.url.startsWith("//")
        ? body.url
        : "/admin.html";

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const listResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,subscription`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`
        }
      }
    );

    if (!listResponse.ok) {
      return res.status(500).json({
        error: "Impossible de récupérer les abonnements."
      });
    }

    const subscriptions = await listResponse.json();
    let sent = 0;
    let failed = 0;

    for (const item of subscriptions) {
      try {
        await webpush.sendNotification(
          item.subscription,
          JSON.stringify({ title, body: message, url })
        );
        sent++;
      } catch (error) {
        failed++;

        if (error.statusCode === 404 || error.statusCode === 410) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${item.id}`,
            {
              method: "DELETE",
              headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`
              }
            }
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      failed,
      total: subscriptions.length
    });
  } catch (error) {
    console.error("Erreur d'envoi push :", error.message);
    return res.status(500).json({
      error: "Erreur lors de l'envoi des notifications."
    });
  }
};

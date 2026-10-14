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

  if (!SERVICE_KEY) {
    return res.status(500).json({
      error: "Configuration serveur incomplète."
    });
  }

  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

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
      console.error("Vérification administrateur impossible.");
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
    const subscription = body.subscription;

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== "string" ||
      typeof subscription.keys.auth !== "string"
    ) {
      return res.status(400).json({
        error: "Abonnement de notification invalide."
      });
    }

    const saveResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify({
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription,
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!saveResponse.ok) {
      console.error("Enregistrement de l'abonnement impossible.");
      return res.status(500).json({
        error: "Impossible d'enregistrer l'abonnement."
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur API abonnement :", error.message);
    return res.status(500).json({
      error: "Erreur interne du serveur."
    });
  }
};

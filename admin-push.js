(function () {
  "use strict";

  const VAPID_PUBLIC_KEY =
    "BPV7-ZZ2shnTN436cvIpdCVJOlOug4iv5CuiPBIwGg5HKXls7hLpPVoke58DB-cskcDl2H6QrkrrJdSPhslGd44";

  function decodeKey(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    return Uint8Array.from(
      atob(base64),
      character => character.charCodeAt(0)
    );
  }

  function addButton() {
    if (document.getElementById("branserv-push-button")) return;

    const button = document.createElement("button");
    button.id = "branserv-push-button";
    button.textContent = "Activer les notifications BRANSERV";
    button.style.cssText =
      "position:fixed;right:12px;bottom:16px;z-index:99999;" +
      "padding:12px 16px;background:#087f5b;color:white;" +
      "border:0;border-radius:10px;font-weight:bold;" +
      "box-shadow:0 3px 12px #0003;max-width:90%;";

    button.addEventListener("click", async function () {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Activation en cours...";

      try {
        const auth = window.BRANSERV_ADMIN_AUTH;
        if (!auth || !auth.session || !auth.session.access_token) {
          throw new Error("Connecte-toi d’abord à l’espace administrateur.");
        }

        if (!("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !("Notification" in window)) {
          throw new Error("Ce navigateur ne prend pas en charge les notifications push.");
        }

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          throw new Error("Autorisation des notifications refusée.");
        }

        const registration = await navigator.serviceWorker.register(
          "/service-worker.js"
        );
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeKey(VAPID_PUBLIC_KEY)
          });
        }

        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + auth.session.access_token
          },
          body: JSON.stringify({
            subscription: subscription.toJSON()
          })
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.error || "Enregistrement impossible.");
        }

        button.textContent = "Notifications activées ✓";
        alert("Les notifications BRANSERV sont activées sur cet appareil.");
      } catch (error) {
        button.textContent = originalText;
        alert("Activation impossible : " + error.message);
      } finally {
        button.disabled = false;
      }
    });

    document.body.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addButton);
  } else {
    addButton();
  }
})();

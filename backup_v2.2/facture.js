(function(){

  const params = new URLSearchParams(location.search);
  const orderId = params.get("id");

  const orders = JSON.parse(localStorage.getItem("brans_orders") || "[]");
  const order = orders.find(o => String(o.id) === String(orderId));

  const money = n =>
    Number(n || 0).toLocaleString("fr-FR") + " FCFA";

  if(!order){
    document.getElementById("facture").innerHTML = `
      <h2>Facture introuvable</h2>
      <p>La commande demandée n'existe pas sur cet appareil.</p>
    `;
    document.getElementById("pdfButton").style.display = "none";
    return;
  }

  document.getElementById("invoiceNumber").textContent =
    "N° " + (order.orderNumber || order.id);

  document.getElementById("invoiceDate").textContent =
    new Date(order.createdAt).toLocaleString("fr-FR");

  const customer = order.customer || {};

  document.getElementById("clientInfo").innerHTML = `
    <strong>${escapeHTML(customer.name || "")}</strong><br>
    Téléphone : ${escapeHTML(customer.phone || "")}<br>
    Ville : ${escapeHTML(customer.city || "")}<br>
    Quartier : ${escapeHTML(customer.district || "")}<br>
    Adresse : ${escapeHTML(customer.address || "")}
  `;

  document.getElementById("deliveryInfo").innerHTML = `
    Mode : ${escapeHTML(order.delivery || "À confirmer")}<br>
    ${order.comment ? "Note : " + escapeHTML(order.comment) : ""}
  `;

  const tbody = document.getElementById("items");

  tbody.innerHTML = (order.items || []).map(item => `
    <tr>
      <td>${escapeHTML(item.productName || "")}</td>
      <td class="num">${Number(item.quantity || 0)}</td>
      <td class="num">${money(item.unitPrice)}</td>
      <td class="num">${money(item.lineTotal)}</td>
    </tr>
  `).join("");

  document.getElementById("subtotal").textContent =
    money(order.subtotal);

  document.getElementById("deliveryFee").textContent =
    money(order.deliveryFee);

  document.getElementById("total").textContent =
    money(order.total);

  window.downloadInvoice = async function(){

    const button = document.getElementById("pdfButton");

    if(typeof html2pdf === "undefined"){
      alert("Le moteur PDF n'est pas encore chargé. Vérifie ta connexion Internet puis réessaie.");
      return;
    }

    button.disabled = true;
    button.textContent = "⏳ Génération du PDF...";

    try{

      const element = document.getElementById("facture");

      const filename =
        "Facture-BRANSERV-" +
        (order.orderNumber || order.id) +
        ".pdf";

      const options = {
        margin: 8,

        filename: filename,

        image: {
          type: "jpeg",
          quality: 0.98
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff"
        },

        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait"
        },

        pagebreak: {
          mode: ["avoid-all", "css", "legacy"]
        }
      };

      await html2pdf()
        .set(options)
        .from(element)
        .save();

      button.textContent = "✅ PDF téléchargé";

      setTimeout(() => {
        button.textContent = "📄 Télécharger la facture PDF";
        button.disabled = false;
      }, 2500);

    }catch(error){

      console.error(error);

      alert(
        "Impossible de générer le PDF. " +
        "Vérifie la connexion Internet et réessaie."
      );

      button.disabled = false;
      button.textContent = "📄 Télécharger la facture PDF";
    }
  };

  function escapeHTML(value){

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

})();

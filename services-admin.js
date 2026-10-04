/* BRANSERV SERVICES ADMIN V1 */

let allBranservServiceRequests = [];
let currentServiceFilter = 'all';

console.log('🛠️ Services Admin chargé');

function serviceEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function serviceDate(value) {
  if (!value) return '-';

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('fr-FR') + ' à ' +
         d.toLocaleTimeString('fr-FR', {
           hour: '2-digit',
           minute: '2-digit'
         });
}

function serviceStatus(status) {
  const labels = {
    new: '🆕 Nouvelle demande',
    progress: '🔧 En cours',
    done: '✅ Terminée',
    cancelled: '❌ Annulée'
  };

  return labels[status] || status || '⏳ En attente';
}


async function loadBranservServiceRequests() {
  const list = document.getElementById('serviceRequestsList');
  if (!list) return;

  list.innerHTML = '<p>⏳ Chargement des demandes...</p>';

  try {
    const supabase = window.branservSupabase;

    if (!supabase) {
      list.innerHTML =
        '<p style="color:red;">❌ Supabase non disponible.</p>';
      return;
    }

    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Les services déjà facturés apparaissent uniquement
    // dans la section « Services validés ».
    allBranservServiceRequests = (data || []).filter(
      item => item.invoice !== true
    );

    renderBranservServiceRequests();

    console.log(
      '✅ Demandes services chargées :',
      allBranservServiceRequests.length
    );

  } catch (error) {
    console.error('❌ Erreur services :', error);

    list.innerHTML =
      '<p style="color:red;">❌ Impossible de charger les demandes.</p>';
  }
}



function renderBranservServiceRequests() {
  const list = document.getElementById('serviceRequestsList');
  if (!list) return;

  let items = [...allBranservServiceRequests];

  if (currentServiceFilter !== 'all') {
    items = items.filter(
      item => (item.status || 'new') === currentServiceFilter
    );
  }

  const searchInput =
    document.getElementById('serviceRequestSearch');

  const search =
    (searchInput?.value || '').trim().toLowerCase();

  if (search) {
    items = items.filter(item =>
      String(item.customer_name || '')
        .toLowerCase()
        .includes(search) ||
      String(item.customer_phone || '')
        .toLowerCase()
        .includes(search) ||
      String(item.service_type || '')
        .toLowerCase()
        .includes(search)
    );
  }

  if (!items.length) {
    list.innerHTML =
      '<p>📭 Aucune demande trouvée.</p>';
    return;
  }

  list.innerHTML = items.map(item => `
    <div class="admin-card" style="margin-bottom:12px;">
      <h3>🛠️ ${serviceEscape(item.service_type || 'Service')}</h3>

      <p>
        <strong>👤 Client :</strong>
        ${serviceEscape(item.customer_name || '-')}
      </p>

      <p>
        <strong>📞 Téléphone :</strong>
        ${serviceEscape(item.customer_phone || '-')}
      </p>

      <p>
        <strong>📍 Lieu :</strong>
        ${serviceEscape(item.location || '-')}
      </p>

      <p>
        <strong>📝 Description :</strong>
        ${serviceEscape(item.description || '-')}
      </p>

      <p>
        <strong>📅 Date :</strong>
        ${serviceDate(item.created_at)}
      </p>

      <p>
        <strong>📌 Statut :</strong>
        ${serviceStatus(item.status)}
      </p>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
        <button class="btn" type="button"
          onclick="viewBranservService(${item.id})">
          👁️ Voir
        </button>

        <button class="btn" type="button"
          onclick="updateBranservServiceStatus(${item.id}, 'progress')">
          🔧 En cours
        </button>

        <button class="btn" type="button"
          onclick="validateBranservService(${item.id})">
          💰 Valider & Facturer
        </button>

        <button class="btn" type="button"
          onclick="updateBranservServiceStatus(${item.id}, 'cancelled')">
          ❌ Annuler
        </button>
      </div>
    </div>
  `).join('');
}



function filterBranservServices(status) {
  currentServiceFilter = status || 'all';
  renderBranservServiceRequests();
}

async function updateBranservServiceStatus(id, status) {
  try {
    const supabase = window.branservSupabase;

    if (!supabase) {
      alert('❌ Supabase non disponible.');
      return;
    }

    const { error } = await supabase
      .from('service_requests')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Statut service mis à jour :', id, status);

    await loadBranservServiceRequests();

  } catch (error) {
    console.error('❌ Erreur changement statut :', error);
    alert('❌ Impossible de modifier le statut.');
  }
}



async function viewBranservService(id) {

  try {

    const supabase = window.branservSupabase;

    if (!supabase) {
      alert("❌ Supabase non disponible.");
      return;
    }

    const { data: item, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("id", Number(id))
      .single();

    if (error) throw error;

    if (!item) {
      alert("❌ Demande introuvable.");
      return;
    }

    const oldModal = document.getElementById("branservServiceModal");
    if (oldModal) oldModal.remove();

    const modal = document.createElement("div");

    modal.id = "branservServiceModal";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.65);
      z-index:99999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      box-sizing:border-box;
    `;

    modal.innerHTML = `
      <div style="
        background:#fff;
        color:#222;
        width:100%;
        max-width:600px;
        max-height:90vh;
        overflow:auto;
        border-radius:16px;
        padding:20px;
        box-sizing:border-box;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        ">
          <h2 style="margin:0;">
            🛠️ Demande de service
          </h2>

          <button
            type="button"
            onclick="document.getElementById('branservServiceModal')?.remove()"
            style="
              border:0;
              background:#eee;
              border-radius:50%;
              width:38px;
              height:38px;
              font-size:20px;
              cursor:pointer;
            "
          >×</button>
        </div>

        <hr>

        <p>
          <strong>Service :</strong><br>
          ${serviceEscape(item.service_type || "-")}
        </p>

        <p>
          <strong>Client :</strong><br>
          ${serviceEscape(item.customer_name || "-")}
        </p>

        <p>
          <strong>Téléphone :</strong><br>
          ${serviceEscape(item.customer_phone || "-")}
        </p>

        <p>
          <strong>Lieu :</strong><br>
          ${serviceEscape(item.location || "-")}
        </p>

        <p>
          <strong>Description :</strong><br>
          ${serviceEscape(item.description || "-")}
        </p>

        <p>
          <strong>Statut :</strong><br>
          ${serviceStatus(item.status)}
        </p>

        <p>
          <strong>Créée le :</strong><br>
          ${serviceDate(item.created_at)}
        </p>

        ${
          item.invoice === true
          ? `
            <div style="
              margin-top:15px;
              padding:15px;
              background:#eaf8ee;
              border-radius:12px;
            ">
              <strong>💰 Service facturé</strong><br><br>
              Prix :
              <strong>
                ${Number(item.final_price || 0).toLocaleString("fr-FR")}
                FCFA
              </strong><br>
              Date :
              ${serviceDate(item.completed_at)}
            </div>
          `
          : ""
        }

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:20px;
        ">

          ${
            item.invoice !== true
            ? `
              <button class="btn" type="button"
                onclick="updateBranservServiceStatus(${item.id}, 'progress'); document.getElementById('branservServiceModal')?.remove();">
                🔧 En cours
              </button>

              <button class="btn" type="button"
                onclick="validateBranservService(${item.id})">
                💰 Valider & Facturer
              </button>
            `
            : `
              <button class="btn" type="button"
                onclick="generateServiceInvoice(${item.id})">
                📄 Facture
              </button>
            `
          }

          ${
            item.invoice !== true
            ? `
              <button class="btn" type="button"
                onclick="updateBranservServiceStatus(${item.id}, 'cancelled'); document.getElementById('branservServiceModal')?.remove();">
                ❌ Annuler
              </button>
            `
            : ""
          }

        </div>

      </div>
    `;

    document.body.appendChild(modal);

  } catch (error) {

    console.error("❌ Erreur affichage service :", error);

    alert(
      "❌ Impossible d'afficher le service.\n\n" +
      (error.message || error)
    );
  }
}

/* Ouvre la facture du service */
function generateServiceInvoice(id) {
  window.open(
    "facture-service.html?id=" + encodeURIComponent(id),
    "_blank"
  );
}

window.generateServiceInvoice = generateServiceInvoice;

window.loadBranservServiceRequests = loadBranservServiceRequests;
window.filterBranservServices = filterBranservServices;
window.updateBranservServiceStatus = updateBranservServiceStatus;
window.viewBranservService = viewBranservService;

console.log('✅ BRANSERV SERVICES ADMIN V1 complet');


/* =========================================================
   BRANSERV SERVICES - VALIDATION COMPTABLE V1
   ========================================================= */

async function validateBranservService(id) {
  const item = allBranservServiceRequests.find(
    r => Number(r.id) === Number(id)
  );

  if (!item) {
    alert("❌ Demande de service introuvable.");
    return;
  }

  const priceInput = prompt(
    "💰 Prix final facturé au client (FCFA) :",
    item.final_price || ""
  );

  if (priceInput === null) return;

  const finalPrice = Number(
    String(priceInput)
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    alert("❌ Prix final invalide.");
    return;
  }

  const costInput = prompt(
    "💵 Coût interne du service (FCFA) :",
    item.cost_price || "0"
  );

  if (costInput === null) return;

  const costPrice = Number(
    String(costInput)
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  if (!Number.isFinite(costPrice) || costPrice < 0) {
    alert("❌ Coût invalide.");
    return;
  }

  const profit = finalPrice - costPrice;

  if (!confirm(
    "💰 VALIDATION DU SERVICE\n\n" +
    "Service : " +
    (item.service_type || "Service BRANSERV") + "\n\n" +
    "Prix final : " +
    finalPrice.toLocaleString("fr-FR") +
    " FCFA\n" +
    "Coût interne : " +
    costPrice.toLocaleString("fr-FR") +
    " FCFA\n" +
    "Bénéfice : " +
    profit.toLocaleString("fr-FR") +
    " FCFA\n\n" +
    "Valider et générer la facture ?"
  )) {
    return;
  }

  try {

    if (!window.branservSupabase) {
      if (typeof getBranservSupabase === "function") {
        window.branservSupabase = getBranservSupabase();
      }
    }

    if (!window.branservSupabase) {
      throw new Error("Connexion Supabase introuvable.");
    }

    const now = new Date().toISOString();

    /* 1. Mise à jour du service */
    const { data: updatedService, error: updateError } =
      await window.branservSupabase
        .from("service_requests")
        .update({
          final_price: finalPrice,
          cost_price: costPrice,
          profit: profit,
          invoice: true,
          status: "done",
          completed_at: now,
          updated_at: now
        })
        .eq("id", Number(id))
        .select()
        .single();

    if (updateError) {
      throw updateError;
    }

    /* 2. Enregistrement comptable */
    const saleData = {
      order_id: null,
      product_id: null,
      product_name:
        "Service - " +
        (item.service_type || "Service BRANSERV"),
      quantity: 1,
      sale_price: finalPrice,
      purchase_price: costPrice,
      total: finalPrice,
      profit: profit,
      status: "sold",
      sold_at: now,
      returned_at: null,
      return_reason: null
    };

    const { error: saleError } =
      await window.branservSupabase
        .from("sales")
        .insert(saleData);

    if (saleError) {
      throw saleError;
    }

    alert(
      "✅ SERVICE VALIDÉ !\n\n" +
      "💰 Prix : " +
      finalPrice.toLocaleString("fr-FR") +
      " FCFA\n" +
      "📈 Bénéfice : " +
      profit.toLocaleString("fr-FR") +
      " FCFA\n\n" +
      "La facture va maintenant s'ouvrir."
    );

    /* 3. Actualisation des listes */
    await loadBranservServiceRequests();

    if (typeof loadBranservValidatedServices === "function") {
      await loadBranservValidatedServices();
    }

    /* 4. Ouverture de la facture */
    window.open(
      "facture-service.html?id=" + encodeURIComponent(id),
      "_blank"
    );

  } catch (error) {

    console.error(
      "❌ Validation service :",
      error
    );

    alert(
      "❌ Impossible de valider le service.\n\n" +
      (error.message || error)
    );
  }
}

window.validateBranservService = validateBranservService;

console.log("💰 BRANSERV facturation services V1 chargée");

/* =========================================================
   BRANSERV - SERVICES VALIDÉS
   ========================================================= */

async function loadBranservValidatedServices() {
  const container = document.getElementById('validatedServicesList');

  if (!container) return;

  container.innerHTML = '<p>⏳ Chargement...</p>';

  try {
    if (!window.branservSupabase) {
      if (typeof getBranservSupabase === 'function') {
        window.branservSupabase = getBranservSupabase();
      }
    }

    if (!window.branservSupabase) {
      throw new Error('Connexion Supabase introuvable.');
    }

    const { data, error } = await window.branservSupabase
      .from('service_requests')
      .select('*')
      .eq('status', 'done')
      .eq('invoice', true)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    if (!data || !data.length) {
      container.innerHTML = `
        <div style="
          padding:20px;
          text-align:center;
          background:#f8f9fa;
          border-radius:12px;
        ">
          📭 Aucun service validé pour le moment.
        </div>
      `;
      return;
    }

    container.innerHTML = data.map(item => {
      const price = Number(item.final_price || 0);
      const cost = Number(item.cost_price || 0);
      const profit = Number(item.profit ?? (price - cost));

      return `
        <div style="
          border:1px solid #ddd;
          border-radius:12px;
          padding:15px;
          margin-bottom:12px;
          background:#fff;
        ">
          <h3 style="margin-top:0;">
            💰 ${serviceEscape(item.service_type || 'Service BRANSERV')}
          </h3>

          <p>
            <strong>👤 Client :</strong>
            ${serviceEscape(item.customer_name || '-')}
          </p>

          <p>
            <strong>📞 Téléphone :</strong>
            ${serviceEscape(item.customer_phone || '-')}
          </p>

          <p>
            <strong>📅 Terminé le :</strong>
            ${serviceDate(item.completed_at || item.updated_at)}
          </p>

          <div style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
            gap:10px;
            margin-top:15px;
          ">
            <div style="padding:12px;background:#f5f5f5;border-radius:10px;">
              <small>Prix final</small>
              <strong style="display:block;font-size:18px;">
                ${price.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>

            <div style="padding:12px;background:#f5f5f5;border-radius:10px;">
              <small>Coût interne</small>
              <strong style="display:block;font-size:18px;">
                ${cost.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>

            <div style="padding:12px;background:#f5f5f5;border-radius:10px;">
              <small>Bénéfice</small>
              <strong style="display:block;font-size:18px;">
                ${profit.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
          </div>

          <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:15px;
          ">
            <button class="btn" type="button"
              onclick="generateServiceInvoice(${item.id})">
              📄 Facture
            </button>

            <button class="btn" type="button"
              onclick="viewBranservService(${item.id})">
              👁️ Voir
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('❌ Services validés :', error);

    container.innerHTML = `
      <div style="
        padding:15px;
        border-radius:10px;
        background:#ffecec;
      ">
        ❌ Impossible de charger les services validés.<br>
        ${serviceEscape(error.message || error)}
      </div>
    `;
  }
}

window.loadBranservValidatedServices = loadBranservValidatedServices;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadBranservValidatedServices, 1500);
});

console.log('💰 Services validés V1 chargé');


(function () {
  'use strict';

  async function loadBranservCitiesAdmin() {
    const container = document.getElementById('branservCitiesList');

    if (!container) return;

    const supabase = window.branservSupabase;

    if (!supabase) {
      container.innerHTML = '<p>❌ Supabase non disponible.</p>';
      return;
    }

    container.innerHTML = '<p>⏳ Chargement des villes...</p>';

    try {
      const { data, error } = await supabase
        .from('branserv_cities')
        .select('id,name,delivery_fee,active')
        .order('name', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        container.innerHTML = '<p>Aucune ville enregistrée.</p>';
        return;
      }

      container.innerHTML = data.map(city => `
        <div class="admin-card" style="margin-bottom:10px;">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <strong style="min-width:120px;">${escapeCity(city.name)}</strong>

            <label>
              Frais :
              <input
                type="number"
                min="0"
                step="100"
                value="${Number(city.delivery_fee || 0)}"
                id="cityFee_${city.id}"
                style="width:130px;padding:8px;"
              >
              FCFA
            </label>

            <label>
              <input
                type="checkbox"
                id="cityActive_${city.id}"
                ${city.active ? 'checked' : ''}
              >
              Active
            </label>

            <button
              class="btn"
              type="button"
              onclick="saveBranservCity(${city.id})"
            >
              💾 Enregistrer
            </button>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error(error);
      container.innerHTML =
        '<p>❌ Impossible de charger les villes.</p>';
    }
  }

  function escapeCity(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[char];
    });
  }

  async function saveBranservCity(id) {
    const supabase = window.branservSupabase;

    if (!supabase) {
      alert('❌ Supabase non disponible.');
      return;
    }

    const feeInput = document.getElementById('cityFee_' + id);
    const activeInput = document.getElementById('cityActive_' + id);

    const deliveryFee = Number(feeInput?.value || 0);
    const active = Boolean(activeInput?.checked);

    if (deliveryFee < 0 || !Number.isFinite(deliveryFee)) {
      alert('❌ Frais de livraison invalides.');
      return;
    }

    try {
      const { error } = await supabase
        .from('branserv_cities')
        .update({
          delivery_fee: deliveryFee,
          active: active
        })
        .eq('id', id);

      if (error) throw error;

      alert('✅ Ville mise à jour.');

      loadBranservCitiesAdmin();

    } catch (error) {
      console.error(error);
      alert('❌ Erreur lors de la mise à jour : ' + error.message);
    }
  }

  window.loadBranservCitiesAdmin = loadBranservCitiesAdmin;
  window.saveBranservCity = saveBranservCity;

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(loadBranservCitiesAdmin, 1200);
  });

})();

(function () {
  'use strict';

  async function loadBranservCities() {
    const select = document.getElementById('city');

    if (!select) return;

    const supabase = window.branservSupabase;

    if (!supabase) {
      console.error('❌ Supabase non disponible pour les villes');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('branserv_cities')
        .select('name, delivery_fee')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      const currentValue = select.value;

      select.innerHTML =
        '<option value="">Sélectionner une ville</option>';

      (data || []).forEach(city => {
        const option = document.createElement('option');
        option.value = city.name;
        option.textContent = city.name;
        option.dataset.deliveryFee = city.delivery_fee || 0;
        select.appendChild(option);
      });

      if (currentValue) {
        select.value = currentValue;
      }

      console.log('✅ Villes BRANSERV chargées :', data?.length || 0);

    } catch (error) {
      console.error('❌ Erreur chargement villes :', error);
    }
  }

  function start() {
    setTimeout(loadBranservCities, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.loadBranservCities = loadBranservCities;
})();

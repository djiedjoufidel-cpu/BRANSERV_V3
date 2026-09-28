(function () {
  if (!window.supabase) {
    console.error("Supabase JS n'est pas chargé.");
    return;
  }

  if (!window.BRANSERV_SUPABASE_URL || !window.BRANSERV_SUPABASE_KEY) {
    console.error("Configuration Supabase manquante.");
    return;
  }

  window.branservSupabase = window.supabase.createClient(
    window.BRANSERV_SUPABASE_URL,
    window.BRANSERV_SUPABASE_KEY
  );

  console.log("✅ BRANSERV connecté à Supabase");
})();

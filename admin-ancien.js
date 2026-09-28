/* =========================================================
   BRANSERV - ADMIN SUPABASE
   ========================================================= */

(function () {

    console.log("🚀 BRANSERV ADMIN démarrage...");

    /* ---------------------------------------------------------
       SUPABASE
       --------------------------------------------------------- */

    if (!window.supabase) {
        console.error("❌ Le CDN Supabase n'est pas chargé.");
        alert("Supabase n'est pas chargé.");
        return;
    }

    const SUPABASE_URL =
        "https://lsaykyehbfgfpoqwsmto.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_nuAzQtyhEtTeQoC-4JjM3g_yGG7KHdZ";

    const SB = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

    console.log("✅ Client Supabase créé dans admin.js");

    /* ---------------------------------------------------------
       AUTHENTIFICATION / ADMIN
       --------------------------------------------------------- */

    async function checkAdmin() {

        const {
            data: { session },
            error: sessionError
        } = await SB.auth.getSession();

        if (sessionError) {
            console.error(sessionError);
            throw sessionError;
        }

        if (!session) {
            alert("Connecte-toi avec ton compte administrateur.");
            return false;
        }

        console.log("👤 Session :", session.user.email);

        const { data, error } = await SB
            .from("admin_users")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            console.error("Erreur vérification admin :", error);
            alert("Erreur de vérification administrateur : " + error.message);
            return false;
        }

        if (!data) {
            alert("Ce compte n'est pas administrateur.");
            return false;
        }

        console.log("✅ Administrateur confirmé");

        return true;
    }

    /* ---------------------------------------------------------
       PRODUITS
       --------------------------------------------------------- */

    async function loadProducts() {

        const { data, error } = await SB
            .from("products")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("❌ Chargement produits :", error);
            alert("Erreur produits : " + error.message);
            return;
        }

        console.log("📦 Produits Supabase :", data);

        localStorage.setItem(
            "branserv_products",
            JSON.stringify(data || [])
        );

        renderProducts(data || []);
    }

    function renderProducts(products) {

        const container =
            document.getElementById("adminProducts");

        if (!container) {
            console.warn("#adminProducts introuvable");
            return;
        }

        if (!products.length) {
            container.innerHTML =
                "<p>Aucun produit enregistré.</p>";
            return;
        }

        container.innerHTML = products.map(product => {

            const image =
                product.image_url ||
                product.image ||
                "https://via.placeholder.com/400x300?text=BRANSERV";

            return `
                <div class="admin-product-card"
                     style="
                        display:flex;
                        gap:15px;
                        align-items:center;
                        padding:15px;
                        margin:10px 0;
                        border:1px solid #ddd;
                        border-radius:12px;
                     ">

                    <img
                        src="${image}"
                        alt="${escapeHtml(product.name || "")}"
                        style="
                            width:100px;
                            height:100px;
                            object-fit:cover;
                            border-radius:10px;
                        "
                    >

                    <div style="flex:1">

                        <h3>
                            ${escapeHtml(product.name || "")}
                        </h3>

                        <p>
                            Prix :
                            <strong>
                                ${Number(product.price || 0)
                                    .toLocaleString("fr-FR")} FCFA
                            </strong>
                        </p>

                        <p>
                            Stock :
                            <strong>${product.stock ?? 0}</strong>
                        </p>

                        <p>
                            ${product.promo ? "🔥 Promotion" : ""}
                        </p>

                        <button
                            class="btn"
                            onclick="deleteProduct(${product.id})"
                            style="background:#c62828;"
                        >
                            Supprimer
                        </button>

                    </div>

                </div>
            `;

        }).join("");
    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /* ---------------------------------------------------------
       AJOUT PRODUIT
       --------------------------------------------------------- */

    window.addProduct = async function () {

        try {

            const admin = await checkAdmin();

            if (!admin) return;

            const name =
                document.getElementById("name")?.value.trim();

            const category =
                document.getElementById("category")?.value.trim();

            const price =
                Number(
                    document.getElementById("price")?.value || 0
                );

            const purchasePrice =
                Number(
                    document.getElementById("purchasePrice")?.value || 0
                );

            const oldPrice =
                Number(
                    document.getElementById("oldPrice")?.value || 0
                );

            const stock =
                Number(
                    document.getElementById("stock")?.value || 0
                );

            const image =
                document.getElementById("image")?.value.trim() ||
                null;

            const promo =
                document.getElementById("promo")?.checked || false;

            const active =
                document.getElementById("active")?.checked ?? true;

            if (!name) {
                alert("Entre le nom du produit.");
                return;
            }

            if (price <= 0) {
                alert("Entre un prix valide.");
                return;
            }

            const product = {
                name,
                category: category || null,
                price,
                purchase_price: purchasePrice,
                old_price: oldPrice || null,
                stock,
                promo,
                active,
                image_url: image,
                description: null
            };

            console.log("📤 Ajout produit :", product);

            const {
                data,
                error
            } = await SB
                .from("products")
                .insert(product)
                .select()
                .single();

            if (error) {

                console.error("❌ Supabase :", error);

                alert(
                    "Erreur Supabase :\n" +
                    error.message
                );

                return;
            }

            console.log("✅ Produit ajouté :", data);

            alert("✅ Produit ajouté avec succès !");

            [
                "name",
                "category",
                "price",
                "purchasePrice",
                "oldPrice",
                "stock",
                "image"
            ].forEach(id => {

                const element =
                    document.getElementById(id);

                if (element) element.value = "";

            });

            const promoElement =
                document.getElementById("promo");

            if (promoElement)
                promoElement.checked = false;

            const activeElement =
                document.getElementById("active");

            if (activeElement)
                activeElement.checked = true;

            await loadProducts();

        } catch (error) {

            console.error("❌ ADMIN :", error);

            alert(
                "Erreur BRANSERV :\n" +
                error.message
            );
        }
    };

    /* ---------------------------------------------------------
       SUPPRESSION
       --------------------------------------------------------- */

    window.deleteProduct = async function (id) {

        if (!confirm("Supprimer ce produit ?"))
            return;

        try {

            const admin = await checkAdmin();

            if (!admin) return;

            const { error } = await SB
                .from("products")
                .delete()
                .eq("id", id);

            if (error) {

                console.error(error);

                alert(
                    "Erreur suppression : " +
                    error.message
                );

                return;
            }

            alert("✅ Produit supprimé.");

            await loadProducts();

        } catch (error) {

            console.error(error);

            alert(error.message);
        }
    };

    /* ---------------------------------------------------------
       DÉMARRAGE
       --------------------------------------------------------- */

    async function startAdmin() {

        try {

            console.log("🔐 Vérification du compte...");

            const admin = await checkAdmin();

            if (!admin) return;

            console.log(
                "☁️ Connexion à la base Supabase..."
            );

            await loadProducts();

            console.log(
                "🎉 Administration BRANSERV prête."
            );

        } catch (error) {

            console.error(
                "❌ Erreur démarrage admin :",
                error
            );

            alert(
                "Erreur BRANSERV :\n" +
                error.message
            );
        }
    }

    window.addEventListener(
        "load",
        startAdmin
    );

})();

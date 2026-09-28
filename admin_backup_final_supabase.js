(function () {

    console.log("🚀 BRANSERV ADMIN démarrage...");

    function getSupabase() {
        if (!window.branservSupabase) {
            throw new Error("Supabase n'est pas initialisé.");
        }
        return window.branservSupabase;
    }

    async function checkAdmin() {
        const supabase = getSupabase();

        const { data: { session }, error } =
            await supabase.auth.getSession();

        if (error) {
            console.error(error);
            throw error;
        }

        if (!session) {
            alert("Connecte-toi avec ton compte administrateur.");
            return false;
        }

        const { data, error: adminError } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (adminError) {
            console.error("Erreur admin :", adminError);
            alert("Impossible de vérifier les droits administrateur.");
            return false;
        }

        if (!data) {
            alert("Ce compte n'est pas administrateur.");
            return false;
        }

        console.log("✅ Administrateur connecté :", session.user.email);
        return true;
    }

    async function loadProducts() {

        const supabase = getSupabase();

        const { data, error } = await supabase
            .from("products")
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            console.error("Erreur produits :", error);
            alert("Erreur lors du chargement des produits.");
            return;
        }

        localStorage.setItem(
            "branserv_products",
            JSON.stringify(data || [])
        );

        renderProducts(data || []);
    }

    function renderProducts(products) {

        const container = document.getElementById("adminProducts");

        if (!container) return;

        if (!products.length) {
            container.innerHTML = "<p>Aucun produit.</p>";
            return;
        }

        container.innerHTML = products.map(product => {

            const image =
                product.image_url ||
                product.image ||
                "https://via.placeholder.com/300x200?text=BRANSERV";

            return `
                <div class="admin-product-card">

                    <img
                        src="${image}"
                        alt="${product.name || ""}"
                        style="width:120px;height:100px;object-fit:cover;border-radius:10px;"
                    >

                    <div>
                        <h3>${product.name || ""}</h3>

                        <p>
                            Prix :
                            <strong>${Number(product.price || 0).toLocaleString("fr-FR")} FCFA</strong>
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

    window.addProduct = async function () {

        try {

            const supabase = getSupabase();

            const ok = await checkAdmin();

            if (!ok) return;

            const name =
                document.getElementById("name")?.value.trim();

            const category =
                document.getElementById("category")?.value.trim();

            const price =
                Number(document.getElementById("price")?.value || 0);

            const purchasePrice =
                Number(document.getElementById("purchasePrice")?.value || 0);

            const oldPrice =
                Number(document.getElementById("oldPrice")?.value || 0);

            const stock =
                Number(document.getElementById("stock")?.value || 0);

            const image =
                document.getElementById("image")?.value.trim() || null;

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
                name: name,
                category: category || null,
                price: price,
                purchase_price: purchasePrice,
                old_price: oldPrice || null,
                stock: stock,
                promo: promo,
                active: active,
                image_url: image,
                description: null
            };

            console.log("📦 Produit à envoyer :", product);

            const { data, error } =
                await supabase
                    .from("products")
                    .insert(product)
                    .select()
                    .single();

            if (error) {
                console.error("❌ Erreur Supabase :", error);
                alert("Erreur Supabase : " + error.message);
                return;
            }

            console.log("✅ Produit ajouté :", data);

            alert("✅ Produit ajouté avec succès !");

            document.getElementById("name").value = "";
            document.getElementById("category").value = "";
            document.getElementById("price").value = "";
            document.getElementById("purchasePrice").value = "";
            document.getElementById("oldPrice").value = "";
            document.getElementById("stock").value = "";
            document.getElementById("image").value = "";
            document.getElementById("promo").checked = false;
            document.getElementById("active").checked = true;

            await loadProducts();

        } catch (error) {

            console.error("❌", error);
            alert(error.message);

        }

    };

    window.deleteProduct = async function (id) {

        if (!confirm("Supprimer ce produit ?")) return;

        try {

            const supabase = getSupabase();

            const ok = await checkAdmin();

            if (!ok) return;

            const { error } =
                await supabase
                    .from("products")
                    .delete()
                    .eq("id", id);

            if (error) {
                console.error(error);
                alert("Erreur : " + error.message);
                return;
            }

            alert("✅ Produit supprimé.");

            await loadProducts();

        } catch (error) {

            console.error(error);
            alert(error.message);

        }

    };

    async function startAdmin() {

        try {

            console.log("🔐 Vérification administrateur...");

            const ok = await checkAdmin();

            if (!ok) return;

            console.log("☁️ Chargement des produits Supabase...");

            await loadProducts();

            console.log("✅ Administration BRANSERV prête.");

        } catch (error) {

            console.error("❌ ADMIN ERROR :", error);

            alert(
                "Erreur BRANSERV : " +
                error.message
            );

        }

    }

    window.addEventListener("load", startAdmin);

})();

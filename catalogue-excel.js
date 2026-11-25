"use strict";

async function downloadClientCatalogueExcel() {
  const linkElement = document.querySelector(
    '#catalogueClientETS a[onclick]'
  );

  try {
    const supabase = window.branservSupabase;

    if (!supabase) {
      throw new Error("Connexion Supabase non disponible.");
    }

    if (!window.ExcelJS) {
      throw new Error("La bibliothèque Excel n'a pas été chargée.");
    }

    if (linkElement) {
      linkElement.style.pointerEvents = "none";
      linkElement.textContent = "⏳ Préparation du catalogue...";
    }

    const { data: products, error } = await supabase
      .from("products")
      .select(
        "id,name,category,price,old_price,promo,active,stock,image_url,image"
      )
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      throw new Error("Chargement des produits : " + error.message);
    }

    if (!products || products.length === 0) {
      throw new Error("Aucun produit actif à exporter.");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ETS H-PROMESSE";
    workbook.subject = "Catalogue produits client";
    workbook.title = "Catalogue ETS H-PROMESSE";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Catalogue", {
      views: [{ state: "frozen", ySplit: 5 }]
    });

    sheet.columns = [
      { width: 17 },
      { width: 14 },
      { width: 30 },
      { width: 22 },
      { width: 23 },
      { width: 16 },
      { width: 20 }
    ];

    // En-tête de l'entreprise
    sheet.mergeCells("A1:B4");
    sheet.mergeCells("C1:G2");
    sheet.mergeCells("C3:G4");

    sheet.getCell("C1").value = "ETS H-PROMESSE";
    sheet.getCell("C1").font = {
      bold: true,
      size: 22
    };
    sheet.getCell("C1").alignment = {
      vertical: "middle",
      horizontal: "center"
    };

    sheet.getCell("C3").value =
      "PRODUITS & SERVICES AU CAMEROUN\\nCATALOGUE CLIENT — PRIX EN FCFA";
    sheet.getCell("C3").font = {
      size: 12,
      bold: true
    };
    sheet.getCell("C3").alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };

    sheet.getRow(1).height = 28;
    sheet.getRow(2).height = 25;
    sheet.getRow(3).height = 25;
    sheet.getRow(4).height = 25;

    // Charger et intégrer le logo officiel dans le classeur
    try {
      const logoResponse = await fetch("logo-ets-h-promesse.png");

      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoObjectUrl = URL.createObjectURL(logoBlob);

        try {
          const logo = new Image();

          await new Promise((resolve, reject) => {
            logo.onload = resolve;
            logo.onerror = reject;
            logo.src = logoObjectUrl;
          });

          const canvas = document.createElement("canvas");
          canvas.width = logo.naturalWidth || logo.width;
          canvas.height = logo.naturalHeight || logo.height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(logo, 0, 0);

          const logoData = canvas.toDataURL("image/png");
          const base64 = logoData.split(",")[1];

          const logoId = workbook.addImage({
            base64,
            extension: "png"
          });

          sheet.addImage(logoId, {
            tl: { col: 0, row: 0 },
            ext: { width: 125, height: 90 }
          });
        } finally {
          URL.revokeObjectURL(logoObjectUrl);
        }
      }
    } catch (error) {
      console.warn("Logo entreprise non intégré :", error);
    }

    // Titre du listing
    sheet.mergeCells("A5:G5");
    sheet.getCell("A5").value = "LISTING DES PRODUITS";
    sheet.getCell("A5").font = {
      bold: true,
      size: 14
    };
    sheet.getCell("A5").alignment = {
      horizontal: "center",
      vertical: "middle"
    };
    sheet.getRow(5).height = 30;

    sheet.addRow([
      "Photo",
      "Référence",
      "Produit",
      "Catégorie",
      "Prix de vente (FCFA)",
      "Promotion",
      "Disponibilité"
    ]);

    const header = sheet.getRow(6);
    header.font = { bold: true };
    header.height = 30;
    header.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true
    };

    // Le tableau commence à la ligne 6
    let embeddedImages = 0;

    async function imageToPngData(url) {
      if (!url || typeof url !== "string") {
        return null;
      }

      try {
        const response = await fetch(url);

        if (!response.ok) return null;

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        try {
          const img = new Image();

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = objectUrl;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          const context = canvas.getContext("2d");
          context.drawImage(img, 0, 0);

          return canvas.toDataURL("image/png").split(",")[1];
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        console.warn("Photo produit non intégrée :", error);
        return null;
      }
    }

    for (const product of products) {
      const salePrice = Number(product.price) || 0;
      const regularPrice = Number(product.old_price) || 0;
      const hasPromo = product.promo === true;

      const discountPercent =
        hasPromo && regularPrice > salePrice && regularPrice > 0
          ? Math.round(
              ((regularPrice - salePrice) / regularPrice) * 100
            )
          : 0;

      const promotionLabel = hasPromo
        ? discountPercent > 0
          ? `Oui (-${discountPercent} %)`
          : "Oui"
        : "Non";

      const row = sheet.addRow([
        "",
        product.id ?? "",
        product.name || "Produit",
        product.category || "",
        salePrice,
        promotionLabel,
        Number(product.stock) > 0 ? "Disponible" : "Rupture"
      ]);

      row.height = 65;
      row.alignment = { vertical: "middle" };
      row.getCell(5).numFmt = '#,##0 "FCFA"';

      const imageUrl = product.image_url || product.image || "";
      const imageBase64 = await imageToPngData(imageUrl);

      if (imageBase64) {
        const imageId = workbook.addImage({
          base64: imageBase64,
          extension: "png"
        });

        sheet.addImage(imageId, {
          tl: {
            col: 0,
            row: row.number - 1
          },
          ext: {
            width: 75,
            height: 58
          }
        });

        embeddedImages++;
      } else {
        row.getCell(1).value = "Photo indisponible";
      }
    }

    sheet.autoFilter = {
      from: "A6",
      to: "G" + sheet.rowCount
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const file = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const downloadUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download =
      "Catalogue_ETS_H-PROMESSE_" +
      new Date().toISOString().slice(0, 10) +
      ".xlsx";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);

    alert(
      "Catalogue ETS H-PROMESSE créé !\\n" +
      products.length + " produits actifs.\\n" +
      embeddedImages + " photos produits intégrées."
    );

  } catch (error) {
    console.error("Erreur catalogue Excel :", error);
    alert("❌ " + (error.message || "Erreur lors de l'export."));
  } finally {
    if (linkElement) {
      linkElement.style.pointerEvents = "";
      linkElement.textContent =
        "📥 Télécharger le listing Excel (.xlsx)";
    }
  }
}

window.downloadClientCatalogueExcel =
  downloadClientCatalogueExcel;

(function () {
  "use strict";

  function findImageInput() {
    let input = document.querySelector('#image, input[name="image"]');
    if (input) return input;

    const inputs = [...document.querySelectorAll('input')];

    return inputs.find(input => {
      const text = (
        input.placeholder + " " +
        input.name + " " +
        input.id
      ).toLowerCase();

      return text.includes("url") && text.includes("image");
    });
  }

  function init() {
    const oldInput = findImageInput();

    if (!oldInput) {
      console.log("BRANSERV : champ image introuvable.");
      return;
    }

    // Évite de créer deux fois le système
    if (document.getElementById("branserv-gallery-upload")) return;

    // Garder l'ancien champ pour compatibilité,
    // mais le rendre discret.
    oldInput.style.display = "none";

    const container = document.createElement("div");
    container.id = "branserv-gallery-upload";

    container.innerHTML = `
      <div style="
        margin-top:8px;
        padding:12px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#fafafa;
      ">
        <label style="
          display:block;
          font-weight:700;
          margin-bottom:8px;
        ">
          📷 Photo du produit
        </label>

        <input
          id="branserv-image-file"
          type="file"
          accept="image/*"
          style="
            width:100%;
            padding:10px;
            border:1px solid #ddd;
            border-radius:8px;
            background:white;
            box-sizing:border-box;
          "
        >

        <div id="branserv-image-preview"
          style="
            display:none;
            margin-top:10px;
            text-align:center;
          ">
          <img
            id="branserv-preview-img"
            style="
              max-width:180px;
              max-height:180px;
              border-radius:12px;
              object-fit:cover;
              border:1px solid #ddd;
            "
          >

          <div style="margin-top:6px;">
            <button
              type="button"
              id="branserv-remove-image"
              style="
                border:0;
                background:#dc2626;
                color:white;
                padding:7px 12px;
                border-radius:7px;
                font-size:12px;
              "
            >
              Supprimer la photo
            </button>
          </div>
        </div>

        <small style="
          display:block;
          margin-top:7px;
          color:#777;
        ">
          JPG, PNG ou WEBP • La photo sera automatiquement compressée.
        </small>
      </div>
    `;

    // Insérer juste après l'ancien champ
    oldInput.parentNode.insertBefore(container, oldInput.nextSibling);

    const fileInput = document.getElementById("branserv-image-file");
    const previewBox = document.getElementById("branserv-image-preview");
    const previewImg = document.getElementById("branserv-preview-img");
    const removeBtn = document.getElementById("branserv-remove-image");

    fileInput.addEventListener("change", function () {
      const file = this.files && this.files[0];

      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("Veuillez sélectionner une image.");
        this.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        const img = new Image();

        img.onload = function () {
          const maxSize = 900;

          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round(height * maxSize / width);
              width = maxSize;
            } else {
              width = Math.round(width * maxSize / height);
              height = maxSize;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL("image/jpeg", 0.72);

          // Compatibilité avec l'ancien système
          oldInput.value = compressed;

          previewImg.src = compressed;
          previewBox.style.display = "block";

          console.log("BRANSERV : photo enregistrée.");
        };

        img.src = event.target.result;
      };

      reader.readAsDataURL(file);
    });

    removeBtn.addEventListener("click", function () {
      fileInput.value = "";
      oldInput.value = "";
      previewImg.src = "";
      previewBox.style.display = "none";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

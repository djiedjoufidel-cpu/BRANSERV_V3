(function () {
  "use strict";

  function init() {
    if (document.getElementById("branservThemeButton")) return;

    var button = document.createElement("button");
    button.id = "branservThemeButton";
    button.type = "button";
    button.setAttribute("data-theme-toggle", "");
    button.setAttribute("aria-label", "Changer le thème clair ou sombre");

    button.style.cssText = [
      "position:fixed",
      "right:18px",
      "bottom:18px",
      "width:52px",
      "height:52px",
      "border:0",
      "border-radius:50%",
      "z-index:2147483647",
      "font-size:23px",
      "background:#087f8c",
      "color:#fff",
      "cursor:pointer",
      "box-shadow:0 8px 25px rgba(0,0,0,.25)"
    ].join(";");

    function updateIcon() {
      var dark =
        document.documentElement.dataset.branservTheme === "dark";
      button.textContent = dark ? "☀️" : "🌙";
      button.title = dark ? "Activer le thème clair" : "Activer le thème sombre";
    }

    button.addEventListener("click", function () {
      if (typeof window.branservToggleTheme === "function") {
        window.branservToggleTheme();
        updateIcon();
      } else {
        console.error("BRANSERV : moteur du thème non chargé.");
      }
    });

    document.body.appendChild(button);
    updateIcon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

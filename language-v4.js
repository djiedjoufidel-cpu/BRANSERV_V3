(function () {
  "use strict";

  const KEY = "branserv_language_v4";

  const translations = {
    fr: {
      home: "Accueil",
      products: "Produits",
      services: "Services",
      cart: "Panier",
      contact: "Contact",
      order: "Commander",
      discover: "Découvrir nos produits",
      discoverServices: "Découvrir nos services",
      welcome: "Bienvenue chez BRANSERV",
      productsTitle: "Nos produits",
      servicesTitle: "Nos services",
      addCart: "Ajouter au panier",
      requestService: "Demander un service",
      phoneRepair: "Réparation téléphone",
      computerRepair: "Réparation ordinateur",
      graphicDesign: "Infographie",
      itServices: "Services informatiques",
      supplementAdvice: "Conseil complément alimentaire",
      cosmeticAdvice: "Conseil cosmétique"
    },

    en: {
      home: "Home",
      products: "Products",
      services: "Services",
      cart: "Cart",
      contact: "Contact",
      order: "Order",
      discover: "Discover our products",
      discoverServices: "Discover our services",
      welcome: "Welcome to BRANSERV",
      productsTitle: "Our Products",
      servicesTitle: "Our Services",
      addCart: "Add to cart",
      requestService: "Request a service",
      phoneRepair: "Phone repair",
      computerRepair: "Computer repair",
      graphicDesign: "Graphic design",
      itServices: "IT services",
      supplementAdvice: "Food supplement advice",
      cosmeticAdvice: "Cosmetics advice"
    }
  };

  function getLanguage() {
    return localStorage.getItem(KEY) || "fr";
  }

  function setLanguage(lang) {
    if (!translations[lang]) lang = "fr";

    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      const key = element.getAttribute("data-i18n");

      if (translations[lang][key]) {
        element.textContent = translations[lang][key];
      }
    });

    document.querySelectorAll("[data-language-toggle]").forEach(function (button) {
      button.textContent = lang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";
      button.setAttribute(
        "aria-label",
        lang === "fr" ? "Passer en anglais" : "Passer en français"
      );
    });
  }

  window.branservSetLanguage = setLanguage;

  window.branservToggleLanguage = function () {
    setLanguage(getLanguage() === "fr" ? "en" : "fr");
  };

  function init() {
    setLanguage(getLanguage());

    if (!document.querySelector("[data-language-toggle]")) {
      const button = document.createElement("button");

      button.type = "button";
      button.setAttribute("data-language-toggle", "");
      button.textContent = getLanguage() === "fr" ? "🇬🇧 EN" : "🇫🇷 FR";

      button.style.cssText =
        "position:fixed;right:18px;bottom:82px;width:70px;height:42px;" +
        "border:0;border-radius:22px;z-index:2147483646;" +
        "background:#ff8a00;color:#fff;font-weight:700;font-size:14px;" +
        "cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.25);";

      button.onclick = function () {
        window.branservToggleLanguage();
      };

      document.body.appendChild(button);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

(function () {
  'use strict';

  const FR_EN = {
    "Nos produits": "Our products",
    "Découvrez les produits disponibles chez BRANSERV à Yaoundé.":
      "Discover the products available at BRANSERV in Yaoundé.",
    "🔎 Rechercher un produit...":
      "🔎 Search for a product...",
    "Prix croissant":
      "Price: low to high",
    "Prix décroissant":
      "Price: high to low",
    "Chargement des produits...":
      "Loading products...",
    "Produit":
      "Product",
    "Stock disponible":
      "Stock available",
    "Ajouter au panier":
      "Add to cart",
    "Stock maximum atteint.":
      "Maximum stock reached.",
    "Rupture de stock":
      "Out of stock",
    "En stock":
      "In stock",
    "Promo":
      "Sale"
  };

  const EN_FR = Object.fromEntries(
    Object.entries(FR_EN).map(([fr, en]) => [en, fr])
  );

  function getLang() {
    return localStorage.getItem('branserv_language_v4') || 'fr';
  }

  function translateText(lang) {
    const dictionary = lang === 'en' ? FR_EN : EN_FR;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          if (
            ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          const text = node.nodeValue.trim();

          return dictionary[text]
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      const original = node.nodeValue.trim();
      const translated = dictionary[original];

      if (translated) {
        node.nodeValue = node.nodeValue.replace(original, translated);
      }
    });

    // Placeholders
    document.querySelectorAll('[placeholder]').forEach(el => {
      const value = el.getAttribute('placeholder');
      if (dictionary[value]) {
        el.setAttribute('placeholder', dictionary[value]);
      }
    });

    // Options
    document.querySelectorAll('option').forEach(el => {
      const value = el.textContent.trim();
      if (dictionary[value]) {
        el.textContent = dictionary[value];
      }
    });

    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
  }

  function applyTranslation() {
    setTimeout(() => translateText(getLang()), 80);
  }

  window.addEventListener('DOMContentLoaded', applyTranslation);
  window.addEventListener('load', applyTranslation);

  const originalToggle = window.branservToggleLanguage;

  if (typeof originalToggle === 'function') {
    window.branservToggleLanguage = function () {
      originalToggle();
      setTimeout(() => translateText(getLang()), 100);
    };
  }

  const originalSet = window.branservSetLanguage;

  if (typeof originalSet === 'function') {
    window.branservSetLanguage = function (lang) {
      originalSet(lang);
      setTimeout(() => translateText(getLang()), 100);
    };
  }

  // Retraduit les éléments ajoutés dynamiquement par produits.js
  const observer = new MutationObserver(() => {
    translateText(getLang());
  });

  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

})();

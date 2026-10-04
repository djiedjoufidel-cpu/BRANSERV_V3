(function () {
  'use strict';

  const translations = {
    "BRANSERV vous propose des produits et des services pratiques":
      "BRANSERV offers practical products and services",

    "🛍️ Voir les produits":
      "🛍️ View products",

    "🛠️ Nos services":
      "🛠️ Our services",

    "Pourquoi BRANSERV ?":
      "Why BRANSERV?",

    "Produits":
      "Products",

    "Services":
      "Services",

    "Commande WhatsApp":
      "WhatsApp orders",

    "Contact rapide et simple.":
      "Fast and easy contact.",

    "Nos produits":
      "Our products",

    "Découvrez nos produits disponibles et commandez":
      "Discover our available products and order",

    "directement depuis BRANSERV.":
      "directly from BRANSERV.",

    "Voir les produits":
      "View products",

    "Réparation, informatique, infographie et conseils.":
      "Repairs, IT, graphic design and advice.",

    "Produits disponibles":
      "Available products",

    "Découvrez quelques produits actuellement disponibles.":
      "Discover some products currently available.",

    "Nos services":
      "Our services",

    "Réparation téléphone":
      "Phone repair",

    "Réparation ordinateur":
      "Computer repair",

    "Assistance et réparation informatique.":
      "IT assistance and computer repair.",

    "Conseil complément alimentaire":
      "Food supplement advice",

    "Conseil cosmétique":
      "Cosmetics advice",

    "Infographie":
      "Graphic design",

    "Services informatiques":
      "IT services",

    "Installation, configuration et assistance informatique.":
      "Installation, configuration and IT assistance.",

    "Pourquoi choisir BRANSERV ?":
      "Why choose BRANSERV?",

    "Contact direct pour vos commandes et services.":
      "Direct contact for your orders and services.",

    "💬 WhatsApp":
      "💬 WhatsApp",

    "Échange rapide avec BRANSERV pour confirmer votre commande.":
      "Quick communication with BRANSERV to confirm your order.",

    "Contactez BRANSERV directement sur WhatsApp.":
      "Contact BRANSERV directly on WhatsApp.",

    "💬 Nous contacter sur WhatsApp":
      "💬 Contact us on WhatsApp",

    "Contact":
      "Contact",

    "Boutique et services à Yaoundé, Cameroun.":
      "Shop and services in Yaoundé, Cameroon.",

    "Développé par Brandon et ChatGPT.":
      "Developed by Brandon and ChatGPT."
  };

  const reverse = Object.fromEntries(
    Object.entries(translations).map(([fr, en]) => [en, fr])
  );

  function currentLanguage() {
    return localStorage.getItem('branserv_language_v4') || 'fr';
  }

  function translatePage() {
    const lang = currentLanguage();
    const dictionary = lang === 'en' ? translations : reverse;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          if (
            ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName) ||
            parent.closest('[data-br-ignore-translation]')
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return dictionary[node.nodeValue.trim()]
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

    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
  }

  function runTranslation() {
    setTimeout(translatePage, 50);
  }

  window.addEventListener('DOMContentLoaded', runTranslation);

  const originalToggle = window.branservToggleLanguage;

  if (typeof originalToggle === 'function') {
    window.branservToggleLanguage = function () {
      originalToggle();
      setTimeout(translatePage, 80);
    };
  }

  const originalSet = window.branservSetLanguage;

  if (typeof originalSet === 'function') {
    window.branservSetLanguage = function (lang) {
      originalSet(lang);
      setTimeout(translatePage, 80);
    };
  }

  window.addEventListener('load', function () {
    setTimeout(translatePage, 150);
  });

})();

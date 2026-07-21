import { SITE } from "../data/site.js";

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: new URL(item.path, SITE.url).toString(),
    })),
  };
}

export function faqLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function wheelProductLd(wheel) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: wheel.name,
    description: wheel.blurb,
    brand: { "@type": "Brand", name: SITE.name },
    material: "Aluminium forgé",
    additionalProperty: [
      { "@type": "PropertyValue", name: "Famille", value: wheel.family },
      { "@type": "PropertyValue", name: "Disponibilité", value: "Fabrication à la commande, sans stock — aucune taille de série" },
      { "@type": "PropertyValue", name: "Personnalisation", value: "Toute taille de 15\" à 26\" définie sur mesure, dessin des bâtons adaptable" },
    ],
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      availability: "https://schema.org/MadeToOrder",
      url: `${SITE.url}/catalogue/${wheel.slug}`,
      description: "Fabrication à la commande — prix sur devis selon taille, dessin et finition.",
    },
  };
}

export function articleLd({ title, description, path, datePublished, dateModified }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: new URL(path, SITE.url).toString(),
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    inLanguage: "fr-FR",
  };
}

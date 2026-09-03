// Plan du site, construit à la demande.
//
// Il l'était auparavant par l'intégration @astrojs/sitemap, au moment de la
// compilation. Deux conséquences, également graves et de sens opposé :
//
//   * elle listait les quatorze pages de /admin — jusqu'à /admin/login et
//     /admin/setup. On invitait les moteurs à venir les visiter et on publiait
//     la carte de l'administration ;
//   * elle ne listait AUCUNE fiche produit. Les pages du catalogue sont rendues
//     à la demande (elles dépendent de la base), donc invisibles à la
//     compilation : les quelque 450 jantes n'existaient pour aucun moteur.
//
// Le rendre à la demande règle les deux, et un troisième problème par-dessus :
// une jante retirée depuis l'admin disparaît du plan aussitôt, au lieu
// d'attendre le prochain déploiement.
import { famillesVisibles, listItemsForFamily } from "../lib/catalogDb.js";

export const prerender = false;

// Les pages fixes, énumérées à la main. Elles sont peu nombreuses et changent
// rarement ; les découvrir automatiquement demanderait de lire le dossier des
// pages à l'exécution, ce qui ne marche pas sur une fonction déployée.
// Volontairement absentes : /admin, /api, /commande (tunnel de commande) et la
// page 404.
const PAGES_FIXES = [
  ["/", "weekly", "1.0"],
  ["/catalogue", "daily", "0.9"],
  ["/sur-mesure", "monthly", "0.8"],
  ["/savoir-faire", "monthly", "0.7"],
  ["/configurateur", "monthly", "0.7"],
  ["/journal", "weekly", "0.6"],
  ["/journal/jante-forgee-vs-jante-coulee", "yearly", "0.5"],
  ["/journal/monobloc-ou-multi-pieces", "yearly", "0.5"],
  ["/journal/guide-choisir-taille-jantes", "yearly", "0.5"],
  ["/journal/delai-jantes-sur-mesure-forgees", "yearly", "0.5"],
  ["/faq", "monthly", "0.6"],
  ["/a-propos", "yearly", "0.4"],
  ["/contact", "yearly", "0.4"],
  ["/cgv", "yearly", "0.2"],
  ["/mentions-legales", "yearly", "0.2"],
  ["/politique-de-confidentialite", "yearly", "0.2"],
];

const echapper = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET({ request }) {
  // L'origine vient de la requête, pas d'une constante. Le site vit pour
  // l'instant sur une adresse Vercel et vivra demain sur son domaine : un plan
  // qui annoncerait des URL d'un autre hôte que celui qui le sert est rejeté
  // par les moteurs.
  const origine = new URL(request.url).origin;
  const jour = new Date().toISOString().slice(0, 10);
  const urls = [];

  for (const [chemin, frequence, priorite] of PAGES_FIXES) {
    urls.push({ loc: origine + chemin, frequence, priorite });
  }

  try {
    const familles = await famillesVisibles();
    for (const famille of familles) {
      urls.push({ loc: `${origine}/catalogue/${famille.slug}`, frequence: "daily", priorite: "0.8" });
      const items = await listItemsForFamily(famille.slug);
      for (const item of items) {
        urls.push({
          loc: `${origine}/catalogue/${item.family}/${item.slug}`,
          frequence: "weekly",
          priorite: "0.7",
        });
      }
    }
  } catch {
    // Base injoignable : on sert le plan des pages fixes plutôt qu'une erreur.
    // Un plan partiel vaut mieux qu'un plan absent — les moteurs conservent
    // les URL déjà connues.
  }

  const corps =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${echapper(u.loc)}</loc><lastmod>${jour}</lastmod>` +
          `<changefreq>${u.frequence}</changefreq><priority>${u.priorite}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(corps, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Une heure de cache côté CDN : un moteur ne repasse pas toutes les
      // minutes, et la base n'a pas à être interrogée à chaque visite de robot.
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

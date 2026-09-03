// Fiche de renseignement destinée aux assistants conversationnels.
//
// Convention llmstxt.org : un fichier en texte simple, à la racine, qu'un
// modèle peut lire d'un coup au lieu de parcourir le site. C'est le seul
// document du site dont le lecteur visé n'est pas humain.
//
// Il était statique, dans public/, et il avait vieilli sans que rien ne le
// signale : il annonçait « 8 à 14 semaines » quand tout le reste du site dit
// 8 semaines en moyenne, « un parcours en 6 étapes » qui n'existe plus sur la
// page sur-mesure, 457 références et quatre familles alors que des jantes et
// une famille entière ont été retirées depuis l'admin.
//
// C'est le pire endroit où laisser une erreur : une page fausse trompe un
// visiteur à la fois, celle-ci est recopiée telle quelle dans la réponse d'un
// assistant. Elle est donc désormais rendue à la demande, et les chiffres
// viennent de la base — ils ne peuvent plus diverger de ce que le site montre.
import { famillesVisibles, countItemsForFamily, countAllItems } from "../lib/catalogDb.js";

export const prerender = false;

const DESCRIPTIONS = {
  monobloc: "forgée et usinée en une seule pièce, le meilleur rapport poids/rigidité",
  "multi-pieces": "centre forgé et barrel boulonné en 2 ou 3 parties, largeur et déport ajustables séparément",
  "tout-terrain": "renforts type beadlock, pensées pour le franchissement",
  carbone: "structure carbone brasée à l'aluminium forgé, légèreté maximale",
};

export async function GET({ request }) {
  const base = new URL(request.url).origin;

  let familles = [];
  let total = null;
  try {
    const visibles = await famillesVisibles();
    familles = await Promise.all(
      visibles.map(async (f) => ({ ...f, nombre: await countItemsForFamily(f.slug) }))
    );
    total = await countAllItems();
  } catch {
    // Base injoignable : on sert la fiche sans les chiffres plutôt qu'avec des
    // chiffres faux. Une donnée absente se remarque, une donnée périmée non.
  }

  const ligneCatalogue = familles.length
    ? `${total} références en photo réparties en ${familles.length} famille${familles.length > 1 ? "s" : ""} ` +
      `(${familles.map((f) => `${f.short.toLowerCase()} : ${f.nombre}`).join(", ")}), ` +
      `chacune redimensionnable et redessinable — un aperçu du savoir-faire de l'atelier partenaire, pas un stock figé.`
    : `références en photo, chacune redimensionnable et redessinable — un aperçu du savoir-faire de l'atelier partenaire, pas un stock figé.`;

  const lignesFamilles = familles
    .map((f) => `- ${f.label} (${f.nombre} références) : ${DESCRIPTIONS[f.slug] || f.short}. ${base}/catalogue/${f.slug}`)
    .join("\n");

  const texte = `# KESSLER WHEELS

> KESSLER WHEELS conçoit et fait fabriquer des jantes en aluminium forgé 100 % sur mesure. Contrairement à la majorité des fabricants « sur mesure », qui n'ajustent que la taille et la couleur d'un dessin figé, KESSLER WHEELS permet aussi de modifier la forme des bâtons elle-même (nombre, galbe, profondeur de dish, découpe du disque). Tailles disponibles : 15 à 26 pouces. Architectures : monobloc ou multi-pièces (2 ou 3 parties). Matière : aluminium forgé de qualité aéronautique (type 6061-T6 ou équivalent). Délai moyen : 8 semaines entre la validation du plan technique et la livraison. Marché : France, particuliers et préparateurs automobiles.

## Pages clés

- [Accueil](${base}/) : présentation générale, différenciation face aux fabricants « sur mesure » classiques.
- [Sur-mesure](${base}/sur-mesure) : ce qui est personnalisable (dimensions, dessin, finition), délais et homologation.
- [Catalogue](${base}/catalogue) : ${ligneCatalogue}
- [Savoir-faire](${base}/savoir-faire) : forgeage contre coulée, différence monobloc/multi-pièces, matière et contrôle qualité.
- [FAQ](${base}/faq) : dessin, tailles, délais, homologation et prix.
- [Journal](${base}/journal) : guides sur le forgeage, le choix des tailles, les architectures et les délais.
- [Configurateur](${base}/configurateur) : formulaire de brief de projet.
- [Contact](${base}/contact) : coordonnées.
${familles.length ? `\n## Familles du catalogue\n\n${lignesFamilles}\n` : ""}
## Points factuels notables

- Différenciateur principal : la forme des bâtons est modifiable sur demande, pas seulement la taille — capacité rare chez les fabricants de jantes forgées sur mesure.
- Gamme de tailles : 15" à 26", sans référence de catalogue figée.
- Deux architectures de construction : monobloc (léger, rigide, forgé en une pièce) et multi-pièces 2 ou 3 parties (dish profond, modulaire).
- Chaque photo du catalogue montre un dessin, pas une taille figée : diamètre, largeur, déport et entraxe sont fixés à la commande, en fonction du véhicule.
- Un prix HT est affiché sur chaque fiche produit selon la taille, la finition et la quantité choisies, avec paiement en ligne possible ; les demandes particulières passent par une étude technique gratuite via le configurateur.
- Délai moyen de 8 semaines entre la validation du plan technique et la réception du jeu complet, selon la complexité du dessin, la taille et la finition.
- Pour un usage route, une configuration sur mesure peut nécessiter une démarche d'homologation individuelle (réception à titre isolé en France), selon la réglementation en vigueur.
`;

  return new Response(texte, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}

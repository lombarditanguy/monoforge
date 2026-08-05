// Sélection mise en avant sur la page d'accueil.
//
// Elle ne sort pas d'un tirage au sort : l'audit de marché 2024-2026 avait
// retenu trente références en face des tendances observées chez les fabricants
// occidentaux. On en garde six, une par tendance majeure, choisies pour
// couvrir les trois familles et toute l'étendue de la gamme de prix — un
// visiteur doit voir en un écran ce qu'on sait forger et ce que ça coûte.
//
// Second filtre, décisif en vitrine : la photo. Plusieurs références de
// l'audit portent encore le filigrane du fournisseur, discret dans une grille
// de catalogue mais lisible sur une carte de page d'accueil. Chaque code
// ci-dessous a été vérifié à pleine résolution — aucune marque étrangère.
//
// `argument` est la version client de l'analyse : ce qui est écrit ici part
// sur le site public, l'audit lui-même reste interne.
export const BEST_SELLERS = [
  {
    code: "DZ-070",
    family: "monobloc",
    tendance: "Deep concave",
    argument: "Le dessin qui fait le plus gros volume du marché, toutes marques confondues.",
  },
  {
    code: "DZ-045",
    family: "monobloc",
    tendance: "Monobloc épuré",
    argument: "La ligne sobre qui gagne du terrain chez les berlines premium et les électriques.",
  },
  {
    code: "DZ-244",
    family: "monobloc",
    tendance: "JDM",
    argument: "Six bâtons et un dish profond : le dessin le plus imité au monde depuis trente ans.",
  },
  {
    code: "DZT-042",
    family: "multi-pieces",
    tendance: "Contraste",
    argument: "Face mate, voile poli — le contraste qui remplace peu à peu le tout-noir.",
  },
  {
    code: "DZT-004",
    family: "multi-pieces",
    tendance: "Trois pièces",
    argument: "Barrel démontable : largeur et déport ajustés indépendamment du centre.",
  },
  {
    code: "TDZ-008",
    family: "carbone",
    tendance: "Carbone forgé",
    argument: "Le segment qui progresse le plus vite, porté par l'allègement.",
  },
];

// Sélection de l'audit de marché 2024-2026 — DOCUMENT INTERNE.
//
// Trente références du catalogue retenues face aux tendances observées chez les
// fabricants occidentaux, regroupées par tendance. Le champ `analyse` est la
// lecture interne du marché : il ne doit pas partir sur le site public tel quel
// (il dit par exemple qu'un segment est saturé par la concurrence). La version
// client des arguments vit dans bestsellers.js et dans la table home_featured.
//
// La liste était restée dans les fichiers de travail de l'audit ; elle est ici
// pour ne pas être à refaire, et pour servir de base à toute mise en avant
// ultérieure dans le catalogue.
export const AUDIT_2026 = [
  {
    tendance: "Deep concave agressif",
    analyse: "Le style le plus vendu historiquement — toujours le plus gros volume, malgré un marché aujourd'hui saturé par la concurrence.",
    codes: ["DZ-023", "DZ-070"],
  },
  {
    tendance: "Monobloc épuré",
    analyse: "La contre-tendance qui monte : les acheteurs premium et VE délaissent le concave agressif pour des branches plus sobres.",
    codes: ["DZ-016", "DZ-045"],
  },
  {
    tendance: "Mesh JDM",
    analyse: "Le langage visuel le plus copié au monde (Volk TE37, BBS LM) — valeur sûre intergénérationnelle.",
    codes: ["DZ-244", "DZ-134"],
  },
  {
    tendance: "Bronze satiné",
    analyse: "La finition la plus citée comme tendance n°1 pour 2026, toutes catégories confondues.",
    codes: ["DZ-147", "DZ-256", "TDZ-030"],
  },
  {
    tendance: "Brushed premium allemand",
    analyse: "Finition dominante chez la clientèle BMW / Mercedes / Audi : discrète, dissimule les micro-rayures.",
    codes: ["DZ-148", "DZ-175"],
  },
  {
    tendance: "Bicolore / contraste",
    analyse: "Remplace progressivement le monochrome — y compris le noir mat « stealth » longtemps dominant.",
    codes: ["DZ-231", "DZ-228", "DZT-042"],
  },
  {
    tendance: "Chrome / poli miroir",
    analyse: "Niche durable, concentrée sur la clientèle collectionneur et « showcar ».",
    codes: ["DZ-116", "DZ-279"],
  },
  {
    tendance: "Carbone forgé",
    analyse: "6 % du catalogue, mais le segment le plus dynamique : ~8 %/an, porté par l'allègement VE et l'image exotique.",
    codes: ["TDZ-008", "TDZ-020", "TDZ-026", "TDZ-006"],
  },
  {
    tendance: "Tout-terrain / pickup",
    analyse: "Forte demande US, en essor en Europe — bronze, mat, gros entraxes multi-boulons.",
    codes: ["DZ-059", "DZ-297", "DZT-100"],
  },
  {
    tendance: "VE / Tesla",
    analyse: "Diamètres 18-20″ recherchés par les connaisseurs pour préserver l'autonomie (poids non suspendu).",
    codes: ["DZ-241"],
  },
  {
    tendance: "Motorsport / center-lock",
    analyse: "Le center-lock est un signal fort auprès des collectionneurs Porsche / GT.",
    codes: ["DZ-057", "DZS-036"],
  },
  {
    tendance: "Multi-pièces modulaire",
    analyse: "L'argument du 3-pièces : personnalisation et barrel remplaçable — pas la performance pure.",
    codes: ["DZS-017", "DZT-004"],
  },
  {
    tendance: "Design signature",
    analyse: "Deux classiques indéboulonnables du secteur (blade design, diamond cut) — utiles en pièces d'appel.",
    codes: ["DZ-168", "DZ-243"],
  },
];

/** Les trente codes, à plat. */
export const AUDIT_2026_CODES = AUDIT_2026.flatMap((g) => g.codes);

/** Tendance d'une référence, ou null si elle n'est pas dans la sélection. */
export function tendanceDe(code) {
  return AUDIT_2026.find((g) => g.codes.includes(code))?.tendance || null;
}

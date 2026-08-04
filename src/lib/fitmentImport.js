// Lecture d'un jeu de données de cotes constructeur acheté sur étagère.
//
// Le problème : on ne connaît pas à l'avance le nom des colonnes du fichier
// (chaque éditeur a les siennes, en anglais ou en français, parfois préfixées).
// Plutôt que de figer un format et de casser à la première livraison, on
// détecte les colonnes — par leur nom ET par la plausibilité de leurs valeurs.
// La distinction compte : un fichier contient souvent `tyre_width` (245 mm) à
// côté de `rim_width` (9,5″), et les deux répondent au mot « width ». Seule la
// plage de valeurs permet de trancher, donc on la regarde.
//
// Le module est volontairement sans dépendance ni accès base : il tourne aussi
// bien dans le navigateur (aperçu avant import) que dans la fonction serveur
// (validation avant écriture), et les deux côtés voient exactement la même
// interprétation du fichier.

/* ------------------------------------------------------------------ */
/* CSV                                                                  */
/* ------------------------------------------------------------------ */

export function detectDelimiter(text) {
  const ligne = text.split(/\r?\n/).find((l) => l.trim()) || "";
  const compte = (c) => (ligne.match(new RegExp(`\\${c}`, "g")) || []).length;
  return [";", "\t", ",", "|"].sort((a, b) => compte(b) - compte(a))[0];
}

/** Parseur CSV minimal mais correct : guillemets, séparateurs échappés, CRLF. */
export function parseCsv(text, delimiter) {
  const sep = delimiter || detectDelimiter(text);
  const lignes = [];
  let champ = "";
  let ligne = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          champ += '"';
          i++;
        } else inQuotes = false;
      } else champ += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === sep) {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = "";
    } else if (c !== "\r") champ += c;
  }
  if (champ !== "" || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((v) => String(v).trim() !== ""));
}

/* ------------------------------------------------------------------ */
/* Détection des colonnes                                               */
/* ------------------------------------------------------------------ */

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const entier = (v) => {
  const n = Number(String(v).replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/**
 * Champs recherchés. `noms` = intitulés plausibles (normalisés), `plage` =
 * intervalle attendu des valeurs, qui sert d'arbitre quand deux colonnes
 * portent un nom compatible.
 */
export const CHAMPS = [
  { cle: "marque", label: "Marque", requis: true, texte: true,
    noms: ["make", "marque", "brand", "manufacturer", "carmake", "vehiclemake", "makename"] },
  { cle: "modele", label: "Modèle", requis: true, texte: true,
    noms: ["model", "modele", "carmodel", "vehiclemodel", "modelname"] },
  { cle: "finition", label: "Finition / version", texte: true,
    noms: ["trim", "version", "finition", "submodel", "grade", "trimname", "variant", "equipment", "motorisation", "engine"] },
  { cle: "anneeDebut", label: "Année (début)", plage: [1950, 2100],
    noms: ["yearfrom", "yearstart", "startyear", "anneedebut", "productionstart", "fromyear", "year", "annee", "modelyear", "yr"] },
  { cle: "anneeFin", label: "Année (fin)", plage: [1950, 2100],
    noms: ["yearto", "yearend", "endyear", "anneefin", "productionend", "toyear"] },
  { cle: "diametre", label: "Diamètre jante (″)", requis: true, plage: [10, 30],
    noms: ["rimdiameter", "wheeldiameter", "diameter", "diametre", "rimsize", "wheelsize", "rd", "diam"] },
  { cle: "largeur", label: "Largeur jante (″)", plage: [4, 16],
    noms: ["rimwidth", "wheelwidth", "width", "largeur", "rw", "rimwidthinches"] },
  { cle: "deport", label: "Déport ET (mm)", plage: [-80, 100],
    noms: ["offset", "et", "rimoffset", "wheeloffset", "deport", "offsetmm", "etmm"] },
  { cle: "entraxe", label: "Entraxe", texte: true,
    noms: ["boltpattern", "pcd", "entraxe", "lugpattern", "bolt", "boltpatternmm", "pcdmm"] },
  { cle: "nbTrous", label: "Nombre de trous", plage: [3, 8],
    noms: ["boltcount", "numbolts", "lugcount", "holes", "nbtrous", "studs", "numberofbolts"] },
  { cle: "pcdMm", label: "Diamètre de perçage (mm)", plage: [90, 180],
    noms: ["pcd", "pcdmm", "boltcircle", "boltcirclediameter", "bcd"] },
  { cle: "alesage", label: "Alésage (mm)", plage: [40, 120],
    noms: ["cb", "centerbore", "centrebore", "hubbore", "alesage", "bore"] },
  { cle: "pneu", label: "Dimension pneu", texte: true,
    noms: ["tyresize", "tiresize", "tyre", "tire", "pneu", "tiresizefront"] },
];

function plausibilite(champ, valeurs) {
  const utiles = valeurs.filter((v) => String(v).trim() !== "");
  if (utiles.length === 0) return 0;
  if (champ.texte) {
    // Une colonne texte utile contient des lettres, pas seulement des chiffres.
    const alpha = utiles.filter((v) => /[a-zA-Z]/.test(v)).length;
    return alpha / utiles.length;
  }
  if (!champ.plage) return 0.5;
  const [min, max] = champ.plage;
  const dans = utiles.filter((v) => {
    const n = entier(v);
    return n !== null && n >= min && n <= max;
  }).length;
  return dans / utiles.length;
}

function scoreNom(champ, entete) {
  const n = norm(entete);
  if (!n) return 0;
  if (champ.noms.includes(n)) return 3;
  if (champ.noms.some((c) => c.length >= 3 && (n.endsWith(c) || n.startsWith(c)))) return 2;
  if (champ.noms.some((c) => c.length >= 4 && n.includes(c))) return 1;
  return 0;
}

/**
 * Associe chaque champ attendu à un indice de colonne. Une colonne n'est
 * jamais attribuée deux fois : les champs sont servis par ordre de certitude,
 * ce qui évite que `tyre_width` rafle la largeur de jante.
 */
export function detectMapping(entetes, echantillon = []) {
  const colonnes = entetes.map((_, i) => echantillon.map((l) => l[i] ?? ""));
  const propositions = [];

  for (const champ of CHAMPS) {
    for (let i = 0; i < entetes.length; i++) {
      const nom = scoreNom(champ, entetes[i]);
      if (nom === 0) continue;
      const valeurs = plausibilite(champ, colonnes[i]);
      // Un nom qui colle mais des valeurs hors plage : c'est l'autre colonne.
      if (champ.plage && valeurs < 0.5) continue;
      propositions.push({ cle: champ.cle, colonne: i, score: nom * 2 + valeurs });
    }
  }

  propositions.sort((a, b) => b.score - a.score);
  const mapping = {};
  const prises = new Set();
  for (const p of propositions) {
    if (mapping[p.cle] !== undefined || prises.has(p.colonne)) continue;
    mapping[p.cle] = p.colonne;
    prises.add(p.colonne);
  }
  return mapping;
}

/* ------------------------------------------------------------------ */
/* Normalisation des lignes                                             */
/* ------------------------------------------------------------------ */

const normaliseCle = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

function borne(n, [min, max]) {
  return n !== null && n >= min && n <= max ? n : null;
}

/** Une ligne du fichier → une ligne de la table, ou null si inexploitable. */
export function normalizeRow(cellules, mapping) {
  const lire = (cle) => {
    const i = mapping[cle];
    if (i === undefined || i === null) return "";
    return String(cellules[i] ?? "").trim();
  };

  const marque = lire("marque");
  const modele = lire("modele");
  if (!marque || !modele) return null;

  let diametre = borne(entier(lire("diametre")), [10, 30]);
  // Certains jeux ne donnent que la dimension pneu : le diamètre jante s'y lit.
  if (diametre === null) {
    const pneu = lire("pneu");
    const m = pneu.match(/R\s*(\d{2}(?:\.\d)?)/i);
    if (m) diametre = borne(Number(m[1]), [10, 30]);
  }
  if (diametre === null) return null;

  const largeur = borne(entier(lire("largeur")), [4, 16]);
  const deport = borne(entier(lire("deport")), [-80, 100]);

  // L'entraxe arrive soit tout fait ("5x112"), soit en deux colonnes.
  let entraxe = lire("entraxe");
  if (!/\d\s*[x×]\s*\d/.test(entraxe)) {
    const trous = borne(entier(lire("nbTrous")), [3, 8]);
    const pcd = borne(entier(lire("pcdMm")), [90, 180]);
    entraxe = trous && pcd ? `${trous}x${pcd}` : "";
  } else {
    entraxe = entraxe.replace(/\s*[x×]\s*/i, "x");
  }

  const anneeDebut = borne(entier(lire("anneeDebut")), [1950, 2100]);
  const anneeFin = borne(entier(lire("anneeFin")), [1950, 2100]);

  return {
    marque,
    modele,
    marqueNorm: normaliseCle(marque),
    modeleNorm: normaliseCle(modele),
    finition: lire("finition") || null,
    anneeDebut,
    // Une seule colonne d'année = un millésime, pas un intervalle ouvert.
    anneeFin: anneeFin ?? anneeDebut,
    diametre,
    largeur,
    deport,
    entraxe: entraxe || null,
    alesage: borne(entier(lire("alesage")), [40, 120]),
  };
}

/**
 * Analyse complète d'un fichier : colonnes détectées, lignes exploitables,
 * échantillon. Sert à montrer à l'opérateur ce qui va être importé — et à lui
 * laisser corriger le mapping avant d'écrire quoi que ce soit.
 */
export function analyseFichier(texte, mappingForce = null) {
  const lignes = parseCsv(texte);
  if (lignes.length < 2) {
    return { erreur: "Fichier vide ou sans ligne de données." };
  }
  const entetes = lignes[0].map((h) => String(h).trim());
  const donnees = lignes.slice(1);
  const mapping = mappingForce || detectMapping(entetes, donnees.slice(0, 200));

  const manquants = CHAMPS.filter((c) => c.requis && mapping[c.cle] === undefined).map((c) => c.label);
  const echantillon = [];
  let exploitables = 0;
  for (const l of donnees) {
    const row = normalizeRow(l, mapping);
    if (!row) continue;
    exploitables++;
    if (echantillon.length < 5) echantillon.push(row);
  }

  return {
    entetes,
    mapping,
    manquants,
    total: donnees.length,
    exploitables,
    echantillon,
    lignes: donnees,
  };
}

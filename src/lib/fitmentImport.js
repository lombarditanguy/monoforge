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
/* Format « grille véhicule »                                           */
/* ------------------------------------------------------------------ */
//
// Le jeu de données TyresAddict n'a pas d'en-tête et n'a pas une ligne par
// taille : une ligne = un véhicule pour une année, avec toutes les tailles
// admises empilées dans quelques cellules.
//
//   Jaguar;F-Type;F-Type Coupe;3.0 V6;2013;…;7.5 x 17 ET45|8.5 x 18 ET49,9.5 x 18 ET27;…;5*108;63.3
//
//   « | » sépare deux montes alternatives,
//   « , » sépare l'avant et l'arrière d'une même monte décalée.
//
// On éclate donc chaque cellule en montes individuelles, puis on recompacte
// les années : le fichier répète la même ligne pour 2013, 2014, 2015… ce qui
// gonfle le volume d'un facteur 10 pour zéro information.

const TOKEN_JANTE = /^\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*ET\s*(-?\d+)\s*$/i;
const TOKEN_PNEU = /\d{3}\s*\/\s*\d{2}\s*R\s*\d{2}/i;
// Entraxe « 5*108 ». Le nombre de trous tient sur un chiffre, ce qui écarte le
// pas de filetage « 12*1.5 » qui vit dans une colonne voisine.
const TOKEN_PCD = /^\s*(\d)\s*[*x×]\s*(\d{2,3}(?:[.,]\d)?)\s*$/i;
const TOKEN_FILETAGE = /^\s*\d{2}\s*[*x×]\s*[\d.,]+\s*$/i;

const nb = (v) => Number(String(v).replace(",", "."));

function roleColonne(valeurs) {
  const utiles = valeurs.map((v) => String(v ?? "").trim()).filter(Boolean);
  if (utiles.length === 0) return "vide";
  const part = (test) => utiles.filter(test).length / utiles.length;
  const morceaux = (v) => v.split(/[|,]/).map((t) => t.trim()).filter(Boolean);

  if (part((v) => morceaux(v).some((t) => TOKEN_JANTE.test(t))) > 0.7) return "jantes";
  if (part((v) => morceaux(v).some((t) => TOKEN_PNEU.test(t))) > 0.7) return "pneus";
  if (part((v) => TOKEN_PCD.test(v) && nb(v.split(/[*x×]/i)[1]) >= 90 && nb(v.split(/[*x×]/i)[1]) <= 180) > 0.7)
    return "pcd";
  if (part((v) => TOKEN_FILETAGE.test(v)) > 0.7) return "filetage";
  if (part((v) => Number.isInteger(nb(v)) && nb(v) >= 1950 && nb(v) <= 2100) > 0.9) return "annee";
  if (part((v) => Number.isFinite(nb(v)) && nb(v) >= 40 && nb(v) <= 120) > 0.9) return "alesage";
  return "texte";
}

/** Ce format se reconnaît à ses cellules de tailles, pas à ses intitulés. */
export function looksLikeVehicleGrid(lignes) {
  const echantillon = lignes.slice(0, 30);
  if (echantillon.length === 0) return false;
  const avecJante = echantillon.filter((l) =>
    l.some((c) => String(c || "").split(/[|,]/).some((t) => TOKEN_JANTE.test(t.trim())))
  );
  return avecJante.length / echantillon.length > 0.5;
}

function rolesDeGrille(lignes) {
  const n = Math.max(...lignes.map((l) => l.length));
  const roles = [];
  for (let i = 0; i < n; i++) roles.push(roleColonne(lignes.slice(0, 300).map((l) => l[i])));

  const iAnnee = roles.indexOf("annee");
  // Les colonnes d'identité (marque, modèle, carrosserie, motorisation) sont
  // celles qui précèdent l'année ; au-delà on ne trouve que des cotes.
  const identite = roles
    .map((r, i) => ({ r, i }))
    .filter((c) => c.r === "texte" && (iAnnee === -1 || c.i < iAnnee))
    .map((c) => c.i);

  return {
    roles,
    identite,
    annee: iAnnee === -1 ? null : iAnnee,
    jantes: roles.map((r, i) => (r === "jantes" ? i : -1)).filter((i) => i >= 0),
    pcd: roles.indexOf("pcd") === -1 ? null : roles.indexOf("pcd"),
    alesage: roles.indexOf("alesage") === -1 ? null : roles.indexOf("alesage"),
  };
}

function eclaterCellule(cellule, groupe) {
  const montes = [];
  for (const combo of String(cellule || "").split("|")) {
    const parts = combo.split(",").map((p) => p.trim()).filter(Boolean);
    parts.forEach((p, k) => {
      const m = TOKEN_JANTE.exec(p);
      if (!m) return;
      const largeur = nb(m[1]);
      const diametre = nb(m[2]);
      // Le fichier contient des « 0 x 0 ET0 » : la dimension pneu est connue
      // mais pas la cote de jante. Une cote absente doit rester absente.
      if (!(diametre >= 10 && diametre <= 30) || !(largeur >= 4 && largeur <= 16)) return;
      montes.push({
        largeur,
        diametre,
        deport: nb(m[3]),
        essieu: parts.length === 1 ? null : k === 0 ? "avant" : "arriere",
        groupe,
      });
    });
  }
  return montes;
}

export function parseVehicleGrid(lignes) {
  const cols = rolesDeGrille(lignes);
  if (cols.jantes.length === 0 || cols.identite.length < 2) {
    return { rows: [], cols, erreur: "Colonnes de tailles ou d'identité introuvables." };
  }

  const brut = [];
  for (const l of lignes) {
    const textes = cols.identite.map((i) => String(l[i] ?? "").trim());
    const marque = textes[0];
    const modele = textes[1];
    if (!marque || !modele) continue;

    // Carrosserie et motorisation vont dans un seul libellé de version : c'est
    // là-dedans que la finition renvoyée par la plaque ira se reconnaître.
    const finition = textes.slice(2).filter((t) => t && t !== modele).join(" · ") || null;
    const annee = cols.annee === null ? null : nb(l[cols.annee]);

    let entraxe = null;
    if (cols.pcd !== null) {
      const m = TOKEN_PCD.exec(String(l[cols.pcd] ?? ""));
      if (m) entraxe = `${m[1]}x${String(m[2]).replace(",", ".")}`;
    }
    const alesage = cols.alesage === null ? null : nb(l[cols.alesage]);

    cols.jantes.forEach((ci, rang) => {
      for (const m of eclaterCellule(l[ci], rang + 1)) {
        brut.push({
          marque, modele, finition,
          marqueNorm: normaliseCle(marque),
          modeleNorm: normaliseCle(modele),
          annee: Number.isFinite(annee) ? annee : null,
          diametre: m.diametre,
          largeur: m.largeur,
          deport: m.deport,
          essieu: m.essieu,
          groupe: m.groupe,
          entraxe,
          alesage: Number.isFinite(alesage) && alesage >= 40 && alesage <= 120 ? alesage : null,
        });
      }
    });
  }

  return { rows: compacterAnnees(brut), cols, brut: brut.length };
}

/**
 * Le fichier répète la même monte pour chaque millésime. On rassemble les
 * années consécutives en intervalles : même information, dix fois moins de
 * lignes à transférer et à interroger.
 */
function compacterAnnees(rows) {
  const groupes = new Map();
  for (const r of rows) {
    const cle = [
      r.marque, r.modele, r.finition, r.diametre, r.largeur, r.deport,
      r.essieu, r.groupe, r.entraxe, r.alesage,
    ].join(" ");
    if (!groupes.has(cle)) groupes.set(cle, { modele: r, annees: [] });
    if (r.annee !== null) groupes.get(cle).annees.push(r.annee);
  }

  const sortie = [];
  for (const { modele, annees } of groupes.values()) {
    const { annee, ...base } = modele;
    if (annees.length === 0) {
      sortie.push({ ...base, anneeDebut: null, anneeFin: null });
      continue;
    }
    const tri = [...new Set(annees)].sort((a, b) => a - b);
    let debut = tri[0];
    for (let i = 1; i <= tri.length; i++) {
      if (i === tri.length || tri[i] !== tri[i - 1] + 1) {
        sortie.push({ ...base, anneeDebut: debut, anneeFin: tri[i - 1] });
        debut = tri[i];
      }
    }
  }
  return sortie;
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

  // Deux familles de fichiers coexistent sur le marché : la grille véhicule
  // (sans en-tête, tailles empilées) et le tableau classique une-ligne-par-
  // taille. On reconnaît la première à son contenu et on la traite à part.
  if (!mappingForce && looksLikeVehicleGrid(lignes)) {
    const { rows, cols, erreur, brut } = parseVehicleGrid(lignes);
    if (erreur) return { erreur };
    return {
      grille: true,
      roles: cols.roles,
      total: lignes.length,
      brut,
      exploitables: rows.length,
      echantillon: rows.slice(0, 5),
      rows,
      manquants: rows.length === 0 ? ["Tailles de jantes"] : [],
      entetes: cols.roles.map((r, i) => `Colonne ${i + 1} — ${r}`),
    };
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
    grille: false,
    entetes,
    mapping,
    manquants,
    total: donnees.length,
    exploitables,
    echantillon,
    lignes: donnees,
  };
}

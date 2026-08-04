// Emplacement de la jante sur une commande catalogue : on reprend le déport
// (ET) de la monte d'origine du véhicule.
//
// POURQUOI CETTE RÈGLE. Il n'existe pas de « jante affleurante » automatisable :
// la cote qui la détermine — distance entre le moyeu et le bord d'aile — ne
// figure dans aucune base constructeur, se mesure sur le véhicule, et bouge
// avec la hauteur de caisse. On livre donc à l'emplacement prévu par le
// constructeur, qui est vérifiable et opposable ; tout écart volontaire passe
// par le sur-mesure, où la cote est relevée avec le client.
//
// GÉOMÉTRIE (elle sous-tend toutes les alertes ci-dessous). La face d'appui est
// à ET millimètres du plan médian de la jante, vers l'extérieur :
//
//     bord extérieur = L/2 − ET        bord intérieur = L/2 + ET
//
// Conséquences directes :
//   • ET plus grand  → la jante rentre sous l'aile.
//   • ET plus petit  → la jante ressort.
//   • À ET constant, élargir de ΔL fait sortir le bord extérieur de ΔL/2 ET
//     rentrer le bord intérieur de ΔL/2 — les deux à la fois.
//
// C'est ce dernier point qui rend l'alerte nécessaire : un acheteur de jantes
// forgées commande presque toujours plus large que l'origine, donc il n'existe
// pas de déport constructeur pour la taille exacte commandée. On repart de la
// monte d'origine la plus proche, on conserve son ET, et on chiffre en
// millimètres ce que ça déplace — à charge pour l'atelier de valider.

import { query } from "./db.js";
import { normalizeKey, bestMatch } from "./textMatch.js";

const MM_PAR_POUCE = 25.4;

/* ------------------------------------------------------------------ */
/* Lecture des libellés utilisés dans les commandes                     */
/* ------------------------------------------------------------------ */

function nombre(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** `19"` → 19 */
export function parseDiametre(label) {
  const n = nombre(label);
  return n !== null && n >= 10 && n <= 30 ? n : null;
}

/** `9,5J` → 9.5 */
export function parseLargeur(label) {
  const n = nombre(String(label).replace(/J/gi, ""));
  return n !== null && n >= 4 && n <= 16 ? n : null;
}

/**
 * `9,5J` → { avant: 9.5, arriere: 9.5 }
 * `9,5J avant / 10,5J arrière` → { avant: 9.5, arriere: 10.5 }
 * (format produit par la fiche produit quand la commande est en montage
 * décalé — voir src/pages/catalogue/[family]/[slug].astro)
 */
export function parseLargeurs(widthLabel) {
  const texte = String(widthLabel || "");
  if (/avant/i.test(texte) && /arri/i.test(texte)) {
    const [av, ar] = texte.split("/");
    const avant = parseLargeur(av);
    const arriere = parseLargeur(ar);
    if (avant !== null || arriere !== null) {
      return { avant: avant ?? arriere, arriere: arriere ?? avant, decale: avant !== arriere };
    }
  }
  const l = parseLargeur(texte);
  return { avant: l, arriere: l, decale: false };
}

/** `ET35`, `35`, `+35` → 35 ; `ET-5` → −5 */
export function parseDeport(value) {
  const n = nombre(String(value).replace(/ET/gi, ""));
  return n !== null && n >= -80 && n <= 100 ? Math.round(n) : null;
}

export function formatDeport(n) {
  return n === null || n === undefined ? null : `ET${Math.round(n)}`;
}

/* ------------------------------------------------------------------ */
/* Règle de sélection                                                   */
/* ------------------------------------------------------------------ */

// Le diamètre pèse plus lourd que la largeur : c'est lui qui identifie une
// monte d'origine. Entre deux montes également proches en largeur, on retient
// la plus large — son déport tient déjà compte d'une jante plus encombrante,
// donc l'écart à corriger est moindre.
function choisirBase(montes, diametre, largeur) {
  const ecart = (m) => {
    const dD = m.diametre !== null && diametre !== null ? Math.abs(m.diametre - diametre) : 99;
    const dL = m.largeur !== null && largeur !== null ? Math.abs(m.largeur - largeur) : 9;
    return dD * 10 + dL;
  };
  return [...montes].sort((a, b) => ecart(a) - ecart(b) || (b.largeur || 0) - (a.largeur || 0))[0];
}

function formatTaille(m) {
  const d = m.diametre !== null ? `${String(m.diametre).replace(".", ",")}″` : "?";
  const l = m.largeur !== null ? `${String(m.largeur).replace(".", ",")}J` : "?";
  return `${d}×${l}`;
}

/**
 * Propose le déport pour une taille commandée, à partir des montes d'origine
 * du véhicule. Renvoie null si aucune monte exploitable n'est connue — c'est
 * un cas normal (véhicule absent du jeu de données), pas une erreur : la fiche
 * commande reste alors renseignable à la main.
 */
export function proposeDeportPourTaille(montes, { diametre, largeur }) {
  const utilisables = (montes || []).filter((m) => Number.isFinite(m.deport));
  if (utilisables.length === 0) return null;

  const base = choisirBase(utilisables, diametre, largeur);
  const exactDiametre = base.diametre !== null && diametre !== null && base.diametre === diametre;
  const exactLargeur = base.largeur !== null && largeur !== null && base.largeur === largeur;
  const exact = exactDiametre && exactLargeur;

  // Plusieurs versions du même modèle peuvent proposer la même taille avec des
  // déports différents (Elegance vs AMG). Tant qu'on n'a pas tranché la
  // finition, on ne choisit pas à leur place.
  const memeTaille = utilisables.filter(
    (m) => m.diametre === base.diametre && m.largeur === base.largeur
  );
  const deportsConcurrents = [...new Set(memeTaille.map((m) => m.deport))];

  const ecartLargeur =
    base.largeur !== null && largeur !== null ? Math.round((largeur - base.largeur) * 100) / 100 : null;
  const deplacement = ecartLargeur !== null ? Math.round((ecartLargeur * MM_PAR_POUCE) / 2) : null;

  const proposition = {
    deport: base.deport,
    entraxe: base.entraxe || null,
    base: {
      diametre: base.diametre,
      largeur: base.largeur,
      deport: base.deport,
      entraxe: base.entraxe || null,
      finition: base.finition || null,
      taille: formatTaille(base),
    },
    exact,
    ecartLargeurPouces: ecartLargeur,
    // Signés : positif = le bord sort / rentre d'autant. À ET conservé les deux
    // valeurs sont égales, la jante s'élargit symétriquement.
    deplacementExterieurMm: deplacement,
    deplacementInterieurMm: deplacement,
    // Les deux bornes utiles à l'atelier s'il veut privilégier un côté.
    deportMemeBordExterieur: deplacement !== null ? base.deport + deplacement : null,
    deportMemeBordInterieur: deplacement !== null ? base.deport - deplacement : null,
    deportsConcurrents: deportsConcurrents.length > 1 ? deportsConcurrents : null,
    montesConnues: utilisables.length,
  };

  proposition.confiance = exact
    ? deportsConcurrents.length > 1
      ? "moyenne"
      : "haute"
    : Math.abs(ecartLargeur ?? 9) <= 0.5
      ? "moyenne"
      : "faible";
  proposition.verificationRequise = !exact || deportsConcurrents.length > 1;
  proposition.note = redigerNote(proposition);
  return proposition;
}

function redigerNote(p) {
  const parties = [];
  const finition = p.base.finition ? ` (${p.base.finition})` : "";

  if (p.exact) {
    parties.push(
      `Monte d'origine exacte : ${p.base.taille} ${formatDeport(p.base.deport)}${finition}.`
    );
  } else {
    parties.push(
      `Pas de monte d'origine dans la taille commandée. Base retenue : ${p.base.taille} ${formatDeport(
        p.base.deport
      )}${finition}.`
    );
    if (p.ecartLargeurPouces) {
      const signe = p.ecartLargeurPouces > 0 ? "plus large" : "plus étroite";
      const mm = Math.abs(p.deplacementExterieurMm);
      const sens = p.ecartLargeurPouces > 0 ? "sort" : "rentre";
      const contre = p.ecartLargeurPouces > 0 ? "rentre" : "sort";
      parties.push(
        `La jante commandée est ${signe} de ${Math.abs(p.ecartLargeurPouces)
          .toString()
          .replace(".", ",")}″ : à ${formatDeport(
          p.deport
        )} conservé, elle ${sens} de ${mm} mm vers l'extérieur et ${contre} de ${mm} mm vers l'intérieur.`
      );
      parties.push(
        `Pour garder le bord extérieur d'origine : ${formatDeport(
          p.deportMemeBordExterieur
        )}. Pour garder le dégagement intérieur : ${formatDeport(p.deportMemeBordInterieur)}.`
      );
    }
  }

  if (p.deportsConcurrents) {
    parties.push(
      `Attention : cette taille existe d'origine avec plusieurs déports (${p.deportsConcurrents
        .map(formatDeport)
        .join(", ")}) selon la version — à trancher avec le client.`
    );
  }
  return parties.join(" ");
}

/**
 * Applique la règle aux deux trains d'une commande (montage décalé compris).
 */
export function proposeFitment(montes, { sizeLabel, widthLabel }) {
  const diametre = parseDiametre(sizeLabel);
  const largeurs = parseLargeurs(widthLabel);

  const avant = proposeDeportPourTaille(montes, { diametre, largeur: largeurs.avant });
  const arriere = largeurs.decale
    ? proposeDeportPourTaille(montes, { diametre, largeur: largeurs.arriere })
    : avant;

  if (!avant && !arriere) return null;

  const resume = largeurs.decale
    ? [
        avant ? `${formatDeport(avant.deport)} avant` : "avant inconnu",
        arriere ? `${formatDeport(arriere.deport)} arrière` : "arrière inconnu",
      ].join(" / ")
    : formatDeport(avant?.deport);

  return {
    decale: largeurs.decale,
    avant,
    arriere,
    resume,
    entraxe: avant?.entraxe || arriere?.entraxe || null,
    verificationRequise: Boolean(avant?.verificationRequise || arriere?.verificationRequise),
    confiance:
      [avant, arriere].some((p) => p?.confiance === "faible")
        ? "faible"
        : [avant, arriere].some((p) => p?.confiance === "moyenne")
          ? "moyenne"
          : "haute",
  };
}

/* ------------------------------------------------------------------ */
/* Accès aux données constructeur                                       */
/* ------------------------------------------------------------------ */

export async function countOeFitments() {
  const rows = await query(
    "select count(*)::int as n, count(distinct marque_norm)::int as marques from oe_fitments"
  );
  return { lignes: rows[0]?.n || 0, marques: rows[0]?.marques || 0 };
}

export async function isOeFitmentDbLoaded() {
  try {
    const { lignes } = await countOeFitments();
    return lignes > 0;
  } catch {
    return false;
  }
}

const FILTRE_ANNEE = `
  and (
    $ANNEE::int is null
    or (coalesce(annee_debut, 1900) <= $ANNEE::int and coalesce(annee_fin, 2100) >= $ANNEE::int)
  )`;

/**
 * Retrouve les montes d'origine d'un véhicule. Cascade volontairement prudente :
 * marque → modèle → finition. À chaque étage on refuse de deviner, et on
 * remonte ce qu'on a vu pour que l'admin comprenne pourquoi ça n'a pas abouti.
 */
export async function findOeFitments({ marque, modele, annee, finition }) {
  const trace = [];
  const an = annee ? Number(String(annee).match(/(19|20)\d{2}/)?.[0]) || null : null;

  if (!marque) return { montes: [], trace, note: "Marque inconnue — recherche impossible." };

  // 1) Marque. Correspondance exacte d'abord, sinon rapprochement sur la liste
  //    réelle du jeu de données (« MERCEDES » vs « Mercedes-Benz »).
  const cle = normalizeKey(marque);
  let marqueNorm = cle;
  const exacte = await query("select 1 from oe_fitments where marque_norm = $1 limit 1", [cle]);
  if (exacte.length === 0) {
    const rows = await query("select distinct marque, marque_norm from oe_fitments");
    if (rows.length === 0) {
      return { montes: [], trace, note: "Aucune donnée constructeur importée — voir /admin/fitments." };
    }
    const choix = bestMatch(rows.map((r) => r.marque), marque);
    if (!choix) {
      return {
        montes: [],
        trace,
        note: `Marque « ${marque} » absente du jeu de données (${rows.length} marques importées).`,
      };
    }
    marqueNorm = rows.find((r) => r.marque === choix).marque_norm;
    trace.push(`marque : ${marque} → ${choix}`);
  }

  // 2) Modèle.
  const modeles = await query(
    `select distinct modele, modele_norm from oe_fitments where marque_norm = $1 ${FILTRE_ANNEE.replaceAll(
      "$ANNEE",
      "$2"
    )}`,
    [marqueNorm, an]
  );
  if (modeles.length === 0) {
    return {
      montes: [],
      trace,
      note: `Aucun modèle référencé pour cette marque${an ? ` en ${an}` : ""}.`,
    };
  }
  const modeleChoisi = bestMatch(modeles.map((m) => m.modele), modele, finition);
  if (!modeleChoisi) {
    return {
      montes: [],
      trace,
      note: `Modèle « ${modele || "?"} » introuvable. Modèles connus pour cette marque : ${modeles
        .slice(0, 12)
        .map((m) => m.modele)
        .join(", ")}${modeles.length > 12 ? "…" : ""}`,
    };
  }
  trace.push(`modèle : ${modele || "?"} → ${modeleChoisi}`);
  const modeleNorm = modeles.find((m) => m.modele === modeleChoisi).modele_norm;

  // 3) Tailles.
  const rows = await query(
    `select finition, diametre, largeur, deport, entraxe, alesage, annee_debut, annee_fin
       from oe_fitments
      where marque_norm = $1 and modele_norm = $2 ${FILTRE_ANNEE.replaceAll("$ANNEE", "$3")}
      order by diametre, largeur`,
    [marqueNorm, modeleNorm, an]
  );

  let montes = rows.map((r) => ({
    finition: r.finition,
    diametre: r.diametre === null ? null : Number(r.diametre),
    largeur: r.largeur === null ? null : Number(r.largeur),
    deport: r.deport === null ? null : Number(r.deport),
    entraxe: r.entraxe,
    alesage: r.alesage === null ? null : Number(r.alesage),
  }));

  // 4) Finition. Une E320 et une E63 AMG n'ont pas le même déport : quand le
  //    jeu de données distingue les versions et qu'on connaît celle du client,
  //    on restreint. Sinon on garde tout et la proposition signalera elle-même
  //    les déports concurrents.
  const finitions = [...new Set(montes.map((m) => m.finition).filter(Boolean))];
  if (finition && finitions.length > 1) {
    const choix = bestMatch(finitions, finition, finition);
    if (choix) {
      montes = montes.filter((m) => m.finition === choix);
      trace.push(`finition : ${finition} → ${choix} (parmi ${finitions.length})`);
    } else {
      trace.push(
        `finition : « ${finition} » ne correspond à aucune des ${finitions.length} versions référencées — toutes conservées.`
      );
    }
  }

  return { montes, trace, modele: modeleChoisi, finitions, note: null };
}

/**
 * Chaîne complète pour une commande : véhicule → montes d'origine → déport
 * proposé. Ne lève jamais : une commande ne doit pas échouer parce que le jeu
 * de données ne connaît pas la voiture.
 */
export async function proposeFitmentPourCommande(vehicule, { sizeLabel, widthLabel }) {
  try {
    const { montes, trace, note, modele, finitions } = await findOeFitments(vehicule);
    const proposition = montes.length ? proposeFitment(montes, { sizeLabel, widthLabel }) : null;
    return {
      proposition,
      montes,
      trace,
      note: note || (proposition ? null : "Montes d'origine trouvées mais aucun déport exploitable."),
      modele,
      finitions,
    };
  } catch (err) {
    return { proposition: null, montes: [], trace: [], note: `Recherche indisponible : ${err.message}` };
  }
}

// Rapprochement de libellés véhicule entre deux sources qui ne les écrivent
// jamais pareil : le fournisseur de plaques renvoie « MERCEDES » / « CLASSE E »
// là où une base de cotes écrira « Mercedes-Benz » / « E-Class » ou « Classe E ».
// On compare donc des mots normalisés, pas des chaînes.

export function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Termes de gamme : ils changent de langue et de position d'une source à
// l'autre sans rien identifier ("Classe E" / "E-Class" / "E Klasse").
const FILLER = /^(CLASSE|CLASS|KLASSE|SERIE|SERIES|REIHE|THE|DE|LE|LA)$/;

// Carrosseries : chaque source a sa langue. Le fournisseur de cotes écrit
// « Convertible » là où la carte grise dit « Cabriolet », et ces mots-là sont
// souvent le seul élément qui distingue deux versions aux déports différents.
const SYNONYMES = [
  ["CABRIOLET", "CONVERTIBLE", "ROADSTER", "CABRIO", "SPIDER"],
  ["COUPE", "COUPÉ", "FASTBACK"],
  ["BERLINE", "SALOON", "SEDAN", "LIMOUSINE"],
  ["BREAK", "ESTATE", "WAGON", "TOURING", "SPORTBRAKE", "SW", "AVANT"],
  ["MONOSPACE", "MPV", "VAN"],
];
const CANON = new Map();
for (const groupe of SYNONYMES) for (const mot of groupe) CANON.set(mot, groupe[0]);

export function tokens(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    // Une cylindrée est un seul mot : découper « 2.0 » en « 2 » et « 0 »
    // ferait ressembler une 2.7 à une 2.0 par le chiffre des unités.
    .replace(/(\d)[.,](\d)/g, "$1$2")
    .split(/[^A-Z0-9]+/)
    .filter((t) => t && !FILLER.test(t))
    .map((t) => CANON.get(t) || t);
}

/**
 * Un libellé de version peut couvrir plusieurs motorisations d'un coup
 * (« 2.0T / 2.2D / 3.0D V6 », « D150 / D180 / D240 »). On le découpe pour
 * pouvoir reconnaître celle du client dedans, sans perdre le libellé entier
 * qui reste une variante valable.
 */
function variantes(libelle) {
  const texte = String(libelle || "");
  const parts = texte
    .split(/[/·|]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? [texte, ...parts] : [texte];
}

// Un jeton porte une information distinctive s'il contient un chiffre (une
// cylindrée, un code moteur) ou s'il est assez long pour ne pas être un
// article. « 3.0D » distingue, « S » ne distingue rien.
const distinctif = (t) => /\d/.test(t) || t.length >= 4;

/**
 * Choisit dans `candidates` le libellé qui désigne le mieux `wanted`.
 *
 * `hint` sert à départager : « CLASSE E » se réduit au seul mot « E », qui
 * matcherait par préfixe aussi bien E320 que E350 ou E55. La finition
 * (« E320 CDI ELEGANCE BA ») tranche. Sans elle, on préfère ne rien renvoyer
 * plutôt que de retenir un homonyme au hasard — une cote fausse coûte plus
 * cher qu'une absence de cote.
 */
export function bestMatch(candidates, wanted, hint) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const flat = (v) => tokens(v).join("");
  const target = flat(wanted);
  const wantedTokens = tokens(wanted);
  const hintTokens = hint ? tokens(hint) : [];
  const hintFlat = hintTokens.join("");
  if (!target && !hintFlat) return null;

  const noter = (variante) => {
    const ct = tokens(variante);
    const cf = ct.join("");
    let score = 0;

    if (target && cf === target) score += 100;
    if (target && ct.length && wantedTokens.every((t) => ct.includes(t))) score += 40;

    // Un rapprochement par préfixe n'a de valeur que sur une chaîne un peu
    // longue : « E » contre « E320 » ne prouve rien.
    if (target && target.length >= 3 && (cf.startsWith(target) || target.startsWith(cf))) score += 30;
    if (target && target.length >= 4 && (cf.includes(target) || target.includes(cf))) score += 20;

    // Signal fort : le libellé du candidat apparaît dans la finition réelle.
    if (hintFlat && cf && (hintFlat.includes(cf) || hintTokens.includes(cf))) score += 60;
    if (hintTokens.length && ct.length && ct.every((t) => hintTokens.includes(t))) score += 25;

    // Recouvrement partiel : « F-Type Convertible 5.0 V8 » et « F-TYPE
    // CABRIOLET 5.0 V8 R » ne seront jamais égaux, mais partagent tout ce qui
    // compte. On n'accorde ce point qu'à des jetons porteurs de sens — sinon
    // deux versions se ressembleraient par leurs mots vides.
    if (hintTokens.length && ct.length) {
      const communs = ct.filter((t) => hintTokens.includes(t));
      const utiles = communs.filter(distinctif);
      if (utiles.length > 0) {
        score += 20 * (communs.length / ct.length) + 10 * utiles.length;
      }
    }

    return { score, len: cf.length };
  };

  const scored = candidates.map((c) => {
    // Chaque libellé est jugé sur sa meilleure lecture : entier, ou réduit à
    // l'une des motorisations qu'il regroupe.
    const meilleur = variantes(c)
      .map(noter)
      .sort((a, b) => b.score - a.score)[0];
    return { c, ...meilleur };
  });

  scored.sort((a, b) => b.score - a.score || b.len - a.len);
  // Une seule tête : deux candidats à égalité veulent dire qu'on ne sait pas
  // trancher, et on préfère l'admettre.
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].score > 0 ? scored[0].c : null;
}

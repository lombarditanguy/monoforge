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

export function tokens(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t && !FILLER.test(t));
}

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

  const scored = candidates.map((c) => {
    const ct = tokens(c);
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

    return { c, score, len: cf.length };
  });

  scored.sort((a, b) => b.score - a.score || b.len - a.len);
  return scored[0].score > 0 ? scored[0].c : null;
}

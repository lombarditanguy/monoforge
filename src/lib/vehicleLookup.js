// Identification du véhicule à partir de sa plaque, via un revendeur SIV
// (auto-ways.net) :
//   GET https://app.auto-ways.net/api/v1/fr?plaque=XX123XX&token=...&country=fr
//
// La structure exacte de leur réponse n'est pas documentée publiquement — le
// parsing ci-dessous cherche les champs par nom à n'importe quelle profondeur
// et conserve systématiquement la réponse brute (`raw`) pour que l'admin
// puisse vérifier à la main si un champ n'est pas au bon endroit.
//
// Les COTES du véhicule ne se cherchent PAS ici : elles viennent du jeu de
// données européen chargé depuis /admin/fitments (voir fitment.js), qui les
// connaît par véhicule. Ce fichier ne garde qu'une table d'entraxes par marque,
// en secours pour les véhicules absents de ce jeu de données.
//
// Un fournisseur de cotes par API a été branché ici puis retiré : tire.vdim.app,
// dont le catalogue est nord-américain. Sur une immatriculation française il ne
// pouvait qu'échouer — ou pire, renvoyer le déport d'une version américaine
// homonyme. Son code est dans l'historique git si le besoin revient.

import { guessBoltPattern } from "./boltPatterns.js";

export function isPlateLookupConfigured() {
  return Boolean(process.env.AUTOWAYS_API_KEY);
}

export async function lookupVehicleByPlate(plaque) {
  const token = process.env.AUTOWAYS_API_KEY;
  if (!token) {
    throw new Error(
      "Recherche par plaque non configurée : ajoute AUTOWAYS_API_KEY (ou l'équivalent du fournisseur choisi) dans les variables d'environnement Vercel, puis redéploie."
    );
  }

  const url = new URL("https://app.auto-ways.net/api/v1/fr");
  url.searchParams.set("plaque", plaque.replace(/[^A-Z0-9]/gi, ""));
  url.searchParams.set("token", token);
  url.searchParams.set("country", "fr");

  const res = await fetch(url);
  const bodyText = await res.text();
  let raw = null;
  try {
    raw = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    raw = null;
  }
  if (!res.ok || !raw) {
    // On remonte un extrait du corps réel : c'est ce qui permet de comprendre
    // un refus du fournisseur (jeton, quota, format) sans avoir à deviner.
    const extrait = bodyText ? ` — réponse : ${bodyText.slice(0, 200)}` : " — réponse vide";
    throw new Error(`Recherche plaque échouée (HTTP ${res.status})${extrait}`);
  }

  // La structure exacte de la réponse n'est pas documentée publiquement : on
  // cherche les champs par nom à n'importe quelle profondeur plutôt que de
  // parier sur une arborescence précise.
  const marque = deepFind(raw, ["marque", "make", "brand", "marquevehicule", "carmake"]);
  // Volontairement sans "version" : chez auto-ways c'est la finition
  // ("E320 CDI ELEGANCE BA"), pas le modèle attendu par les bases de fitment.
  const modele = deepFind(raw, ["modele", "model", "modelevehicule", "carmodel"]);

  // La finition conditionne les cotes d'origine (donc le déport) : sans elle,
  // on ne saurait pas distinguer une E320 d'une E63 AMG.
  const finition = deepFind(raw, ["version", "finition", "trim", "grade"]);
  const dateMiseEnCirculation = deepFind(raw, [
    "datemiseencirculation",
    "circulationdate",
    "date1ereimmat",
    "datepremiereimmatriculation",
    "dateimmat",
    "year",
    "annee",
  ]);
  const anneeMatch = dateMiseEnCirculation ? String(dateMiseEnCirculation).match(/(19|20)\d{2}/) : null;
  const annee = anneeMatch ? anneeMatch[0] : null;

  // Sans marque, la réponse contient presque toujours un message d'erreur du
  // fournisseur (jeton invalide, crédits épuisés, plaque inconnue) : on le
  // remonte tel quel plutôt que de laisser un « non identifié » opaque.
  if (!marque) {
    // On cherche d'abord un libellé, puis seulement un champ d'état : sinon on
    // remonterait le booléen `error: true` au lieu du message explicatif.
    const providerMessage = [
      deepFind(raw, ["message"]),
      deepFind(raw, ["erreur", "detail", "description"]),
      deepFind(raw, ["error", "status"]),
    ].find((v) => typeof v === "string" && v.trim());
    if (providerMessage) {
      throw new Error(`Réponse du fournisseur de plaques : ${providerMessage}`);
    }
  }

  return { marque, modele, annee, finition, raw };
}

// Entraxe par marque, en secours quand le véhicule est absent du jeu de données
// constructeur. C'est une valeur de gamme, pas une valeur de véhicule : elle
// pré-remplit la fiche pour faire gagner du temps, elle ne tranche rien.
//
// Le déport n'y figure pas et n'y figurera pas : il dépend du véhicule ET de la
// largeur montée, donc il ne se déduit pas d'une marque. Il vient des cotes
// constructeur. Sur une commande catalogue c'est à nous de le déterminer —
// l'acheteur prend la jante telle quelle et n'a pas à connaître cette cote.
export function fitmentFromTable(marque, modele, annee) {
  const guess = guessBoltPattern(marque, modele, annee);
  if (!guess) {
    return {
      entraxe: null,
      deport: null,
      source: "table",
      note: `Marque « ${marque || "?"} » absente de la table des entraxes — à renseigner à la main.`,
    };
  }
  return {
    entraxe: guess.entraxe,
    deport: null,
    source: "table",
    confiance: guess.confiance,
    note: guess.note,
  };
}

// Cherche récursivement une valeur dans une réponse JSON dont on ne connaît
// pas la structure exacte, en testant plusieurs noms de champs plausibles.
// Les fournisseurs de fitment n'exposent pas tous la même arborescence, et
// leurs docs sont inaccessibles au scraping : on reste tolérant, et la
// réponse brute est de toute façon conservée pour ajuster au premier appel réel.
// Les fournisseurs préfixent souvent leurs champs (auto-ways renvoie
// AWN_marque, AWN_modele...). On accepte donc aussi les clés qui se
// *terminent* par le nom cherché, en privilégiant toujours une
// correspondance exacte quand il y en a une au même niveau.
function usableValue(v) {
  if (v === null || v === "" || typeof v === "object") return false;
  // "INCONNU" est le marqueur d'absence de donnée chez auto-ways.
  return String(v).toUpperCase() !== "INCONNU";
}

function deepFind(node, keys, depth = 0) {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = deepFind(entry, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  const entries = Object.entries(node).filter(([, v]) => usableValue(v));
  const normalize = (k) => k.toLowerCase().replace(/[^a-z]/g, "");

  for (const [k, v] of entries) {
    if (keys.includes(normalize(k))) return v;
  }
  for (const [k, v] of entries) {
    const n = normalize(k);
    if (keys.some((key) => n.endsWith(key))) return v;
  }

  for (const v of Object.values(node)) {
    const found = deepFind(v, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

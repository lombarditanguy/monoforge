// Recherche véhicule à partir d'une plaque d'immatriculation, en 2 étapes :
//
//   1) plaque -> marque/modèle/année, via un revendeur SIV (ex: auto-ways.net).
//      Format confirmé depuis leur exemple public :
//      GET https://app.auto-ways.net/api/v1/fr?plaque=XX123XX&token=...&country=fr
//
//   2) marque/modèle/année -> entraxe/déport, via l'API Wheel-Size.
//      GET https://api.wheel-size.com/v2/search/by_model/?make=...&model=...&year=...&region=eudm&user_key=...
//
// Aucune des deux réponses JSON exactes n'a pu être vérifiée en détail (docs
// fournisseur bloquant le scraping) — le parsing ci-dessous essaie plusieurs
// noms de champs plausibles et conserve systématiquement la réponse brute
// (`raw`) pour que l'admin puisse vérifier/corriger à la main si un champ
// n'est pas au bon endroit. À ajuster dès la première vraie recherche.

import { guessBoltPattern } from "./boltPatterns.js";

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

export function isPlateLookupConfigured() {
  return Boolean(process.env.AUTOWAYS_API_KEY);
}

export function isFitmentLookupConfigured() {
  return Boolean(process.env.VDIM_API_KEY || process.env.WHEELSIZE_API_KEY);
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
  const modele = deepFind(raw, ["modele", "model", "modelevehicule", "carmodel", "version"]);
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
    const providerMessage = deepFind(raw, ["error", "message", "erreur", "status", "detail"]);
    if (providerMessage) {
      throw new Error(`Réponse du fournisseur de plaques : ${providerMessage}`);
    }
  }

  return { marque, modele, annee, raw };
}

// Entraxe depuis la table interne (gratuite, sans API). C'est la source par
// défaut : le déport n'est volontairement pas déduit ici, c'est un paramètre
// de conception défini avec le client sur une jante sur mesure.
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
function deepFind(node, keys, depth = 0) {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = deepFind(entry, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [k, v] of Object.entries(node)) {
    const normalized = k.toLowerCase().replace(/[^a-z]/g, "");
    if (keys.includes(normalized) && v !== null && v !== "" && typeof v !== "object") {
      return v;
    }
  }
  for (const v of Object.values(node)) {
    const found = deepFind(v, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

// tire.vdim.app — authentification par en-tête x-api-key.
// L'endpoint exact des données de jante n'a pas pu être vérifié depuis leur
// documentation (site protégé contre le scraping) : on essaie les chemins les
// plus probables l'un après l'autre et on garde le premier qui répond.
const VDIM_FITMENT_PATHS = [
  "/api/v1/by_vehicle/wheelfitment/",
  "/api/v1/by_vehicle/wheel_fitment/",
  "/api/v1/by_vehicle/wheelsize/",
  "/api/v1/by_vehicle/tiresize/",
];

export async function lookupFitmentVdim(marque, modele, annee) {
  const apiKey = process.env.VDIM_API_KEY;
  if (!apiKey) throw new Error("VDIM_API_KEY manquante.");
  if (!marque) throw new Error("Marque manquante — impossible de chercher l'entraxe/déport.");

  const attempts = [];
  for (const path of VDIM_FITMENT_PATHS) {
    const url = new URL(path, "https://tire.vdim.app");
    url.searchParams.set("make", marque);
    if (modele) url.searchParams.set("model", modele);
    if (annee) url.searchParams.set("year", annee);

    let res;
    try {
      res = await fetch(url, { headers: { "x-api-key": apiKey } });
    } catch (err) {
      attempts.push(`${path} -> ${err.message}`);
      continue;
    }
    if (!res.ok) {
      attempts.push(`${path} -> HTTP ${res.status}`);
      continue;
    }
    const raw = await res.json().catch(() => null);
    if (!raw) {
      attempts.push(`${path} -> réponse illisible`);
      continue;
    }

    const entraxe = deepFind(raw, ["boltpattern", "pcd", "boltcircle", "entraxe"]);
    const deport = deepFind(raw, ["offset", "et", "rimoffset", "deport"]);
    return {
      entraxe: entraxe ? String(entraxe) : null,
      deport: deport ? String(deport) : null,
      raw: { endpoint: path, response: raw },
    };
  }

  throw new Error(`Aucun endpoint tire.vdim.app n'a répondu (${attempts.join(" ; ")}).`);
}

export async function lookupFitment(marque, modele, annee) {
  if (process.env.VDIM_API_KEY) {
    return lookupFitmentVdim(marque, modele, annee);
  }

  const userKey = process.env.WHEELSIZE_API_KEY;
  if (!userKey) {
    throw new Error(
      "Recherche entraxe/déport non configurée : ajoute VDIM_API_KEY (tire.vdim.app) ou WHEELSIZE_API_KEY dans les variables d'environnement Vercel, puis redéploie."
    );
  }
  if (!marque || !modele) {
    throw new Error("Marque/modèle manquants — impossible de chercher l'entraxe/déport.");
  }

  const url = new URL("https://api.wheel-size.com/v2/search/by_model/");
  url.searchParams.set("make", marque);
  url.searchParams.set("model", modele);
  if (annee) url.searchParams.set("year", annee);
  url.searchParams.set("region", "eudm");
  url.searchParams.set("user_key", userKey);

  const res = await fetch(url);
  const raw = await res.json().catch(() => null);
  if (!res.ok || !raw) {
    throw new Error(`Recherche entraxe/déport échouée (HTTP ${res.status}).`);
  }

  const first = Array.isArray(raw.data) ? raw.data[0] : null;
  const technical = first?.technical || {};
  const entraxe = firstDefined(technical.bolt_pattern, technical.pcd && `${technical.pcd}`);
  const deport = firstDefined(technical.offset, technical.et, technical.deport);

  return { entraxe, deport, raw };
}

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
// « CLASSE E » et « E-Class » désignent le même modèle : le rapprochement des
// libellés est mutualisé avec la recherche des cotes constructeur.
import { bestMatch, decrireCandidats } from "./textMatch.js";

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

// Entraxe depuis la table interne (gratuite, sans API). Le déport n'y figure
// pas : il dépend du véhicule ET de la largeur commandée, donc il vient de
// l'API de fitment. Sur une commande catalogue c'est à nous de le déterminer
// — l'acheteur prend la jante telle quelle et n'a pas à connaître cette cote.
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

// tire.vdim.app — authentification par en-tête x-api-key.
//
// Structure confirmée par leurs messages d'erreur : /api/v1/by_vehicle/{type}/
// où {type} vaut make, model, trim ou tiresize. C'est un sélecteur en cascade,
// et `tiresize` exige year + make + model + trim. On remonte donc la chaîne
// avant de demander les cotes.
//
// Complication : auto-ways renvoie des libellés français ("MERCEDES",
// "CLASSE E") là où ce fournisseur attend les siens ("Mercedes-Benz",
// "E-Class"). Plutôt que de figer une table de traduction, on récupère ses
// propres listes et on y cherche la meilleure correspondance.

const VDIM_BASE = "https://tire.vdim.app";

async function vdimGet(type, params, apiKey) {
  const url = new URL(`/api/v1/by_vehicle/${type}/`, VDIM_BASE);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  let res;
  try {
    res = await fetch(url, { headers: { "x-api-key": apiKey } });
  } catch (err) {
    return { ok: false, status: 0, text: err.message, json: null };
  }
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

// Extrait une liste de libellés d'une réponse dont on ne connaît pas la forme
// (tableau nu, {data:[...]}, [{name:...}], [{make:...}]...).
function extractLabels(json) {
  const seen = [];
  const walk = (node, depth = 0) => {
    if (node === null || depth > 5) return;
    if (typeof node === "string") {
      if (node.trim()) seen.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const v of node) walk(v, depth + 1);
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === "string" && /^(name|label|make|model|trim|value|title)$/i.test(k)) {
          if (v.trim()) seen.push(v);
        } else {
          walk(v, depth + 1);
        }
      }
    }
  };
  walk(json);
  return [...new Set(seen)];
}

export async function lookupFitmentVdim(marque, modele, annee, finition) {
  const apiKey = process.env.VDIM_API_KEY;
  if (!apiKey) throw new Error("VDIM_API_KEY manquante.");
  if (!marque) throw new Error("Marque manquante — impossible de chercher le déport.");
  if (!annee) throw new Error("Année inconnue — requise par tire.vdim.app.");

  const trace = [];

  // 1) Marque : on aligne le libellé français sur celui du fournisseur.
  const makesRes = await vdimGet("make", { year: annee }, apiKey);
  if (!makesRes.ok) {
    throw new Error(`Liste des marques refusée (HTTP ${makesRes.status} ${makesRes.text.slice(0, 200)})`);
  }
  const makes = extractLabels(makesRes.json);
  const make = bestMatch(makes, marque);
  if (!make) {
    throw new Error(`Marque « ${marque} » absente de leur catalogue (${makes.length} marques connues).`);
  }
  trace.push(`make: ${marque} -> ${make}`);

  // 2) Modèle.
  const modelsRes = await vdimGet("model", { make, year: annee }, apiKey);
  if (!modelsRes.ok) {
    throw new Error(`Liste des modèles refusée (HTTP ${modelsRes.status} ${modelsRes.text.slice(0, 200)})`);
  }
  const models = extractLabels(modelsRes.json);
  // Leur catalogue nomme les modèles à l'américaine (E320, pas E-Class) : la
  // finition est souvent le seul élément qui permet de choisir le bon.
  const model = bestMatch(models, modele, finition);
  if (!model) {
    throw new Error(
      `Modèle « ${modele} » introuvable pour ${make} en ${annee}. ${decrireCandidats(models, modele, finition)}`
    );
  }
  trace.push(`model: ${modele} -> ${model}`);

  // 3) Finition : c'est elle qui fixe les cotes d'origine, donc le déport.
  // Une E320 et une E63 AMG n'ont pas le même déport : prendre la première
  // finition venue produirait une valeur fausse sans le dire. On exige donc
  // une correspondance avec la finition réelle du véhicule, et à défaut on
  // s'arrête en listant les possibilités plutôt que de deviner.
  const trimsRes = await vdimGet("trim", { make, model, year: annee }, apiKey);
  if (!trimsRes.ok) {
    throw new Error(`Liste des finitions refusée (HTTP ${trimsRes.status} ${trimsRes.text.slice(0, 200)})`);
  }
  const trims = extractLabels(trimsRes.json);
  if (trims.length === 0) throw new Error(`Aucune finition listée pour ${make} ${model} ${annee}.`);

  const preferred = trims.length === 1 ? trims[0] : bestMatch(trims, finition, finition);
  if (!preferred) {
    throw new Error(
      `Finition non déterminée : « ${finition || "inconnue"} » ne correspond à aucune de leurs ${
        trims.length
      } finitions. ${decrireCandidats(
        trims,
        finition,
        finition,
        10
      )} Le déport dépend de la finition — renseigne-le à la main plutôt que de risquer une valeur fausse.`
    );
  }
  trace.push(`trim: ${finition || "(non fournie)"} -> ${preferred}${trims.length > 1 ? ` (parmi ${trims.length})` : ""}`);

  // 4) Cotes. La finition la mieux notée peut n'avoir aucune cote référencée
  // (fréquent sur une version européenne absente d'un catalogue américain) :
  // on tente alors les autres finitions du même modèle avant d'abandonner.
  const ordered = [preferred, ...trims.filter((t) => t !== preferred)].slice(0, 4);
  const refus = [];
  for (const trim of ordered) {
    const specsRes = await vdimGet("tiresize", { year: annee, make, model, trim }, apiKey);
    if (!specsRes.ok) {
      refus.push(`${trim} -> HTTP ${specsRes.status}`);
      continue;
    }
    const entraxe = deepFind(specsRes.json, ["boltpattern", "pcd", "boltcircle", "entraxe"]);
    const deport = deepFind(specsRes.json, ["offset", "rimoffset", "deport", "et"]);
    if (!entraxe && !deport) {
      refus.push(`${trim} -> aucune cote dans la réponse`);
      continue;
    }
    if (trim !== preferred) trace.push(`repli sur la finition « ${trim} » (${preferred} sans cotes)`);
    return {
      entraxe: entraxe ? String(entraxe) : null,
      deport: deport ? String(deport) : null,
      raw: { trace, trims, trimUtilise: trim, response: specsRes.json },
    };
  }

  throw new Error(
    `${make} ${model} ${annee} : aucune cote référencée chez eux (${refus.join(" ; ")}). Catalogue probablement nord-américain — cette version européenne n'y figure pas.`
  );
}

export async function lookupFitment(marque, modele, annee, finition) {
  if (process.env.VDIM_API_KEY) {
    return lookupFitmentVdim(marque, modele, annee, finition);
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

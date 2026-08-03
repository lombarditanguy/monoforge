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
  return Boolean(process.env.WHEELSIZE_API_KEY);
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
  const raw = await res.json().catch(() => null);
  if (!res.ok || !raw) {
    throw new Error(`Recherche plaque échouée (HTTP ${res.status}).`);
  }

  const marque = firstDefined(raw.marque, raw.make, raw.brand, raw?.data?.marque, raw?.data?.make);
  const modele = firstDefined(raw.modele, raw.model, raw?.data?.modele, raw?.data?.model);
  const dateMiseEnCirculation = firstDefined(
    raw.date_mise_en_circulation,
    raw.circulation_date,
    raw.date_1ere_immat,
    raw?.data?.date_mise_en_circulation
  );
  const annee = dateMiseEnCirculation ? String(dateMiseEnCirculation).slice(0, 4) : null;

  return { marque, modele, annee, raw };
}

export async function lookupFitment(marque, modele, annee) {
  const userKey = process.env.WHEELSIZE_API_KEY;
  if (!userKey) {
    throw new Error(
      "Recherche entraxe/déport non configurée : ajoute WHEELSIZE_API_KEY dans les variables d'environnement Vercel, puis redéploie."
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

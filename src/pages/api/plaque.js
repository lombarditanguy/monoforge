import { lookupVehicleByPlate, isPlateLookupConfigured } from "../../lib/vehicleLookup.js";

export const prerender = false;

// Formats français acceptés :
//  - SIV (depuis 2009) : AA-123-AA
//  - FNI (avant 2009)  : 123 ABC 45
const SIV = /^[A-Z]{2}-?[0-9]{3}-?[A-Z]{2}$/;
const FNI = /^[0-9]{1,4}-? ?[A-Z]{2,3}-? ?[0-9]{2,3}$/;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const plaque = String(body?.plaque || "").trim().toUpperCase();
  if (!plaque) return jsonError("Renseignez une plaque d'immatriculation.");

  // On valide le format avant d'appeler le fournisseur : chaque appel est
  // facturé/décompté, inutile de le gaspiller sur une saisie manifestement
  // incorrecte — et ça protège le quota d'un formulaire public.
  if (!SIV.test(plaque) && !FNI.test(plaque)) {
    return jsonError("Format de plaque non reconnu. Attendu : AA-123-AA (ou 123 ABC 45 pour les anciennes plaques).");
  }

  if (!isPlateLookupConfigured()) {
    return jsonError("La vérification automatique est momentanément indisponible. Vous pouvez continuer : nous confirmerons votre véhicule avec vous.", 503);
  }

  try {
    const vehicle = await lookupVehicleByPlate(plaque);
    if (!vehicle.marque) {
      return jsonError("Véhicule introuvable pour cette plaque. Vérifiez la saisie — vous pouvez aussi continuer, nous confirmerons avec vous.", 404);
    }
    return new Response(
      JSON.stringify({
        ok: true,
        marque: vehicle.marque,
        modele: vehicle.modele,
        annee: vehicle.annee,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return jsonError("La vérification automatique n'a pas abouti. Vous pouvez continuer : nous confirmerons votre véhicule avec vous.", 502);
  }
}

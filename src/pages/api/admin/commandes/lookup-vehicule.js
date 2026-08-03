import { sql } from "../../../../lib/db.js";
import {
  lookupVehicleByPlate,
  lookupFitment,
  fitmentFromTable,
  isFitmentLookupConfigured,
} from "../../../../lib/vehicleLookup.js";

export const prerender = false;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(context) {
  // Toute erreur non prévue doit ressortir en JSON lisible : sans ce filet, la
  // fonction meurt avec un corps vide et l'admin ne voit qu'une erreur de
  // parsing JSON côté navigateur, sans aucune indication de la cause réelle.
  try {
    return await handlePost(context);
  } catch (err) {
    const message = /column .* does not exist/i.test(err.message)
      ? `La base n'est pas à jour (${err.message}). Ouvre /admin/setup et clique sur « Initialiser / vérifier les tables ».`
      : `Erreur inattendue : ${err.message}`;
    return jsonError(message, 500);
  }
}

async function handlePost({ request }) {
  const body = await request.json().catch(() => null);
  const id = Number(body?.id);
  if (!id) return jsonError("Commande invalide.");

  const [commande] = await sql`select id, plaque_immatriculation from commandes where id = ${id} limit 1`;
  if (!commande) return jsonError("Commande introuvable.", 404);
  if (!commande.plaque_immatriculation) return jsonError("Aucune plaque enregistrée pour cette commande.");

  let vehicle;
  try {
    vehicle = await lookupVehicleByPlate(commande.plaque_immatriculation);
  } catch (err) {
    return jsonError(err.message, 500);
  }

  // Entraxe : table interne par défaut (gratuite). Si une clé Wheel-Size est
  // configurée, on tente l'API d'abord et on retombe sur la table si elle échoue.
  let fitment = { entraxe: null, deport: null, raw: null, source: null };
  let fitmentError = null;
  if (!vehicle.marque) {
    fitmentError = "Marque non identifiée depuis la plaque — entraxe à renseigner à la main.";
  } else {
    if (isFitmentLookupConfigured()) {
      try {
        fitment = { ...(await lookupFitment(vehicle.marque, vehicle.modele, vehicle.annee, vehicle.finition)), source: "api" };
      } catch (err) {
        fitmentError = `API entraxe indisponible (${err.message}) — valeur issue de la table interne.`;
      }
    }
    if (!fitment.entraxe) {
      const table = fitmentFromTable(vehicle.marque, vehicle.modele, vehicle.annee);
      fitment = { ...fitment, entraxe: table.entraxe, source: table.source, confiance: table.confiance };
      if (table.note) fitmentError = table.note;
    }
  }

  const combinedRaw = { plate_lookup: vehicle.raw, fitment_lookup: fitment.raw };

  await sql`
    update commandes set
      vehicule_marque = ${vehicle.marque},
      vehicule_modele = ${vehicle.modele},
      entraxe = coalesce(${fitment.entraxe}, entraxe),
      deport = coalesce(${fitment.deport}, deport),
      vehicule_lookup_raw = ${JSON.stringify(combinedRaw)},
      updated_at = now()
    where id = ${id}
  `;

  return new Response(
    JSON.stringify({
      ok: true,
      marque: vehicle.marque,
      modele: vehicle.modele,
      annee: vehicle.annee,
      finition: vehicle.finition,
      entraxe: fitment.entraxe,
      deport: fitment.deport,
      source: fitment.source,
      confiance: fitment.confiance,
      fitmentError,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

import { sql } from "../../../../lib/db.js";
import { lookupVehicleByPlate, lookupFitment } from "../../../../lib/vehicleLookup.js";

export const prerender = false;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
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

  let fitment = { entraxe: null, deport: null, raw: null };
  let fitmentError = null;
  if (vehicle.marque && vehicle.modele) {
    try {
      fitment = await lookupFitment(vehicle.marque, vehicle.modele, vehicle.annee);
    } catch (err) {
      fitmentError = err.message;
    }
  } else {
    fitmentError = "Marque/modèle non identifiés depuis la plaque — entraxe/déport non recherchés.";
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
      entraxe: fitment.entraxe,
      deport: fitment.deport,
      fitmentError,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

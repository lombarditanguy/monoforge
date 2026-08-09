import { sql } from "../../../../lib/db.js";
import { lookupVehicleByPlate, fitmentFromTable } from "../../../../lib/vehicleLookup.js";
import { proposeFitmentPourCommande } from "../../../../lib/fitment.js";

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

  const [commande] = await sql`
    select id, plaque_immatriculation, taille, largeur from commandes where id = ${id} limit 1
  `;
  if (!commande) return jsonError("Commande introuvable.", 404);
  if (!commande.plaque_immatriculation) return jsonError("Aucune plaque enregistrée pour cette commande.");

  let vehicle;
  try {
    vehicle = await lookupVehicleByPlate(commande.plaque_immatriculation);
  } catch (err) {
    return jsonError(err.message, 500);
  }

  // Cotes constructeur : le jeu de données européen chargé depuis
  // /admin/fitments. C'est la seule source qui connaît le véhicule lui-même —
  // elle donne le déport de la monte d'origine, l'alésage, et l'entraxe.
  const oe = await proposeFitmentPourCommande(vehicle, {
    sizeLabel: commande.taille,
    widthLabel: commande.largeur,
  });
  const propose = oe.proposition;

  // Entraxe : les cotes constructeur d'abord, la table interne en secours.
  //
  // L'ordre compte. La table raisonne par marque (« Mercedes = 5x112 »), le jeu
  // de données par véhicule : quand un constructeur mélange les entraxes dans sa
  // gamme, la table se trompe là où le fichier a raison. Elle reste utile quand
  // le véhicule est absent du fichier, mais elle ne doit jamais passer devant.
  //
  // Il n'y a plus d'appel à une API de cotes : la seule branchée était
  // tire.vdim.app, dont le catalogue est nord-américain. Sur une immatriculation
  // française elle ne pouvait qu'échouer — ou pire, renvoyer le déport d'une
  // version américaine homonyme.
  let entraxe = propose?.entraxe || null;
  let entraxeSource = entraxe ? "constructeur" : null;
  let entraxeConfiance = entraxe ? "haute" : null;
  let fitmentError = null;
  if (!entraxe) {
    if (!vehicle.marque) {
      fitmentError = "Marque non identifiée depuis la plaque — entraxe à renseigner à la main.";
    } else {
      const table = fitmentFromTable(vehicle.marque, vehicle.modele, vehicle.annee);
      entraxe = table.entraxe;
      entraxeSource = table.source;
      entraxeConfiance = table.confiance;
      if (table.note) fitmentError = table.note;
    }
  }

  const combinedRaw = { plate_lookup: vehicle.raw };

  await sql`
    update commandes set
      vehicule_marque = ${vehicle.marque},
      vehicule_modele = ${vehicle.modele},
      vehicule_annee = ${vehicle.annee},
      vehicule_finition = ${vehicle.finition},
      entraxe = coalesce(${entraxe}, entraxe),
      alesage = coalesce(${propose?.alesage != null ? `${propose.alesage} mm` : null}, alesage),
      deport_propose = ${propose?.resume || null},
      deport_source = ${propose ? (propose.verificationRequise ? "constructeur_approche" : "constructeur_exact") : "aucun"},
      monte_origine = ${JSON.stringify({
        montes: oe.montes,
        trace: oe.trace,
        note: oe.note,
        proposition: propose,
      })},
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
      entraxe,
      source: entraxeSource,
      confiance: entraxeConfiance,
      fitmentError,
      alesage: propose?.alesage ?? null,
      deportPropose: propose?.resume || null,
      deportConfiance: propose?.confiance || null,
      deportVerification: Boolean(propose?.verificationRequise),
      montesTrouvees: oe.montes.length,
      oeNote: oe.note,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

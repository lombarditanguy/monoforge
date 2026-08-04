import { findOeFitments, proposeFitment } from "../../../../lib/fitment.js";

export const prerender = false;

// Banc d'essai de la chaîne complète, sans passer par une vraie commande :
// on saisit un véhicule et une taille, on voit exactement ce que le site
// proposerait. C'est ce qui permet de vérifier un jeu de données juste après
// l'avoir importé, avant qu'un client ne soit concerné.

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const marque = String(body?.marque || "").trim();
  const modele = String(body?.modele || "").trim();
  const annee = String(body?.annee || "").trim();
  const finition = String(body?.finition || "").trim();
  const sizeLabel = String(body?.sizeLabel || "").trim();
  const widthLabel = String(body?.widthLabel || "").trim();

  if (!marque) {
    return new Response(JSON.stringify({ error: "Renseigne au moins une marque." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const resultat = await findOeFitments({ marque, modele, annee, finition });
    const proposition = resultat.montes.length
      ? proposeFitment(resultat.montes, { sizeLabel, widthLabel })
      : null;
    return new Response(
      JSON.stringify({
        ok: true,
        montes: resultat.montes,
        trace: resultat.trace,
        note: resultat.note,
        modele: resultat.modele,
        proposition,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

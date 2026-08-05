import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const id = Number(data.get("id"));
  if (!id) return redirect("/admin/commandes");

  const statut = String(data.get("statut") || "").trim();
  if (statut) {
    await sql`update commandes set statut = ${statut}, updated_at = now() where id = ${id}`;
  }

  if (data.has("vehicule_marque") || data.has("entraxe")) {
    const marque = String(data.get("vehicule_marque") || "").trim();
    const modele = String(data.get("vehicule_modele") || "").trim();
    const entraxe = String(data.get("entraxe") || "").trim();
    const deport = String(data.get("deport") || "").trim();
    const alesage = String(data.get("alesage") || "").trim();
    await sql`
      update commandes set
        vehicule_marque = ${marque || null},
        vehicule_modele = ${modele || null},
        entraxe = ${entraxe || null},
        deport = ${deport || null},
        alesage = ${alesage || null},
        updated_at = now()
      where id = ${id}
    `;
  }

  return redirect(`/admin/commandes/${id}`);
}

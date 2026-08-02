import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const id = Number(data.get("id"));
  const statut = String(data.get("statut") || "").trim();
  if (id && statut) {
    await sql`update commandes set statut = ${statut}, updated_at = now() where id = ${id}`;
  }
  return redirect(`/admin/commandes/${id}`);
}

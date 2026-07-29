import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const type = String(data.get("type"));

  if (type === "price_base") {
    const id = data.get("id");
    const famille = String(data.get("famille") || "").trim();
    const label = String(data.get("label") || "").trim();
    const prix = Number(data.get("prix_base_ht") || 0);
    if (id) {
      await sql`update price_bases set famille = ${famille}, label = ${label}, prix_base_ht = ${prix}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into price_bases (famille, label, prix_base_ht) values (${famille}, ${label}, ${prix})`;
    }
  } else if (type === "coefficient") {
    const id = data.get("id");
    const label = String(data.get("label") || "").trim();
    const valeur = Number(data.get("valeur") || 1);
    const description = String(data.get("description") || "").trim() || null;
    if (id) {
      await sql`update coefficients set label = ${label}, valeur = ${valeur}, description = ${description}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into coefficients (label, valeur, description) values (${label}, ${valeur}, ${description})`;
    }
  }

  return redirect("/admin/prix");
}

export async function DELETE({ request }) {
  const { type, id } = await request.json();
  if (type === "price_base") {
    await sql`delete from price_bases where id = ${Number(id)}`;
  } else if (type === "coefficient") {
    await sql`delete from coefficients where id = ${Number(id)}`;
  }
  return new Response(null, { status: 204 });
}

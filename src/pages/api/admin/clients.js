import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const id = data.get("id");
  const nom = String(data.get("nom") || "").trim();
  const email = String(data.get("email") || "").trim() || null;
  const telephone = String(data.get("telephone") || "").trim() || null;
  const adresse = String(data.get("adresse") || "").trim() || null;
  const notes = String(data.get("notes") || "").trim() || null;

  if (!nom) {
    return new Response("Le nom est requis", { status: 400 });
  }

  if (id) {
    await sql`
      update clients set nom = ${nom}, email = ${email}, telephone = ${telephone},
        adresse = ${adresse}, notes = ${notes}
      where id = ${Number(id)}
    `;
    return redirect(`/admin/clients/${id}`);
  }

  const [row] = await sql`
    insert into clients (nom, email, telephone, adresse, notes)
    values (${nom}, ${email}, ${telephone}, ${adresse}, ${notes})
    returning id
  `;
  return redirect(`/admin/clients/${row.id}`);
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  await sql`delete from clients where id = ${Number(id)}`;
  return new Response(null, { status: 204 });
}

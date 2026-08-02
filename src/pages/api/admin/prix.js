import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const type = String(data.get("type"));

  if (type === "price_base") {
    const id = data.get("id");
    const famille = String(data.get("famille") || "").trim();
    const label = String(data.get("label") || "").trim();
    const coefficient = Number(data.get("coefficient_revente") || 1);
    if (id) {
      await sql`update price_bases set famille = ${famille}, label = ${label}, coefficient_revente = ${coefficient}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into price_bases (famille, label, coefficient_revente) values (${famille}, ${label}, ${coefficient})`;
    }
  } else if (type === "width_coefficient") {
    const id = data.get("id");
    const largeur = String(data.get("largeur") || "").trim();
    const ordre = Number(data.get("ordre") || 0);
    const coefficient = Number(data.get("coefficient") || 1);
    if (id) {
      await sql`update width_coefficients set largeur = ${largeur}, ordre = ${ordre}, coefficient = ${coefficient}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into width_coefficients (largeur, ordre, coefficient) values (${largeur}, ${ordre}, ${coefficient})`;
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
  } else if (type === "size_coefficient") {
    const id = data.get("id");
    const taille = String(data.get("taille") || "").trim();
    const ordre = Number(data.get("ordre") || 0);
    const coefficient = Number(data.get("coefficient") || 1);
    if (id) {
      await sql`update size_coefficients set taille = ${taille}, ordre = ${ordre}, coefficient = ${coefficient}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into size_coefficients (taille, ordre, coefficient) values (${taille}, ${ordre}, ${coefficient})`;
    }
  } else if (type === "finish_option") {
    const id = data.get("id");
    const label = String(data.get("label") || "").trim();
    const prixAchat = Number(data.get("prix_achat_ht") || 0);
    const coefficient = Number(data.get("coefficient_revente") || 1);
    const position = Number(data.get("position") || 0);
    const actif = data.get("actif") === "1";
    if (id) {
      await sql`update finish_options set label = ${label}, prix_achat_ht = ${prixAchat}, coefficient_revente = ${coefficient}, position = ${position}, actif = ${actif}, updated_at = now() where id = ${Number(id)}`;
    } else {
      await sql`insert into finish_options (label, prix_achat_ht, coefficient_revente, actif) values (${label}, ${prixAchat}, ${coefficient}, true)`;
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
  } else if (type === "size_coefficient") {
    await sql`delete from size_coefficients where id = ${Number(id)}`;
  } else if (type === "width_coefficient") {
    await sql`delete from width_coefficients where id = ${Number(id)}`;
  } else if (type === "finish_option") {
    await sql`delete from finish_options where id = ${Number(id)}`;
  }
  return new Response(null, { status: 204 });
}

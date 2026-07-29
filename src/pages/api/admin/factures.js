import { sql, nextInvoiceNumber } from "../../../lib/db.js";

export const prerender = false;

function parseItems(data) {
  const descriptions = data.getAll("item_description");
  const quantites = data.getAll("item_quantite");
  const prix = data.getAll("item_prix");
  const items = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = String(descriptions[i] || "").trim();
    if (!description) continue;
    items.push({
      description,
      quantite: Number(quantites[i] || 1),
      prix_unitaire_ht: Number(prix[i] || 0),
    });
  }
  return items;
}

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const id = data.get("id");
  const clientId = data.get("client_id") ? Number(data.get("client_id")) : null;
  const dateEmission = String(data.get("date_emission") || new Date().toISOString().slice(0, 10));
  const statut = String(data.get("statut") || "brouillon");
  const tauxTva = Number(data.get("taux_tva") || 20);
  const notes = String(data.get("notes") || "").trim() || null;
  const items = parseItems(data);

  let invoiceId = id ? Number(id) : null;

  if (invoiceId) {
    await sql`
      update invoices set client_id = ${clientId}, date_emission = ${dateEmission},
        statut = ${statut}, taux_tva = ${tauxTva}, notes = ${notes}, updated_at = now()
      where id = ${invoiceId}
    `;
    await sql`delete from invoice_items where invoice_id = ${invoiceId}`;
  } else {
    const numero = await nextInvoiceNumber();
    const [row] = await sql`
      insert into invoices (numero, client_id, date_emission, statut, taux_tva, notes)
      values (${numero}, ${clientId}, ${dateEmission}, ${statut}, ${tauxTva}, ${notes})
      returning id
    `;
    invoiceId = row.id;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await sql`
      insert into invoice_items (invoice_id, description, quantite, prix_unitaire_ht, position)
      values (${invoiceId}, ${item.description}, ${item.quantite}, ${item.prix_unitaire_ht}, ${i})
    `;
  }

  return redirect(`/admin/factures/${invoiceId}`);
}

export async function DELETE({ request }) {
  const { id } = await request.json();
  await sql`delete from invoices where id = ${Number(id)}`;
  return new Response(null, { status: 204 });
}

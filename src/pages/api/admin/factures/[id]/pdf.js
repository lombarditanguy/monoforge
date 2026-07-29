import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { sql } from "../../../../../lib/db.js";
import { SITE } from "../../../../../data/site.js";

export const prerender = false;

export async function GET({ params }) {
  const id = Number(params.id);
  const rows = await sql`select * from invoices where id = ${id}`;
  const invoice = rows[0];
  if (!invoice) {
    return new Response("Facture introuvable", { status: 404 });
  }
  const items = await sql`select * from invoice_items where invoice_id = ${id} order by position asc`;
  let client = null;
  if (invoice.client_id) {
    const clientRows = await sql`select * from clients where id = ${invoice.client_id}`;
    client = clientRows[0] || null;
  }

  const totalHt = items.reduce((sum, it) => sum + Number(it.quantite) * Number(it.prix_unitaire_ht), 0);
  const totalTva = totalHt * (Number(invoice.taux_tva) / 100);
  const totalTtc = totalHt + totalTva;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0.05, 0.05, 0.05);
  const grey = rgb(0.45, 0.45, 0.48);
  const orange = rgb(1, 0.35, 0.12);

  let y = 800;
  const left = 50;
  const right = 545;

  page.drawText(SITE.name, { x: left, y, size: 20, font: fontBold, color: black });
  page.drawText("FACTURE", { x: right - 90, y, size: 20, font: fontBold, color: orange });
  y -= 22;
  page.drawText(SITE.legalName, { x: left, y, size: 8, font, color: grey });
  page.drawText(invoice.numero, { x: right - 90, y, size: 11, font, color: black });
  y -= 12;
  page.drawText(`SIRET : ${SITE.siret || "[à compléter]"}`, { x: left, y, size: 8, font, color: grey });
  page.drawText(`Date : ${new Date(invoice.date_emission).toLocaleDateString("fr-FR")}`, { x: right - 90, y, size: 8, font, color: grey });
  y -= 12;
  page.drawText(`TVA intracom. : ${SITE.tvaIntracom || "[à compléter]"}`, { x: left, y, size: 8, font, color: grey });

  y -= 40;
  page.drawText("Facturé à :", { x: left, y, size: 9, font: fontBold, color: black });
  y -= 14;
  if (client) {
    page.drawText(client.nom, { x: left, y, size: 10, font, color: black });
    y -= 13;
    if (client.adresse) {
      for (const line of String(client.adresse).split("\n")) {
        page.drawText(line, { x: left, y, size: 9, font, color: grey });
        y -= 12;
      }
    }
    if (client.email) {
      page.drawText(client.email, { x: left, y, size: 9, font, color: grey });
      y -= 12;
    }
  } else {
    page.drawText("—", { x: left, y, size: 10, font, color: grey });
    y -= 13;
  }

  y -= 25;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 18;

  const colDesc = left;
  const colQty = 380;
  const colPrice = 440;
  const colTotal = 500;

  page.drawText("Description", { x: colDesc, y, size: 8, font: fontBold, color: grey });
  page.drawText("Qté", { x: colQty, y, size: 8, font: fontBold, color: grey });
  page.drawText("PU HT", { x: colPrice, y, size: 8, font: fontBold, color: grey });
  page.drawText("Total HT", { x: colTotal, y, size: 8, font: fontBold, color: grey });
  y -= 8;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 16;

  for (const item of items) {
    const lineTotal = Number(item.quantite) * Number(item.prix_unitaire_ht);
    page.drawText(String(item.description).slice(0, 55), { x: colDesc, y, size: 9, font, color: black });
    page.drawText(String(item.quantite), { x: colQty, y, size: 9, font, color: black });
    page.drawText(`${Number(item.prix_unitaire_ht).toFixed(2)} €`, { x: colPrice, y, size: 9, font, color: black });
    page.drawText(`${lineTotal.toFixed(2)} €`, { x: colTotal, y, size: 9, font, color: black });
    y -= 18;
    if (y < 150) break; // avoid overflow off page for very long invoices (v1 limitation)
  }

  y -= 10;
  page.drawLine({ start: { x: 350, y }, end: { x: right, y }, thickness: 0.5, color: grey });
  y -= 16;
  page.drawText("Total HT", { x: 400, y, size: 9, font, color: grey });
  page.drawText(`${totalHt.toFixed(2)} €`, { x: colTotal, y, size: 9, font, color: black });
  y -= 14;
  page.drawText(`TVA (${Number(invoice.taux_tva)}%)`, { x: 400, y, size: 9, font, color: grey });
  page.drawText(`${totalTva.toFixed(2)} €`, { x: colTotal, y, size: 9, font, color: black });
  y -= 16;
  page.drawText("Total TTC", { x: 400, y, size: 11, font: fontBold, color: black });
  page.drawText(`${totalTtc.toFixed(2)} €`, { x: colTotal, y, size: 11, font: fontBold, color: orange });

  if (invoice.notes) {
    y -= 40;
    page.drawText("Notes :", { x: left, y, size: 8, font: fontBold, color: grey });
    y -= 12;
    page.drawText(String(invoice.notes).slice(0, 200), { x: left, y, size: 8, font, color: grey, maxWidth: right - left });
  }

  page.drawText(
    `${SITE.legalName} — ${SITE.addressRegion}, France — ${SITE.email}`,
    { x: left, y: 40, size: 7, font, color: grey }
  );

  const pdfBytes = await doc.save();
  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.numero}.pdf"`,
    },
  });
}

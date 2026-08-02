import { sql } from "../../../lib/db.js";

export const prerender = false;

export async function POST({ request }) {
  const body = await request.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return new Response(JSON.stringify({ error: "Aucune référence à enregistrer." }), { status: 400 });
  }

  for (const { code, prixAchatHt } of items) {
    const cleanCode = String(code || "").trim();
    if (!cleanCode) continue;
    const price = Number(prixAchatHt) || 0;
    await sql`
      insert into item_prices (code, prix_achat_ht, updated_at)
      values (${cleanCode}, ${price}, now())
      on conflict (code) do update set prix_achat_ht = ${price}, updated_at = now()
    `;
  }

  return new Response(JSON.stringify({ ok: true, count: items.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

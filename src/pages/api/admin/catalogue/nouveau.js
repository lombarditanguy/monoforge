import { sql } from "../../../../lib/db.js";
import { codeExists, createExtraItem } from "../../../../lib/catalogDb.js";
import { FAMILIES } from "../../../../data/catalog.js";

export const prerender = false;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Requête invalide.");

  const code = String(body.code || "").trim().toUpperCase();
  const family = String(body.family || "").trim();
  const prixAchatHt = Number(body.prixAchatHt);

  if (!code || !/^[A-Z0-9][A-Z0-9-]{1,30}$/.test(code)) {
    return jsonError("Référence invalide (lettres, chiffres et tirets uniquement).");
  }
  if (!FAMILIES.some((f) => f.slug === family)) {
    return jsonError("Famille invalide.");
  }
  if (!Number.isFinite(prixAchatHt) || prixAchatHt < 0) {
    return jsonError("Prix d'achat invalide.");
  }
  if (await codeExists(code)) {
    return jsonError(`La référence ${code} existe déjà.`);
  }

  const slug = code.toLowerCase();
  await createExtraItem({ code, slug, family });
  await sql`
    insert into item_prices (code, prix_achat_ht)
    values (${code}, ${prixAchatHt})
    on conflict (code) do update set prix_achat_ht = ${prixAchatHt}, updated_at = now()
  `;

  return new Response(JSON.stringify({ ok: true, code, slug, family }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

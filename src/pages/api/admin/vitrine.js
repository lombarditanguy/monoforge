import { sql } from "../../../lib/db.js";
import { codeExists } from "../../../lib/catalogDb.js";

export const prerender = false;

// Au-delà, la vitrine cesse d'être une vitrine : la page d'accueil redevient
// un catalogue, ce qu'elle a précisément à ne pas être.
const MAX = 12;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) return json({ error: "Sélection illisible." }, 400);
  if (items.length > MAX) return json({ error: `${MAX} jantes au maximum en vitrine.` }, 400);

  const propres = [];
  const vus = new Set();
  for (const item of items) {
    const code = String(item?.code || "").trim().toUpperCase();
    if (!code || vus.has(code)) continue;
    if (!(await codeExists(code))) return json({ error: `Référence inconnue : ${code}.` }, 400);
    vus.add(code);
    propres.push({
      code,
      tendance: String(item?.tendance || "").trim().slice(0, 40),
      argument: String(item?.argument || "").trim().slice(0, 200),
    });
  }

  // Une sélection vide serait indiscernable d'une base jamais réglée : le site
  // retomberait sur la sélection de l'audit, et on aurait enregistré « rien »
  // pour voir réapparaître six jantes. Autant le dire franchement.
  if (propres.length === 0) {
    return json(
      { error: "Garde au moins une jante en vitrine — une sélection vide ferait revenir la sélection par défaut." },
      400
    );
  }

  // On remplace la sélection entière plutôt que de la modifier ligne à ligne :
  // l'ordre et les retraits font partie de ce qu'on enregistre, et une mise à
  // jour partielle laisserait des références orphelines.
  await sql`delete from home_featured`;
  for (const [index, item] of propres.entries()) {
    await sql`
      insert into home_featured (code, position, tendance, argument, updated_at)
      values (${item.code}, ${index}, ${item.tendance}, ${item.argument}, now())
    `;
  }

  return json({ ok: true, count: propres.length });
}

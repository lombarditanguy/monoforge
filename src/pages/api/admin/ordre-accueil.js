import { sql } from "../../../lib/db.js";
import { codeExists } from "../../../lib/catalogDb.js";

export const prerender = false;

// Garde-fou contre une charge absurde, rien de plus. Il valait 60, alors que
// l'ordre initial proposé au premier démarrage compte 74 références : le
// formulaire arrivait donc pré-rempli au-dessus du plafond, et « Enregistrer
// l'ordre » échouait sans que l'on ait rien touché. Un seuil qui rejette l'état
// par défaut n'est pas un garde-fou, c'est une panne.
const MAX = 300;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const rangs = Array.isArray(body?.rangs) ? body.rangs : null;
  if (!rangs) return json({ error: "Ordre illisible." }, 400);
  if (rangs.length > MAX) return json({ error: `${MAX} jantes au maximum en tête.` }, 400);

  const propres = [];
  const vus = new Set();
  for (const r of rangs) {
    const code = String(r?.code || "").trim().toUpperCase();
    const position = Number(r?.position);
    if (!code || vus.has(code)) continue;
    if (!Number.isFinite(position) || position < 1) {
      return json({ error: `Rang invalide pour ${code} — un entier à partir de 1.` }, 400);
    }
    if (!(await codeExists(code))) return json({ error: `Référence inconnue : ${code}.` }, 400);
    vus.add(code);
    propres.push({ code, position: Math.round(position) });
  }

  // Créée à la volée, pour la même raison que catalog_hidden : sans ça,
  // enregistrer un ordre échouait tant que /admin/setup n'avait pas été lancé
  // après le déploiement.
  await sql`
    create table if not exists home_featured (
      code text primary key,
      position integer not null default 0,
      tendance text,
      argument text,
      updated_at timestamptz not null default now()
    )
  `;

  // On réécrit la table entière : un rang effacé dans le formulaire doit
  // disparaître, et une mise à jour ligne à ligne laisserait traîner les
  // anciennes valeurs.
  await sql`delete from home_featured`;
  for (const r of propres) {
    await sql`
      insert into home_featured (code, position, updated_at)
      values (${r.code}, ${r.position}, now())
    `;
  }

  return json({ ok: true, count: propres.length });
}

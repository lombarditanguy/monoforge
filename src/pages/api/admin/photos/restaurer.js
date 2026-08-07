import { codeExists, isStaticItem, photosOrigine, reinitialiserPhotos } from "../../../../lib/catalogDb.js";

export const prerender = false;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) return json({ error: "Référence manquante." }, 400);
  if (!(await codeExists(code))) return json({ error: `Référence inconnue : ${code}.` }, 400);

  // Une jante ajoutée depuis l'admin n'a pas de photo d'origine : effacer sa
  // liste ne la ramènerait pas en arrière, ça la viderait pour de bon.
  if (!isStaticItem(code)) {
    return json(
      { error: "Cette jante a été ajoutée depuis l'admin : elle n'a pas de photo fournisseur à retrouver." },
      400
    );
  }

  await reinitialiserPhotos(code);
  return json({ ok: true, images: photosOrigine(code) });
}

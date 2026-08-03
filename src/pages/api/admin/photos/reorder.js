import { getEffectivePhotos, setItemPhotos } from "../../../../lib/catalogDb.js";

export const prerender = false;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code || "").trim();
  const images = Array.isArray(body?.images) ? body.images : null;
  if (!code || !images) return jsonError("Requête invalide.");

  const current = await getEffectivePhotos(code);
  const currentSet = new Set(current);
  const newSet = new Set(images);
  if (current.length !== images.length || ![...currentSet].every((s) => newSet.has(s))) {
    return jsonError("La liste envoyée ne correspond pas aux photos actuelles de cette référence.");
  }

  await setItemPhotos(code, images);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
}

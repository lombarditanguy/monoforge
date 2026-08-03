import { del } from "@vercel/blob";
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
  const src = String(body?.src || "");
  if (!code || !src) return jsonError("Requête invalide.");

  const current = await getEffectivePhotos(code);
  if (!current.includes(src)) return jsonError("Cette photo ne fait plus partie de la référence.");

  const updated = current.filter((s) => s !== src);
  await setItemPhotos(code, updated);

  if (process.env.BLOB_READ_WRITE_TOKEN && src.includes("blob.vercel-storage.com")) {
    try {
      await del(src);
    } catch {
      // La suppression du fichier stocké a échoué (déjà supprimé, etc.) —
      // la référence n'a plus la photo, ce qui est l'essentiel.
    }
  }

  return new Response(JSON.stringify({ ok: true, images: updated }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

import { put } from "@vercel/blob";
import { getEffectivePhotos, setItemPhotos } from "../../../../lib/catalogDb.js";

export const prerender = false;

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  // Volontairement sans contrôle préalable d'une variable d'environnement :
  // l'intégration Vercel Blob n'expose pas toujours BLOB_READ_WRITE_TOKEN
  // (les projets récents reçoivent BLOB_STORE_ID et une authentification
  // implicite). Exiger un nom précis rejetait des installations valides —
  // on tente l'envoi et on remonte l'erreur réelle du SDK.
  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError("Requête invalide.");

  const code = String(formData.get("code") || "").trim();
  const file = formData.get("file");
  if (!code) return jsonError("Référence manquante.");
  if (!(file instanceof File)) return jsonError("Fichier manquant.");
  if (!file.type.startsWith("image/")) return jsonError("Le fichier doit être une image.");

  const ext = file.name.split(".").pop() || "webp";
  const filename = `catalogue/${code.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  let blob;
  try {
    blob = await put(filename, file, { access: "public" });
  } catch (err) {
    // Distingue le défaut de configuration du reste : c'est la question qu'on
    // se pose en premier quand un envoi échoue.
    const auth = /token|unauthorized|forbidden|credential|not found/i.test(err.message || "");
    return jsonError(
      auth
        ? `Stockage des photos inaccessible : ${err.message}. Vérifie que le store Blob est connecté au projet dans Vercel → Storage, puis redéploie.`
        : `Échec de l'upload : ${err.message}`,
      500
    );
  }

  const current = await getEffectivePhotos(code);
  const updated = [...current, blob.url];
  await setItemPhotos(code, updated);

  return new Response(JSON.stringify({ ok: true, url: blob.url, images: updated }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

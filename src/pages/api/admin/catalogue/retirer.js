import { sql } from "../../../../lib/db.js";
import {
  codeExists,
  isStaticItem,
  retirerItem,
  remettreItem,
  supprimerExtraItem,
} from "../../../../lib/catalogDb.js";

export const prerender = false;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function commandesPour(code) {
  try {
    const [row] = await sql`select count(*)::int as n from commandes where item_code = ${code}`;
    return row?.n || 0;
  } catch {
    return 0;
  }
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const code = String(body?.code || "").trim().toUpperCase();
  const action = String(body?.action || "");
  if (!code) return json({ error: "Référence manquante." }, 400);
  if (!(await codeExists(code))) return json({ error: `Référence inconnue : ${code}.` }, 400);

  if (action === "retirer") {
    await retirerItem(code);
    return json({ ok: true, etat: "retire" });
  }

  if (action === "remettre") {
    await remettreItem(code);
    return json({ ok: true, etat: "en-ligne" });
  }

  if (action === "supprimer") {
    // Le catalogue fournisseur vit dans data/catalog.js : rien à supprimer en
    // base, et le prétendre laisserait croire à une suppression qui reviendrait
    // au prochain déploiement.
    if (isStaticItem(code)) {
      return json(
        {
          error:
            "Cette jante vient du catalogue fournisseur, elle est inscrite dans le code du site et ne peut pas être supprimée depuis l'admin. " +
            "« Retirer du site » la fait disparaître partout et reste annulable — c'est l'équivalent, sans rien perdre.",
        },
        400
      );
    }
    const n = await commandesPour(code);
    await supprimerExtraItem(code);
    return json({ ok: true, etat: "supprime", commandes: n });
  }

  return json({ error: "Action inconnue." }, 400);
}

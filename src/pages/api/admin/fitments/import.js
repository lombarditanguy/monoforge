import { query } from "../../../../lib/db.js";

export const prerender = false;

// L'import se fait par lots envoyés depuis le navigateur : le fichier est lu
// et normalisé côté client, puis poussé par paquets. C'est ce qui permet de
// charger un jeu de données de plusieurs dizaines de mégaoctets malgré la
// limite de taille de corps de requête des fonctions serverless — et ça donne
// une barre de progression gratuitement.

const COLONNES = [
  "marque",
  "modele",
  "marque_norm",
  "modele_norm",
  "finition",
  "annee_debut",
  "annee_fin",
  "diametre",
  "largeur",
  "deport",
  "entraxe",
  "alesage",
];

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ request }) {
  try {
    const body = await request.json().catch(() => null);
    const rows = Array.isArray(body?.rows) ? body.rows : null;
    if (!rows) return json({ error: "Aucune ligne reçue." }, 400);
    if (rows.length > 2000) return json({ error: "Lot trop volumineux (max 2000 lignes)." }, 400);

    // Le premier lot remplace le jeu précédent : réimporter un fichier corrigé
    // ne doit pas empiler deux versions des mêmes cotes.
    if (body.reset) await query("truncate table oe_fitments restart identity");

    let insérées = 0;
    if (rows.length > 0) {
      const valeurs = [];
      const params = [];
      for (const r of rows) {
        if (!r?.marque || !r?.modele || r?.diametre === null || r?.diametre === undefined) continue;
        const base = params.length;
        valeurs.push(`(${COLONNES.map((_, i) => `$${base + i + 1}`).join(",")})`);
        params.push(
          String(r.marque).slice(0, 120),
          String(r.modele).slice(0, 160),
          String(r.marqueNorm || "").slice(0, 120),
          String(r.modeleNorm || "").slice(0, 160),
          r.finition ? String(r.finition).slice(0, 200) : null,
          r.anneeDebut ?? null,
          r.anneeFin ?? null,
          r.diametre,
          r.largeur ?? null,
          r.deport ?? null,
          r.entraxe ? String(r.entraxe).slice(0, 40) : null,
          r.alesage ?? null
        );
        insérées++;
      }
      if (valeurs.length > 0) {
        await query(
          `insert into oe_fitments (${COLONNES.join(",")}) values ${valeurs.join(",")}`,
          params
        );
      }
    }

    const [{ n }] = await query("select count(*)::int as n from oe_fitments");
    return json({ ok: true, insérées, total: n });
  } catch (err) {
    const message = /relation .*oe_fitments.* does not exist/i.test(err.message)
      ? "La table des cotes n'existe pas encore. Ouvre /admin/setup et clique sur « Initialiser / vérifier les tables »."
      : err.message;
    return json({ error: message }, 500);
  }
}

export async function DELETE() {
  try {
    await query("truncate table oe_fitments restart identity");
    return json({ ok: true, total: 0 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

import { query } from "../../lib/db.js";
import { findOeFitments, alesageDesMontes, formatAlesage } from "../../lib/fitment.js";
import { normalizeKey } from "../../lib/textMatch.js";

export const prerender = false;

// Sélecteur de véhicule public. Il ne tape que la base des montes constructeur,
// déjà importée : aucun appel au fournisseur de plaques, qui est facturé à
// l'unité et doit rester derrière le tunnel de commande. Un visiteur peut donc
// cliquer autant qu'il veut sans consommer quoi que ce soit.

function json(payload, { status = 200, cache = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  // Le jeu de données ne bouge qu'à l'import : on peut le mettre en cache
  // longtemps côté CDN, ce qui évite d'ouvrir une connexion Postgres à chaque
  // ouverture d'une liste déroulante.
  if (cache) headers["Cache-Control"] = "public, s-maxage=86400, stale-while-revalidate=604800";
  return new Response(JSON.stringify(payload), { status, headers });
}

export async function GET({ url }) {
  const marque = (url.searchParams.get("marque") || "").trim();
  const modele = (url.searchParams.get("modele") || "").trim();

  try {
    if (!marque) {
      const rows = await query("select distinct marque from oe_fitments order by marque");
      return json({ marques: rows.map((r) => r.marque) });
    }

    if (!modele) {
      const rows = await query(
        "select distinct modele from oe_fitments where marque_norm = $1 order by modele",
        [normalizeKey(marque)]
      );
      return json({ modeles: rows.map((r) => r.modele) });
    }

    const { montes } = await findOeFitments({ marque, modele });
    if (montes.length === 0) {
      return json({ ok: false, message: "Aucune cote constructeur pour ce modèle." }, { status: 404 });
    }

    const entraxes = [...new Set(montes.map((m) => m.entraxe).filter(Boolean))];
    const { valeur: alesage } = alesageDesMontes(montes);
    // Les tailles « de série » sont celles que le constructeur monte lui-même
    // (groupe 1). Les groupes suivants sont des tailles plus grandes que le
    // fournisseur de données référence sans qu'elles soient homologuées.
    const serie = montes.filter((m) => m.groupe === 1 && m.diametre !== null);
    const diametres = [...new Set((serie.length > 0 ? serie : montes).map((m) => m.diametre).filter(Number.isFinite))]
      .sort((a, b) => a - b);

    return json({
      ok: true,
      // Un seul entraxe attendu par véhicule ; on renvoie la liste plutôt que
      // d'en choisir un au hasard si le jeu de données se contredit.
      entraxe: entraxes.length === 1 ? entraxes[0] : null,
      entraxes,
      alesage: formatAlesage(alesage),
      diametres,
      montes: montes.length,
    });
  } catch {
    return json({ ok: false, message: "Données véhicules momentanément indisponibles." }, { status: 503, cache: false });
  }
}


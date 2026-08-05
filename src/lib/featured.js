import { sql } from "./db.js";
import { BEST_SELLERS } from "../data/bestsellers.js";
import { listItemsByCodes } from "./catalogDb.js";
import { startingPrices } from "./pricing.js";

/**
 * La vitrine de la page d'accueil, telle qu'elle doit être affichée.
 *
 * Source de vérité : la table `home_featured`, réglée depuis /admin/vitrine.
 * Tant qu'elle est vide — base neuve, ou personne n'a encore touché à la
 * sélection — on retombe sur les six références de l'audit de marché. La
 * page d'accueil n'a donc jamais de trou, et le jour où l'admin enregistre
 * une sélection, elle prend le dessus sans rien changer d'autre.
 */
export async function selectionVitrine() {
  let choix = [];
  try {
    const rows = await sql`
      select code, tendance, argument from home_featured order by position, code
    `;
    choix = rows.map((r) => ({
      code: r.code,
      tendance: r.tendance || "",
      argument: r.argument || "",
    }));
  } catch {
    // Base injoignable : la sélection de repli suffit à servir la page.
  }
  if (choix.length === 0) choix = BEST_SELLERS;

  // Une référence supprimée du catalogue depuis son ajout à la vitrine est
  // écartée ici plutôt que rendue en carte vide.
  const items = await listItemsByCodes(choix.map((c) => c.code));
  const prix = await startingPrices(items);
  return choix
    .map((c) => {
      const item = items.find((i) => i.code === c.code);
      return item ? { ...c, item, prix: prix.get(c.code) || 0 } : null;
    })
    .filter(Boolean);
}

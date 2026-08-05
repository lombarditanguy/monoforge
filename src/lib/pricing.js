import { sql } from "./db.js";

/**
 * Prix « à partir de » pour un lot de jantes, éventuellement de familles
 * différentes.
 *
 * Le plancher est le prix d'achat de la jante, multiplié par la marge de sa
 * famille, puis par les coefficients les plus bas de la grille — soit la plus
 * petite taille et la plus petite largeur. Toute autre configuration coûte
 * plus cher, jamais moins : le chiffre affiché est donc tenable quelle que
 * soit la commande qui suit.
 *
 * Renvoie une Map code → prix. Un code absent de la Map n'a pas de prix
 * calculable (achat non renseigné, marge de famille non configurée, base
 * injoignable) : l'appelant affiche « sur devis » plutôt qu'un chiffre faux.
 */
export async function startingPrices(items) {
  const codes = [...new Set(items.map((i) => i.code))];
  if (codes.length === 0) return new Map();
  const familles = [...new Set(items.map((i) => i.family))];

  try {
    const [achatRows, margeRows, tailleRows, largeurRows] = await Promise.all([
      sql`select code, prix_achat_ht from item_prices where code = any(${codes})`,
      sql`select famille, coefficient_revente from price_bases where famille = any(${familles})`,
      sql`select min(coefficient) as min_coeff from size_coefficients`,
      sql`select min(coefficient) as min_coeff from width_coefficients`,
    ]);

    const taille = Number(tailleRows[0]?.min_coeff || 0);
    // La grille des largeurs peut être vide tant qu'elle n'est pas réglée ;
    // celle des tailles, non — sans elle le prix n'a pas de sens.
    const largeur = Number(largeurRows[0]?.min_coeff || 1);
    if (taille <= 0) return new Map();

    const achat = new Map(achatRows.map((r) => [r.code, Number(r.prix_achat_ht || 0)]));
    const marge = new Map(margeRows.map((r) => [r.famille, Number(r.coefficient_revente || 0)]));

    const prix = new Map();
    for (const item of items) {
      const montant = (achat.get(item.code) || 0) * (marge.get(item.family) || 0) * taille * largeur;
      if (montant > 0) prix.set(item.code, montant);
    }
    return prix;
  } catch {
    // Base non connectée ou pas encore configurée : aucun prix, pas d'erreur.
    return new Map();
  }
}

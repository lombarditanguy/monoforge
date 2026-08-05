import { sql, nextCommandeReference } from "../../lib/db.js";
import { getStripe, isStripeConfigured } from "../../lib/stripe.js";
import { proposeFitmentPourCommande } from "../../lib/fitment.js";

export const prerender = false;

/**
 * Déport d'origine du véhicule pour la taille commandée. Volontairement en
 * « best effort » et après l'enregistrement : une commande ne doit jamais
 * échouer parce que le jeu de données constructeur est absent, incomplet ou
 * indisponible. Sans proposition, la fiche commande reste renseignable à la
 * main comme aujourd'hui.
 */
async function enregistrerDeportPropose(reference, vehicule, taille) {
  if (!vehicule.marque) return;
  const resultat = await proposeFitmentPourCommande(vehicule, taille);
  const p = resultat.proposition;
  await sql`
    update commandes set
      deport_propose = ${p?.resume || null},
      deport_source = ${p ? (p.verificationRequise ? "constructeur_approche" : "constructeur_exact") : "aucun"},
      monte_origine = ${JSON.stringify({
        montes: resultat.montes,
        trace: resultat.trace,
        note: resultat.note,
        proposition: p,
      })},
      entraxe = coalesce(entraxe, ${p?.entraxe || null}),
      alesage = coalesce(alesage, ${p?.alesage != null ? `${p.alesage} mm` : null}),
      updated_at = now()
    where reference = ${reference}
  `;
}

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const get = (name) => String(data.get(name) || "").trim();

  const code = get("code");
  const family = get("family");
  const slug = get("slug");
  const sizeLabel = get("sizeLabel");
  const widthLabel = get("widthLabel");
  const finishLabel = get("finishLabel");
  const quantity = Math.max(1, Number(data.get("quantity") || 1));
  const unitPriceHt = Number(data.get("unitPriceHt") || 0);
  const totalHt = unitPriceHt * quantity;

  const plaque = get("plaque").toUpperCase();
  const nom = get("nom");
  const email = get("email");
  const telephone = get("telephone");

  if (!code || unitPriceHt <= 0 || !nom || !email) {
    return redirect(`/catalogue/${family}/${slug}`, 303);
  }

  const reference = await nextCommandeReference();

  await sql`
    insert into commandes (
      reference, statut, item_code, item_family, taille, largeur, finition,
      peinture_aspect, peinture_ral, peinture_nom, peinture_hex, quantite,
      prix_unitaire_ht, total_ht, plaque_immatriculation,
      vehicule_marque, vehicule_modele, vehicule_annee, vehicule_finition,
      client_nom, client_email, client_telephone,
      livraison_rue, livraison_complement, livraison_code_postal, livraison_ville, livraison_pays,
      facturation_rue, facturation_complement, facturation_code_postal, facturation_ville, facturation_pays
    ) values (
      ${reference}, 'en_attente_paiement', ${code}, ${family}, ${sizeLabel}, ${widthLabel}, ${finishLabel},
      ${get("peintureAspect") || null}, ${get("peintureRal") || null}, ${get("peintureNom") || null}, ${get("peintureHex") || null}, ${quantity},
      ${unitPriceHt}, ${totalHt}, ${plaque},
      ${get("vehicule_marque") || null}, ${get("vehicule_modele") || null}, ${get("vehicule_annee") || null}, ${get("vehicule_finition") || null},
      ${nom}, ${email}, ${telephone},
      ${get("livraison_rue")}, ${get("livraison_complement")}, ${get("livraison_code_postal")}, ${get("livraison_ville")}, ${get("livraison_pays") || "France"},
      ${get("facturation_rue")}, ${get("facturation_complement")}, ${get("facturation_code_postal")}, ${get("facturation_ville")}, ${get("facturation_pays") || "France"}
    )
  `;

  try {
    await enregistrerDeportPropose(
      reference,
      {
        marque: get("vehicule_marque"),
        modele: get("vehicule_modele"),
        annee: get("vehicule_annee"),
        finition: get("vehicule_finition"),
      },
      { sizeLabel, widthLabel }
    );
  } catch {
    // Silencieux par construction : voir le commentaire sur la fonction.
  }

  if (!isStripeConfigured()) {
    return redirect(`/commande/confirmee?ref=${encodeURIComponent(reference)}`, 303);
  }

  const origin = new URL(request.url).origin;
  const nameParts = [`Jante ${code}`, sizeLabel, widthLabel, finishLabel && finishLabel !== "Brut forgé" ? finishLabel : null].filter(Boolean);

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(unitPriceHt * 100),
            product_data: {
              name: nameParts.join(" — "),
              description: `Commande ${reference} — fabrication à la demande, famille ${family}. Prix HT.`,
            },
          },
          quantity,
        },
      ],
      customer_email: email,
      success_url: `${origin}/commande/confirmee?session_id={CHECKOUT_SESSION_ID}&ref=${encodeURIComponent(reference)}`,
      cancel_url: `${origin}/catalogue/${family}/${slug}`,
    });
    await sql`update commandes set stripe_session_id = ${session.id}, updated_at = now() where reference = ${reference}`;
    return redirect(session.url, 303);
  } catch (err) {
    return new Response(
      `<p style="font-family:sans-serif;color:#f3f1ec;background:#0a0a0b;padding:2rem">Erreur de paiement : ${err.message}. Votre commande ${reference} est enregistrée, nous vous recontactons.</p>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

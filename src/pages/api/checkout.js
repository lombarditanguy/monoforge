import { getStripe, isStripeConfigured } from "../../lib/stripe.js";

export const prerender = false;

export async function POST({ request, redirect }) {
  const data = await request.formData();
  const code = String(data.get("code") || "").trim();
  const family = String(data.get("family") || "").trim();
  const sizeLabel = String(data.get("sizeLabel") || "").trim();
  const finishLabel = String(data.get("finishLabel") || "").trim();
  const quantity = Math.max(1, Number(data.get("quantity") || 1));
  const unitPriceHt = Number(data.get("unitPriceHt") || 0);

  if (!isStripeConfigured() || !code || unitPriceHt <= 0) {
    return redirect(`/configurateur?ref=${encodeURIComponent(code)}`, 303);
  }

  const origin = new URL(request.url).origin;
  const nameParts = [`Jante ${code}`, sizeLabel, finishLabel !== "Brut forgé" ? finishLabel : null].filter(Boolean);

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
              description: `Fabrication à la demande — famille ${family}. Prix HT, hors frais éventuels communiqués avant expédition.`,
            },
          },
          quantity,
        },
      ],
      success_url: `${origin}/commande/confirmee?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/catalogue/${family}/${data.get("slug") || ""}`,
    });
    return redirect(session.url, 303);
  } catch (err) {
    return new Response(
      `<p style="font-family:sans-serif;color:#f3f1ec;background:#0a0a0b;padding:2rem">Erreur de paiement : ${err.message}</p>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

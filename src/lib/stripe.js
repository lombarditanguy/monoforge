import Stripe from "stripe";

let client = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY n'est pas défini (variable d'environnement manquante).");
  }
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

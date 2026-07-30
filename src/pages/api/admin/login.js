import { verifyPassword, createSessionToken, setSessionCookie } from "../../../lib/auth.js";

export const prerender = false;

export async function POST({ request, cookies, redirect }) {
  const data = await request.formData();
  const password = String(data.get("password") || "");
  const next = String(data.get("next") || "/admin");

  let valid = false;
  try {
    valid = await verifyPassword(password);
  } catch (err) {
    return new Response(
      `<p style="font-family:sans-serif;color:#f3f1ec;background:#0a0a0b;padding:2rem">Erreur de configuration serveur : ${err.message}</p>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!valid) {
    return redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }

  const token = createSessionToken();
  setSessionCookie(cookies, token);
  return redirect(next.startsWith("/admin") ? next : "/admin", 303);
}

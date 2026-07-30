import { clearSessionCookie } from "../../../lib/auth.js";

export const prerender = false;

export async function POST({ cookies, redirect }) {
  clearSessionCookie(cookies);
  return redirect("/admin/login", 303);
}

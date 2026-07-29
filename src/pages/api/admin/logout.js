import { clearSessionCookie } from "../../../lib/auth.js";

export const prerender = false;

export async function POST({ cookies, request }) {
  clearSessionCookie(cookies);
  return Response.redirect(new URL("/admin/login", request.url), 303);
}

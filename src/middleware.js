import { defineMiddleware } from "astro:middleware";
import { isAuthenticated } from "./lib/auth.js";

export const onRequest = defineMiddleware((context, next) => {
  const path = context.url.pathname;
  const isAdminRoute = path.startsWith("/admin") && path !== "/admin/login";
  const isAdminApiRoute = path.startsWith("/api/admin") && path !== "/api/admin/login";

  if (isAdminRoute || isAdminApiRoute) {
    if (!isAuthenticated(context.cookies)) {
      if (isAdminApiRoute) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return context.redirect(`/admin/login?next=${encodeURIComponent(path)}`);
    }
  }

  return next();
});

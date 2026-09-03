// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.kesslerwheels.fr',
  output: 'static',
  adapter: vercel(),
  // Pas d'intégration sitemap : elle ne voit que les pages compilées, donc
  // elle publiait les quatorze pages de /admin et aucune des ~450 fiches
  // produit, qui sont rendues à la demande. Le plan est servi par
  // src/pages/sitemap.xml.js, qui lit la base.
  vite: {
    plugins: [tailwindcss()],
  },
});

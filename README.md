# MONOFORGE — site vitrine

Site vitrine pour MONOFORGE, jantes forgées 100% sur mesure (toute taille, dessin des bâtons personnalisable). Construit avec [Astro](https://astro.build) + Tailwind CSS v4, en full statique (SEO/performance maximale), sans backend.

## Développement

```bash
npm install
npm run dev       # http://localhost:4321
npm run build      # génère le site statique dans dist/
npm run preview    # sert le build de dist/
```

## Structure

- `src/pages/` — une page par route (le catalogue et le journal ont des routes dynamiques `[slug].astro`).
- `src/data/site.js` — coordonnées, nom de marque, navigation. **À compléter avant mise en ligne** (email, téléphone, région).
- `src/data/wheels.js` — catalogue des 8 modèles de base.
- `src/data/articles.js` — articles du journal (contenu SEO).
- `src/components/WheelGraphic.astro` — illustration SVG paramétrique de jante (pas des photos produit — à remplacer par de vraies photos dès que disponibles).
- `src/utils/seo.js` — helpers JSON-LD (BreadcrumbList, FAQPage, Product, Article).
- `public/llms.txt` — résumé factuel du site pour les moteurs génératifs (ChatGPT, Perplexity, etc.), format [llms.txt](https://llmstxt.org/).
- `public/robots.txt`, sitemap généré automatiquement par `@astrojs/sitemap` au build.

## À faire avant mise en ligne

Ces éléments sont volontairement des placeholders identifiables (voir aussi les pages légales) :

1. **Coordonnées réelles** dans `src/data/site.js` (email, téléphone, ville/région) et dans `astro.config.mjs` (`site:` = nom de domaine réel).
2. **Mentions légales** (`src/pages/mentions-legales.astro`) : forme juridique, SIRET, RCS, hébergeur — à faire valider par un professionnel avant publication.
3. **CGV** (`src/pages/cgv.astro`) : modalités d'acompte, garanties, juridiction — à faire relire par un professionnel du droit.
4. **Formulaire configurateur** : fonctionne actuellement en `mailto:` (aucun backend). Pour un vrai formulaire (sans ouvrir le client mail de l'utilisateur), brancher un service comme Formspree, Resend ou une fonction serverless.
5. **Photos produit réelles** pour remplacer/compléter les illustrations SVG dès que le fournisseur peut en fournir.
6. **Nom de domaine** : le site est configuré sur `https://www.monoforge.fr` à titre d'exemple — à ajuster si le domaine final diffère.

## Déploiement

Le site est 100% statique (`output: "static"` dans `astro.config.mjs`) : il peut être déployé sur Vercel, Netlify, Cloudflare Pages ou tout hébergeur statique, sans configuration serveur particulière.

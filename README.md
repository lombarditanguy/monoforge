# KESSLER WHEELS — site vitrine

Site vitrine pour KESSLER WHEELS, jantes forgées 100% sur mesure (toute taille, dessin des bâtons personnalisable). Construit avec [Astro](https://astro.build) + Tailwind CSS v4. Les pages publiques restent 100% statiques (SEO/performance maximale) ; une partie `/admin` protégée par mot de passe gère clients, prix et factures via une base Postgres (Neon, intégrée à Vercel).

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
6. **Nom de domaine** : le site est configuré sur `https://www.kesslerwheels.fr` — vérifier que le domaine est bien réservé et pointé (DNS + Vercel) avant mise en ligne.

## Déploiement

Les pages publiques restent statiques, mais `/admin/*` et les routes `/api/admin/*` sont rendues côté serveur (adaptateur `@astrojs/vercel`) : **le site doit être déployé sur Vercel** (Netlify/Cloudflare nécessiteraient un adaptateur différent pour la partie admin).

## Mise en route de l'espace admin (`/admin`)

L'espace admin (clients, prix/coefficients, factures) a besoin de deux choses côté Vercel avant de fonctionner : une base de données et deux variables d'environnement.

1. **Base de données** : dans le dashboard Vercel du projet → onglet *Storage* → *Create Database* → choisir **Postgres (Neon)**. Une fois créée et liée au projet, Vercel ajoute automatiquement une variable `DATABASE_URL` (ou `POSTGRES_URL`) — rien à copier-coller manuellement.
2. **Variables d'environnement** à ajouter dans *Settings → Environment Variables* :
   - `ADMIN_PASSWORD_HASH` : hash bcrypt du mot de passe admin. Pour en générer un : `node -e "console.log(require('bcryptjs').hashSync('TON_MOT_DE_PASSE', 10))"` (à lancer en local avec `npm install` fait), puis copier la sortie.
   - `ADMIN_SESSION_SECRET` : une chaîne aléatoire longue (ex. `openssl rand -hex 32`), sert à signer les sessions de connexion.
3. **Redéployer** le projet pour que les nouvelles variables soient prises en compte.
4. Aller sur `https://tondomaine/admin/setup`, se connecter, cliquer sur *Initialiser / vérifier les tables* — crée les tables `clients`, `invoices`, `invoice_items`, `price_bases`, `coefficients` si elles n'existent pas encore. Sans risque à relancer plus tard.

**Facturation — à compléter avant d'envoyer une vraie facture** : les factures générées (`/admin/factures/:id` → *Télécharger le PDF*) utilisent les mentions légales de `src/data/site.js` (`siret`, `tvaIntracom`, `legalName`, `addressRegion`...), actuellement des placeholders. La loi française impose des mentions obligatoires précises sur les factures (SIRET, forme juridique, TVA, numérotation séquentielle continue — déjà gérée automatiquement) : remplace les placeholders et fais idéalement valider le format par un comptable avant le premier envoi réel.

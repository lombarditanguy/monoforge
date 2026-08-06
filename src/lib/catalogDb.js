import { sql } from "./db.js";
import { ORDRE_ACCUEIL_INITIAL } from "../data/ordreInitial.js";
import { catalogItems as staticItems, itemsForFamily as staticItemsForFamily } from "../data/catalog.js";

const PLACEHOLDER_IMAGE = "/catalogue/placeholder.webp";

// overrides: Map<code, string[]>. A code present in the map means an
// item_photos row exists for it (even if the array is empty, e.g. the admin
// deleted every photo) — that's authoritative and must NOT fall back to the
// static catalogue images. A code absent from the map means untouched.
function applyPhotoOverride(item, overrides) {
  if (!overrides.has(item.code)) return item;
  const images = overrides.get(item.code);
  if (images.length > 0) return { ...item, image: images[0], images };
  return { ...item, image: PLACEHOLDER_IMAGE, images: [] };
}

async function loadPhotoOverrides(codes) {
  if (codes.length === 0) return new Map();
  try {
    const rows = await sql`select code, images from item_photos where code = any(${codes})`;
    return new Map(rows.map((r) => [r.code, r.images]));
  } catch {
    return new Map();
  }
}

async function loadExtraItems(familySlug) {
  try {
    const rows = familySlug
      ? await sql`select code, slug, family from catalog_extra_items where family = ${familySlug} order by created_at desc`
      : await sql`select code, slug, family from catalog_extra_items order by created_at desc`;
    return rows.map((r) => ({ code: r.code, slug: r.slug, family: r.family, image: PLACEHOLDER_IMAGE, images: [] }));
  } catch {
    return [];
  }
}

// Toutes les références d'une famille : catalogue fournisseur (statique) +
// jantes ajoutées depuis l'admin, avec les photos telles que gérées dans
// /admin/catalogue (upload/réordonnancement/suppression) si elles existent.
export async function listItemsForFamily(familySlug) {
  const base = staticItemsForFamily(familySlug);
  const extra = await loadExtraItems(familySlug);
  const combined = [...base, ...extra];
  const overrides = await loadPhotoOverrides(combined.map((i) => i.code));
  const items = combined.map((item) => applyPhotoOverride(item, overrides));

  // Les jantes mises en tête passent devant, dans l'ordre choisi depuis
  // /admin/catalogue. Un premier essai classait automatiquement les photos
  // détourées en tête ; c'était pratique mais faux de principe — l'ordre de ce
  // qu'on montre en premier est une décision commerciale, pas une propriété du
  // fichier. Et il avait un défaut concret : remplacer une photo faisait sortir
  // la jante de la tête, alors que c'est justement le moment où l'on veut la
  // voir. Le tri est stable, donc l'ordre du catalogue est conservé partout où
  // aucun rang n'est fixé.
  const rangs = await ordreAccueil();
  return items
    .map((item, ordre) => ({ item, ordre, rang: rangs.get(item.code) }))
    .sort((a, b) => {
      if (a.rang !== undefined && b.rang !== undefined) return a.rang - b.rang;
      if (a.rang !== undefined) return -1;
      if (b.rang !== undefined) return 1;
      return a.ordre - b.ordre;
    })
    .map((x) => x.item);
}

/**
 * Rang d'affichage en tête de famille, réglé dans /admin/catalogue.
 *
 * Tant que rien n'a été enregistré, on propose l'ordre initial — les jantes
 * dont la photo principale est détourée — pour qu'une grille neuve soit déjà
 * homogène. Dès qu'un ordre est enregistré, il prend seul la main : c'est une
 * décision, elle ne doit pas être recouverte par une valeur par défaut.
 *
 * L'admin lit la même fonction, donc les cases du formulaire montrent
 * exactement l'ordre que le site applique — sinon on règlerait à l'aveugle.
 */
export async function ordreAccueil() {
  try {
    const rows = await sql`select code, position from home_featured`;
    if (rows.length > 0) return new Map(rows.map((r) => [r.code, Number(r.position)]));
  } catch {
    // Base injoignable : l'ordre initial fait tout aussi bien l'affaire.
  }
  return new Map(ORDRE_ACCUEIL_INITIAL.map((code, i) => [code, i + 1]));
}

export async function getCatalogItem(familySlug, slug) {
  let item = staticItems.find((i) => i.family === familySlug && i.slug === slug);
  if (!item) {
    const extra = await loadExtraItems(familySlug);
    item = extra.find((i) => i.slug === slug) || null;
  }
  if (!item) return null;
  const overrides = await loadPhotoOverrides([item.code]);
  return applyPhotoOverride(item, overrides);
}

export async function countItemsForFamily(familySlug) {
  const base = staticItemsForFamily(familySlug).length;
  const extra = await loadExtraItems(familySlug);
  return base + extra.length;
}

export async function countAllItems() {
  const extra = await loadExtraItems(null);
  return staticItems.length + extra.length;
}

// Toutes les références, tous familles confondues, pour /admin/catalogue.
export async function listAllItemsForAdmin() {
  const extra = await loadExtraItems(null);
  const combined = [...staticItems, ...extra];
  const overrides = await loadPhotoOverrides(combined.map((i) => i.code));
  return combined.map((item) => applyPhotoOverride(item, overrides));
}

export async function findItemByCode(code) {
  let item = staticItems.find((i) => i.code === code);
  if (!item) {
    const [row] = await sql`select code, slug, family from catalog_extra_items where code = ${code} limit 1`;
    if (row) item = { code: row.code, slug: row.slug, family: row.family, image: PLACEHOLDER_IMAGE, images: [] };
  }
  if (!item) return null;
  const overrides = await loadPhotoOverrides([item.code]);
  return applyPhotoOverride(item, overrides);
}

// Plusieurs références d'un coup, dans l'ordre demandé. Passer par
// findItemByCode en boucle ferait une requête de photos par jante ; ici il n'y
// en a qu'une pour tout le lot. Un code inconnu est simplement absent du
// résultat — l'appelant décide quoi en faire.
export async function listItemsByCodes(codes) {
  if (codes.length === 0) return [];
  const trouves = codes.map((c) => staticItems.find((i) => i.code === c)).filter(Boolean);
  const overrides = await loadPhotoOverrides(trouves.map((i) => i.code));
  return trouves.map((item) => applyPhotoOverride(item, overrides));
}

export function isStaticItem(code) {
  return staticItems.some((i) => i.code === code);
}

export async function codeExists(code) {
  if (isStaticItem(code)) return true;
  const [row] = await sql`select 1 from catalog_extra_items where code = ${code} limit 1`;
  return Boolean(row);
}

export async function createExtraItem({ code, slug, family }) {
  await sql`insert into catalog_extra_items (code, slug, family) values (${code}, ${slug}, ${family})`;
}

// Photos "telles qu'affichées actuellement" pour une référence : l'override
// admin s'il existe (même vide), sinon les photos statiques du catalogue
// fournisseur. C'est la base à partir de laquelle upload/réordonnancement/
// suppression doivent travailler — jamais une liste vide par erreur pour une
// jante du catalogue fournisseur qui n'a encore jamais été modifiée.
export async function getEffectivePhotos(code) {
  const [row] = await sql`select images from item_photos where code = ${code} limit 1`;
  if (row) return row.images;
  const staticItem = staticItems.find((i) => i.code === code);
  return staticItem?.images || [];
}

export async function setItemPhotos(code, images) {
  await sql`
    insert into item_photos (code, images, updated_at)
    values (${code}, ${JSON.stringify(images)}, now())
    on conflict (code) do update set images = ${JSON.stringify(images)}, updated_at = now()
  `;
}

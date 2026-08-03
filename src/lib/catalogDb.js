import { sql } from "./db.js";
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
  return combined.map((item) => applyPhotoOverride(item, overrides));
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

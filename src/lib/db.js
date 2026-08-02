import { neon } from "@neondatabase/serverless";
import { catalogItems } from "../data/catalog.js";

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED
  );
}

export function sql(strings, ...values) {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Aucune base de données connectée (DATABASE_URL / POSTGRES_URL manquant). Active Vercel Postgres (Neon) dans le dashboard Vercel du projet, puis redéploie."
    );
  }
  const client = neon(connectionString);
  return client(strings, ...values);
}

export const SCHEMA_SQL = `
create table if not exists clients (
  id serial primary key,
  nom text not null,
  email text,
  telephone text,
  adresse text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists price_bases (
  id serial primary key,
  famille text not null,
  label text not null,
  prix_base_ht numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table price_bases add column if not exists prix_achat_ht numeric(10,2) not null default 0;
alter table price_bases add column if not exists coefficient_revente numeric(6,3) not null default 1.5;

create table if not exists coefficients (
  id serial primary key,
  label text not null,
  valeur numeric(6,3) not null default 1,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists size_coefficients (
  id serial primary key,
  taille text not null,
  ordre integer not null default 0,
  coefficient numeric(6,3) not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists finish_options (
  id serial primary key,
  label text not null,
  prix_achat_ht numeric(10,2) not null default 0,
  coefficient_revente numeric(6,3) not null default 1.5,
  position integer not null default 0,
  actif boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists width_coefficients (
  id serial primary key,
  largeur text not null,
  ordre integer not null default 0,
  coefficient numeric(6,3) not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists item_prices (
  code text primary key,
  prix_achat_ht numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists commandes (
  id serial primary key,
  reference text not null unique,
  statut text not null default 'en_attente_paiement',

  item_code text not null,
  item_family text not null,
  taille text,
  largeur text,
  finition text,
  quantite integer not null default 1,
  prix_unitaire_ht numeric(10,2) not null default 0,
  total_ht numeric(10,2) not null default 0,

  plaque_immatriculation text,
  entraxe text,
  deport text,

  client_nom text not null,
  client_email text not null,
  client_telephone text,

  livraison_rue text,
  livraison_complement text,
  livraison_code_postal text,
  livraison_ville text,
  livraison_pays text not null default 'France',

  facturation_rue text,
  facturation_complement text,
  facturation_code_postal text,
  facturation_ville text,
  facturation_pays text not null default 'France',

  stripe_session_id text,
  stripe_payment_intent text,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commande_counter (
  year integer primary key,
  last_number integer not null default 0
);

create table if not exists invoices (
  id serial primary key,
  numero text not null unique,
  client_id integer references clients(id) on delete set null,
  date_emission date not null default current_date,
  statut text not null default 'brouillon',
  taux_tva numeric(5,2) not null default 20,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_items (
  id serial primary key,
  invoice_id integer not null references invoices(id) on delete cascade,
  description text not null,
  quantite numeric(10,2) not null default 1,
  prix_unitaire_ht numeric(10,2) not null default 0,
  position integer not null default 0
);

create table if not exists invoice_counter (
  year integer primary key,
  last_number integer not null default 0
);
`;

const DEFAULT_FAMILIES = [
  { famille: "monobloc", label: "Monobloc — 1 pièce" },
  { famille: "multi-pieces", label: "Multi-pièces — 2 et 3 parties" },
  { famille: "tout-terrain", label: "Tout-terrain" },
  { famille: "carbone", label: "Carbone brasé" },
];

const DEFAULT_SIZES = ["16", "17", "18", "19", "20", "21", "22", "23", "24"];
const DEFAULT_WIDTHS = ["8", "8,5", "9", "9,5", "10", "10,5", "11", "11,5", "12"];

// Prix d'achat HT approximatifs, convertis depuis le tableau tarifaire USD
// du fournisseur (XINLAI) à ~0.92 USD->EUR — à ajuster avec le taux et les
// tarifs réels le moment venu, ce ne sont que des valeurs de départ.
const DEFAULT_FINISHES = [
  { label: "Peinture (coloris au choix)", prixAchatHt: 28 }, // 30 USD
  { label: "Poli miroir", prixAchatHt: 28 }, // 30 USD
  { label: "Cache moyeu alu — petit", prixAchatHt: 18 }, // 20 USD
  { label: "Cache moyeu alu — grand", prixAchatHt: 28 }, // 30 USD
  { label: "Cache moyeu alu — grand, formé", prixAchatHt: 55 }, // 60 USD
  { label: "Brossé", prixAchatHt: 28 }, // 30 USD
  { label: "Chromé", prixAchatHt: 55 }, // 60 USD
  { label: "Lèvre carbone", prixAchatHt: 178 }, // 193 USD
  { label: "Barrel habillé carbone", prixAchatHt: 520 }, // 565 USD
  { label: "Dessin sur mesure / gravure", prixAchatHt: 92 }, // 100 USD
];

export async function initSchema() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Aucune base de données connectée (DATABASE_URL / POSTGRES_URL manquant)."
    );
  }
  const client = neon(connectionString);
  // neon() tag function doesn't support multi-statement strings; split and run sequentially.
  const statements = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await client.query(statement + ";");
  }

  for (const f of DEFAULT_FAMILIES) {
    await client.query(
      `insert into price_bases (famille, label, prix_achat_ht, coefficient_revente)
       select $1, $2, 699, 1
       where not exists (select 1 from price_bases where famille = $1)`,
      [f.famille, f.label]
    );
  }

  const sizeRows = await client.query("select count(*)::int as count from size_coefficients");
  if (Number(sizeRows[0]?.count) === 0) {
    for (let i = 0; i < DEFAULT_SIZES.length; i++) {
      await client.query(
        "insert into size_coefficients (taille, ordre, coefficient) values ($1, $2, 1)",
        [`${DEFAULT_SIZES[i]}"`, i]
      );
    }
  }

  const widthRows = await client.query("select count(*)::int as count from width_coefficients");
  if (Number(widthRows[0]?.count) === 0) {
    for (let i = 0; i < DEFAULT_WIDTHS.length; i++) {
      await client.query(
        "insert into width_coefficients (largeur, ordre, coefficient) values ($1, $2, 1)",
        [`${DEFAULT_WIDTHS[i]}J`, i]
      );
    }
  }

  // Migration prix par famille -> prix par jante : les références
  // tout-terrain n'ont pas de prix fournisseur (achatHt) dans catalogItems
  // (catalogue non retouché) — on amorce leur item_prices avec l'ancien
  // prix par famille déjà en base, pour ne pas perdre leur prix actuel.
  const [outdoorBase] = await client.query(
    "select prix_achat_ht from price_bases where famille = 'tout-terrain' limit 1"
  );
  const outdoorFallback = Number(outdoorBase?.prix_achat_ht || 0) || 699;
  for (const item of catalogItems) {
    if (item.family !== "tout-terrain") continue;
    await client.query(
      `insert into item_prices (code, prix_achat_ht) values ($1, $2)
       on conflict (code) do nothing`,
      [item.code, outdoorFallback]
    );
  }

  // Prix d'achat par jante : amorcé depuis le prix indicatif fournisseur
  // (catalogItems[].achatHt) au premier démarrage, puis entièrement piloté
  // depuis /admin/prix-jantes ensuite — on ne touche jamais une ligne existante.
  for (const item of catalogItems) {
    if (!item.achatHt) continue;
    await client.query(
      `insert into item_prices (code, prix_achat_ht) values ($1, $2)
       on conflict (code) do nothing`,
      [item.code, item.achatHt]
    );
  }

  const finishRows = await client.query("select count(*)::int as count from finish_options");
  if (Number(finishRows[0]?.count) === 0) {
    for (let i = 0; i < DEFAULT_FINISHES.length; i++) {
      await client.query(
        "insert into finish_options (label, position, prix_achat_ht) values ($1, $2, $3)",
        [DEFAULT_FINISHES[i].label, i, DEFAULT_FINISHES[i].prixAchatHt]
      );
    }
  } else {
    // Rattrape les lignes déjà créées (par une exécution précédente de
    // /admin/setup) qui sont restées à 0 : ne touche jamais une valeur déjà
    // personnalisée par l'admin.
    for (const f of DEFAULT_FINISHES) {
      await client.query(
        "update finish_options set prix_achat_ht = $1 where label = $2 and prix_achat_ht = 0",
        [f.prixAchatHt, f.label]
      );
    }
  }
}

export async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const rows = await sql`
    insert into invoice_counter (year, last_number)
    values (${year}, 1)
    on conflict (year) do update set last_number = invoice_counter.last_number + 1
    returning last_number
  `;
  const n = rows[0].last_number;
  return `KW-${year}-${String(n).padStart(4, "0")}`;
}

export async function nextCommandeReference() {
  const year = new Date().getFullYear();
  const rows = await sql`
    insert into commande_counter (year, last_number)
    values (${year}, 1)
    on conflict (year) do update set last_number = commande_counter.last_number + 1
    returning last_number
  `;
  const n = rows[0].last_number;
  return `KW-CMD-${year}-${String(n).padStart(4, "0")}`;
}

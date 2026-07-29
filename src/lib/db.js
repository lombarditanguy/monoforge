import { neon } from "@neondatabase/serverless";

function getConnectionString() {
  return (
    import.meta.env.DATABASE_URL ||
    import.meta.env.POSTGRES_URL ||
    import.meta.env.DATABASE_URL_UNPOOLED
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

create table if not exists coefficients (
  id serial primary key,
  label text not null,
  valeur numeric(6,3) not null default 1,
  description text,
  updated_at timestamptz not null default now()
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

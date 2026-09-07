-- IPO Analysis Dashboard schema (Postgres)
-- Run this once against your DATABASE_URL (Neon/Supabase free tier both work).

create table if not exists companies (
  id serial primary key,
  slug text unique not null,
  name text not null,
  sector text,
  created_at timestamptz not null default now()
);

create table if not exists ipos (
  id serial primary key,
  company_id integer not null references companies(id) on delete cascade,
  price_band_low numeric,
  price_band_high numeric,
  lot_size integer,
  issue_size_crores numeric,
  open_date date,
  close_date date,
  listing_date date,
  status text not null default 'upcoming' check (status in ('upcoming', 'open', 'closed', 'listed')),
  -- Source URLs for the Phase 2 scraper (scraper/) to refresh this IPO's data from.
  -- Set once per IPO through /admin. Left null, the scraper skips this IPO.
  chittorgarh_url text,
  investorgain_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id serial primary key,
  ipo_id integer not null references ipos(id) on delete cascade,
  category text not null check (category in ('retail', 'hni', 'qib', 'employee', 'overall')),
  times_subscribed numeric not null,
  as_of timestamptz not null default now(),
  source text
);

create table if not exists gmp_snapshots (
  id serial primary key,
  ipo_id integer not null references ipos(id) on delete cascade,
  gmp_value numeric,
  gmp_pct numeric,
  as_of timestamptz not null default now(),
  source text
);

create table if not exists fundamentals (
  id serial primary key,
  company_id integer not null references companies(id) on delete cascade,
  fiscal_year text not null,
  revenue_crores numeric,
  profit_crores numeric,
  margin_pct numeric,
  debt_crores numeric,
  entered_manually boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, fiscal_year)
);

create table if not exists peers (
  id serial primary key,
  ipo_id integer not null references ipos(id) on delete cascade,
  peer_company_id integer not null references companies(id) on delete cascade,
  unique (ipo_id, peer_company_id)
);

create index if not exists idx_ipos_company on ipos(company_id);
create index if not exists idx_subscriptions_ipo on subscriptions(ipo_id);
create index if not exists idx_gmp_ipo on gmp_snapshots(ipo_id);
create index if not exists idx_fundamentals_company on fundamentals(company_id);
create index if not exists idx_peers_ipo on peers(ipo_id);

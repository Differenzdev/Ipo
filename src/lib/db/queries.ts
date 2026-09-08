import { query } from "@/lib/db";
import type { Company, Fundamentals, GmpSnapshot, Ipo, IpoListItem, Subscription } from "@/lib/db/types";

export async function listIpos(filters?: { sector?: string; q?: string; board?: string }): Promise<IpoListItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.sector) {
    params.push(filters.sector);
    conditions.push(`companies.sector = $${params.length}`);
  }
  if (filters?.q) {
    params.push(`%${filters.q}%`);
    conditions.push(`companies.name ilike $${params.length}`);
  }
  if (filters?.board) {
    params.push(filters.board);
    conditions.push(`ipos.board = $${params.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  return query<IpoListItem>(
    `
    select
      ipos.*,
      companies.name as company_name,
      companies.slug as company_slug,
      companies.sector,
      (
        select gmp_pct::text from gmp_snapshots
        where gmp_snapshots.ipo_id = ipos.id
        order by as_of desc limit 1
      ) as latest_gmp_pct,
      (
        select times_subscribed::text from subscriptions
        where subscriptions.ipo_id = ipos.id and subscriptions.category = 'overall'
        order by as_of desc limit 1
      ) as latest_overall_subscription,
      (
        select array_agg(gmp_pct order by as_of asc) from (
          select gmp_pct, as_of from gmp_snapshots
          where gmp_snapshots.ipo_id = ipos.id and gmp_pct is not null
          order by as_of desc limit 8
        ) recent
      ) as gmp_sparkline
    from ipos
    join companies on companies.id = ipos.company_id
    ${where}
    order by coalesce(ipos.open_date, ipos.created_at::date) desc
  `,
    params
  );
}

export async function getDistinctSectors(): Promise<string[]> {
  const rows = await query<{ sector: string }>(
    `select distinct sector from companies where sector is not null order by sector asc`
  );
  return rows.map((r) => r.sector);
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const rows = await query<Company>(`select * from companies where slug = $1`, [slug]);
  return rows[0] ?? null;
}

export async function getIpoByCompanyId(companyId: number): Promise<Ipo | null> {
  const rows = await query<Ipo>(`select * from ipos where company_id = $1 order by created_at desc limit 1`, [
    companyId,
  ]);
  return rows[0] ?? null;
}

export async function getFundamentals(companyId: number): Promise<Fundamentals[]> {
  return query<Fundamentals>(
    `select * from fundamentals where company_id = $1 order by fiscal_year asc`,
    [companyId]
  );
}

export async function getSubscriptions(ipoId: number): Promise<Subscription[]> {
  return query<Subscription>(
    `select distinct on (category) * from subscriptions where ipo_id = $1 order by category, as_of desc`,
    [ipoId]
  );
}

export async function getGmpHistory(ipoId: number): Promise<GmpSnapshot[]> {
  return query<GmpSnapshot>(`select * from gmp_snapshots where ipo_id = $1 order by as_of asc`, [ipoId]);
}

export async function getPeerCompanies(ipoId: number): Promise<Company[]> {
  return query<Company>(
    `select companies.* from peers join companies on companies.id = peers.peer_company_id where peers.ipo_id = $1`,
    [ipoId]
  );
}

export async function getAllCompanies(): Promise<Company[]> {
  return query<Company>(`select * from companies order by name asc`);
}

export async function addPeer(ipoId: number, peerCompanyId: number): Promise<void> {
  await query(
    `insert into peers (ipo_id, peer_company_id) values ($1, $2) on conflict do nothing`,
    [ipoId, peerCompanyId]
  );
}

export async function removePeer(ipoId: number, peerCompanyId: number): Promise<void> {
  await query(`delete from peers where ipo_id = $1 and peer_company_id = $2`, [ipoId, peerCompanyId]);
}

/** Latest fiscal year's fundamentals for each given company (for peer comparison). */
export async function getLatestFundamentalsForCompanies(
  companyIds: number[]
): Promise<Fundamentals[]> {
  if (companyIds.length === 0) return [];
  return query<Fundamentals>(
    `select distinct on (company_id) *
     from fundamentals
     where company_id = any($1)
     order by company_id, fiscal_year desc`,
    [companyIds]
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function upsertCompany(input: { name: string; sector: string | null }): Promise<Company> {
  const slug = slugify(input.name);
  const rows = await query<Company>(
    `insert into companies (slug, name, sector) values ($1, $2, $3)
     on conflict (slug) do update set name = excluded.name, sector = excluded.sector
     returning *`,
    [slug, input.name, input.sector]
  );
  return rows[0];
}

export async function upsertIpo(input: {
  companyId: number;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  issueSizeCrores: number | null;
  openDate: string | null;
  closeDate: string | null;
  listingDate: string | null;
  status: Ipo["status"];
  board?: Ipo["board"];
  chittorgarhUrl?: string | null;
  investorgainUrl?: string | null;
}): Promise<Ipo> {
  const existing = await getIpoByCompanyId(input.companyId);
  if (existing) {
    const rows = await query<Ipo>(
      `update ipos set price_band_low = $2, price_band_high = $3, lot_size = $4, issue_size_crores = $5,
         open_date = $6, close_date = $7, listing_date = $8, status = $9, board = $10,
         chittorgarh_url = $11, investorgain_url = $12, updated_at = now()
       where id = $1 returning *`,
      [
        existing.id,
        input.priceBandLow,
        input.priceBandHigh,
        input.lotSize,
        input.issueSizeCrores,
        input.openDate,
        input.closeDate,
        input.listingDate,
        input.status,
        input.board ?? existing.board,
        input.chittorgarhUrl ?? existing.chittorgarh_url,
        input.investorgainUrl ?? existing.investorgain_url,
      ]
    );
    return rows[0];
  }
  const rows = await query<Ipo>(
    `insert into ipos (company_id, price_band_low, price_band_high, lot_size, issue_size_crores, open_date, close_date, listing_date, status, board, chittorgarh_url, investorgain_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning *`,
    [
      input.companyId,
      input.priceBandLow,
      input.priceBandHigh,
      input.lotSize,
      input.issueSizeCrores,
      input.openDate,
      input.closeDate,
      input.listingDate,
      input.status,
      input.board ?? null,
      input.chittorgarhUrl ?? null,
      input.investorgainUrl ?? null,
    ]
  );
  return rows[0];
}

export async function updateIpoScraperUrls(input: {
  ipoId: number;
  chittorgarhUrl: string | null;
  investorgainUrl: string | null;
}): Promise<Ipo> {
  const rows = await query<Ipo>(
    `update ipos set chittorgarh_url = $2, investorgain_url = $3, updated_at = now()
     where id = $1 returning *`,
    [input.ipoId, input.chittorgarhUrl, input.investorgainUrl]
  );
  return rows[0];
}

export async function upsertFundamentals(input: {
  companyId: number;
  fiscalYear: string;
  revenueCrores: number | null;
  profitCrores: number | null;
  marginPct: number | null;
  debtCrores: number | null;
}): Promise<Fundamentals> {
  const rows = await query<Fundamentals>(
    `insert into fundamentals (company_id, fiscal_year, revenue_crores, profit_crores, margin_pct, debt_crores, entered_manually)
     values ($1, $2, $3, $4, $5, $6, true)
     on conflict (company_id, fiscal_year) do update set
       revenue_crores = excluded.revenue_crores,
       profit_crores = excluded.profit_crores,
       margin_pct = excluded.margin_pct,
       debt_crores = excluded.debt_crores
     returning *`,
    [input.companyId, input.fiscalYear, input.revenueCrores, input.profitCrores, input.marginPct, input.debtCrores]
  );
  return rows[0];
}

export async function addSubscription(input: {
  ipoId: number;
  category: Subscription["category"];
  timesSubscribed: number;
}): Promise<Subscription> {
  const rows = await query<Subscription>(
    `insert into subscriptions (ipo_id, category, times_subscribed, source) values ($1, $2, $3, 'manual') returning *`,
    [input.ipoId, input.category, input.timesSubscribed]
  );
  return rows[0];
}

export async function addGmpSnapshot(input: { ipoId: number; gmpValue: number | null; gmpPct: number | null }): Promise<GmpSnapshot> {
  const rows = await query<GmpSnapshot>(
    `insert into gmp_snapshots (ipo_id, gmp_value, gmp_pct, source) values ($1, $2, $3, 'manual') returning *`,
    [input.ipoId, input.gmpValue, input.gmpPct]
  );
  return rows[0];
}

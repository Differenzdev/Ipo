export type Company = {
  id: number;
  slug: string;
  name: string;
  sector: string | null;
};

export type Ipo = {
  id: number;
  company_id: number;
  price_band_low: string | null;
  price_band_high: string | null;
  lot_size: number | null;
  issue_size_crores: string | null;
  open_date: string | null;
  close_date: string | null;
  listing_date: string | null;
  status: "upcoming" | "open" | "closed" | "listed";
  board: "mainboard" | "sme" | null;
  chittorgarh_url: string | null;
  investorgain_url: string | null;
};

export type Subscription = {
  id: number;
  ipo_id: number;
  category: "retail" | "hni" | "qib" | "employee" | "overall";
  times_subscribed: string;
  as_of: string;
  source: string | null;
};

export type GmpSnapshot = {
  id: number;
  ipo_id: number;
  gmp_value: string | null;
  gmp_pct: string | null;
  as_of: string;
  source: string | null;
};

export type Fundamentals = {
  id: number;
  company_id: number;
  fiscal_year: string;
  revenue_crores: string | null;
  profit_crores: string | null;
  margin_pct: string | null;
  debt_crores: string | null;
  entered_manually: boolean;
};

export type IpoListItem = Ipo & {
  company_name: string;
  company_slug: string;
  sector: string | null;
  latest_gmp_pct: string | null;
  latest_overall_subscription: string | null;
  gmp_sparkline: number[] | null;
};

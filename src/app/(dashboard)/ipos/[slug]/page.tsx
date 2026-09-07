import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Banknote,
  Building2,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  GitCompareArrows,
  Layers,
  ListChecks,
  Package,
  ShieldQuestion,
  Ticket,
  TrendingUp,
} from "lucide-react";
import {
  getCompanyBySlug,
  getFundamentals,
  getGmpHistory,
  getIpoByCompanyId,
  getLatestFundamentalsForCompanies,
  getPeerCompanies,
  getSubscriptions,
} from "@/lib/db/queries";
import {
  ALLOTMENT_TIPS,
  computeScorecard,
  estimateAllotmentOdds,
  estimateListingGain,
} from "@/lib/scoring";
import Card from "@/components/ui/Card";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import StatTile from "@/components/ui/StatTile";
import FundamentalsChart from "./FundamentalsChart";
import GmpTrendChart from "./GmpTrendChart";

export const dynamic = "force-dynamic";

const RATING_TONE: Record<string, BadgeTone> = {
  green: "good",
  yellow: "warning",
  red: "critical",
};

const RATING_LABEL: Record<string, string> = {
  green: "Looks strong",
  yellow: "Mixed",
  red: "Weak signals",
};

const VERDICT_DOT: Record<string, string> = {
  good: "bg-good",
  poor: "bg-critical",
  neutral: "bg-ink-muted",
};

export default async function IpoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const ipo = await getIpoByCompanyId(company.id);
  const fundamentals = await getFundamentals(company.id);
  const subscriptions = ipo ? await getSubscriptions(ipo.id) : [];
  const gmpHistory = ipo ? await getGmpHistory(ipo.id) : [];
  const peers = ipo ? await getPeerCompanies(ipo.id) : [];
  const peerFundamentals =
    peers.length > 0
      ? await getLatestFundamentalsForCompanies([company.id, ...peers.map((p) => p.id)])
      : [];
  const fundamentalsByCompanyId = new Map(peerFundamentals.map((f) => [f.company_id, f]));

  const latestGmp = gmpHistory[gmpHistory.length - 1] ?? null;
  const latestGmpPct = latestGmp?.gmp_pct ? Number(latestGmp.gmp_pct) : null;
  const overallSub = subscriptions.find((s) => s.category === "overall");
  const retailSub = subscriptions.find((s) => s.category === "retail");

  const scorecard = computeScorecard(fundamentals, subscriptions, latestGmpPct);
  const listingGain = estimateListingGain(latestGmpPct, overallSub ? Number(overallSub.times_subscribed) : null);
  const allotmentOdds = estimateAllotmentOdds(retailSub ? Number(retailSub.times_subscribed) : null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      <div>
        <Link href="/ipos" className="inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink hover:underline">
          <ChevronLeft size={14} /> All IPOs
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{company.name}</h1>
            <p className="text-sm text-ink-secondary">{company.sector ?? "Sector n/a"}</p>
          </div>
          <Badge tone={RATING_TONE[scorecard.rating]} className="px-3 py-1.5 text-sm">
            {RATING_LABEL[scorecard.rating]}
          </Badge>
        </div>
      </div>

      {ipo && (
        <Card className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile
            icon={Banknote}
            label="Price band"
            value={ipo.price_band_low && ipo.price_band_high ? `Rs.${ipo.price_band_low}-${ipo.price_band_high}` : "-"}
          />
          <StatTile icon={Package} label="Lot size" value={ipo.lot_size ? `${ipo.lot_size} shares` : "-"} />
          <StatTile icon={Building2} label="Issue size" value={ipo.issue_size_crores ? `Rs.${ipo.issue_size_crores} cr` : "-"} />
          <StatTile icon={Layers} label="Status" value={ipo.status} />
          <StatTile icon={CalendarRange} label="Opens" value={ipo.open_date ?? "-"} />
          <StatTile icon={CalendarRange} label="Closes" value={ipo.close_date ?? "-"} />
          <StatTile icon={CalendarClock} label="Listing date" value={ipo.listing_date ?? "-"} />
          <StatTile
            icon={TrendingUp}
            label="Latest GMP"
            value={latestGmp ? `Rs.${latestGmp.gmp_value ?? "-"} (${latestGmp.gmp_pct ?? "-"}%)` : "-"}
          />
        </Card>
      )}

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldQuestion size={16} className="text-ink-muted" /> Scorecard
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Rule-based, not a recommendation -- every factor below is shown so you can judge it yourself.
        </p>
        <ul className="mt-4 space-y-2">
          {scorecard.factors.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-ink-secondary">{f.label}</span>
              <span className="flex items-center gap-2 text-ink-muted">
                {f.detail}
                <span className={`h-2 w-2 rounded-full ${VERDICT_DOT[f.verdict]}`} />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {gmpHistory.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TrendingUp size={16} className="text-ink-muted" /> GMP trend
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Every recorded grey market premium reading over time -- unofficial and volatile, but shows
            the data is live, not a one-time snapshot.
          </p>
          <div className="mt-4">
            <GmpTrendChart history={gmpHistory} />
          </div>
        </Card>
      )}

      {fundamentals.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-ink">Fundamentals</h2>
          <FundamentalsChart fundamentals={fundamentals} />
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-ink">Listing-day gain estimate</h2>
          {listingGain ? (
            <>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">
                {listingGain.lowPct}% to {listingGain.highPct}%
              </p>
              <p className="mt-2 text-xs text-ink-muted">{listingGain.basis}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-secondary">Add a GMP entry to see an indicative range.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-ink">Retail allotment odds</h2>
          {allotmentOdds ? (
            <>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">~{allotmentOdds.approxProbabilityPct}%</p>
              <p className="mt-2 text-xs text-ink-muted">{allotmentOdds.explanation}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-secondary">Add a retail subscription entry to see an estimate.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Ticket size={16} className="text-ink-muted" /> Improving your allotment odds
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-ink-secondary">
          {ALLOTMENT_TIPS.map((tip, i) => (
            <li key={i} className="flex gap-2">
              <ListChecks size={15} className="mt-0.5 shrink-0 text-ink-muted" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>

      {peers.length > 0 && (
        <Card>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <GitCompareArrows size={16} className="text-ink-muted" /> Peer comparison
          </h2>
          <p className="mt-1 text-xs text-ink-muted">Latest fiscal year on file for each company.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted">
                  <th className="py-1 pr-4">Company</th>
                  <th className="py-1 pr-4">FY</th>
                  <th className="py-1 pr-4">Revenue (cr)</th>
                  <th className="py-1 pr-4">Profit (cr)</th>
                  <th className="py-1 pr-4">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {[{ id: company.id, name: company.name, slug: company.slug, isSelf: true }, ...peers.map((p) => ({ ...p, isSelf: false }))].map(
                  (c) => {
                    const f = fundamentalsByCompanyId.get(c.id);
                    return (
                      <tr key={c.id} className={`border-t border-hairline ${c.isSelf ? "bg-accent/5" : ""}`}>
                        <td className="py-1.5 pr-4">
                          {c.isSelf ? (
                            <span className="font-medium text-ink">{c.name} (this IPO)</span>
                          ) : (
                            <Link href={`/ipos/${c.slug}`} className="text-ink-secondary hover:text-ink hover:underline">
                              {c.name}
                            </Link>
                          )}
                        </td>
                        <td className="py-1.5 pr-4 tabular-nums text-ink-secondary">{f?.fiscal_year ?? "-"}</td>
                        <td className="py-1.5 pr-4 tabular-nums text-ink-secondary">{f?.revenue_crores ?? "-"}</td>
                        <td className="py-1.5 pr-4 tabular-nums text-ink-secondary">{f?.profit_crores ?? "-"}</td>
                        <td className="py-1.5 pr-4 tabular-nums text-ink-secondary">{f?.margin_pct ?? "-"}</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

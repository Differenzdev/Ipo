import Link from "next/link";
import { notFound } from "next/navigation";
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
import FundamentalsChart from "./FundamentalsChart";

export const dynamic = "force-dynamic";

const RATING_STYLES: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
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
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <div>
        <Link href="/ipos" className="text-sm text-neutral-500 hover:underline">
          &larr; All IPOs
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">{company.name}</h1>
            <p className="text-sm text-neutral-500">{company.sector ?? "Sector n/a"}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${RATING_STYLES[scorecard.rating]}`}
          >
            {scorecard.rating === "green" ? "Looks strong" : scorecard.rating === "red" ? "Weak signals" : "Mixed"}
          </span>
        </div>
      </div>

      {ipo && (
        <section className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-4">
          <Stat label="Price band" value={ipo.price_band_low && ipo.price_band_high ? `Rs.${ipo.price_band_low}-${ipo.price_band_high}` : "-"} />
          <Stat label="Lot size" value={ipo.lot_size ? `${ipo.lot_size} shares` : "-"} />
          <Stat label="Issue size" value={ipo.issue_size_crores ? `Rs.${ipo.issue_size_crores} cr` : "-"} />
          <Stat label="Status" value={ipo.status} />
          <Stat label="Opens" value={ipo.open_date ?? "-"} />
          <Stat label="Closes" value={ipo.close_date ?? "-"} />
          <Stat label="Listing date" value={ipo.listing_date ?? "-"} />
          <Stat label="Latest GMP" value={latestGmp ? `Rs.${latestGmp.gmp_value ?? "-"} (${latestGmp.gmp_pct ?? "-"}%)` : "-"} />
        </section>
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Scorecard</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Rule-based, not a recommendation -- every factor below is shown so you can judge it yourself.
        </p>
        <ul className="mt-4 space-y-2">
          {scorecard.factors.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700">{f.label}</span>
              <span className="flex items-center gap-2 text-neutral-500">
                {f.detail}
                <span
                  className={`h-2 w-2 rounded-full ${
                    f.verdict === "good" ? "bg-green-500" : f.verdict === "poor" ? "bg-red-500" : "bg-amber-400"
                  }`}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {fundamentals.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Fundamentals</h2>
          <FundamentalsChart fundamentals={fundamentals} />
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Listing-day gain estimate</h2>
          {listingGain ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">
                {listingGain.lowPct}% to {listingGain.highPct}%
              </p>
              <p className="mt-2 text-xs text-neutral-500">{listingGain.basis}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Add a GMP entry to see an indicative range.</p>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Retail allotment odds</h2>
          {allotmentOdds ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">~{allotmentOdds.approxProbabilityPct}%</p>
              <p className="mt-2 text-xs text-neutral-500">{allotmentOdds.explanation}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">Add a retail subscription entry to see an estimate.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Improving your allotment odds</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-neutral-700">
          {ALLOTMENT_TIPS.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </section>

      {peers.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-neutral-900">Peer comparison</h2>
          <p className="mt-1 text-xs text-neutral-500">Latest fiscal year on file for each company.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
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
                      <tr key={c.id} className="border-t border-neutral-100">
                        <td className="py-1 pr-4">
                          {c.isSelf ? (
                            <span className="font-medium text-neutral-900">{c.name} (this IPO)</span>
                          ) : (
                            <Link href={`/ipos/${c.slug}`} className="hover:underline">
                              {c.name}
                            </Link>
                          )}
                        </td>
                        <td className="py-1 pr-4">{f?.fiscal_year ?? "-"}</td>
                        <td className="py-1 pr-4">{f?.revenue_crores ?? "-"}</td>
                        <td className="py-1 pr-4">{f?.profit_crores ?? "-"}</td>
                        <td className="py-1 pr-4">{f?.margin_pct ?? "-"}</td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  );
}

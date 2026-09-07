import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyBySlug,
  getFundamentals,
  getGmpHistory,
  getIpoByCompanyId,
  getPeerCompanies,
  getSubscriptions,
} from "@/lib/db/queries";
import {
  addPeerCompany,
  removePeerCompany,
  saveFundamentals,
  saveGmp,
  saveScraperUrls,
  saveSubscription,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const ipo = await getIpoByCompanyId(company.id);
  const fundamentals = await getFundamentals(company.id);
  const subscriptions = ipo ? await getSubscriptions(ipo.id) : [];
  const gmpHistory = ipo ? await getGmpHistory(ipo.id) : [];
  const peers = ipo ? await getPeerCompanies(ipo.id) : [];

  const saveFundamentalsForCompany = saveFundamentals.bind(null, company.id);
  const saveSubscriptionForIpo = ipo ? saveSubscription.bind(null, ipo.id) : null;
  const saveGmpForIpo = ipo ? saveGmp.bind(null, ipo.id) : null;
  const saveScraperUrlsForIpo = ipo ? saveScraperUrls.bind(null, ipo.id) : null;
  const addPeerForIpo = ipo ? addPeerCompany.bind(null, ipo.id) : null;
  const removePeerForIpo = ipo ? removePeerCompany.bind(null, ipo.id) : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <div>
        <Link href="/admin" className="text-sm text-neutral-500 hover:underline">
          &larr; Back to admin
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">{company.name}</h1>
        <Link href={`/ipos/${company.slug}`} className="text-sm text-neutral-500 hover:underline">
          View public page &rarr;
        </Link>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-neutral-900">Fundamentals</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-1 pr-2">FY</th>
              <th className="py-1 pr-2">Revenue (cr)</th>
              <th className="py-1 pr-2">Profit (cr)</th>
              <th className="py-1 pr-2">Margin %</th>
              <th className="py-1 pr-2">Debt (cr)</th>
            </tr>
          </thead>
          <tbody>
            {fundamentals.map((f) => (
              <tr key={f.id} className="border-t border-neutral-100">
                <td className="py-1 pr-2">{f.fiscal_year}</td>
                <td className="py-1 pr-2">{f.revenue_crores ?? "-"}</td>
                <td className="py-1 pr-2">{f.profit_crores ?? "-"}</td>
                <td className="py-1 pr-2">{f.margin_pct ?? "-"}</td>
                <td className="py-1 pr-2">{f.debt_crores ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form action={saveFundamentalsForCompany} className="mt-4 grid grid-cols-3 gap-3">
          <MiniField label="Fiscal year (e.g. FY24)" name="fiscalYear" required />
          <MiniField label="Revenue (cr)" name="revenueCrores" type="number" step="0.01" />
          <MiniField label="Profit (cr)" name="profitCrores" type="number" step="0.01" />
          <MiniField label="Margin %" name="marginPct" type="number" step="0.01" />
          <MiniField label="Debt (cr)" name="debtCrores" type="number" step="0.01" />
          <div className="flex items-end">
            <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
              Add / update year
            </button>
          </div>
        </form>
      </section>

      {ipo && (
        <>
          <section className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Subscription status</h2>
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {subscriptions.length === 0 && <li className="text-neutral-500">None entered yet.</li>}
              {subscriptions.map((s) => (
                <li key={s.id}>
                  {s.category}: {s.times_subscribed}x (as of {new Date(s.as_of).toLocaleDateString()})
                </li>
              ))}
            </ul>
            {saveSubscriptionForIpo && (
              <form action={saveSubscriptionForIpo} className="mt-4 grid grid-cols-3 gap-3">
                <label className="text-xs text-neutral-700">
                  Category
                  <select
                    name="category"
                    defaultValue="overall"
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  >
                    {["retail", "hni", "qib", "employee", "overall"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <MiniField label="Times subscribed" name="timesSubscribed" type="number" step="0.01" required />
                <div className="flex items-end">
                  <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
                    Add
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Grey market premium (GMP)</h2>
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {gmpHistory.length === 0 && <li className="text-neutral-500">None entered yet.</li>}
              {gmpHistory.map((g) => (
                <li key={g.id}>
                  Rs.{g.gmp_value ?? "-"} ({g.gmp_pct ?? "-"}%) as of {new Date(g.as_of).toLocaleDateString()}
                </li>
              ))}
            </ul>
            {saveGmpForIpo && (
              <form action={saveGmpForIpo} className="mt-4 grid grid-cols-3 gap-3">
                <MiniField label="GMP value (Rs.)" name="gmpValue" type="number" step="0.01" />
                <MiniField label="GMP %" name="gmpPct" type="number" step="0.01" />
                <div className="flex items-end">
                  <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
                    Add
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Auto-refresh source URLs</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Set these once and the scraper (<code>scraper/run.py</code>, scheduled via GitHub
              Actions) will keep price band, lot size, issue size, dates, and GMP updated for this
              IPO. Subscription status stays manual (see <code>scraper/README.md</code> for why).
              Leave blank to exclude it from auto-refresh.
            </p>
            {saveScraperUrlsForIpo && (
              <form action={saveScraperUrlsForIpo} className="mt-4 grid grid-cols-1 gap-3">
                <MiniField
                  label="Chittorgarh IPO page URL"
                  name="chittorgarhUrl"
                  defaultValue={ipo.chittorgarh_url ?? ""}
                />
                <MiniField
                  label="InvestorGain IPO page URL (GMP)"
                  name="investorgainUrl"
                  defaultValue={ipo.investorgain_url ?? ""}
                />
                <div className="flex items-end">
                  <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
                    Save source URLs
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-neutral-900">Peer comparison</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Companies to compare against on the public detail page (typically already-listed
              competitors). If a peer isn&apos;t in the system yet, adding one here creates it.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-neutral-700">
              {peers.length === 0 && <li className="text-neutral-500">None added yet.</li>}
              {peers.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>
                    {p.name}
                    {p.sector && <span className="ml-2 text-neutral-400">{p.sector}</span>}
                  </span>
                  {removePeerForIpo && (
                    <form action={removePeerForIpo}>
                      <input type="hidden" name="peerCompanyId" value={p.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {addPeerForIpo && (
              <form action={addPeerForIpo} className="mt-4 grid grid-cols-3 gap-3">
                <MiniField label="Peer company name" name="name" required />
                <MiniField label="Sector" name="sector" />
                <div className="flex items-end">
                  <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800">
                    Add peer
                  </button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MiniField({
  label,
  name,
  type = "text",
  step,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="text-xs text-neutral-700">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
    </label>
  );
}

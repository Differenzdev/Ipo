import Link from "next/link";
import { getDistinctSectors, listIpos } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  open: "bg-green-50 text-green-700",
  closed: "bg-amber-50 text-amber-700",
  listed: "bg-neutral-100 text-neutral-600",
};

export default async function IposPage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string; q?: string }>;
}) {
  const { sector, q } = await searchParams;
  const [ipos, sectors] = await Promise.all([listIpos({ sector, q }), getDistinctSectors()]);
  const hasFilters = Boolean(sector || q);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">IPOs</h1>
        <Link href="/admin" className="text-sm text-neutral-500 hover:underline">
          + Add / edit IPO
        </Link>
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          placeholder="Search by company name"
          defaultValue={q ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <select
          name="sector"
          defaultValue={sector ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Filter
        </button>
        {hasFilters && (
          <Link href="/ipos" className="flex items-center text-sm text-neutral-500 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {ipos.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">
          {hasFilters ? (
            "No IPOs match these filters."
          ) : (
            <>
              No IPOs yet. <Link href="/admin" className="underline">Add one</Link> to get started.
            </>
          )}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {ipos.map((ipo) => (
            <li key={ipo.id}>
              <Link href={`/ipos/${ipo.company_slug}`} className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{ipo.company_name}</p>
                  <p className="text-xs text-neutral-500">
                    {ipo.sector ?? "Sector n/a"}
                    {ipo.price_band_low && ipo.price_band_high && (
                      <> &middot; Rs.{ipo.price_band_low}-{ipo.price_band_high}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {ipo.latest_gmp_pct && <span className="text-neutral-500">GMP {ipo.latest_gmp_pct}%</span>}
                  {ipo.latest_overall_subscription && (
                    <span className="text-neutral-500">{ipo.latest_overall_subscription}x sub</span>
                  )}
                  <span className={`rounded-full px-2 py-1 font-medium ${STATUS_STYLES[ipo.status]}`}>
                    {ipo.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

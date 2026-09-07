import Link from "next/link";
import { Building2, ListChecks, Radio, TrendingUp } from "lucide-react";
import { getDistinctSectors, listIpos } from "@/lib/db/queries";
import Card from "@/components/ui/Card";
import Badge, { type BadgeTone } from "@/components/ui/Badge";
import StatTile from "@/components/ui/StatTile";
import GmpSparkline from "./GmpSparkline";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, BadgeTone> = {
  upcoming: "accent",
  open: "good",
  closed: "warning",
  listed: "muted",
};

export default async function IposPage({
  searchParams,
}: {
  searchParams: Promise<{ sector?: string; q?: string }>;
}) {
  const { sector, q } = await searchParams;
  const [ipos, sectors] = await Promise.all([listIpos({ sector, q }), getDistinctSectors()]);
  const hasFilters = Boolean(sector || q);

  const openCount = ipos.filter((i) => i.status === "open").length;
  const gmpValues = ipos.map((i) => (i.latest_gmp_pct ? Number(i.latest_gmp_pct) : null)).filter((v): v is number => v !== null);
  const avgGmp = gmpValues.length ? (gmpValues.reduce((a, b) => a + b, 0) / gmpValues.length).toFixed(1) : null;
  const untrackedCount = ipos.filter((i) => !i.chittorgarh_url && !i.investorgain_url).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">IPOs</h1>
        <Link href="/admin" className="text-sm text-ink-secondary hover:text-ink hover:underline">
          + Add / edit IPO
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <StatTile icon={ListChecks} label="Tracked IPOs" value={String(ipos.length)} />
        </Card>
        <Card>
          <StatTile icon={Radio} label="Open now" value={String(openCount)} />
        </Card>
        <Card>
          <StatTile icon={TrendingUp} label="Avg. GMP" value={avgGmp ? `${avgGmp}%` : "-"} />
        </Card>
        <Card>
          <StatTile icon={Building2} label="No auto-refresh set" value={String(untrackedCount)} />
        </Card>
      </div>

      <form method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          placeholder="Search by company name"
          defaultValue={q ?? ""}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <select
          name="sector"
          defaultValue={sector ?? ""}
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-plane hover:opacity-90"
        >
          Filter
        </button>
        {hasFilters && (
          <Link href="/ipos" className="flex items-center text-sm text-ink-secondary hover:underline">
            Clear
          </Link>
        )}
      </form>

      {ipos.length === 0 ? (
        <p className="mt-6 text-sm text-ink-secondary">
          {hasFilters ? (
            "No IPOs match these filters."
          ) : (
            <>
              No IPOs yet. <Link href="/admin" className="underline">Add one</Link> to get started.
            </>
          )}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ipos.map((ipo) => (
            <Link key={ipo.id} href={`/ipos/${ipo.company_slug}`}>
              <Card className="h-full transition-colors hover:border-accent/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{ipo.company_name}</p>
                    <p className="text-xs text-ink-muted">{ipo.sector ?? "Sector n/a"}</p>
                  </div>
                  <Badge tone={STATUS_TONE[ipo.status]}>{ipo.status}</Badge>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div className="space-y-1 text-xs text-ink-secondary">
                    {ipo.price_band_low && ipo.price_band_high && (
                      <p>
                        Rs.{ipo.price_band_low}-{ipo.price_band_high}
                      </p>
                    )}
                    {ipo.latest_gmp_pct && <p>GMP {ipo.latest_gmp_pct}%</p>}
                    {ipo.latest_overall_subscription && <p>{ipo.latest_overall_subscription}x subscribed</p>}
                  </div>
                  {ipo.gmp_sparkline && ipo.gmp_sparkline.length >= 2 && (
                    <GmpSparkline values={ipo.gmp_sparkline.map(Number)} />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

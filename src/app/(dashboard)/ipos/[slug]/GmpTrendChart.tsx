"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GmpSnapshot } from "@/lib/db/types";

export default function GmpTrendChart({ history }: { history: GmpSnapshot[] }) {
  const data = history
    .filter((h) => h.gmp_pct !== null)
    .map((h) => ({
      date: new Date(h.as_of).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      gmpPct: Number(h.gmp_pct),
    }));

  if (data.length < 2) {
    return <p className="text-sm text-ink-muted">Need at least two GMP entries to plot a trend.</p>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
            axisLine={{ stroke: "var(--color-hairline)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
            axisLine={false}
            tickLine={false}
            width={40}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-hairline)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--color-ink)" }}
            formatter={(value) => [`${value}%`, "GMP"]}
          />
          <Line
            type="monotone"
            dataKey="gmpPct"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-accent)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

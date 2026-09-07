"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Fundamentals } from "@/lib/db/types";

export default function FundamentalsChart({ fundamentals }: { fundamentals: Fundamentals[] }) {
  const data = fundamentals.map((f) => ({
    year: f.fiscal_year,
    revenue: f.revenue_crores ? Number(f.revenue_crores) : 0,
    profit: f.profit_crores ? Number(f.profit_crores) : 0,
  }));

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={{ stroke: "var(--color-hairline)" }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
            axisLine={false}
            tickLine={false}
            label={{ value: "Rs. crores", angle: -90, position: "insideLeft", fontSize: 12, fill: "var(--color-ink-muted)" }}
          />
          <Tooltip
            contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-hairline)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--color-ink)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-ink-secondary)" }} />
          <Bar dataKey="revenue" name="Revenue" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
          <Bar dataKey="profit" name="Profit" fill="var(--color-accent-2)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

/**
 * Glance-only mini chart for list cards -- no axes, no tooltip. The full
 * interactive trend chart lives on the IPO detail page (GmpTrendChart).
 */
export default function GmpSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const data = values.map((v) => ({ v }));

  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

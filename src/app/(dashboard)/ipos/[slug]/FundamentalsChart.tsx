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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: "Rs. crores", angle: -90, position: "insideLeft", fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#171717" radius={[3, 3, 0, 0]} />
          <Bar dataKey="profit" name="Profit" fill="#a3a3a3" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function IncomeChart({ data, currency }: { data: { day: string; total: number }[]; currency: string }) {
  const money = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const label = (day: string) => {
    const [, m, d] = day.split("-");
    return `${Number(d)}/${Number(m)}`;
  };
  return (
    <div className="h-56 w-full" role="img" aria-label="Ingresos por día">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="day" tickFormatter={label} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tickFormatter={(n) => money(n)} tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)" }}
            labelFormatter={(d) => label(String(d))}
            formatter={(v) => [money(Number(v)), "Ingreso"]}
          />
          <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

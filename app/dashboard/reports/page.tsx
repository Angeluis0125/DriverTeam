import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { requireDriver } from "@/lib/auth";
import { buildReport, RANGES, resolveRange } from "@/lib/reports";
import { addExpense, deleteExpense } from "@/lib/expense-actions";
import { EXPENSE_CATEGORIES } from "@/lib/validation";
import { ActionForm } from "@/components/forms/action-form";
import { IncomeChart } from "@/components/dashboard/income-chart";
import { Stat } from "@/components/dashboard/stat";
import { Button, Card, Field, Input, PageTitle, Select, cx } from "@/components/ui";
import { formatMoney } from "@/lib/pricing";
import { PAYMENT_LABELS } from "@/lib/types";
import { localDate } from "@/lib/periods";

export const metadata = { title: "Finanzas" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { supabase, driver } = await requireDriver();
  const range = resolveRange(driver.timezone, sp.range, sp.from, sp.to);
  const r = await buildReport(supabase, range.from, range.to);
  const money = (n: number) => formatMoney(n, driver.currency);
  const maxMethod = Math.max(1, ...r.methods.map((m) => m.total));

  return (
    <>
      <PageTitle
        title="Finanzas"
        subtitle={`${range.from} — ${range.to}`}
        action={
          <a href={`/dashboard/reports/export?from=${range.from}&to=${range.to}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold hover:bg-surface-2">
            <Download size={16} /> CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {Object.entries(RANGES).map(([k, label]) => (
          <Link key={k} href={`/dashboard/reports?range=${k}`} className={cx("rounded-full border px-3 py-1.5 text-sm font-medium", range.key === k ? "border-ink bg-ink text-bg" : "border-line bg-surface text-muted")}>
            {label}
          </Link>
        ))}
        <form className="flex w-full items-center gap-1.5 sm:w-auto">
          <input type="date" name="from" defaultValue={range.from} aria-label="Desde" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm sm:flex-none" />
          <input type="date" name="to" defaultValue={range.to} aria-label="Hasta" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm sm:flex-none" />
          <button className="h-9 shrink-0 rounded-lg border border-line bg-surface px-3 text-sm font-medium">Ver</button>
        </form>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={money(r.income)} sub={r.tips ? `incluye ${money(r.tips)} de propinas` : undefined} />
        <Stat label="Gastos" value={money(r.spent)} />
        <Stat label="Ganancia neta" value={money(r.net)} />
        <Stat label="Viajes cobrados" value={String(r.trips)} sub={r.trips ? `promedio ${money(r.avg)}` : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Ingresos por día</h2>
          <IncomeChart data={r.days} currency={driver.currency} />
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Por método de pago</h2>
          {r.methods.length === 0 && <p className="text-sm text-muted">Sin pagos en este periodo.</p>}
          <ul className="space-y-3">
            {r.methods.map((m) => (
              <li key={m.method}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{PAYMENT_LABELS[m.method]} <span className="text-muted">· {m.trips}</span></span>
                  <span className="font-semibold tabular-nums">{money(m.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2">
                  <div className="h-2 rounded-full bg-ink" style={{ width: `${(m.total / maxMethod) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 font-semibold">Registrar gasto</h2>
          <ActionForm action={addExpense} submit="Agregar gasto">
            <Field label="Categoría">
              <Select name="category">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Monto (${driver.currency})`}><Input name="amount" type="number" step="0.01" min="0.01" inputMode="decimal" required /></Field>
              <Field label="Fecha"><Input name="spent_on" type="date" defaultValue={localDate(new Date(), driver.timezone)} required /></Field>
            </div>
            <Field label="Nota"><Input name="note" maxLength={200} /></Field>
          </ActionForm>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">Gastos del periodo</h2>
          {r.expenses.length === 0 ? (
            <p className="text-sm text-muted">Sin gastos registrados.</p>
          ) : (
            <ul className="divide-y divide-line">
              {r.expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="w-24 shrink-0 text-muted tabular-nums">{e.spent_on}</span>
                  <span className="min-w-0 flex-1 truncate">{e.category}{e.note ? ` · ${e.note}` : ""}</span>
                  <span className="font-semibold tabular-nums">{money(Number(e.amount))}</span>
                  <form action={deleteExpense}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button variant="ghost" className="h-8 px-2" aria-label="Borrar gasto"><Trash2 size={14} /></Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

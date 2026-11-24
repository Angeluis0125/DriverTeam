import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireDriver } from "@/lib/auth";
import { Badge, Card, Empty, Input, PageTitle } from "@/components/ui";
import { loyaltyStatus } from "@/lib/loyalty";
import { formatMoney } from "@/lib/pricing";
import { fmt } from "@/lib/format";

export const metadata = { title: "Clientes" };

type Row = { id: string; full_name: string; phone: string; completed_trips: number; active_trips: number; total_paid: number; last_trip_at: string | null };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase, driver } = await requireDriver();
  let query = supabase.from("customer_stats").select("id, full_name, phone, completed_trips, active_trips, total_paid, last_trip_at");
  const term = q?.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term.replace(/\D/g, "") || term}%`);
  const [{ data }, { data: program }] = await Promise.all([
    query.order("completed_trips", { ascending: false }).limit(300),
    supabase.from("loyalty_programs").select("active, trips_required, discount_pct").maybeSingle(),
  ]);
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageTitle title="Clientes" subtitle={`${rows.length} cliente${rows.length === 1 ? "" : "s"}`} />
      <form className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-3 text-muted" />
        <Input name="q" defaultValue={q} placeholder="Buscar por nombre o teléfono" className="pl-10" />
      </form>
      {rows.length === 0 ? (
        <Empty>{term ? "Sin resultados." : "Tus clientes aparecerán aquí cuando reserven."}</Empty>
      ) : (
        <Card className="divide-y divide-line overflow-hidden p-0 sm:p-0">
          {rows.map((c) => {
            const l = loyaltyStatus(program, Number(c.completed_trips) + Number(c.active_trips));
            return (
              <Link key={c.id} href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-display font-bold">{c.full_name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{c.full_name}</span>
                    {l.nextIsRewarded && <Badge tone="accent">Próximo con descuento</Badge>}
                  </div>
                  <div className="text-sm text-muted">
                    {c.completed_trips} viaje{Number(c.completed_trips) === 1 ? "" : "s"}
                    {c.last_trip_at && ` · último ${fmt(c.last_trip_at, driver.timezone, "d MMM")}`}
                  </div>
                </div>
                <div className="text-right text-sm font-semibold tabular-nums">{formatMoney(Number(c.total_paid), driver.currency)}</div>
                <ChevronRight size={16} className="text-muted" />
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}

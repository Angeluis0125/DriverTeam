import Link from "next/link";
import { requireDriver } from "@/lib/auth";
import { Card, Empty, LinkButton, PageTitle } from "@/components/ui";
import { CopyLink } from "@/components/dashboard/copy-link";
import { Stat } from "@/components/dashboard/stat";
import { BookingRow, type BookingListItem } from "@/components/dashboard/booking-row";
import { periodStarts } from "@/lib/periods";
import { formatMoney } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { fmtDay } from "@/lib/format";

export const metadata = { title: "Inicio" };

const sum = (rows: { amount: number; tip: number; paid_at: string }[] | null, from: Date) =>
  (rows ?? []).filter((r) => new Date(r.paid_at) >= from).reduce((a, r) => a + Number(r.amount) + Number(r.tip), 0);

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, driver } = await requireDriver();
  const p = periodStarts(driver.timezone);
  const monthOrWeek = p.week < p.month ? p.week : p.month;

  const [{ data: payments }, { data: upcoming }, { count: pending }, { count: todayCount }] = await Promise.all([
    supabase.from("payments").select("amount, tip, paid_at").gte("paid_at", monthOrWeek.toISOString()),
    supabase
      .from("bookings")
      .select("id, start_at, status, pickup_address, dropoff_address, est_price, final_price, customers(full_name)")
      .in("status", ["pending", "confirmed"])
      .gte("start_at", new Date(Date.now() - 3600_000).toISOString())
      .order("start_at")
      .limit(6),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "confirmed", "completed"])
      .gte("start_at", p.today.toISOString())
      .lt("start_at", p.tomorrow.toISOString()),
  ]);
  const money = (n: number) => formatMoney(n, driver.currency);
  const url = `${siteUrl()}/${driver.slug}`;
  const rows = (upcoming ?? []) as unknown as BookingListItem[];

  return (
    <>
      <PageTitle title={`Hola, ${driver.full_name.split(" ")[0]}`} subtitle={fmtDay(new Date(), driver.timezone)} />

      {welcome && (
        <Card className="mb-4 border-accent bg-accent/10">
          <p className="font-semibold">¡Tu página está publicada!</p>
          <p className="mt-1 text-sm text-muted">Compártela por WhatsApp, redes o tu tarjeta de presentación para recibir reservas directas.</p>
        </Card>
      )}

      <div className="mb-5">
        <div className="mb-1.5 text-sm font-medium text-muted">Tu link de reservas</div>
        <CopyLink url={url} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Viajes hoy" value={String(todayCount ?? 0)} />
        <Stat label="Por confirmar" value={String(pending ?? 0)} />
        <Stat label="Esta semana" value={money(sum(payments, p.week))} sub="cobrado" />
        <Stat label="Este mes" value={money(sum(payments, p.month))} sub="cobrado" />
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Próximos viajes</h2>
        <Link href="/dashboard/bookings" className="text-sm text-muted underline">Ver todos</Link>
      </div>
      {rows.length ? (
        <Card className="divide-y divide-line overflow-hidden p-0 sm:p-0">
          {rows.map((b) => (
            <BookingRow key={b.id} b={b} tz={driver.timezone} currency={driver.currency} showDate />
          ))}
        </Card>
      ) : (
        <Empty>
          No tienes viajes próximos. <br />
          <LinkButton href={`/${driver.slug}`} target="_blank" variant="secondary" className="mt-3">Ver mi página pública</LinkButton>
        </Empty>
      )}
    </>
  );
}

import Link from "next/link";
import { requireDriver } from "@/lib/auth";
import { Card, Empty, PageTitle, cx } from "@/components/ui";
import { BookingRow, type BookingListItem } from "@/components/dashboard/booking-row";
import { fmt, fmtDay } from "@/lib/format";

export const metadata = { title: "Reservas" };

const TABS = {
  upcoming: "Próximas",
  pending: "Por confirmar",
  history: "Historial",
} as const;
type Tab = keyof typeof TABS;

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "upcoming";
  const { supabase, driver } = await requireDriver();
  const now = new Date().toISOString();

  let q = supabase
    .from("bookings")
    .select("id, start_at, status, pickup_address, dropoff_address, est_price, final_price, customers(full_name)");
  if (tab === "upcoming") q = q.in("status", ["pending", "confirmed"]).gte("start_at", new Date(Date.now() - 6 * 3600_000).toISOString()).order("start_at");
  if (tab === "pending") q = q.eq("status", "pending").order("start_at");
  if (tab === "history") q = q.or(`status.in.(completed,rejected,cancelled,no_show),start_at.lt.${now}`).order("start_at", { ascending: false });
  const { data } = await q.limit(200);
  const rows = (data ?? []) as unknown as BookingListItem[];

  const groups = new Map<string, BookingListItem[]>();
  rows.forEach((b) => {
    const k = fmt(b.start_at, driver.timezone, "yyyy-MM-dd");
    groups.set(k, [...(groups.get(k) ?? []), b]);
  });

  return (
    <>
      <PageTitle title="Reservas" />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link key={t} href={`/dashboard/bookings?tab=${t}`} className={cx("flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-center text-sm font-semibold", t === tab ? "bg-surface shadow-sm" : "text-muted")}>
            {TABS[t]}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>
          {tab === "pending" ? "No tienes reservas por confirmar." : "Aún no hay reservas aquí. Comparte tu link"}{" "}
          {tab !== "pending" && <Link className="font-semibold text-ink underline" href={`/${driver.slug}`}>/{driver.slug}</Link>}
        </Empty>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-muted">{fmtDay(list[0].start_at, driver.timezone)}</h2>
              <Card className="divide-y divide-line overflow-hidden p-0 sm:p-0">
                {list.map((b) => (
                  <BookingRow key={b.id} b={b} tz={driver.timezone} currency={driver.currency} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

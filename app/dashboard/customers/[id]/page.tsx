import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { requireDriver } from "@/lib/auth";
import { saveCustomer } from "@/lib/customer-actions";
import { ActionForm } from "@/components/forms/action-form";
import { Card, Field, Input, Textarea } from "@/components/ui";
import { Stat } from "@/components/dashboard/stat";
import { BookingRow, type BookingListItem } from "@/components/dashboard/booking-row";
import { loyaltyStatus } from "@/lib/loyalty";
import { formatMoney } from "@/lib/pricing";
import { fmt, whatsapp } from "@/lib/format";

export const metadata = { title: "Cliente" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, driver } = await requireDriver();
  const [{ data: c }, { data: bookings }, { data: program }] = await Promise.all([
    supabase.from("customer_stats").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("bookings")
      .select("id, start_at, status, pickup_address, dropoff_address, est_price, final_price, customers(full_name)")
      .eq("customer_id", id)
      .order("start_at", { ascending: false })
      .limit(100),
    supabase.from("loyalty_programs").select("active, trips_required, discount_pct").maybeSingle(),
  ]);
  if (!c) notFound();
  const l = loyaltyStatus(program, Number(c.completed_trips) + Number(c.active_trips));
  const rows = (bookings ?? []) as unknown as BookingListItem[];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard/customers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Clientes
      </Link>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{c.full_name}</h1>
          <p className="text-sm text-muted">Cliente desde {fmt(c.created_at, driver.timezone, "MMMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${c.phone}`} aria-label="Llamar" className="grid size-10 place-items-center rounded-xl border border-line hover:bg-surface-2"><Phone size={18} /></a>
          <a href={whatsapp(c.phone)} target="_blank" aria-label="WhatsApp" className="grid size-10 place-items-center rounded-xl border border-line hover:bg-surface-2"><MessageCircle size={18} /></a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Viajes" value={String(c.completed_trips)} />
        <Stat label="Total pagado" value={formatMoney(Number(c.total_paid), driver.currency)} />
      </div>

      {l.active && (
        <Card>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Fidelización</span>
            <span className="text-muted">{l.nextIsRewarded ? `¡Próximo viaje con ${l.discountPct}% de descuento!` : `${l.progress} de ${l.required} viajes`}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: l.required }, (_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < l.progress ? "bg-accent" : "bg-surface-2"}`} />
            ))}
          </div>
        </Card>
      )}

      <Card>
        <ActionForm action={saveCustomer}>
          <input type="hidden" name="id" value={c.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><Input name="full_name" defaultValue={c.full_name} required /></Field>
            <Field label="Teléfono"><Input value={c.phone} disabled /></Field>
            <Field label="Email" className="sm:col-span-2"><Input name="email" type="email" defaultValue={c.email ?? ""} /></Field>
          </div>
          <Field label="Notas" hint="Preferencias, dirección frecuente, etc.">
            <Textarea name="notes" defaultValue={c.notes ?? ""} />
          </Field>
        </ActionForm>
      </Card>

      <h2 className="font-display text-lg font-bold">Historial</h2>
      <Card className="divide-y divide-line overflow-hidden p-0 sm:p-0">
        {rows.map((b) => <BookingRow key={b.id} b={b} tz={driver.timezone} currency={driver.currency} showDate />)}
      </Card>
    </div>
  );
}

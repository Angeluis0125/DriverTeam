import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { requireDriver } from "@/lib/auth";
import { changeStatus, recordPayment, saveDriverNotes } from "@/lib/booking-actions";
import { ActionForm } from "@/components/forms/action-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { fmtDateTime, fmtTime, mapsDirections, telLink, whatsapp } from "@/lib/format";
import { defaultCountry, formatPhone } from "@/lib/phone";
import { formatMoney } from "@/lib/pricing";
import { PAYMENT_LABELS, type BookingStatus, type PaymentMethod } from "@/lib/types";

export const metadata = { title: "Reserva" };

function StatusButton({ id, status, label, variant = "secondary" }: { id: string; status: BookingStatus; label: string; variant?: "primary" | "secondary" | "danger" }) {
  return (
    <form action={changeStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button variant={variant} className="w-full">{label}</Button>
    </form>
  );
}

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, driver } = await requireDriver();
  const [{ data: b }, { data: payment }, { data: methods }] = await Promise.all([
    supabase.from("bookings").select("*, customers(id, full_name, phone, email)").eq("id", id).maybeSingle(),
    supabase.from("payments").select("*").eq("booking_id", id).maybeSingle(),
    supabase.from("payment_methods_accepted").select("method"),
  ]);
  if (!b) notFound();
  const c = b.customers as { id: string; full_name: string; phone: string; email: string | null };
  const tz = driver.timezone;
  const money = (n: number) => formatMoney(Number(n), driver.currency);
  const status = b.status as BookingStatus;
  const accepted = (methods ?? []).map((m) => m.method as PaymentMethod);
  const cc = defaultCountry(driver.currency);
  const end = new Date(new Date(b.start_at).getTime() + b.est_duration_min * 60_000);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/dashboard/bookings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> Reservas
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm capitalize text-muted">{fmtDateTime(b.start_at, tz)} – {fmtTime(end, tz)}</div>
            <h1 className="mt-1 font-display text-2xl font-bold">{c.full_name}</h1>
            <p className="text-sm text-muted tabular-nums">{formatPhone(c.phone, cc)}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-ok" /> {b.pickup_address}</p>
          <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-bad" /> {b.dropoff_address}</p>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface-2 p-3 text-center text-sm">
          <div><dt className="text-muted">Distancia</dt><dd className="font-semibold">{Number(b.est_distance_km).toFixed(1)} km</dd></div>
          <div><dt className="text-muted">Duración</dt><dd className="font-semibold">{b.est_duration_min} min</dd></div>
          <div><dt className="text-muted">Estimado</dt><dd className="font-semibold">{money(b.est_price)}</dd></div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {Number(b.discount_pct) > 0 && <Badge tone="accent">Fidelización −{Number(b.discount_pct)}%</Badge>}
          <Badge>{b.passengers} pasajero{b.passengers > 1 ? "s" : ""}</Badge>
        </div>
        {b.notes && <p className="mt-3 rounded-xl border border-line p-3 text-sm"><span className="font-semibold">Nota del cliente:</span> {b.notes}</p>}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <a href={telLink(c.phone, cc)} className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-surface-2"><Phone size={18} />Llamar</a>
          <a href={whatsapp(c.phone, `Hola ${c.full_name}, soy ${driver.full_name}, tu chofer.`, cc)} target="_blank" className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-surface-2"><MessageCircle size={18} />WhatsApp</a>
          <a href={mapsDirections(b.pickup_address, b.dropoff_address)} target="_blank" className="flex flex-col items-center gap-1 rounded-xl border border-line py-2 text-xs font-medium hover:bg-surface-2"><Navigation size={18} />Ruta</a>
        </div>
      </Card>

      {status === "pending" && (
        <div className="grid grid-cols-2 gap-2">
          <StatusButton id={b.id} status="confirmed" label="Aceptar" variant="primary" />
          <StatusButton id={b.id} status="rejected" label="Rechazar" variant="danger" />
        </div>
      )}

      {(status === "confirmed" || status === "completed") && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">{payment ? "Pago registrado" : "Registrar pago"}</h2>
          <ActionForm action={recordPayment} submit={payment ? "Actualizar pago" : "Registrar pago y completar"}>
            <input type="hidden" name="booking_id" value={b.id} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={`Monto cobrado (${driver.currency})`}>
                <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={payment?.amount ?? b.final_price ?? b.est_price} required />
              </Field>
              <Field label="Propina">
                <Input name="tip" type="number" step="0.01" min="0" inputMode="decimal" defaultValue={payment?.tip ?? 0} />
              </Field>
              <Field label="Método">
                <Select name="method" defaultValue={payment?.method ?? accepted[0] ?? "cash"}>
                  {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{PAYMENT_LABELS[m]}{accepted.includes(m) ? "" : " (no aceptado)"}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Nota del pago (opcional)">
              <Input name="note" defaultValue={payment?.note ?? ""} maxLength={300} />
            </Field>
          </ActionForm>
        </Card>
      )}

      {status === "confirmed" && (
        <div className="grid grid-cols-2 gap-2">
          <StatusButton id={b.id} status="no_show" label="No se presentó" />
          <StatusButton id={b.id} status="cancelled" label="Cancelar viaje" variant="danger" />
        </div>
      )}

      <Card>
        <form action={saveDriverNotes} className="space-y-3">
          <input type="hidden" name="id" value={b.id} />
          <Field label="Notas privadas">
            <Textarea name="driver_notes" defaultValue={b.driver_notes ?? ""} placeholder="Solo tú las ves" />
          </Field>
          <Button variant="secondary">Guardar nota</Button>
        </form>
      </Card>

      <p className="text-center text-sm">
        <Link href={`/dashboard/customers/${c.id}`} className="text-muted underline">Ver historial de {c.full_name}</Link>
      </p>
    </div>
  );
}

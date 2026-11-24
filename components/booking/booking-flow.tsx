"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { ArrowDownUp, CheckCircle2, Clock, Gift, Route } from "lucide-react";
import { AddressInput, type PlaceValue } from "./address-input";
import { Button, Field, Input, Notice, Textarea, cx } from "@/components/ui";
import type { PublicProfile } from "@/lib/public-booking";
import type { Quote } from "@/lib/pricing";
import { PAYMENT_LABELS } from "@/lib/types";

type Slot = { start: string; label: string };
type Done = { token: string; status: string; total: number; discountPct: number; start: string };

export function BookingFlow({ d }: { d: PublicProfile }) {
  const money = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: d.currency, maximumFractionDigits: 2 }).format(n);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [pickup, setPickup] = useState<PlaceValue>({ text: "" });
  const [dropoff, setDropoff] = useState<PlaceValue>({ text: "" });
  const [quote, setQuote] = useState<{ quote: Quote; token: string } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const n = Math.min(d.max_days_ahead, 60);
    return Array.from({ length: n + 1 }, (_, i) => formatInTimeZone(addDays(new Date(), i), d.timezone, "yyyy-MM-dd"));
  }, [d.max_days_ahead, d.timezone]);
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [reload, setReload] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  // Si cambian las direcciones, la cotización deja de valer
  useEffect(() => {
    setQuote(null);
    setSlot(null);
  }, [pickup.text, dropoff.text]);

  async function getQuote() {
    setError(null);
    setQuoting(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: d.slug, pickup, dropoff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cotizar");
      setQuote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setQuoting(false);
    }
  }

  useEffect(() => {
    if (!quote) return;
    let alive = true;
    setSlots(null);
    setSlot(null);
    fetch(`/api/availability?slug=${d.slug}&date=${date}&duration=${quote.quote.durationMin}`)
      .then((r) => r.json())
      .then((data) => alive && setSlots(data.slots ?? []))
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [quote, date, d.slug, reload]);

  async function submit(form: FormData) {
    if (!quote || !slot) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: d.slug,
          quoteToken: quote.token,
          startAt: slot.start,
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") ?? "",
          passengers: form.get("passengers"),
          notes: form.get("notes") ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setReload((n) => n + 1); // el horario se ocupó: recargar
        throw new Error(data.error ?? "No se pudo reservar");
      }
      setDone({ ...data, start: slot.start });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6 text-center">
        <CheckCircle2 size={48} className="mx-auto text-ok" />
        <h2 className="mt-3 font-display text-2xl font-bold">{done.status === "confirmed" ? "¡Reserva confirmada!" : "¡Reserva enviada!"}</h2>
        <p className="mt-2 text-muted">
          {done.status === "confirmed" ? `${d.full_name} te espera` : `${d.full_name} confirmará tu viaje pronto`} el{" "}
          <b className="text-ink">{formatInTimeZone(done.start, d.timezone, "EEEE d 'de' MMMM, HH:mm", { locale: es })}</b>.
        </p>
        <p className="mt-4 font-display text-3xl font-bold">{money(done.total)}</p>
        {done.discountPct > 0 && <p className="text-sm font-semibold text-ok">Incluye {done.discountPct}% de descuento por cliente frecuente</p>}
        <p className="mt-1 text-xs text-muted">Precio estimado. Pagas directo al chofer.</p>
        <Link href={`/${d.slug}/r/${done.token}`} className="mt-6 inline-block font-semibold underline">Ver o cancelar mi reserva</Link>
        <p className="mt-2 text-xs text-muted">Guarda este enlace.</p>
      </div>
    );
  }

  const stepCls = "rounded-3xl border border-line bg-surface p-4 sm:p-6";

  return (
    <div className="space-y-4">
      {/* 1. Trayecto */}
      <section className={stepCls}>
        <h2 className="mb-3 font-display text-lg font-bold">¿A dónde vas?</h2>
        <div className="relative space-y-2">
          <AddressInput label="Origen" value={pickup} onChange={setPickup} sessionToken={sessionToken} dotClass="text-ok" />
          <AddressInput label="Destino" value={dropoff} onChange={setDropoff} sessionToken={sessionToken} dotClass="text-bad" />
          <button
            type="button"
            aria-label="Intercambiar origen y destino"
            onClick={() => { setPickup(dropoff); setDropoff(pickup); }}
            className="absolute right-2 top-[2.6rem] z-10 grid size-8 place-items-center rounded-full border border-line bg-surface text-muted hover:text-ink"
          >
            <ArrowDownUp size={14} />
          </button>
        </div>
        {!quote && (
          <Button className="mt-3 w-full" onClick={getQuote} disabled={quoting || pickup.text.trim().length < 3 || dropoff.text.trim().length < 3}>
            {quoting ? "Calculando…" : "Calcular precio"}
          </Button>
        )}
        {quote && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface-2 p-4">
            <div className="space-y-1 text-sm text-muted">
              <div className="flex items-center gap-1.5"><Route size={14} /> {quote.quote.distanceKm.toFixed(1)} km</div>
              <div className="flex items-center gap-1.5"><Clock size={14} /> ~{quote.quote.durationMin} min</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Precio aproximado</div>
              <div className="font-display text-3xl font-bold tabular-nums">{money(quote.quote.total)}</div>
            </div>
          </div>
        )}
      </section>

      {/* 2. Fecha y hora */}
      {quote && (
        <section className={stepCls}>
          <h2 className="mb-3 font-display text-lg font-bold">¿Cuándo?</h2>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {days.map((day) => {
              const dt = new Date(`${day}T12:00:00Z`);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setDate(day)}
                  className={cx("flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2", day === date ? "border-ink bg-ink text-bg" : "border-line bg-surface")}
                >
                  <span className="text-[11px] uppercase">{formatInTimeZone(dt, "UTC", "EEE", { locale: es }).replace(".", "")}</span>
                  <span className="font-display text-lg font-bold">{formatInTimeZone(dt, "UTC", "d")}</span>
                  <span className="text-[10px]">{formatInTimeZone(dt, "UTC", "MMM", { locale: es }).replace(".", "")}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            {slots === null && <p className="text-sm text-muted">Buscando horarios…</p>}
            {slots?.length === 0 && <p className="text-sm text-muted">No hay horarios disponibles este día. Prueba otra fecha.</p>}
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => setSlot(s)}
                    className={cx("h-11 rounded-xl border text-sm font-semibold tabular-nums", slot?.start === s.start ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-ink")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Datos */}
      {quote && slot && (
        <section className={stepCls}>
          <h2 className="mb-3 font-display text-lg font-bold">Tus datos</h2>
          <form action={submit} className="space-y-3">
            <Field label="Nombre"><Input name="name" autoComplete="name" required minLength={2} maxLength={100} /></Field>
            <Field label="Teléfono / WhatsApp"><Input name="phone" type="tel" autoComplete="tel" required minLength={8} maxLength={25} /></Field>
            <Field label="Email (opcional)" hint="Para enviarte la confirmación"><Input name="email" type="email" autoComplete="email" /></Field>
            <Field label="Pasajeros"><Input name="passengers" type="number" min={1} max={20} defaultValue={1} /></Field>
            <Field label="Notas para el chofer (opcional)"><Textarea name="notes" maxLength={500} placeholder="Equipaje, número de vuelo, referencias…" /></Field>
            {d.loyalty && (
              <p className="flex items-start gap-2 rounded-xl bg-accent/10 p-3 text-sm">
                <Gift size={16} className="mt-0.5 shrink-0" />
                {d.loyalty.trips_required === 1 ? "Después de cada viaje" : `Cada ${d.loyalty.trips_required} viajes`}, el siguiente tiene {d.loyalty.discount_pct}% de descuento. Se aplica solo con tu teléfono.
              </p>
            )}
            {d.methods.length > 0 && (
              <p className="text-sm text-muted">Pagas directo al chofer: {d.methods.map((m) => PAYMENT_LABELS[m]).join(", ")}.</p>
            )}
            <Button className="w-full" disabled={submitting}>
              {submitting ? "Reservando…" : `Reservar ${formatInTimeZone(slot.start, d.timezone, "EEE d, HH:mm", { locale: es })}`}
            </Button>
          </form>
        </section>
      )}

      {error && <Notice tone="bad">{error}</Notice>}
    </div>
  );
}

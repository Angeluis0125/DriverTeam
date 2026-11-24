import { requireDriver } from "@/lib/auth";
import {
  addException, deleteException, saveBookingPrefs, saveLoyalty, savePricing, saveProfile, saveSchedule,
} from "@/lib/driver-actions";
import { ActionForm } from "@/components/forms/action-form";
import { ProfileFields } from "@/components/forms/profile-fields";
import { MethodsPicker, PricingFields } from "@/components/forms/pricing-fields";
import { ScheduleEditor } from "@/components/forms/schedule-editor";
import { PushToggle } from "@/components/dashboard/push-toggle";
import { Button, Card, Field, Input, PageTitle, Select } from "@/components/ui";
import { siteUrl } from "@/lib/site";
import { localDate } from "@/lib/periods";
import { fmt } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export const metadata = { title: "Ajustes" };

function Section({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {desc && <p className="mb-4 mt-1 text-sm text-muted">{desc}</p>}
      <div className={desc ? "" : "mt-4"}>{children}</div>
    </Card>
  );
}

function Toggle({ name, label, hint, checked }: { name: string; label: string; hint?: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 size-4 accent-[var(--accent)]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export default async function SettingsPage() {
  const { supabase, driver: d } = await requireDriver();
  const today = localDate(new Date(), d.timezone);
  const [{ data: pricing }, { data: methods }, { data: rules }, { data: exceptions }, { data: loyalty }] = await Promise.all([
    supabase.from("pricing").select("base, per_km, per_min, minimum").maybeSingle(),
    supabase.from("payment_methods_accepted").select("method"),
    supabase.from("availability_rules").select("weekday, start_time, end_time").order("weekday").order("start_time"),
    supabase.from("availability_exceptions").select("*").gte("date", today).order("date"),
    supabase.from("loyalty_programs").select("active, trips_required, discount_pct").maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageTitle title="Ajustes" />
      <nav className="-mt-2 mb-2 flex gap-2 overflow-x-auto text-sm">
        {[["perfil", "Perfil"], ["tarifas", "Tarifas"], ["horario", "Horario"], ["reservas", "Reservas"], ["fidelizacion", "Fidelización"], ["avisos", "Avisos"]].map(([id, l]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-muted hover:text-ink">{l}</a>
        ))}
      </nav>

      <Section id="perfil" title="Perfil público">
        <ActionForm action={saveProfile}>
          <ProfileFields d={d} siteHost={new URL(siteUrl()).host} />
        </ActionForm>
      </Section>

      <Section id="tarifas" title="Tarifas y pagos" desc="Precio = tarifa base + km × precio por km + minutos × precio por minuto (nunca menos que la mínima).">
        <ActionForm action={savePricing}>
          <PricingFields pricing={pricing ?? undefined} currency={d.currency} />
          <MethodsPicker selected={(methods ?? []).map((m) => m.method as PaymentMethod)} />
        </ActionForm>
      </Section>

      <Section id="horario" title="Horario semanal" desc="Tus clientes solo podrán reservar dentro de estos bloques.">
        <ActionForm action={saveSchedule} submit="Guardar horario">
          <ScheduleEditor initial={rules ?? []} />
        </ActionForm>

        <h3 className="mb-2 mt-6 font-semibold">Días especiales</h3>
        <p className="mb-3 text-sm text-muted">Bloquea un día (vacaciones) o define un horario distinto para una fecha.</p>
        {(exceptions ?? []).length > 0 && (
          <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
            {exceptions!.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-32 font-medium capitalize">{fmt(`${e.date}T12:00:00Z`, "UTC", "EEE d MMM")}</span>
                <span className="flex-1 text-muted">
                  {e.is_blocked ? "No disponible" : `${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)}`}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <form action={deleteException}>
                  <input type="hidden" name="id" value={e.id} />
                  <Button variant="ghost" className="h-8 px-2 text-xs">Quitar</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={addException} submit="Agregar día especial">
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Fecha"><Input type="date" name="date" min={today} required /></Field>
            <Field label="Tipo">
              <Select name="kind" defaultValue="blocked">
                <option value="blocked">Bloquear día</option>
                <option value="special">Horario especial</option>
              </Select>
            </Field>
            <Field label="Desde"><Input type="time" name="start_time" /></Field>
            <Field label="Hasta"><Input type="time" name="end_time" /></Field>
          </div>
          <Field label="Nota (opcional)"><Input name="note" maxLength={120} /></Field>
        </ActionForm>
      </Section>

      <Section id="reservas" title="Reglas de reserva">
        <ActionForm action={saveBookingPrefs}>
          <Toggle name="auto_confirm" label="Confirmar reservas automáticamente" hint="Si está apagado, cada reserva queda pendiente hasta que la aceptes." checked={d.auto_confirm} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Margen entre viajes (min)" hint="Tiempo libre después de cada viaje">
              <Input type="number" name="buffer_minutes" min={0} max={240} defaultValue={d.buffer_minutes} />
            </Field>
            <Field label="Anticipación mínima (horas)">
              <Input type="number" name="min_notice_hours" min={0} max={168} defaultValue={d.min_notice_hours} />
            </Field>
            <Field label="Reservar hasta (días adelante)">
              <Input type="number" name="max_days_ahead" min={1} max={365} defaultValue={d.max_days_ahead} />
            </Field>
            <Field label="Intervalo de horarios">
              <Select name="slot_step_minutes" defaultValue={String(d.slot_step_minutes)}>
                <option value="15">Cada 15 min</option>
                <option value="30">Cada 30 min</option>
                <option value="60">Cada hora</option>
              </Select>
            </Field>
          </div>
          <Toggle name="notify_email" label="Recibir avisos por email" checked={d.notify_email} />
        </ActionForm>
      </Section>

      <Section id="fidelizacion" title="Fidelización" desc="Premia a tus clientes frecuentes: después de cierto número de viajes, el siguiente lleva descuento automático.">
        <ActionForm action={saveLoyalty}>
          <Toggle name="active" label="Programa activo" checked={loyalty?.active ?? false} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Viajes necesarios"><Input type="number" name="trips_required" min={1} max={100} defaultValue={loyalty?.trips_required ?? 10} /></Field>
            <Field label="Descuento del siguiente viaje (%)"><Input type="number" name="discount_pct" min={1} max={100} defaultValue={loyalty?.discount_pct ?? 10} /></Field>
          </div>
        </ActionForm>
      </Section>

      <Section id="avisos" title="Avisos en el celular" desc="Recibe una notificación al instante cuando alguien reserve.">
        <PushToggle />
      </Section>

      <form action="/auth/signout" method="post" className="pt-2 text-center">
        <Button variant="ghost" className="text-muted">Cerrar sesión</Button>
      </form>
    </div>
  );
}

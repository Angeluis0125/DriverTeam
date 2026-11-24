import { Field, Input } from "@/components/ui";
import { PAYMENT_LABELS, type PaymentMethod } from "@/lib/types";
import type { Pricing } from "@/lib/pricing";

export function PricingFields({ pricing, currency }: { pricing?: Partial<Pricing>; currency: string }) {
  const f = (name: keyof Pricing, label: string, hint?: string) => (
    <Field label={`${label} (${currency})`} hint={hint}>
      <Input name={name} type="number" inputMode="decimal" step="0.01" min="0" defaultValue={pricing?.[name] ?? 0} required />
    </Field>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {f("base", "Tarifa base", "Se cobra al iniciar cada viaje")}
      {f("per_km", "Precio por km")}
      {f("per_min", "Precio por minuto", "Tiempo estimado con tráfico")}
      {f("minimum", "Tarifa mínima")}
    </div>
  );
}

export function MethodsPicker({ selected }: { selected: PaymentMethod[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Métodos de pago que aceptas</legend>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((m) => (
          <label key={m} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input type="checkbox" name="methods" value={m} defaultChecked={selected.includes(m)} className="accent-[var(--accent)]" />
            {PAYMENT_LABELS[m]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

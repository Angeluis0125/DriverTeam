import { Field, Input, Select, Textarea } from "@/components/ui";
import type { Driver } from "@/lib/types";

const TIMEZONES = [
  "America/Mexico_City", "America/Cancun", "America/Tijuana", "America/Monterrey", "America/Bogota",
  "America/Lima", "America/Santiago", "America/Argentina/Buenos_Aires", "America/Caracas", "America/Guatemala",
  "America/Costa_Rica", "America/Panama", "America/Santo_Domingo", "America/Puerto_Rico", "America/New_York",
  "America/Chicago", "America/Los_Angeles", "Europe/Madrid",
];
const CURRENCIES = ["MXN", "USD", "COP", "PEN", "CLP", "ARS", "GTQ", "CRC", "DOP", "EUR"];

export function ProfileFields({ d, siteHost }: { d?: Partial<Driver>; siteHost: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre completo">
        <Input name="full_name" defaultValue={d?.full_name ?? ""} required maxLength={100} />
      </Field>
      <Field label="Tu link de reservas" hint={`${siteHost}/tu-link`}>
        <Input name="slug" defaultValue={d?.slug ?? ""} required pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]" placeholder="juan-perez" autoCapitalize="none" />
      </Field>
      <Field label="Teléfono / WhatsApp">
        <Input name="phone" type="tel" defaultValue={d?.phone ?? ""} />
      </Field>
      <Field label="Vehículo" hint="Ej. Toyota Corolla 2022 gris, 4 pasajeros">
        <Input name="vehicle" defaultValue={d?.vehicle ?? ""} maxLength={120} />
      </Field>
      <Field label="Foto (URL)" className="sm:col-span-2">
        <Input name="photo_url" type="url" defaultValue={d?.photo_url ?? ""} placeholder="https://…" />
      </Field>
      <Field label="Sobre ti" className="sm:col-span-2" hint="Aparece en tu página pública">
        <Textarea name="bio" defaultValue={d?.bio ?? ""} maxLength={400} />
      </Field>
      <Field label="Moneda">
        <Select name="currency" defaultValue={d?.currency ?? "MXN"}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Zona horaria">
        <Select name="timezone" defaultValue={d?.timezone ?? "America/Mexico_City"}>
          {(d?.timezone && !TIMEZONES.includes(d.timezone) ? [d.timezone, ...TIMEZONES] : TIMEZONES).map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

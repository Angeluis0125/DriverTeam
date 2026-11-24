import { COUNTRIES, splitPhone } from "@/lib/phone";

/**
 * Teléfono con selector de país. Envía dos campos: `${name}_country` (ISO) y `${name}` (número).
 * El servidor los combina con buildPhone().
 */
export function PhoneInput({
  name = "phone",
  defaultCountry = "MX",
  defaultValue,
  required,
  id,
}: {
  name?: string;
  defaultCountry?: string;
  defaultValue?: string | null;
  required?: boolean;
  id?: string;
}) {
  const { iso, national } = splitPhone(defaultValue, defaultCountry);
  return (
    <div className="flex gap-2">
      <select
        name={`${name}_country`}
        defaultValue={iso}
        aria-label="País"
        className="h-11 w-28 shrink-0 rounded-xl border border-line bg-surface px-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent/60"
      >
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso} label={`${c.flag} +${c.dial}`}>
            {c.flag} +{c.dial} {c.name}
          </option>
        ))}
      </select>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        defaultValue={national}
        required={required}
        maxLength={25}
        placeholder="55 1234 5678"
        className="h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/60"
      />
    </div>
  );
}

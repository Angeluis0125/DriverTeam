export type Country = { iso: string; name: string; flag: string; dial: string; len: number };

/** Países frecuentes (lada y longitud del número nacional). México primero. */
export const COUNTRIES: Country[] = [
  { iso: "MX", name: "México", flag: "🇲🇽", dial: "52", len: 10 },
  { iso: "US", name: "Estados Unidos", flag: "🇺🇸", dial: "1", len: 10 },
  { iso: "CA", name: "Canadá", flag: "🇨🇦", dial: "1", len: 10 },
  { iso: "CO", name: "Colombia", flag: "🇨🇴", dial: "57", len: 10 },
  { iso: "PE", name: "Perú", flag: "🇵🇪", dial: "51", len: 9 },
  { iso: "CL", name: "Chile", flag: "🇨🇱", dial: "56", len: 9 },
  { iso: "AR", name: "Argentina", flag: "🇦🇷", dial: "54", len: 10 },
  { iso: "VE", name: "Venezuela", flag: "🇻🇪", dial: "58", len: 10 },
  { iso: "EC", name: "Ecuador", flag: "🇪🇨", dial: "593", len: 9 },
  { iso: "GT", name: "Guatemala", flag: "🇬🇹", dial: "502", len: 8 },
  { iso: "SV", name: "El Salvador", flag: "🇸🇻", dial: "503", len: 8 },
  { iso: "HN", name: "Honduras", flag: "🇭🇳", dial: "504", len: 8 },
  { iso: "NI", name: "Nicaragua", flag: "🇳🇮", dial: "505", len: 8 },
  { iso: "CR", name: "Costa Rica", flag: "🇨🇷", dial: "506", len: 8 },
  { iso: "PA", name: "Panamá", flag: "🇵🇦", dial: "507", len: 8 },
  { iso: "DO", name: "Rep. Dominicana", flag: "🇩🇴", dial: "1", len: 10 },
  { iso: "PR", name: "Puerto Rico", flag: "🇵🇷", dial: "1", len: 10 },
  { iso: "BO", name: "Bolivia", flag: "🇧🇴", dial: "591", len: 8 },
  { iso: "PY", name: "Paraguay", flag: "🇵🇾", dial: "595", len: 9 },
  { iso: "UY", name: "Uruguay", flag: "🇺🇾", dial: "598", len: 8 },
  { iso: "ES", name: "España", flag: "🇪🇸", dial: "34", len: 9 },
];

export const countryOf = (iso?: string | null) => COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];

const CURRENCY_COUNTRY: Record<string, string> = {
  MXN: "MX", USD: "US", COP: "CO", PEN: "PE", CLP: "CL", ARS: "AR", GTQ: "GT", CRC: "CR", DOP: "DO", EUR: "ES",
};
export const defaultCountry = (currency?: string | null) => CURRENCY_COUNTRY[currency ?? ""] ?? "MX";

/**
 * Convierte lo que escribió la persona a formato internacional (solo dígitos, sin "+"),
 * p. ej. MX "55 1234 5678" → "525512345678". Devuelve null si no es válido.
 */
export function buildPhone(iso: string | null | undefined, raw: string): string | null {
  const c = countryOf(iso);
  const trimmed = raw.trim();
  let d = trimmed.replace(/\D/g, "");
  if (!d) return null;

  if (trimmed.startsWith("+")) return valid(d);
  if (d.startsWith("00")) return valid(d.slice(2));
  if (d.length === c.len) return valid(c.dial + d);
  if (d.startsWith(c.dial) && d.length === c.dial.length + c.len) return valid(d);
  if (d.startsWith("0") && d.length === c.len + 1) return valid(c.dial + d.slice(1));
  d = c.dial + d;
  return valid(d);
}
const valid = (d: string) => (d.length >= 8 && d.length <= 15 ? d : null);

/** Mensaje de ayuda con la longitud esperada. */
export const phoneHint = (iso?: string | null) => {
  const c = countryOf(iso);
  return `Revisa tu número: deben ser ${c.len} dígitos para ${c.name}`;
};

/** Separa un número guardado en país + número nacional, para editarlo. */
export function splitPhone(stored: string | null | undefined, fallbackIso: string) {
  const d = (stored ?? "").replace(/\D/g, "");
  const fb = countryOf(fallbackIso);
  if (!d) return { iso: fb.iso, national: "" };
  if (d.length === fb.len) return { iso: fb.iso, national: d }; // número viejo sin lada
  // preferir el país por defecto si comparte lada (+1)
  const candidates = [fb, ...COUNTRIES.filter((c) => c.iso !== fb.iso)];
  const c = candidates.find((x) => d.startsWith(x.dial) && d.length === x.dial.length + x.len);
  return c ? { iso: c.iso, national: d.slice(c.dial.length) } : { iso: fb.iso, national: `+${d}` };
}

/** Dígitos listos para wa.me / tel:, agregando la lada a números viejos de longitud nacional. */
export function toInternational(stored: string, fallbackIso = "MX") {
  const d = stored.replace(/\D/g, "");
  const c = countryOf(fallbackIso);
  return d.length === c.len ? c.dial + d : d;
}

/** Para mostrar: "+52 55 1234 5678". */
export function formatPhone(stored: string, fallbackIso = "MX") {
  const d = toInternational(stored, fallbackIso);
  const { iso, national } = splitPhone(d, fallbackIso);
  const c = countryOf(iso);
  if (national.startsWith("+")) return national;
  const n = c.iso === "MX" && national.length === 10 ? `${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6)}` : national;
  return `+${c.dial} ${n}`;
}

/** Normaliza un teléfono a solo dígitos (8–15). Devuelve null si no es válido. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

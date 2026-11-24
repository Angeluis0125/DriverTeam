/** Normaliza un teléfono a solo dígitos (8–15). Devuelve null si no es válido. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

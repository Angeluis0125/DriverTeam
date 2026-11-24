export type Pricing = { base: number; per_km: number; per_min: number; minimum: number };

export type Quote = {
  distanceKm: number;
  durationMin: number;
  subtotal: number;
  discountPct: number;
  discount: number;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tarifa: max(mínimo, base + km·precio_km + min·precio_min), redondeada al entero; luego descuento. */
export function computeQuote(p: Pricing, distanceKm: number, durationMin: number, discountPct = 0): Quote {
  if (!(distanceKm >= 0) || !(durationMin >= 0)) throw new Error("Distancia o duración inválida");
  const raw = Number(p.base) + distanceKm * Number(p.per_km) + durationMin * Number(p.per_min);
  const subtotal = Math.round(Math.max(Number(p.minimum), raw));
  const pct = Math.min(Math.max(discountPct, 0), 100);
  const discount = Math.round((subtotal * pct) / 100);
  return {
    distanceKm: round2(distanceKm),
    durationMin: Math.ceil(durationMin),
    subtotal,
    discountPct: pct,
    discount,
    total: subtotal - discount,
  };
}

export function formatMoney(amount: number, currency = "MXN", locale = "es-MX") {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

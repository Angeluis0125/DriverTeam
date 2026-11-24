import { describe, expect, it } from "vitest";
import { computeQuote } from "@/lib/pricing";

const p = { base: 40, per_km: 8, per_min: 2, minimum: 80 };

describe("computeQuote", () => {
  it("base + km + minutos", () => {
    const q = computeQuote(p, 10, 20);
    expect(q.subtotal).toBe(40 + 80 + 40);
    expect(q.total).toBe(160);
  });
  it("aplica la tarifa mínima", () => {
    expect(computeQuote(p, 1, 2).total).toBe(80);
  });
  it("aplica descuento", () => {
    const q = computeQuote(p, 10, 20, 10);
    expect(q.discount).toBe(16);
    expect(q.total).toBe(144);
  });
  it("redondea al entero y acota el descuento", () => {
    expect(computeQuote(p, 10.33, 20.5).subtotal).toBe(Math.round(40 + 82.64 + 41));
    expect(computeQuote(p, 10, 20, 150).total).toBe(0);
  });
  it("rechaza datos inválidos", () => {
    expect(() => computeQuote(p, -1, 5)).toThrow();
    expect(() => computeQuote(p, NaN, 5)).toThrow();
  });
});

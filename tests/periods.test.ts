import { describe, expect, it } from "vitest";
import { periodStarts } from "@/lib/periods";

describe("periodStarts", () => {
  it("calcula inicio de día, semana y mes en la zona del chofer", () => {
    // miércoles 2 dic 2026, 03:00 UTC = martes 1 dic 21:00 en CDMX
    const p = periodStarts("America/Mexico_City", new Date("2026-12-02T03:00:00Z"));
    expect(p.today.toISOString()).toBe("2026-12-01T06:00:00.000Z");
    expect(p.tomorrow.toISOString()).toBe("2026-12-02T06:00:00.000Z");
    expect(p.week.toISOString()).toBe("2026-11-30T06:00:00.000Z"); // lunes 30 nov
    expect(p.month.toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });
});

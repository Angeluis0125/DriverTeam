import { describe, expect, it } from "vitest";
import { availableSlots, windowsFor, weekdayOf } from "@/lib/availability";

const tz = "America/Mexico_City"; // UTC-6, sin horario de verano
// 2026-12-01 es martes (2)
const rules = [{ weekday: 2, start_time: "09:00:00", end_time: "12:00:00" }];
const base = {
  date: "2026-12-01",
  timezone: tz,
  rules,
  exceptions: [],
  busy: [],
  durationMin: 60,
  bufferMin: 0,
  stepMin: 30,
  minNoticeHours: 0,
  maxDaysAhead: 30,
  now: new Date("2026-11-30T12:00:00Z"),
};

describe("availability", () => {
  it("weekdayOf", () => expect(weekdayOf("2026-12-01")).toBe(2));

  it("genera horarios que terminan dentro de la ventana", () => {
    const s = availableSlots(base);
    expect(s.map((x) => x.label)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(s[0].start).toBe("2026-12-01T15:00:00.000Z");
  });

  it("día sin reglas no tiene horarios", () => {
    expect(availableSlots({ ...base, date: "2026-12-02" })).toEqual([]);
  });

  it("excluye traslapes con reservas considerando el buffer", () => {
    const busy = [{ start: new Date("2026-12-01T16:00:00Z"), end: new Date("2026-12-01T17:15:00Z") }]; // 10:00–11:15 local
    const s = availableSlots({ ...base, busy, bufferMin: 15 });
    // 09:00 → ocupa hasta 10:15, choca; 08:xx no existe; 11:00 → libre? 11:00 < 11:15 choca
    expect(s.map((x) => x.label)).toEqual([]);
    const s2 = availableSlots({ ...base, busy, bufferMin: 0 });
    expect(s2.map((x) => x.label)).toEqual(["09:00"]);
  });

  it("respeta la anticipación mínima", () => {
    const s = availableSlots({ ...base, now: new Date("2026-12-01T15:10:00Z"), minNoticeHours: 1 });
    expect(s.map((x) => x.label)).toEqual(["10:30", "11:00"]);
  });

  it("respeta días bloqueados y horarios especiales", () => {
    expect(availableSlots({ ...base, exceptions: [{ date: "2026-12-01", is_blocked: true, start_time: null, end_time: null }] })).toEqual([]);
    const special = [{ date: "2026-12-01", is_blocked: false, start_time: "18:00", end_time: "19:00" }];
    expect(windowsFor("2026-12-01", rules, special)).toEqual([{ start: "18:00", end: "19:00" }]);
    expect(availableSlots({ ...base, exceptions: special }).map((x) => x.label)).toEqual(["18:00"]);
  });

  it("no ofrece fechas pasadas ni más allá del límite", () => {
    expect(availableSlots({ ...base, date: "2026-11-29" })).toEqual([]);
    expect(availableSlots({ ...base, maxDaysAhead: 0 })).toEqual([]);
  });

  it("rechaza fechas mal formadas", () => {
    expect(() => availableSlots({ ...base, date: "1/12/2026" })).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { buildPhone, defaultCountry, formatPhone, splitPhone, toInternational } from "@/lib/phone";
import { whatsapp } from "@/lib/format";

describe("buildPhone", () => {
  it("antepone la lada de México a 10 dígitos", () => {
    expect(buildPhone("MX", "55 1234 5678")).toBe("525512345678");
  });
  it("respeta números escritos con +", () => {
    expect(buildPhone("MX", "+52 55 1234 5678")).toBe("525512345678");
    expect(buildPhone("MX", "+1 (415) 555-0100")).toBe("14155550100");
  });
  it("no duplica la lada si ya la escribieron", () => {
    expect(buildPhone("MX", "52 5512345678")).toBe("525512345678");
  });
  it("acepta 00 como prefijo internacional", () => {
    expect(buildPhone("MX", "0052 5512345678")).toBe("525512345678");
  });
  it("otros países", () => {
    expect(buildPhone("PE", "987 654 321")).toBe("51987654321");
    expect(buildPhone("CO", "300 123 4567")).toBe("573001234567");
  });
  it("quita el 0 troncal", () => {
    expect(buildPhone("AR", "01123456789")).toBe("541123456789");
  });
  it("rechaza números inválidos", () => {
    expect(buildPhone("MX", "123")).toBeNull();
    expect(buildPhone("MX", "")).toBeNull();
  });
});

describe("helpers", () => {
  it("país por moneda", () => {
    expect(defaultCountry("MXN")).toBe("MX");
    expect(defaultCountry("COP")).toBe("CO");
    expect(defaultCountry("XYZ")).toBe("MX");
  });
  it("splitPhone separa país y número", () => {
    expect(splitPhone("525512345678", "MX")).toEqual({ iso: "MX", national: "5512345678" });
    expect(splitPhone("5512345678", "MX")).toEqual({ iso: "MX", national: "5512345678" });
    expect(splitPhone("51987654321", "MX")).toEqual({ iso: "PE", national: "987654321" });
    expect(splitPhone("", "CO")).toEqual({ iso: "CO", national: "" });
  });
  it("números viejos sin lada se corrigen al usarse", () => {
    expect(toInternational("5512345678")).toBe("525512345678");
    expect(whatsapp("5512345678")).toBe("https://wa.me/525512345678");
    expect(whatsapp("525512345678", "Hola")).toBe("https://wa.me/525512345678?text=Hola");
  });
  it("formatPhone", () => {
    expect(formatPhone("525512345678")).toBe("+52 55 1234 5678");
    expect(formatPhone("51987654321")).toBe("+51 987654321");
  });
});

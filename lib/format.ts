import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { toInternational } from "@/lib/phone";

export const fmt = (d: string | Date, tz: string, pattern: string) => formatInTimeZone(d, tz, pattern, { locale: es });
export const fmtDateTime = (d: string | Date, tz: string) => fmt(d, tz, "EEE d MMM, HH:mm");
export const fmtDay = (d: string | Date, tz: string) => fmt(d, tz, "EEEE d 'de' MMMM");
export const fmtTime = (d: string | Date, tz: string) => fmt(d, tz, "HH:mm");

export const mapsDirections = (from: string, to: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;

/** Link de WhatsApp. A números viejos sin lada se les agrega la del país por defecto. */
export const whatsapp = (phone: string, text?: string, fallbackIso = "MX") =>
  `https://wa.me/${toInternational(phone, fallbackIso)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const telLink = (phone: string, fallbackIso = "MX") => `tel:+${toInternational(phone, fallbackIso)}`;

import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const fmt = (d: string | Date, tz: string, pattern: string) => formatInTimeZone(d, tz, pattern, { locale: es });
export const fmtDateTime = (d: string | Date, tz: string) => fmt(d, tz, "EEE d MMM, HH:mm");
export const fmtDay = (d: string | Date, tz: string) => fmt(d, tz, "EEEE d 'de' MMMM");
export const fmtTime = (d: string | Date, tz: string) => fmt(d, tz, "HH:mm");

export const mapsDirections = (from: string, to: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&travelmode=driving`;

export const whatsapp = (phone: string, text?: string) => `https://wa.me/${phone.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

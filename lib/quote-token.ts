import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type QuotePayload = {
  driverId: string;
  pickup: { text: string; placeId?: string };
  dropoff: { text: string; placeId?: string };
  distanceKm: number;
  durationMin: number;
  exp: number; // epoch ms
};

const secret = () => process.env.QUOTE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-secret";
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

/** Firma la ruta cotizada para no volver a llamar a Maps al reservar y evitar que el cliente altere distancia/tiempo. */
export function signQuote(p: Omit<QuotePayload, "exp">, ttlMinutes = 60) {
  const data = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + ttlMinutes * 60_000 })).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyQuote(token: string): QuotePayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as QuotePayload;
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

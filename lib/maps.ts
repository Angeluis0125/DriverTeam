import "server-only";

export type Place = { text: string; placeId?: string };
export type Route = { distanceKm: number; durationMin: number };
export type Suggestion = { placeId: string; text: string };

const key = () => process.env.GOOGLE_MAPS_SERVER_KEY;
const mock = () => process.env.MAPS_MOCK === "1";

export class MapsError extends Error {}

/** Distancia y tiempo por carretera (Google Routes API). */
export async function computeRoute(origin: Place, destination: Place): Promise<Route> {
  if (mock()) return mockRoute(origin, destination);
  if (!key()) throw new MapsError("Falta configurar GOOGLE_MAPS_SERVER_KEY");
  const wp = (p: Place) => (p.placeId ? { placeId: p.placeId } : { address: p.text });
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key()!,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: wp(origin),
      destination: wp(destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      languageCode: "es",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new MapsError(`No se pudo calcular la ruta (${res.status})`);
  const data = (await res.json()) as { routes?: { distanceMeters?: number; duration?: string }[] };
  const r = data.routes?.[0];
  if (!r?.distanceMeters || !r.duration) throw new MapsError("No se encontró una ruta entre esas direcciones");
  return { distanceKm: r.distanceMeters / 1000, durationMin: Math.max(1, Math.ceil(parseInt(r.duration, 10) / 60)) };
}

/** Autocompletado de direcciones (Places API New). */
export async function autocomplete(input: string, sessionToken?: string, region?: string): Promise<Suggestion[]> {
  if (mock()) return [{ placeId: `mock:${input}`, text: input }];
  if (!key()) throw new MapsError("Falta configurar GOOGLE_MAPS_SERVER_KEY");
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key()! },
    body: JSON.stringify({ input, sessionToken, languageCode: "es", ...(region ? { includedRegionCodes: [region] } : {}) }),
    cache: "no-store",
  });
  if (!res.ok) throw new MapsError(`Error de autocompletado (${res.status})`);
  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ placeId: p.placeId, text: p.text.text }));
}

// Solo para desarrollo y pruebas (MAPS_MOCK=1): ruta determinística a partir del texto.
function mockRoute(a: Place, b: Place): Route {
  const s = `${a.text}|${b.text}`;
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const distanceKm = 3 + (h % 270) / 10; // 3–30 km
  return { distanceKm, durationMin: Math.ceil(distanceKm * 2 + 5) };
}

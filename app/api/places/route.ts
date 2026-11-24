import { NextResponse } from "next/server";
import { z } from "zod";
import { autocomplete, MapsError } from "@/lib/maps";
import { allow } from "@/lib/rate-limit";

const Body = z.object({ input: z.string().trim().min(3).max(200), sessionToken: z.string().max(64).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ suggestions: [] });
  if (!(await allow("places", 120))) return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
  try {
    const suggestions = await autocomplete(parsed.data.input, parsed.data.sessionToken, process.env.MAPS_REGION);
    return NextResponse.json({ suggestions });
  } catch (e) {
    const msg = e instanceof MapsError ? e.message : "Error de autocompletado";
    return NextResponse.json({ error: msg, suggestions: [] }, { status: 502 });
  }
}

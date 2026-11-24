import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Sub = z.object({ endpoint: z.url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

async function user() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: Request) {
  const { supabase, user: u } = await user();
  if (!u) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const s = Sub.safeParse(await req.json().catch(() => null));
  if (!s.success) return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  // Un endpoint pertenece a un solo dispositivo: si existía con otro chofer, se reemplaza
  await supabase.from("push_subscriptions").delete().eq("endpoint", s.data.endpoint);
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ driver_id: u.id, endpoint: s.data.endpoint, p256dh: s.data.keys.p256dh, auth: s.data.keys.auth });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { supabase, user: u } = await user();
  if (!u) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}

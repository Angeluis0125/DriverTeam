import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card } from "@/components/ui";
import { fmtDateTime, whatsapp } from "@/lib/format";
import { formatMoney } from "@/lib/pricing";
import type { BookingStatus } from "@/lib/types";
import { cancelByCustomer } from "./actions";

export const metadata = { title: "Tu reserva", robots: { index: false } };

export default async function ManageBooking({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  if (!/^[a-f0-9]{36}$/.test(token)) notFound();
  const { data: b } = await createAdminClient()
    .from("bookings")
    .select("status, start_at, pickup_address, dropoff_address, est_price, final_price, discount_pct, est_duration_min, est_distance_km, drivers(slug, full_name, phone, timezone, currency, vehicle)")
    .eq("manage_token", token)
    .maybeSingle();
  const d = b?.drivers as unknown as { slug: string; full_name: string; phone: string | null; timezone: string; currency: string; vehicle: string | null } | undefined;
  if (!b || !d || d.slug !== slug) notFound();
  const status = b.status as BookingStatus;
  const canCancel = ["pending", "confirmed"].includes(status) && new Date(b.start_at) > new Date();

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Tu viaje con {d.full_name}</p>
            <h1 className="mt-1 font-display text-2xl font-bold capitalize">{fmtDateTime(b.start_at, d.timezone)}</h1>
          </div>
          <StatusBadge status={status} />
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-ok" /> {b.pickup_address}</p>
          <p className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-bad" /> {b.dropoff_address}</p>
        </div>
        <div className="mt-4 flex items-end justify-between rounded-2xl bg-surface-2 p-4">
          <div className="text-sm text-muted">{Number(b.est_distance_km).toFixed(1)} km · ~{b.est_duration_min} min</div>
          <div className="text-right">
            <div className="text-xs text-muted">{b.final_price != null ? "Total pagado" : "Precio aproximado"}</div>
            <div className="font-display text-2xl font-bold">{formatMoney(Number(b.final_price ?? b.est_price), d.currency)}</div>
            {Number(b.discount_pct) > 0 && <div className="text-xs font-semibold text-ok">−{Number(b.discount_pct)}% cliente frecuente</div>}
          </div>
        </div>
        {status === "pending" && <p className="mt-3 text-sm text-muted">Tu chofer aún no confirma. Te avisaremos por email si lo dejaste.</p>}
        {d.vehicle && <p className="mt-3 text-sm text-muted">Vehículo: {d.vehicle}</p>}
      </Card>

      {d.phone && (
        <a href={whatsapp(d.phone, "Hola, tengo una reserva contigo.")} target="_blank" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-semibold">
          <MessageCircle size={18} /> Escribir a {d.full_name.split(" ")[0]}
        </a>
      )}

      {canCancel && (
        <form action={cancelByCustomer}>
          <input type="hidden" name="token" value={token} />
          <Button variant="danger" className="w-full">Cancelar reserva</Button>
        </form>
      )}

      <p className="text-center text-sm">
        <Link href={`/${d.slug}`} className="text-muted underline">Hacer otra reserva</Link>
      </p>
    </main>
  );
}

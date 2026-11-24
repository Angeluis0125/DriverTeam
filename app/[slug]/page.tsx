import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Car } from "lucide-react";
import { getPublicDriver, toPublicProfile } from "@/lib/public-booking";
import { BookingFlow } from "@/components/booking/booking-flow";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getPublicDriver(slug);
  if (!d) return { title: "Chofer no encontrado" };
  const description = d.bio || `Reserva tu viaje directo con ${d.full_name}. Precio estimado al instante.`;
  return { title: `Reserva con ${d.full_name}`, description, openGraph: { title: `Reserva con ${d.full_name}`, description, images: d.photo_url ? [d.photo_url] : undefined } };
}

export default async function PublicDriverPage({ params }: Props) {
  const { slug } = await params;
  const d = await getPublicDriver(slug);
  if (!d) notFound();
  const p = toPublicProfile(d);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-8">
      <header className="mb-6 flex items-center gap-4">
        {p.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo_url} alt="" className="size-16 rounded-2xl object-cover" />
        ) : (
          <div className="grid size-16 place-items-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-ink">{p.full_name.charAt(0)}</div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight">{p.full_name}</h1>
          {p.vehicle && <p className="flex items-center gap-1.5 text-sm text-muted"><Car size={14} /> {p.vehicle}</p>}
        </div>
      </header>
      {p.bio && <p className="mb-6 text-sm text-muted">{p.bio}</p>}
      <BookingFlow d={p} />
      <p className="mt-10 text-center text-xs text-muted">Reservas con DriverTeam</p>
    </main>
  );
}

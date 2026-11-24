import Link from "next/link";
import { BarChart3, Bell, CalendarClock, Calculator, Gift, Users } from "lucide-react";
import { LinkButton } from "@/components/ui";

const features = [
  { icon: Calculator, title: "Precio al instante", text: "Tus clientes ponen origen y destino y ven el costo aproximado con tus tarifas." },
  { icon: CalendarClock, title: "Tu horario, tus reglas", text: "Define días, horarios, margen entre viajes y fechas bloqueadas." },
  { icon: Bell, title: "Avisos inmediatos", text: "Notificación en tu celular y correo con cada nueva reserva." },
  { icon: Users, title: "Tus clientes, tuyos", text: "Historial de viajes, notas y contacto directo por WhatsApp." },
  { icon: Gift, title: "Fidelización automática", text: "Cada N viajes, el siguiente con descuento. Sin tarjetas de sellos." },
  { icon: BarChart3, title: "Sabes cuánto ganas", text: "Ingresos por día y método de pago, gastos y ganancia neta." },
];

export default function Landing() {
  return (
    <main>
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <span className="font-display text-xl font-bold">Driver<span className="text-accent">Team</span></span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm font-medium text-muted hover:text-ink">Entrar</Link>
          <LinkButton href="/signup" className="h-10">Crear cuenta</LinkButton>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-20">
        <p className="mb-4 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold">Para choferes independientes</p>
        <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Tus clientes reservan directo contigo. Sin comisiones.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Una página con tu link para que te reserven, vean tu disponibilidad y el precio del viaje. Tú decides tus tarifas y cobras como siempre: efectivo, tarjeta o terminal.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/signup" className="h-12 px-6 text-base">Crear mi página gratis</LinkButton>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-surface p-6">
              <Icon className="text-accent" size={24} />
              <h2 className="mt-3 font-display text-lg font-bold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">© {new Date().getFullYear()} DriverTeam</footer>
    </main>
  );
}

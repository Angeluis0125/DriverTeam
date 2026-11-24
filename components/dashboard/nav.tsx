"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Home, Settings, Users } from "lucide-react";
import { cx } from "@/components/ui";

const items = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/bookings", label: "Reservas", icon: CalendarDays },
  { href: "/dashboard/customers", label: "Clientes", icon: Users },
  { href: "/dashboard/reports", label: "Finanzas", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
];

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
}

export function DesktopNav({ pending }: { pending: number }) {
  const active = useActive();
  return (
      <nav className="hidden gap-1 md:flex">
        {items.map(({ href, label }) => (
          <Link key={href} href={href} className={cx("rounded-xl px-3 py-2 text-sm font-medium", active(href) ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}>
            {label}
            {href === "/dashboard/bookings" && pending > 0 && <span className="ml-1.5 rounded-full bg-warn/20 px-1.5 text-xs text-warn">{pending}</span>}
          </Link>
        ))}
      </nav>
  );
}

/** Va fuera del header: su backdrop-blur haría que `fixed` se posicione respecto a él. */
export function MobileNav({ pending }: { pending: number }) {
  const active = useActive();
  return (
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cx("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active(href) ? "text-ink" : "text-muted")}>
            <Icon size={20} strokeWidth={active(href) ? 2.4 : 1.8} />
            {label}
            {href === "/dashboard/bookings" && pending > 0 && <span className="absolute right-[22%] top-1 size-2 rounded-full bg-warn" />}
          </Link>
        ))}
      </nav>
  );
}

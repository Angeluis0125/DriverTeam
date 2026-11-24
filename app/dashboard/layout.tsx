import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireDriver } from "@/lib/auth";
import { DesktopNav, MobileNav } from "@/components/dashboard/nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, driver } = await requireDriver();
  const [{ data: notifs }, { count: pending }] = await Promise.all([
    supabase.from("notifications").select("id, title, body, booking_id, read_at, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="font-display text-lg font-bold">
            Driver<span className="text-accent">Team</span>
          </Link>
          <DesktopNav pending={pending ?? 0} />
          <div className="ml-auto flex items-center gap-1">
            <Link href={`/${driver.slug}`} target="_blank" className="hidden items-center gap-1 rounded-xl px-3 py-2 text-sm text-muted hover:text-ink sm:flex">
              Mi página <ExternalLink size={14} />
            </Link>
            <NotificationBell driverId={driver.id} initial={notifs ?? []} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <MobileNav pending={pending ?? 0} />
    </div>
  );
}

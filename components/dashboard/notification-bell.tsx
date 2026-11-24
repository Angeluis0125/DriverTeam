"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type N = { id: string; title: string; body: string; booking_id: string | null; read_at: string | null; created_at: string };

export function NotificationBell({ driverId, initial }: { driverId: string; initial: N[] }) {
  const [items, setItems] = useState<N[]>(initial);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<N | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((i) => !i.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`notif:${driverId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `driver_id=eq.${driverId}` }, (p) => {
        const n = p.new as N;
        setItems((cur) => [n, ...cur].slice(0, 30));
        setToast(n);
        setTimeout(() => setToast(null), 6000);
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [driverId, router]);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function markAllRead() {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((cur) => cur.map((i) => ({ ...i, read_at: i.read_at ?? now })));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) markAllRead();
        }}
        className="relative grid size-10 place-items-center rounded-xl hover:bg-surface-2"
        aria-label={`Avisos${unread ? ` (${unread} sin leer)` : ""}`}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Avisos</div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Sin avisos todavía</li>}
            {items.map((n) => (
              <li key={n.id} className="border-b border-line last:border-0">
                <Link href={n.booking_id ? `/dashboard/bookings/${n.booking_id}` : "/dashboard/bookings"} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-surface-2">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="whitespace-pre-line text-xs text-muted">{n.body}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {toast && (
        <Link href={toast.booking_id ? `/dashboard/bookings/${toast.booking_id}` : "/dashboard/bookings"} className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm rounded-2xl border border-accent bg-surface p-4 shadow-2xl sm:bottom-6">
          <div className="text-sm font-bold">{toast.title}</div>
          <div className="whitespace-pre-line text-xs text-muted">{toast.body}</div>
        </Link>
      )}
    </div>
  );
}

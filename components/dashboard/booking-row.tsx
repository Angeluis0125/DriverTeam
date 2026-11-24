import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { fmt, fmtTime } from "@/lib/format";
import { formatMoney } from "@/lib/pricing";
import type { BookingStatus } from "@/lib/types";

export type BookingListItem = {
  id: string;
  start_at: string;
  status: BookingStatus;
  pickup_address: string;
  dropoff_address: string;
  est_price: number;
  final_price: number | null;
  customers: { full_name: string } | null;
};

export function BookingRow({ b, tz, currency, showDate }: { b: BookingListItem; tz: string; currency: string; showDate?: boolean }) {
  return (
    <Link href={`/dashboard/bookings/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
      <div className="w-14 shrink-0 tabular-nums">
        {showDate && <div className="text-[11px] font-medium uppercase text-muted">{fmt(b.start_at, tz, "d MMM")}</div>}
        <div className="font-display text-lg font-bold">{fmtTime(b.start_at, tz)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{b.customers?.full_name ?? "Cliente"}</span>
          <StatusBadge status={b.status} />
        </div>
        <div className="truncate text-sm text-muted">
          {b.pickup_address} → {b.dropoff_address}
        </div>
      </div>
      <div className="shrink-0 text-right text-sm font-semibold tabular-nums">{formatMoney(Number(b.final_price ?? b.est_price), currency)}</div>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

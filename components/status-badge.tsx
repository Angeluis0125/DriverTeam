import { Badge } from "@/components/ui";
import { STATUS_LABELS, type BookingStatus } from "@/lib/types";

const tone: Record<BookingStatus, "neutral" | "ok" | "warn" | "bad" | "accent"> = {
  pending: "warn",
  confirmed: "accent",
  completed: "ok",
  rejected: "bad",
  cancelled: "neutral",
  no_show: "bad",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={tone[status]}>{STATUS_LABELS[status]}</Badge>;
}

export type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed" | "no_show";
export type PaymentMethod = "cash" | "card" | "terminal" | "transfer";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  terminal: "Terminal bancaria",
  transfer: "Transferencia",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No se presentó",
};

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export type Driver = {
  id: string;
  slug: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  vehicle: string | null;
  currency: string;
  timezone: string;
  auto_confirm: boolean;
  buffer_minutes: number;
  min_notice_hours: number;
  max_days_ahead: number;
  slot_step_minutes: number;
  notify_email: boolean;
  onboarded: boolean;
};

export type Booking = {
  id: string;
  driver_id: string;
  customer_id: string;
  pickup_address: string;
  dropoff_address: string;
  start_at: string;
  est_duration_min: number;
  est_distance_km: number;
  est_price: number;
  discount_pct: number;
  final_price: number | null;
  passengers: number;
  status: BookingStatus;
  notes: string | null;
  driver_notes: string | null;
  manage_token: string;
  busy_until: string;
  created_at: string;
};

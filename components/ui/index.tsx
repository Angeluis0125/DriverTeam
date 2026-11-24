import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-95",
  secondary: "bg-surface border border-line text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
  danger: "bg-surface border border-bad/40 text-bad hover:bg-bad/10",
};
const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(btn, variants[variant], className)} {...p} />;
}

export function LinkButton({ variant = "primary", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btn, variants[variant], className)} {...p} />;
}

const field = "w-full rounded-xl border border-line bg-surface px-3 h-11 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/60";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cx(field, className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cx(field, "pr-8", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cx(field, "h-auto min-h-20 py-2", className)} {...p} />;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-surface p-4 sm:p-5", className)} {...p} />;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  neutral: "bg-surface-2 text-muted",
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  accent: "bg-accent/20 text-ink",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>;
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "bad"; children: ReactNode }) {
  return (
    <p role="status" className={cx("rounded-xl px-3 py-2 text-sm", tone === "ok" ? "bg-ok/12 text-ok" : "bg-bad/12 text-bad")}>
      {children}
    </p>
  );
}

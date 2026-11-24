"use client";

import { useActionState, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";
import type { FormState } from "@/lib/driver-actions";

export function ActionForm({
  action,
  submit = "Guardar",
  children,
  className,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  submit?: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {children}
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.ok && <Notice>{state.ok}</Notice>}
      <Button disabled={pending}>{pending ? "Guardando…" : submit}</Button>
    </form>
  );
}

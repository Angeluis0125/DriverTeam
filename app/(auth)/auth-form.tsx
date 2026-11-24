"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Field, Input, Notice } from "@/components/ui";
import { magicLink, signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [useMagic, setUseMagic] = useState(false);
  const action = mode === "signup" ? signUp : useMagic ? magicLink : signIn;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      {!useMagic && (
        <Field label="Contraseña" hint={mode === "signup" ? "Mínimo 8 caracteres" : undefined}>
          <Input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} />
        </Field>
      )}
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {state.message && <Notice>{state.message}</Notice>}
      <Button className="w-full" disabled={pending}>
        {pending ? "Un momento…" : mode === "signup" ? "Crear cuenta" : useMagic ? "Enviarme un enlace" : "Entrar"}
      </Button>
      {mode === "login" && (
        <button type="button" onClick={() => setUseMagic(!useMagic)} className="w-full text-sm text-muted underline-offset-4 hover:underline">
          {useMagic ? "Entrar con contraseña" : "Entrar sin contraseña (enlace por email)"}
        </button>
      )}
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>¿Nuevo en DriverTeam? <Link className="font-semibold text-ink underline" href="/signup">Crea tu cuenta</Link></>
        ) : (
          <>¿Ya tienes cuenta? <Link className="font-semibold text-ink underline" href="/login">Entra</Link></>
        )}
      </p>
    </form>
  );
}

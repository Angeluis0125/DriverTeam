"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";

export type AuthState = { error?: string; message?: string };

const Creds = z.object({ email: z.email(), password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres") });
const safeNext = (n: FormDataEntryValue | null) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Creds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Email o contraseña inválidos" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email o contraseña incorrectos" };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = Creds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/onboarding");
  return { message: "Te enviamos un correo para confirmar tu cuenta." };
}

export async function magicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().safeParse(form.get("email"));
  if (!email.success) return { error: "Escribe un email válido" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` },
  });
  if (error) return { error: error.message };
  return { message: "Revisa tu correo: te enviamos un enlace para entrar." };
}

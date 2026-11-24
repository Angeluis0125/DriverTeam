import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Driver } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Usuario con perfil de chofer completo; si no, lo manda al onboarding. */
export async function requireDriver() {
  const { supabase, user } = await requireUser();
  const { data: driver } = await supabase.from("drivers").select("*").eq("id", user.id).maybeSingle();
  if (!driver || !driver.onboarded) redirect("/onboarding");
  return { supabase, user, driver: driver as Driver };
}

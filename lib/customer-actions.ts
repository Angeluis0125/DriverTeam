"use server";

import { revalidatePath } from "next/cache";
import { requireDriver } from "@/lib/auth";
import type { FormState } from "@/lib/driver-actions";

export async function saveCustomer(_: FormState, f: FormData): Promise<FormState> {
  const id = String(f.get("id"));
  const name = String(f.get("full_name") ?? "").trim();
  if (name.length < 2) return { error: "Escribe un nombre" };
  const email = String(f.get("email") ?? "").trim();
  const { supabase } = await requireDriver();
  const { error } = await supabase
    .from("customers")
    .update({ full_name: name.slice(0, 100), email: email || null, notes: String(f.get("notes") ?? "").slice(0, 1000) || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/customers/${id}`);
  return { ok: "Cliente guardado" };
}

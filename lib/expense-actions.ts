"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDriver } from "@/lib/auth";
import type { FormState } from "@/lib/driver-actions";



const Schema = z.object({
  category: z.string().trim().min(1).max(40),
  amount: z.coerce.number().positive().max(1_000_000),
  spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).optional(),
});

export async function addExpense(_: FormState, f: FormData): Promise<FormState> {
  const e = Schema.safeParse(Object.fromEntries(f.entries()));
  if (!e.success) return { error: "Revisa el gasto" };
  const { supabase, driver } = await requireDriver();
  const { error } = await supabase.from("expenses").insert({ driver_id: driver.id, ...e.data, note: e.data.note || null });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/reports");
  return { ok: "Gasto registrado" };
}

export async function deleteExpense(f: FormData) {
  const { supabase } = await requireDriver();
  await supabase.from("expenses").delete().eq("id", String(f.get("id")));
  revalidatePath("/dashboard/reports");
}

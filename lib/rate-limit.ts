import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** true si la petición está permitida. Si la base falla, no bloquea. */
export async function allow(bucket: string, max: number, windowSeconds = 60) {
  const ip = await clientIp();
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${bucket}:${ip}`,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  return error ? true : data !== false;
}

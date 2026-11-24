import "server-only";
import * as webpush from "web-push";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";

type Message = { driverId: string; bookingId?: string; title: string; body: string; url?: string; emailHtml?: string };

let vapidReady = false;
function setupVapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:avisos@driverteam.app", pub, priv);
  vapidReady = true;
  return true;
}

/** Avisa al chofer por todos los canales disponibles: panel (Realtime), push y email. Nunca lanza. */
export async function notifyDriver(m: Message) {
  const db = createAdminClient();
  const url = m.url ?? `${siteUrl()}/dashboard/bookings`;

  const tasks: Promise<unknown>[] = [];

  // 1. Panel en tiempo real
  tasks.push(
    Promise.resolve(
      db.from("notifications").insert({ driver_id: m.driverId, booking_id: m.bookingId ?? null, title: m.title, body: m.body }),
    ),
  );

  // 2. Web Push
  if (setupVapid()) {
    tasks.push(
      (async () => {
        const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("driver_id", m.driverId);
        await Promise.all(
          (subs ?? []).map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                JSON.stringify({ title: m.title, body: m.body, url }),
              );
            } catch (e) {
              const code = (e as { statusCode?: number }).statusCode;
              if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
            }
          }),
        );
      })(),
    );
  }

  // 3. Email
  if (process.env.RESEND_API_KEY) {
    tasks.push(
      (async () => {
        const { data: d } = await db.from("drivers").select("email, notify_email").eq("id", m.driverId).single();
        if (!d?.email || !d.notify_email) return;
        await sendEmail(d.email, m.title, m.emailHtml ?? `<p>${escapeHtml(m.body)}</p><p><a href="${url}">Abrir DriverTeam</a></p>`);
      })(),
    );
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r) => r.status === "rejected" && console.error("notifyDriver", r.reason));
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: process.env.EMAIL_FROM || "DriverTeam <onboarding@resend.dev>", to, subject, html });
  } catch (e) {
    console.error("sendEmail", e);
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

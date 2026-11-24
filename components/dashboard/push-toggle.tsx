"use client";

import { useEffect, useState } from "react";
import { Button, Notice } from "@/components/ui";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function b64ToUint8(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "denied">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!KEY || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(KEY!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("No se pudo guardar la suscripción");
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar");
    }
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  }

  return (
    <div className="space-y-2">
      {state === "unsupported" && (
        <p className="text-sm text-muted">
          Este navegador no admite avisos push{!KEY ? " (falta configurar las llaves VAPID)" : ""}. En iPhone, primero agrega DriverTeam a tu pantalla de inicio.
        </p>
      )}
      {state === "denied" && <p className="text-sm text-muted">Bloqueaste los avisos. Actívalos en la configuración del navegador.</p>}
      {state === "off" && <Button type="button" onClick={enable}>Activar avisos en este dispositivo</Button>}
      {state === "on" && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ok">Avisos activos en este dispositivo</span>
          <Button type="button" variant="secondary" onClick={disable}>Desactivar</Button>
        </div>
      )}
      {error && <Notice tone="bad">{error}</Notice>}
    </div>
  );
}

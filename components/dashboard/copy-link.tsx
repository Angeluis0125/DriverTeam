"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Reserva conmigo", url });
        return;
      } catch {
        /* cancelado: copiar */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{url.replace(/^https?:\/\//, "")}</span>
      <button onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink">
        {copied ? <Check size={16} /> : typeof navigator !== "undefined" && "share" in navigator ? <Share2 size={16} /> : <Copy size={16} />}
        {copied ? "Copiado" : "Compartir"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";

export type PlaceValue = { text: string; placeId?: string };

export function AddressInput({
  label, value, onChange, sessionToken, dotClass,
}: {
  label: string;
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
  sessionToken: string;
  dotClass: string;
}) {
  const [items, setItems] = useState<{ placeId: string; text: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const id = useId();
  const skip = useRef(false);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const q = value.text.trim();
    if (q.length < 3 || value.placeId) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: q, sessionToken }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        setItems(data.suggestions ?? []);
        setOpen(true);
        setActive(-1);
      } catch {
        /* abortado */
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value.text, value.placeId, sessionToken]);

  function pick(s: { placeId: string; text: string }) {
    skip.current = true;
    onChange({ text: s.text, placeId: s.placeId });
    setOpen(false);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <MapPin size={18} className={`pointer-events-none absolute left-3 top-3.5 ${dotClass}`} />
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={label}
        value={value.text}
        onChange={(e) => onChange({ text: e.target.value })}
        onFocus={() => items.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
        }}
        className="h-12 w-full rounded-xl border border-line bg-surface pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-accent/60"
      />
      {open && items.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-xl">
          {items.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} className={`block w-full px-3 py-2.5 text-left text-sm ${i === active ? "bg-surface-2" : "hover:bg-surface-2"}`}>
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

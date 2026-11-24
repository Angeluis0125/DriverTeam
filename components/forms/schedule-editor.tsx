"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { WEEKDAYS } from "@/lib/types";

export type Block = { weekday: number; start_time: string; end_time: string };

// Lunes primero para la vista
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function ScheduleEditor({ initial }: { initial: Block[] }) {
  const [rows, setRows] = useState<Block[]>(initial.map((r) => ({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) })));

  const update = (i: number, patch: Partial<Block>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const add = (weekday: number) => setRows((r) => [...r, { weekday, start_time: "08:00", end_time: "18:00" }]);
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));

  return (
    <div className="divide-y divide-line rounded-2xl border border-line">
      <input type="hidden" name="schedule" value={JSON.stringify(rows)} />
      {ORDER.map((wd) => {
        const blocks = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === wd);
        return (
          <div key={wd} className="flex flex-wrap items-start gap-3 p-3">
            <div className="w-24 pt-2 text-sm font-semibold">{WEEKDAYS[wd]}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {blocks.length === 0 && <span className="pt-2 text-sm text-muted">No disponible</span>}
              {blocks.map(({ r, i }) => (
                <div key={i} className="flex items-center gap-2">
                  <input aria-label="Desde" type="time" value={r.start_time} onChange={(e) => update(i, { start_time: e.target.value })} className="h-10 w-28 rounded-lg border border-line bg-surface px-2" />
                  <span className="text-muted">–</span>
                  <input aria-label="Hasta" type="time" value={r.end_time} onChange={(e) => update(i, { end_time: e.target.value })} className="h-10 w-28 rounded-lg border border-line bg-surface px-2" />
                  <button type="button" onClick={() => remove(i)} className="rounded-lg p-2 text-muted hover:bg-surface-2" aria-label="Quitar bloque">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => add(wd)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-muted hover:bg-surface-2">
              <Plus size={16} /> Bloque
            </button>
          </div>
        );
      })}
    </div>
  );
}

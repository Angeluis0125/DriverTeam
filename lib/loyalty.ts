export type LoyaltyProgram = { active: boolean; trips_required: number; discount_pct: number };

export type LoyaltyStatus = {
  active: boolean;
  /** viajes dentro del ciclo actual (0..trips_required) */
  progress: number;
  required: number;
  /** la próxima reserva lleva descuento */
  nextIsRewarded: boolean;
  discountPct: number;
};

/**
 * "Cada N viajes, el siguiente lleva X% de descuento".
 * Un ciclo dura N+1 viajes (N normales + 1 premiado).
 * `trips` = viajes completados + reservas activas (pendientes/confirmadas) del cliente,
 * así una reserva activa ya premiada no deja pedir otra con descuento.
 */
export function loyaltyStatus(program: LoyaltyProgram | null | undefined, trips: number): LoyaltyStatus {
  if (!program || !program.active || program.trips_required < 1) {
    return { active: false, progress: 0, required: 0, nextIsRewarded: false, discountPct: 0 };
  }
  const n = program.trips_required;
  const pos = Math.max(0, trips) % (n + 1);
  const nextIsRewarded = pos === n;
  return {
    active: true,
    progress: pos,
    required: n,
    nextIsRewarded,
    discountPct: nextIsRewarded ? Number(program.discount_pct) : 0,
  };
}

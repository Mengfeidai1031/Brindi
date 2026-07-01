import type { Allocation, Assignments } from './types';

interface Weight {
  id: string;
  weight: number;
}

/**
 * Reparte `totalCents` entre los pesos dados de forma proporcional, garantizando
 * que la suma de las partes es exactamente `totalCents` (método del mayor resto:
 * los céntimos sobrantes se asignan a quienes tienen mayor parte fraccionaria).
 * Si todos los pesos son 0, reparte a partes iguales.
 */
export function allocateProportional(totalCents: number, weights: Weight[]): Allocation {
  if (weights.length === 0) return {};

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight <= 0) {
    const each = Math.floor(totalCents / weights.length);
    const remainder = totalCents - each * weights.length;
    const result: Allocation = {};
    weights.forEach((w, i) => {
      result[w.id] = each + (i < remainder ? 1 : 0);
    });
    return result;
  }

  const floored = weights.map((w) => {
    const raw = (totalCents * w.weight) / totalWeight;
    const cents = Math.floor(raw);
    return { id: w.id, cents, frac: raw - cents };
  });

  const allocated = floored.reduce((sum, f) => sum + f.cents, 0);
  const remainder = totalCents - allocated;
  const order = [...floored].sort((a, b) => b.frac - a.frac);

  const result: Allocation = {};
  floored.forEach((f) => {
    result[f.id] = f.cents;
  });
  for (let i = 0; i < remainder; i++) {
    result[order[i % order.length].id] += 1;
  }
  return result;
}

/** Partes iguales entre todas las personas. */
export function splitEqual(totalCents: number, personIds: string[]): Allocation {
  return allocateProportional(
    totalCents,
    personIds.map((id) => ({ id, weight: 1 })),
  );
}

/** Reparto por porcentajes (personId -> porcentaje). */
export function splitPercentage(
  totalCents: number,
  personIds: string[],
  percentages: Record<string, number>,
): Allocation {
  return allocateProportional(
    totalCents,
    personIds.map((id) => ({ id, weight: percentages[id] ?? 0 })),
  );
}

/**
 * Reparto por ítems: cada ítem se divide a partes iguales entre las personas a
 * las que está asignado. Los ítems sin asignar se omiten (la UI exige asignarlos).
 */
export function splitItems(
  items: { id: string; cents: number }[],
  personIds: string[],
  assignments: Assignments,
): Allocation {
  const result: Allocation = {};
  personIds.forEach((id) => {
    result[id] = 0;
  });
  for (const item of items) {
    const assignees = (assignments[item.id] ?? []).filter((id) => personIds.includes(id));
    if (assignees.length === 0) continue;
    const part = allocateProportional(
      item.cents,
      assignees.map((id) => ({ id, weight: 1 })),
    );
    for (const id of assignees) result[id] += part[id];
  }
  return result;
}

/**
 * Reparto con extra fijo: se restan los extras del total, el resto se divide a
 * partes iguales y a cada persona se le suma su extra. La suma sigue siendo el total.
 */
export function splitExtra(
  totalCents: number,
  personIds: string[],
  extras: Record<string, number>,
): Allocation {
  const sumExtras = personIds.reduce((sum, id) => sum + (extras[id] ?? 0), 0);
  const baseAlloc = splitEqual(totalCents - sumExtras, personIds);
  const result: Allocation = {};
  personIds.forEach((id) => {
    result[id] = baseAlloc[id] + (extras[id] ?? 0);
  });
  return result;
}

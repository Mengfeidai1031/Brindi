import { splitEqual, splitExtra, splitItems, splitPercentage } from '@/lib/divide/calculate';
import { parseAmountToCents, parsePercent } from '@/lib/divide/money';
import type { DivideState } from '@/lib/divide/reducer';
import type { Allocation } from '@/lib/divide/types';

/** Ítems con su importe ya parseado a céntimos (importe inválido o vacío = 0). */
export function parsedItems(state: DivideState): { id: string; cents: number }[] {
  return state.items.map((it) => ({ id: it.id, cents: parseAmountToCents(it.amount) ?? 0 }));
}

export function totalCents(state: DivideState): number {
  return parsedItems(state).reduce((sum, it) => sum + it.cents, 0);
}

export function percentSum(state: DivideState): number {
  return state.people.reduce((sum, p) => sum + (parsePercent(state.percentages[p.id] ?? '') ?? 0), 0);
}

export function extrasSumCents(state: DivideState): number {
  return state.people.reduce((sum, p) => sum + (parseAmountToCents(state.extras[p.id] ?? '') ?? 0), 0);
}

/** ¿Es válido el porcentaje introducido para esa persona (entero 0–100)? */
export function isPercentValid(state: DivideState, personId: string): boolean {
  return parsePercent(state.percentages[personId] ?? '') !== null;
}

/** ¿Es válido el importe extra introducido para esa persona (número >= 0)? */
export function isExtraValid(state: DivideState, personId: string): boolean {
  const raw = state.extras[personId] ?? '0';
  if (raw.trim() === '') return true; // vacío = 0
  return parseAmountToCents(raw) !== null;
}

/** ¿Se puede avanzar desde el paso dado? Gobierna los botones del wizard. */
export function canLeaveStep(state: DivideState, step: number): boolean {
  switch (step) {
    case 0:
      return state.people.length >= 2;
    case 1:
      return totalCents(state) > 0;
    case 2:
      return isConfigValid(state);
    default:
      return true;
  }
}

/** Validez de la configuración del modo seleccionado (paso 3). */
export function isConfigValid(state: DivideState): boolean {
  switch (state.mode) {
    case 'equal':
      return true;
    case 'items':
      // Todo ítem con importe debe estar asignado a alguien.
      return parsedItems(state).every(
        (it) => it.cents === 0 || (state.assignments[it.id]?.length ?? 0) > 0,
      );
    case 'percentage':
      return state.people.every((p) => isPercentValid(state, p.id)) && percentSum(state) === 100;
    case 'extra':
      return (
        state.people.every((p) => isExtraValid(state, p.id)) && extrasSumCents(state) <= totalCents(state)
      );
    default:
      return false;
  }
}

/** Calcula el reparto final (personId -> céntimos) según el modo activo. */
export function computeAllocation(state: DivideState): Allocation {
  const ids = state.people.map((p) => p.id);
  const total = totalCents(state);
  switch (state.mode) {
    case 'equal':
      return splitEqual(total, ids);
    case 'items':
      return splitItems(parsedItems(state), ids, state.assignments);
    case 'percentage': {
      const pct: Record<string, number> = {};
      for (const p of state.people) pct[p.id] = parsePercent(state.percentages[p.id] ?? '') ?? 0;
      return splitPercentage(total, ids, pct);
    }
    case 'extra': {
      const extras: Record<string, number> = {};
      for (const p of state.people) extras[p.id] = parseAmountToCents(state.extras[p.id] ?? '') ?? 0;
      return splitExtra(total, ids, extras);
    }
    default:
      return {};
  }
}

/** Nombre a mostrar para una persona (con índice por defecto si está vacío). */
export function personLabel(name: string, index: number, fallback: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : `${fallback} ${index + 1}`;
}

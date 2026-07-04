import type { DivideItem, DividePerson, SplitMode } from '@/lib/divide/types';

export interface DivideState {
  step: number; // 0..3
  people: DividePerson[];
  items: DivideItem[];
  mode: SplitMode;
  assignments: Record<string, string[]>; // itemId -> personIds (modo por ítems)
  percentages: Record<string, string>; // personId -> texto (% entero)
  extras: Record<string, string>; // personId -> texto (importe extra)
}

export const TOTAL_STEPS = 4;

/** Reparte 100 en porcentajes enteros entre n personas (mayor resto sencillo). */
function evenPercentValues(ids: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const n = ids.length;
  if (n === 0) return result;
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  ids.forEach((id, i) => {
    result[id] = String(base + (i < remainder ? 1 : 0));
  });
  return result;
}

export function createInitialState(personId1: string, personId2: string, itemId: string): DivideState {
  return {
    step: 0,
    people: [
      { id: personId1, name: '' },
      { id: personId2, name: '' },
    ],
    items: [{ id: itemId, description: '', amount: '' }],
    mode: 'equal',
    assignments: { [itemId]: [personId1, personId2] },
    percentages: {},
    extras: {},
  };
}

export type DivideAction =
  | { type: 'goto'; step: number }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'addPerson'; id: string }
  | { type: 'removePerson'; id: string }
  | { type: 'renamePerson'; id: string; name: string }
  | { type: 'addItem'; id: string }
  | { type: 'removeItem'; id: string }
  | { type: 'updateItem'; id: string; field: 'description' | 'amount'; value: string }
  | { type: 'setMode'; mode: SplitMode }
  | { type: 'toggleAssignment'; itemId: string; personId: string }
  | { type: 'setPercent'; personId: string; value: string }
  | { type: 'evenPercents' }
  | { type: 'setExtra'; personId: string; value: string }
  | { type: 'reset'; personId1: string; personId2: string; itemId: string };

const clampStep = (step: number) => Math.max(0, Math.min(TOTAL_STEPS - 1, step));

export function divideReducer(state: DivideState, action: DivideAction): DivideState {
  switch (action.type) {
    case 'goto':
      return { ...state, step: clampStep(action.step) };
    case 'next':
      return { ...state, step: clampStep(state.step + 1) };
    case 'back':
      return { ...state, step: clampStep(state.step - 1) };

    case 'addPerson': {
      const people = [...state.people, { id: action.id, name: '' }];
      // La nueva persona comparte por defecto todos los ítems.
      const assignments: Record<string, string[]> = {};
      for (const [itemId, ids] of Object.entries(state.assignments)) {
        assignments[itemId] = [...ids, action.id];
      }
      const extras = { ...state.extras, [action.id]: state.extras[action.id] ?? '0' };
      const ids = people.map((p) => p.id);
      const percentages = state.mode === 'percentage' ? evenPercentValues(ids) : state.percentages;
      return { ...state, people, assignments, extras, percentages };
    }
    case 'removePerson': {
      if (state.people.length <= 2) return state;
      const people = state.people.filter((p) => p.id !== action.id);
      const assignments: Record<string, string[]> = {};
      for (const [itemId, ids] of Object.entries(state.assignments)) {
        assignments[itemId] = ids.filter((id) => id !== action.id);
      }
      const extras = { ...state.extras };
      delete extras[action.id];
      const ids = people.map((p) => p.id);
      const percentages = state.mode === 'percentage' ? evenPercentValues(ids) : state.percentages;
      return { ...state, people, assignments, extras, percentages };
    }
    case 'renamePerson':
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)),
      };

    case 'addItem': {
      const items = [...state.items, { id: action.id, description: '', amount: '' }];
      const assignments = { ...state.assignments, [action.id]: state.people.map((p) => p.id) };
      return { ...state, items, assignments };
    }
    case 'removeItem': {
      if (state.items.length <= 1) return state;
      const items = state.items.filter((it) => it.id !== action.id);
      const assignments = { ...state.assignments };
      delete assignments[action.id];
      return { ...state, items, assignments };
    }
    case 'updateItem':
      return {
        ...state,
        items: state.items.map((it) =>
          it.id === action.id ? { ...it, [action.field]: action.value } : it,
        ),
      };

    case 'setMode': {
      const ids = state.people.map((p) => p.id);
      const next: DivideState = { ...state, mode: action.mode };
      if (action.mode === 'percentage') {
        const covers = ids.every((id) => state.percentages[id] !== undefined);
        if (!covers) next.percentages = evenPercentValues(ids);
      }
      if (action.mode === 'extra') {
        const extras = { ...state.extras };
        ids.forEach((id) => {
          if (extras[id] === undefined) extras[id] = '0';
        });
        next.extras = extras;
      }
      return next;
    }
    case 'toggleAssignment': {
      const current = state.assignments[action.itemId] ?? [];
      const nextIds = current.includes(action.personId)
        ? current.filter((id) => id !== action.personId)
        : [...current, action.personId];
      return { ...state, assignments: { ...state.assignments, [action.itemId]: nextIds } };
    }
    case 'setPercent':
      return { ...state, percentages: { ...state.percentages, [action.personId]: action.value } };
    case 'evenPercents':
      return { ...state, percentages: evenPercentValues(state.people.map((p) => p.id)) };
    case 'setExtra':
      return { ...state, extras: { ...state.extras, [action.personId]: action.value } };

    case 'reset':
      return createInitialState(action.personId1, action.personId2, action.itemId);

    default:
      return state;
  }
}

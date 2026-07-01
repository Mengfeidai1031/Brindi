'use client';

import { createContext, type Dispatch, useContext, useReducer, type ReactNode } from 'react';
import {
  createInitialState,
  type DivideAction,
  divideReducer,
  type DivideState,
} from '@/lib/divide/reducer';

/** Identificador corto y único para personas/ítems creados en cliente. */
export function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

interface DivideContextValue {
  state: DivideState;
  dispatch: Dispatch<DivideAction>;
}

const DivideContext = createContext<DivideContextValue | null>(null);

export function DivideProvider({ children }: { children: ReactNode }) {
  // El estado vive solo en memoria durante la sesión: nada se persiste ni se envía.
  const [state, dispatch] = useReducer(divideReducer, undefined, () =>
    createInitialState(rid(), rid(), rid()),
  );
  return <DivideContext.Provider value={{ state, dispatch }}>{children}</DivideContext.Provider>;
}

export function useDivide(): DivideContextValue {
  const ctx = useContext(DivideContext);
  if (!ctx) throw new Error('useDivide debe usarse dentro de DivideProvider');
  return ctx;
}

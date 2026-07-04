/** Tipos compartidos del módulo Plan (contrato camelCase con la API). */

export interface PlanActivity {
  title: string;
  placeName: string;
  description: string;
  durationLabel: string;
  costLabel: string;
  mapQuery: string;
}

export interface PlanResult {
  intro: string;
  activities: PlanActivity[];
  source: 'ai';
}

export const PLAN_CATEGORIES = [
  'COMIDA',
  'COPAS',
  'CULTURA',
  'AIRE_LIBRE',
  'FIESTA',
  'TRANQUILO',
  'SORPRESA',
] as const;
export type PlanCategory = (typeof PLAN_CATEGORIES)[number];

export const PLAN_BUDGETS = ['BAJO', 'MEDIO', 'ALTO'] as const;
export type PlanBudget = (typeof PLAN_BUDGETS)[number];

export const PLAN_DURATIONS = ['UN_RATO', 'MEDIA_JORNADA', 'DIA_COMPLETO', 'NOCHE'] as const;
export type PlanDuration = (typeof PLAN_DURATIONS)[number];

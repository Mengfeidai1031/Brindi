/** Modos de reparto soportados por el módulo Divide. */
export type SplitMode = 'equal' | 'items' | 'percentage' | 'extra';

export interface DividePerson {
  id: string;
  name: string;
}

/** Ítem de la cuenta. `amount` es el texto crudo introducido; se parsea a céntimos al calcular. */
export interface DivideItem {
  id: string;
  description: string;
  amount: string;
}

/** Asignación de ítems a personas (modo por ítems): itemId -> personIds. */
export type Assignments = Record<string, string[]>;

/** Reparto resultante: personId -> céntimos. */
export type Allocation = Record<string, number>;

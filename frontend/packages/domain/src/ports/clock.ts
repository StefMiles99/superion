/** Reloj inyectable — evita `Date.now()` directo en lógica testeable. */
export interface IClock {
  now(): number;
}

export class SystemClock implements IClock {
  now(): number {
    return Date.now();
  }
}

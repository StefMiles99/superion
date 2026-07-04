export type Uuid = string & { readonly __brand: 'Uuid' };

export type IsoDate = string & { readonly __brand: 'IsoDate' };

export function asUuid(value: string): Uuid {
  return value as Uuid;
}

export function asIsoDate(value: string): IsoDate {
  return value as IsoDate;
}

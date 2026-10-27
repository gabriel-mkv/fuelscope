import type { FuelPrice } from "../src/shared/types";

export function makePrice(overrides: Partial<FuelPrice> = {}): FuelPrice {
  return {
    cnpj: "11111111000111",
    legalName: "RAZAO POSTO",
    tradeName: "POSTO",
    address: "RUA TESTE, 100",
    neighborhood: "CENTRO",
    brand: "BRANCA",
    product: "GASOLINA COMUM",
    price: 6.29,
    collectionDate: "2026-09-29",
    ...overrides,
  };
}
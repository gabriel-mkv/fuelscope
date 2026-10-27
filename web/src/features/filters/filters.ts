import type { FuelPrice } from "../../shared/types";

export interface Filters {
  product: string;
  /** null = todas as bandeiras. */
  brand: string | null;
  /** null = todos os bairros. */
  neighborhood: string | null;
  /** Trecho do nome do posto; vazio = sem busca. */
  query: string;
}

/** Maiúsculas, sem acento e sem espaços nas pontas: "Pará de Minas " -> "PARA DE MINAS". */
export function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase();
}

export function filterPrices(prices: FuelPrice[], filters: Filters): FuelPrice[] {
  const product = normalize(filters.product);
  const brand = filters.brand === null ? null : normalize(filters.brand);
  const neighborhood = filters.neighborhood === null ? null : normalize(filters.neighborhood);
  const query = normalize(filters.query);

  return prices.filter(
    (p) =>
      normalize(p.product) === product &&
      (brand === null || normalize(p.brand) === brand) &&
      (neighborhood === null || normalize(p.neighborhood) === neighborhood) &&
      (query === "" || normalize(p.tradeName).includes(query)),
  );
}

/** Valores distintos de um campo, sem vazios, sem repetir (ignorando caixa/acento) e em ordem alfabética. */
export function distinctValues(
  prices: FuelPrice[],
  field: "product" | "brand" | "neighborhood",
): string[] {
  const byKey = new Map<string, string>();
  for (const price of prices) {
    const value = price[field].trim();
    const key = normalize(value);
    if (key !== "" && !byKey.has(key)) {
      byKey.set(key, value);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
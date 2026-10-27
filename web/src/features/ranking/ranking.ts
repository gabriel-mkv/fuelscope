import type { FuelPrice } from "../../shared/types";

export function toCents(price: number): number {
  return Math.round(price * 100);
}

function compareByPrice(a: FuelPrice, b: FuelPrice): number {
  return (
    toCents(a.price) - toCents(b.price) ||
    a.tradeName.localeCompare(b.tradeName, "pt-BR", { sensitivity: "base" }) ||
    a.cnpj.localeCompare(b.cnpj)
  );
}

/** Do mais barato ao mais caro. Devolve uma nova lista; a original não é alterada. */
export function rankByPrice(prices: FuelPrice[]): FuelPrice[] {
  return [...prices].sort(compareByPrice);
}

export interface PriceSummary {
  count: number;
  cheapest: FuelPrice;
  mostExpensive: FuelPrice;
  average: number;
}

/** Resumo para os cartões do topo; null quando não há postos (a tela mostra o estado vazio). */
export function summarize(prices: FuelPrice[]): PriceSummary | null {
  if (prices.length === 0) return null;

  const ranked = rankByPrice(prices);
  const totalCents = ranked.reduce((sum, p) => sum + toCents(p.price), 0);

  return {
    count: ranked.length,
    cheapest: ranked[0],
    mostExpensive: ranked[ranked.length - 1],
    average: Math.round(totalCents / ranked.length) / 100,
  };
}
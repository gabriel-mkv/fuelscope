import type { FuelPrice } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "2026-09-29" -> "29/09/2026", por texto, sem Date (sem efeito de fuso). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatPrice(price: number): string {
  return BRL.format(price);
}

/** Data de coleta mais recente (datas ISO ordenam como texto), ou null se não houver registros. */
export function latestDate(prices: FuelPrice[]): string | null {
  if (prices.length === 0) return null;
  return prices.reduce((max, p) => (p.collectionDate > max ? p.collectionDate : max), prices[0].collectionDate);
}
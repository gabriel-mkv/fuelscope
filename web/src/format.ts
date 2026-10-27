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

const LOWERCASE_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);
const UPPERCASE_WORDS = new Set(["gnv", "glp", "br"]);

/** "POSTO SÃO JOSÉ DE MINAS LTDA" -> "Posto São José de Minas Ltda". Só para exibição. */
export function titleCase(text: string): string {
  let first = true;
  return text.toLowerCase().replace(/\p{L}[\p{L}\p{N}]*/gu, (word) => {
    const isFirst = first;
    first = false;
    if (UPPERCASE_WORDS.has(word)) return word.toUpperCase();
    if (!isFirst && LOWERCASE_WORDS.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

const MS_PER_DAY = 86_400_000;

function utcDay(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Dias inteiros entre duas datas ISO (yyyy-MM-dd). Positivo quando toIso é depois de fromIso. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcDay(toIso) - utcDay(fromIso)) / MS_PER_DAY);
}

/** "Hoje" no fuso do Brasil, como yyyy-MM-dd (o mesmo critério do Clock do AnpUpdateService). */
export function todayInBrazil(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
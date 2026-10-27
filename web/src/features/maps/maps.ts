import type { FuelPrice } from "../../shared/types";

/** Cidade acrescentada à busca, já que o endereço da ANP vem sem ela. */
export const CITY_QUERY = "Pará de Minas, MG";

export function mapsUrl(price: FuelPrice): string {
  const query = [price.tradeName, price.address, price.neighborhood, CITY_QUERY]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
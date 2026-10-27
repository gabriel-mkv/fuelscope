import { distinctValues, filterPrices, normalize, type Filters } from "./filters";
import type { FuelPrice } from "./types";

export const PREFERRED_PRODUCT = "GASOLINA COMUM";

/** Gasolina comum, se existir; senão o primeiro combustível em ordem alfabética. */
export function defaultProduct(prices: FuelPrice[]): string {
  const products = distinctValues(prices, "product");
  return products.find((p) => normalize(p) === PREFERRED_PRODUCT) ?? products[0] ?? "";
}

/** Devolve a opção existente que corresponde ao valor pedido (ignorando caixa/acento), ou null. */
function pick(options: string[], wanted: string | null | undefined): string | null {
  if (!wanted) return null;
  const key = normalize(wanted);
  return options.find((option) => normalize(option) === key) ?? null;
}

/** Valida um pedido de filtros (URL ou tela) contra os dados, devolvendo sempre um estado consistente. */
export function resolveFilters(prices: FuelPrice[], wanted: Partial<Filters>): Filters {
  const product = pick(distinctValues(prices, "product"), wanted.product) ?? defaultProduct(prices);
  const ofProduct = filterPrices(prices, { product, brand: null, neighborhood: null, query: "" });

  return {
    product,
    brand: pick(distinctValues(ofProduct, "brand"), wanted.brand),
    neighborhood: pick(distinctValues(ofProduct, "neighborhood"), wanted.neighborhood),
    query: wanted.query ?? "",
  };
}
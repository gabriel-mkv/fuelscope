export interface FuelPrice {
  cnpj: string;
  legalName: string;
  tradeName: string;
  address: string;
  neighborhood: string;
  brand: string;
  product: string;
  price: number;
  collectionDate: string;
  /** Identifica se o registro é fruto de coleta manual própria da equipe FuelScope. */
  isManualCollection?: boolean;
  /** Origem do dado ('ANP' ou 'MANUAL'). */
  source?: "ANP" | "MANUAL";
}

/**
 * Determina se o registro é de coleta manual própria.
 * Considera isManualCollection === true ou source === 'MANUAL'.
 */
export function isManualCollectionPrice(price: FuelPrice): boolean {
  return price.isManualCollection === true || price.source === "MANUAL";
}

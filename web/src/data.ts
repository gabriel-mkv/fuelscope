import type { FuelPrice } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isFuelPrice(value: unknown): value is FuelPrice {
    if (typeof value !== 'object' || value === null) return false;

    const v = value as Record<string, unknown>;

    return (
        typeof v.cnpj === 'string' &&
        typeof v.legalName === 'string' &&
        typeof v.tradeName === 'string' &&
        typeof v.address === 'string' &&
        typeof v.neighborhood === 'string' &&
        typeof v.brand === 'string' &&
        typeof v.product === 'string' &&
        typeof v.price === 'number' &&
        Number.isFinite(v.price) &&
        v.price > 0 &&
        typeof v.collectionDate === 'string' &&
        ISO_DATE.test(v.collectionDate)
    );
}

/** Valida o JSON; descarta registros fora do contrato com aviso, em vez de quebrar a página. */
export function parsePrices(json: unknown): FuelPrice[] {
  if (!Array.isArray(json)) {
    throw new Error("O arquivo de preços não é uma lista.");
  }

  const valid = json.filter(isFuelPrice);

  if (valid.length !== json.length) {
    console.warn(`${json.length - valid.length} registros inválidos foram ignorados.`);
  }

  return valid;
}

export async function loadCurrentPrices(baseUrl = "./data"): Promise<FuelPrice[]> {
  const response = await fetch(`${baseUrl}/fuel-prices.json`);

  if (!response.ok) {
    throw new Error(`Falha ao carregar os preços (HTTP ${response.status}).`);
  }
  
  return parsePrices(await response.json());
}
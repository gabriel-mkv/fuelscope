import type { Filters } from "./filters";

/** Lê os filtros de uma query string. Só devolve o que veio preenchido; a validação é do resolveFilters. */
export function parseFilters(search: string): Partial<Filters> {
  const params = new URLSearchParams(search);
  const result: Partial<Filters> = {};

  const product = params.get("produto");
  if (product) result.product = product;
  const brand = params.get("bandeira");
  if (brand) result.brand = brand;
  const neighborhood = params.get("bairro");
  if (neighborhood) result.neighborhood = neighborhood;
  const query = params.get("busca");
  if (query) result.query = query;

  return result;
}

/** Query string (sem o "?") com apenas os filtros escolhidos. */
export function serializeFilters(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.product) params.set("produto", filters.product);
  if (filters.brand) params.set("bandeira", filters.brand);
  if (filters.neighborhood) params.set("bairro", filters.neighborhood);
  if (filters.query.trim()) params.set("busca", filters.query.trim());
  return params.toString();
}
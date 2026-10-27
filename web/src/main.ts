import { loadCurrentPrices } from "./data";
import { distinctValues, filterPrices, type Filters } from "./filters";
import { daysBetween, formatDate, latestDate, titleCase, todayInBrazil } from "./format";
import { rankByPrice, summarize } from "./ranking";
import { resolveFilters } from "./state";
import type { FuelPrice } from "./types";
import { parseFilters, serializeFilters } from "./urlState";
import { emptyView, rankingView, summaryView } from "./view";

/** Acima disso, a coleta mais recente é considerada defasada e a página avisa. */
const STALE_AFTER_DAYS = 14;

function must<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ${selector} não encontrado no HTML.`);
  return element;
}

const ui = {
  status: must<HTMLElement>("#status"),
  stale: must<HTMLElement>("#stale"),
  content: must<HTMLElement>("#content"),
  lastCollection: must<HTMLElement>("#last-collection"),
  product: must<HTMLSelectElement>("#filter-product"),
  brand: must<HTMLSelectElement>("#filter-brand"),
  neighborhood: must<HTMLSelectElement>("#filter-neighborhood"),
  query: must<HTMLInputElement>("#filter-query"),
  clear: must<HTMLButtonElement>("#clear-filters"),
  count: must<HTMLElement>("#result-count"),
  summary: must<HTMLElement>("#summary"),
  ranking: must<HTMLElement>("#ranking"),
};

let prices: FuelPrice[] = [];
let filters: Filters;

function fillSelect(select: HTMLSelectElement, values: string[], allLabel: string | null, selected: string | null): void {
  const options: HTMLOptionElement[] = [];
  if (allLabel !== null) options.push(new Option(allLabel, ""));
  for (const value of values) options.push(new Option(titleCase(value), value));
  select.replaceChildren(...options);
  select.value = selected ?? "";
}

function syncUrl(): void {
  const query = serializeFilters(filters);
  try {
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
  } catch {
    // Alguns navegadores limitam chamadas seguidas ao replaceState; a URL é só um extra.
  }
}

function setFilters(wanted: Partial<Filters>): void {
  filters = resolveFilters(prices, wanted);
  syncUrl();
  render();
}

function clearFilters(): void {
  setFilters({ product: filters.product, brand: null, neighborhood: null, query: "" });
}

function render(): void {
  // As opções de bandeira e bairro vêm só dos postos do combustível escolhido.
  const ofProduct = filterPrices(prices, { ...filters, brand: null, neighborhood: null, query: "" });
  fillSelect(ui.product, distinctValues(prices, "product"), null, filters.product);
  fillSelect(ui.brand, distinctValues(ofProduct, "brand"), "Todas", filters.brand);
  fillSelect(ui.neighborhood, distinctValues(ofProduct, "neighborhood"), "Todos", filters.neighborhood);
  if (ui.query.value !== filters.query) ui.query.value = filters.query;

  const ranked = rankByPrice(filterPrices(prices, filters));
  const summary = summarize(ranked);

  ui.count.textContent = summary
    ? `${summary.count} ${summary.count === 1 ? "posto" : "postos"} · ${titleCase(filters.product)}`
    : "";
  ui.summary.replaceChildren(...(summary ? summaryView(summary) : []));
  ui.ranking.replaceChildren(summary ? rankingView(ranked) : emptyView(clearFilters));
}

function showStaleNotice(latest: string): void {
  const days = daysBetween(latest, todayInBrazil());
  if (days > STALE_AFTER_DAYS) {
    ui.stale.textContent =
      `Os dados mais recentes são de ${formatDate(latest)}, há ${days} dias. ` +
      "A ANP pode ter atrasado a publicação.";
    ui.stale.hidden = false;
  }
}

function bindEvents(): void {
  ui.product.addEventListener("change", () => setFilters({ ...filters, product: ui.product.value }));
  ui.brand.addEventListener("change", () => setFilters({ ...filters, brand: ui.brand.value || null }));
  ui.neighborhood.addEventListener("change", () => setFilters({ ...filters, neighborhood: ui.neighborhood.value || null }));
  ui.query.addEventListener("input", () => setFilters({ ...filters, query: ui.query.value }));
  ui.clear.addEventListener("click", clearFilters);
}

async function init(): Promise<void> {
  try {
    prices = await loadCurrentPrices();
    const latest = latestDate(prices);
    if (latest === null) throw new Error("O arquivo de preços está vazio.");

    ui.lastCollection.textContent = formatDate(latest);
    showStaleNotice(latest);
    bindEvents();
    setFilters(parseFilters(location.search));

    ui.status.hidden = true;
    ui.content.hidden = false;
  } catch (error) {
    console.error(error);
    ui.lastCollection.textContent = "indisponível";
    ui.status.textContent = "Não foi possível carregar os preços. Tente novamente mais tarde.";
  }
}

void init();
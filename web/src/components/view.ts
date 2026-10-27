import { el } from "../shared/dom";
import { formatDate, formatPrice, titleCase } from "../shared/format";
import { mapsUrl } from "../features/maps/maps";
import { toCents, type PriceSummary } from "../features/ranking/ranking";
import type { FuelPrice } from "../shared/types";

function card(label: string, value: string, detail: string): HTMLElement {
  return el("div", { className: "card" }, [
    el("span", { className: "card-label", text: label }),
    el("strong", { className: "card-value", text: value }),
    el("span", { className: "card-detail", text: detail }),
  ]);
}

export function summaryView(summary: PriceSummary): HTMLElement[] {
  return [
    card("Menor preço", formatPrice(summary.cheapest.price), titleCase(summary.cheapest.tradeName)),
    card("Preço médio", formatPrice(summary.average), `${summary.count} ${summary.count === 1 ? "posto" : "postos"}`),
    card("Maior preço", formatPrice(summary.mostExpensive.price), titleCase(summary.mostExpensive.tradeName)),
  ];
}

function orDash(text: string): string {
  return text.trim() === "" ? "—" : titleCase(text);
}

function stationRow(price: FuelPrice, position: number, isCheapest: boolean): HTMLElement {
  const name = el("div", { className: "name" }, [el("strong", { text: titleCase(price.tradeName) })]);
  if (isCheapest) {
    name.append(el("span", { className: "badge", text: "Menor preço" }));
  }

  const mapLink = el("a", {
    className: "map-link",
    text: "Ver no mapa ↗",
    attrs: {
      href: mapsUrl(price),
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `Abrir ${titleCase(price.tradeName)} no Google Maps`,
    },
  });

  return el("li", { className: isCheapest ? "station is-cheapest" : "station" }, [
    el("span", { className: "pos", text: String(position) }),
    name,
    el("span", { className: "meta" }, [
      el("span", { className: "brand", text: orDash(price.brand) }),
      el("span", { className: "hood", text: orDash(price.neighborhood) }),
    ]),
    el("strong", { className: "price", text: formatPrice(price.price) }),
    el("time", { className: "date", text: formatDate(price.collectionDate), attrs: { datetime: price.collectionDate } }),
    mapLink,
  ]);
}

/** Recebe a lista já ordenada (do mais barato ao mais caro) e não vazia. */
export function rankingView(ranked: FuelPrice[]): HTMLElement {
  const bestCents = toCents(ranked[0].price);

  const head = el(
    "div",
    { className: "ranking-head", attrs: { "aria-hidden": "true" } },
    ["#", "Posto", "Bandeira", "Bairro", "Preço", "Coleta", "Mapa"].map((label) => el("span", { text: label })),
  );
  const list = el(
    "ol",
    { className: "ranking-list" },
    ranked.map((price, index) => stationRow(price, index + 1, toCents(price.price) === bestCents)),
  );

  return el("div", { className: "ranking" }, [head, list]);
}

export function emptyView(onClear: () => void): HTMLElement {
  const button = el("button", { className: "button", text: "Limpar filtros", attrs: { type: "button" } });
  button.addEventListener("click", onClear);
  return el("div", { className: "empty" }, [
    el("p", { text: "Nenhum posto encontrado com esses filtros." }),
    button,
  ]);
}
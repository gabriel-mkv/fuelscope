import { el } from "../shared/dom";
import { formatDate, formatNeighborhood, formatPrice, orDash, titleCase } from "../shared/format";
import { mapsUrl } from "../features/maps/maps";
import { toCents, type PriceSummary } from "../features/ranking/ranking";
import { isManualCollectionPrice, type FuelPrice } from "../shared/types";
import { arrowIcon, chartIcon, storeIcon } from "./icons";

function cheapestCard(summary: PriceSummary): HTMLElement {
  const badge = el("span", { className: "badge badge-accent", text: "Menor preço" });
  const headerChildren: HTMLElement[] = [badge];

  if (isManualCollectionPrice(summary.cheapest)) {
    headerChildren.push(
      el("span", {
        className: "badge badge-manual",
        text: "Coleta manual *",
        attrs: { title: "Preço coletado manualmente pela equipe FuelScope" },
      }),
    );
  }

  const header = el("div", { className: "card-header" }, headerChildren);
  const priceGroup = el("div", { className: "card-price-group" }, [
    el("strong", { className: "card-value card-value-highlight", text: formatPrice(summary.cheapest.price) }),
    el("span", { className: "card-unit", text: "/L" }),
  ]);
  const stationName = el("strong", {
    className: "card-station-name",
    text: titleCase(summary.cheapest.tradeName),
  });
  const stationHood = el("span", {
    className: "card-station-hood",
    text: formatNeighborhood(summary.cheapest.neighborhood),
  });
  const footer = el("div", { className: "card-footer-info" }, [stationName, stationHood]);

  return el("div", { className: "card card-featured" }, [header, priceGroup, footer]);
}

function averageCard(summary: PriceSummary): HTMLElement {
  const titleGroup = el("div", { className: "card-title-group" }, [
    chartIcon(),
    el("span", { className: "card-title", text: "Preço médio" }),
  ]);
  const header = el("div", { className: "card-header" }, [titleGroup, arrowIcon()]);
  const priceGroup = el("div", { className: "card-price-group" }, [
    el("strong", { className: "card-value", text: formatPrice(summary.average) }),
    el("span", { className: "card-unit", text: "/L" }),
  ]);
  const footer = el("div", { className: "card-footer-info" }, [
    el("span", { className: "card-detail", text: "Média da região" }),
  ]);

  return el("div", { className: "card" }, [header, priceGroup, footer]);
}

function countCard(summary: PriceSummary): HTMLElement {
  const titleGroup = el("div", { className: "card-title-group" }, [
    storeIcon(),
    el("span", { className: "card-title", text: "Postos encontrados" }),
  ]);
  const header = el("div", { className: "card-header" }, [titleGroup, arrowIcon()]);
  const priceGroup = el("div", { className: "card-price-group" }, [
    el("strong", { className: "card-value", text: String(summary.count) }),
  ]);
  const footer = el("div", { className: "card-footer-info" }, [
    el("span", {
      className: "card-detail",
      text: summary.count === 1 ? "Posto disponível" : "Postos disponíveis",
    }),
  ]);

  return el("div", { className: "card" }, [header, priceGroup, footer]);
}

export function summaryView(summary: PriceSummary): HTMLElement[] {
  return [cheapestCard(summary), averageCard(summary), countCard(summary)];
}

function stationRow(price: FuelPrice, isCheapest: boolean): HTMLElement {
  const stationName = el("strong", { className: "station-name", text: titleCase(price.tradeName) });
  const stationColChildren: (HTMLElement | string)[] = [stationName];
  if (isCheapest) {
    stationColChildren.push(el("span", { className: "badge badge-accent badge-row", text: "MENOR PREÇO" }));
  }

  const stationCol = el("div", { className: "col-station" }, stationColChildren);
  const hoodCol = el("div", { className: "col-hood", text: orDash(price.neighborhood) });

  const dateChildren: (HTMLElement | string)[] = [formatDate(price.collectionDate)];
  if (isManualCollectionPrice(price)) {
    dateChildren.push(
      el("span", {
        className: "manual-asterisk",
        text: "*",
        attrs: {
          title: "Preço coletado manualmente pela equipe FuelScope",
          "aria-label": "Preço de coleta manual",
        },
      }),
    );
  }

  const dateCol = el(
    "time",
    {
      className: "col-date",
      attrs: { datetime: price.collectionDate },
    },
    dateChildren,
  );

  const priceCol = el("strong", {
    className: isCheapest ? "col-price price-highlight" : "col-price",
    text: formatPrice(price.price),
  });

  const mapLink = el("a", {
    className: "col-action map-link",
    text: "Ver mapa ↗",
    attrs: {
      href: mapsUrl(price),
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": `Ver ${titleCase(price.tradeName)} no mapa`,
    },
  });

  return el("li", { className: isCheapest ? "station is-cheapest" : "station" }, [
    stationCol,
    hoodCol,
    dateCol,
    priceCol,
    mapLink,
  ]);
}

export function rankingView(ranked: FuelPrice[]): HTMLElement {
  const bestCents = toCents(ranked[0].price);

  const head = el(
    "div",
    { className: "ranking-head", attrs: { "aria-hidden": "true" } },
    ["Posto", "Bairro", "Coleta", "Preço", "Ação"].map((label, idx) =>
      el("span", { className: `head-col head-col-${idx}`, text: label }),
    ),
  );

  const list = el(
    "ol",
    { className: "ranking-list" },
    ranked.map((price, index) => stationRow(price, index === 0 || toCents(price.price) === bestCents)),
  );

  const elements: HTMLElement[] = [head, list];

  const hasManual = ranked.some(isManualCollectionPrice);
  if (hasManual) {
    elements.push(
      el("p", { className: "manual-legend" }, [
        el("span", { className: "manual-asterisk", text: "*" }),
        el("span", { text: " Preço coletado manualmente pela equipe FuelScope." }),
      ]),
    );
  }

  return el("div", { className: "ranking-container" }, elements);
}

export function emptyView(onClear: () => void): HTMLElement {
  const button = el("button", { className: "btn-clear-empty", text: "Limpar filtros", attrs: { type: "button" } });
  button.addEventListener("click", onClear);
  return el("div", { className: "empty-state" }, [
    el("p", { className: "empty-text", text: "Nenhum posto encontrado com esses filtros." }),
    button,
  ]);
}

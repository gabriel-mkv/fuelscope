import { beforeEach, describe, expect, it } from "vitest";
import { summaryView } from "../../src/components/view";
import { makePrice } from "../helpers";
import type { PriceSummary } from "../../src/features/ranking/ranking";

// Setup de DOM mock mínimo sem bibliotecas externas
class FakeElement {
  tagName: string;
  className = "";
  textContent = "";
  innerHTML = "";
  attrs: Record<string, string> = {};
  children: (FakeElement | string)[] = [];
  content?: { firstElementChild: FakeElement };

  constructor(tagName: string) {
    this.tagName = tagName;
    if (tagName === "template") {
      this.content = {
        firstElementChild: new FakeElement("svg"),
      };
    }
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  append(...children: (FakeElement | string)[]) {
    this.children.push(...children);
  }
}

beforeEach(() => {
  (globalThis as unknown as { document: { createElement: (tag: string) => unknown } }).document = {
    createElement: (tag: string) => new FakeElement(tag),
  };
});

function createSummaryWithTradeName(tradeName: string): PriceSummary {
  const cheapest = makePrice({
    tradeName,
    price: 5.49,
    neighborhood: "Centro",
  });
  return {
    count: 1,
    cheapest,
    mostExpensive: cheapest,
    average: 5.49,
  };
}

describe("summaryView — Card de Menor Preço (Responsividade e Acessibilidade)", () => {
  it("exibe nome curto normalmente e inclui atributo title", () => {
    const summary = createSummaryWithTradeName("Posto Central");
    const [cheapestCard] = summaryView(summary) as unknown as FakeElement[];

    expect(cheapestCard.className).toBe("card card-featured");

    // Procura o elemento com card-station-name nos filhos
    const footer = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-footer-info",
    ) as FakeElement;
    expect(footer).toBeDefined();

    const stationNameEl = footer.children.find(
      (c) => c instanceof FakeElement && c.className === "card-station-name",
    ) as FakeElement;
    expect(stationNameEl).toBeDefined();
    expect(stationNameEl.textContent).toBe("Posto Central");
    expect(stationNameEl.getAttribute("title")).toBe("Posto Central");
  });

  it("exibe nome extenso mantendo o atributo title completo e classe de responsividade", () => {
    const rawName = "AUTO POSTO E CONVENIENCIA SANTA INES DE PARA DE MINAS LTDA";
    const summary = createSummaryWithTradeName(rawName);
    const [cheapestCard] = summaryView(summary) as unknown as FakeElement[];

    const footer = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-footer-info",
    ) as FakeElement;
    const stationNameEl = footer.children.find(
      (c) => c instanceof FakeElement && c.className === "card-station-name",
    ) as FakeElement;

    expect(stationNameEl.textContent).toBe("Auto Posto e Conveniencia Santa Ines de Para de Minas Ltda");
    expect(stationNameEl.getAttribute("title")).toBe("Auto Posto e Conveniencia Santa Ines de Para de Minas Ltda");
  });

  it("preserva o título acessível mesmo para estabelecimentos com nomes extremamente longos", () => {
    const rawName =
      "SUPER HIPER MEGA EXTRAORDINARIO POSTO DE COMBUSTIVEIS E DERIVADOS DE PETROLEO E SERVICOS AUTOMOTIVOS LTDA ME";
    const summary = createSummaryWithTradeName(rawName);
    const [cheapestCard] = summaryView(summary) as unknown as FakeElement[];

    const footer = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-footer-info",
    ) as FakeElement;
    const stationNameEl = footer.children.find(
      (c) => c instanceof FakeElement && c.className === "card-station-name",
    ) as FakeElement;

    expect(stationNameEl.getAttribute("title")).toContain("Super Hiper Mega Extraordinario Posto");
  });

  it("não compromete as demais informações exibidas no card (preço, badge e bairro)", () => {
    const summary = createSummaryWithTradeName("Posto Teste");
    const [cheapestCard] = summaryView(summary) as unknown as FakeElement[];

    // Badge
    const header = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-header",
    ) as FakeElement;
    const badge = header.children.find(
      (c) => c instanceof FakeElement && c.className === "badge badge-accent",
    ) as FakeElement;
    expect(badge.textContent).toBe("Menor preço");

    // Preço
    const priceGroup = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-price-group",
    ) as FakeElement;
    const priceVal = priceGroup.children.find(
      (c) => c instanceof FakeElement && c.className === "card-value card-value-highlight",
    ) as FakeElement;
    expect(priceVal.textContent.replace(/\s/g, " ")).toBe("R$ 5,49");

    // Bairro
    const footer = cheapestCard.children.find(
      (c) => c instanceof FakeElement && c.className === "card-footer-info",
    ) as FakeElement;
    const hood = footer.children.find(
      (c) => c instanceof FakeElement && c.className === "card-station-hood",
    ) as FakeElement;
    expect(hood.textContent).toBe("Bairro Centro");
  });
});

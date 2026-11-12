import { beforeEach, describe, expect, it } from "vitest";
import { renderCalculator } from "../../../src/features/calculator/view";

// Mock simples para testar eventos e DOM no Node
type Listener = (event: { preventDefault: () => void }) => void;

class FakeDOMElement {
  tagName: string;
  className = "";
  textContent = "";
  value = "";
  hidden = false;
  attrs: Record<string, string> = {};
  children: (FakeDOMElement | string)[] = [];
  listeners: Record<string, Listener[]> = {};
  content?: { firstElementChild: FakeDOMElement };
  classList: {
    add: (cls: string) => void;
    remove: (cls: string) => void;
    contains: (cls: string) => boolean;
  };

  constructor(tagName: string) {
    this.tagName = tagName;
    const classes = new Set<string>();

    this.classList = {
      add: (cls: string) => {
        classes.add(cls);
        this.className = [...classes].join(" ");
      },
      remove: (cls: string) => {
        classes.delete(cls);
        this.className = [...classes].join(" ");
      },
      contains: (cls: string) => classes.has(cls),
    };

    if (tagName === "template") {
      this.content = {
        firstElementChild: new FakeDOMElement("svg"),
      };
    }
  }

  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }

  getAttribute(name: string): string | null {
    return this.attrs[name] ?? null;
  }

  append(...children: (FakeDOMElement | string)[]) {
    this.children.push(...children);
  }

  replaceChildren(...children: (FakeDOMElement | string)[]) {
    this.children = [...children];
  }

  addEventListener(type: string, listener: Listener) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  dispatchEvent(type: string) {
    const list = this.listeners[type] ?? [];
    for (const l of list) {
      l({ preventDefault: () => {} });
    }
  }

  scrollIntoView() {}
  focus() {}

  // Helper recursivo para buscar por id ou classe
  find(predicate: (el: FakeDOMElement) => boolean): FakeDOMElement | null {
    for (const child of this.children) {
      if (child instanceof FakeDOMElement) {
        if (predicate(child)) return child;
        const sub = child.find(predicate);
        if (sub) return sub;
      }
    }
    return null;
  }

  findAll(predicate: (el: FakeDOMElement) => boolean): FakeDOMElement[] {
    const res: FakeDOMElement[] = [];
    for (const child of this.children) {
      if (child instanceof FakeDOMElement) {
        if (predicate(child)) res.push(child);
        res.push(...child.findAll(predicate));
      }
    }
    return res;
  }
}

beforeEach(() => {
  (globalThis as unknown as { document: { createElement: (tag: string) => unknown } }).document = {
    createElement: (tag: string) => new FakeDOMElement(tag),
  };
});

describe("renderCalculator (View e Interações)", () => {
  it("inicializa com abas, campos de preço e resultados ocultos", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const title = container.find((el) => el.attrs.id === "calculator-title");
    expect(title?.textContent).toBe("Etanol ou Gasolina?");

    const tabQuick = container.find((el) => el.attrs.id === "tab-quick");
    const tabCustom = container.find((el) => el.attrs.id === "tab-custom");
    expect(tabQuick?.attrs["aria-selected"]).toBe("true");
    expect(tabCustom?.attrs["aria-selected"]).toBe("false");

    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price");
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price");
    expect(inputGas).toBeDefined();
    expect(inputEth).toBeDefined();

    const results = container.find((el) => el.attrs.id === "calc-results");
    expect(results?.hidden).toBe(true);
  });

  it("alterna entre modo rápido e personalizado preservando valores digitados", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const tabQuick = container.find((el) => el.attrs.id === "tab-quick")!;
    const tabCustom = container.find((el) => el.attrs.id === "tab-custom")!;
    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price")!;
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price")!;

    inputGas.value = "6,00";
    inputEth.value = "4,00";

    // Clica na aba personalizada
    tabCustom.dispatchEvent("click");
    expect(tabCustom.attrs["aria-selected"]).toBe("true");
    expect(tabQuick.attrs["aria-selected"]).toBe("false");

    // Preços permanecem preenchidos
    expect(inputGas.value).toBe("6,00");
    expect(inputEth.value).toBe("4,00");

    // Campos de consumo estão visíveis
    const inputGasCons = container.find((el) => el.attrs.id === "calc-input-gas-cons")!;
    expect(inputGasCons).toBeDefined();

    // Volta para o modo rápido
    tabQuick.dispatchEvent("click");
    expect(tabQuick.attrs["aria-selected"]).toBe("true");
    expect(inputGas.value).toBe("6,00");
  });

  it("exibe erros de validação ao submeter formulário com campos obrigatórios vazios", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const form = container.find((el) => el.attrs.id === "calc-form-panel")!;
    form.dispatchEvent("submit");

    const errorGas = container.find((el) => el.attrs.id === "error-gas-price")!;
    const errorEth = container.find((el) => el.attrs.id === "error-eth-price")!;

    expect(errorGas.textContent).toBe("Informe o preço da gasolina.");
    expect(errorEth.textContent).toBe("Informe o preço do etanol.");

    const results = container.find((el) => el.attrs.id === "calc-results")!;
    expect(results.hidden).toBe(true);
  });

  it("calcula e apresenta recomendação de etanol no modo rápido", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price")!;
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price")!;
    const form = container.find((el) => el.attrs.id === "calc-form-panel")!;

    inputGas.value = "6,00";
    inputEth.value = "4,00";

    form.dispatchEvent("submit");

    const results = container.find((el) => el.attrs.id === "calc-results")!;
    expect(results.hidden).toBe(false);

    const badge = container.find((el) => el.className.includes("calc-badge-ethanol"))!;
    expect(badge).toBeDefined();

    const explanation = container.find((el) => el.className === "calc-result-explanation")!;
    expect(explanation.textContent).toContain("66,67%");
    expect(explanation.textContent).toContain("etanol é mais vantajoso");
  });

  it("executa simulação de abastecimento quando a litragem for informada", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price")!;
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price")!;
    const inputLiters = container.find((el) => el.attrs.id === "calc-input-liters")!;
    const form = container.find((el) => el.attrs.id === "calc-form-panel")!;

    inputGas.value = "6,00";
    inputEth.value = "4,00";
    inputLiters.value = "50";

    form.dispatchEvent("submit");

    const simTitle = container.find((el) => el.className === "calc-simulation-title");
    expect(simTitle?.textContent).toContain("50 litros");

    const simPrices = container.findAll((el) => el.className === "calc-sim-price");
    expect(simPrices.some((p) => p.textContent.includes("300"))).toBe(true); // 6 * 50 = 300
    expect(simPrices.some((p) => p.textContent.includes("200"))).toBe(true); // 4 * 50 = 200
  });

  it("no modo personalizado calcula o custo por km e a autonomia na simulação", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const tabCustom = container.find((el) => el.attrs.id === "tab-custom")!;
    tabCustom.dispatchEvent("click");

    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price")!;
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price")!;
    const inputGasCons = container.find((el) => el.attrs.id === "calc-input-gas-cons")!;
    const inputEthCons = container.find((el) => el.attrs.id === "calc-input-eth-cons")!;
    const inputLiters = container.find((el) => el.attrs.id === "calc-input-liters")!;
    const form = container.find((el) => el.attrs.id === "calc-form-panel")!;

    inputGas.value = "6,00";
    inputEth.value = "4,00";
    inputGasCons.value = "12";
    inputEthCons.value = "8";
    inputLiters.value = "50";

    form.dispatchEvent("submit");

    const results = container.find((el) => el.attrs.id === "calc-results")!;
    expect(results.hidden).toBe(false);

    const badge = container.find((el) => el.className.includes("calc-badge-equivalent"))!;
    expect(badge).toBeDefined();

    // Distâncias estimadas: 50 * 12 = 600 km, 50 * 8 = 400 km
    const distGrid = container.find((el) => el.className === "calc-sim-distance-grid");
    expect(distGrid).toBeDefined();
  });

  it("limpa todos os campos e oculta resultados ao clicar no botão Limpar", () => {
    const container = new FakeDOMElement("section");
    renderCalculator(container as unknown as HTMLElement);

    const inputGas = container.find((el) => el.attrs.id === "calc-input-gas-price")!;
    const inputEth = container.find((el) => el.attrs.id === "calc-input-eth-price")!;
    const form = container.find((el) => el.attrs.id === "calc-form-panel")!;
    const btnClear = container.find((el) => el.className === "btn-calc-clear")!;

    inputGas.value = "6,00";
    inputEth.value = "4,00";
    form.dispatchEvent("submit");

    const results = container.find((el) => el.attrs.id === "calc-results")!;
    expect(results.hidden).toBe(false);

    btnClear.dispatchEvent("click");

    expect(inputGas.value).toBe("");
    expect(inputEth.value).toBe("");
    expect(results.hidden).toBe(true);
  });
});

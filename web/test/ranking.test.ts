import { describe, expect, it } from "vitest";
import { rankByPrice, summarize, toCents } from "../src/ranking";
import { makePrice } from "./helpers";

describe("toCents", () => {
  it("converte reais em centavos sem perder um centavo por ponto flutuante", () => {
    expect(toCents(6.29)).toBe(629);
    expect(toCents(4.35)).toBe(435); // 4.35 * 100 = 434.99999999999994
    expect(toCents(1.15)).toBe(115); // 1.15 * 100 = 114.99999999999999
  });
});

describe("rankByPrice", () => {
  it("ordena do mais barato ao mais caro", () => {
    const ranked = rankByPrice([
      makePrice({ cnpj: "1", price: 6.39 }),
      makePrice({ cnpj: "2", price: 6.19 }),
      makePrice({ cnpj: "3", price: 6.29 }),
    ]);

    expect(ranked.map((p) => p.cnpj)).toEqual(["2", "3", "1"]);
  });

  it("desempata pelo nome do posto (sem diferenciar caixa) e depois pelo CNPJ", () => {
    const ranked = rankByPrice([
      makePrice({ cnpj: "3", tradeName: "Bom Preço", price: 6.29 }),
      makePrice({ cnpj: "2", tradeName: "auto zebra", price: 6.29 }),
      makePrice({ cnpj: "1", tradeName: "auto zebra", price: 6.29 }),
    ]);

    expect(ranked.map((p) => p.cnpj)).toEqual(["1", "2", "3"]);
  });

  it("não altera a lista original", () => {
    const original = [makePrice({ cnpj: "1", price: 6.39 }), makePrice({ cnpj: "2", price: 6.19 })];

    rankByPrice(original);

    expect(original.map((p) => p.cnpj)).toEqual(["1", "2"]);
  });
});

describe("summarize", () => {
  it("devolve null quando não há postos", () => {
    expect(summarize([])).toBeNull();
  });

  it("calcula menor, maior, média e quantidade", () => {
    const summary = summarize([
      makePrice({ cnpj: "2", price: 6.29 }),
      makePrice({ cnpj: "3", price: 6.49 }),
      makePrice({ cnpj: "1", price: 6.19 }),
    ]);

    expect(summary?.count).toBe(3);
    expect(summary?.cheapest.cnpj).toBe("1");
    expect(summary?.mostExpensive.cnpj).toBe("3");
    expect(summary?.average).toBe(6.32); // (619 + 629 + 649) / 3 = 632,33 centavos
  });

  it("arredonda a média ao centavo, meio para cima", () => {
    const summary = summarize([makePrice({ price: 6.29 }), makePrice({ cnpj: "2", price: 6.3 })]);

    expect(summary?.average).toBe(6.3); // 629,5 centavos -> 630
  });

  it("não deixa resíduo de ponto flutuante na média", () => {
    const summary = summarize([
      makePrice({ cnpj: "1", price: 6.29 }),
      makePrice({ cnpj: "2", price: 6.29 }),
      makePrice({ cnpj: "3", price: 6.29 }),
    ]);

    expect(summary?.average).toBe(6.29);
  });
});
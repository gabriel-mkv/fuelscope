import { describe, expect, it } from "vitest";
import { distinctValues, filterPrices, normalize, type Filters } from "../../../src/features/filters/filters";
import { makePrice } from "../../helpers";

const ALL: Filters = { product: "GASOLINA COMUM", brand: null, neighborhood: null, query: "" };

describe("normalize", () => {
  it("deixa em maiúsculas, sem acento e sem espaços nas pontas", () => {
    expect(normalize(" Pará de Minas ")).toBe("PARA DE MINAS");
  });
});

describe("filterPrices", () => {
  it("mantém só o combustível escolhido", () => {
    const prices = [
      makePrice({ cnpj: "1" }),
      makePrice({ cnpj: "2", product: "ETANOL" }),
    ];

    expect(filterPrices(prices, ALL).map((p) => p.cnpj)).toEqual(["1"]);
  });

  it("filtra por bandeira sem diferenciar caixa e acento", () => {
    const prices = [
      makePrice({ cnpj: "1", brand: "IPIRANGA" }),
      makePrice({ cnpj: "2", brand: "BRANCA" }),
    ];

    const result = filterPrices(prices, { ...ALL, brand: "ipiranga" });

    expect(result.map((p) => p.cnpj)).toEqual(["1"]);
  });

  it("filtra por bairro sem diferenciar caixa e acento", () => {
    const prices = [
      makePrice({ cnpj: "1", neighborhood: "SÃO JOSÉ" }),
      makePrice({ cnpj: "2", neighborhood: "CENTRO" }),
    ];

    const result = filterPrices(prices, { ...ALL, neighborhood: "sao jose" });

    expect(result.map((p) => p.cnpj)).toEqual(["1"]);
  });

  it("busca pelo nome do posto sem diferenciar acento e caixa", () => {
    const prices = [
      makePrice({ cnpj: "1", tradeName: "Bom Preço" }),
      makePrice({ cnpj: "2", tradeName: "Auto Zebra" }),
    ];

    const result = filterPrices(prices, { ...ALL, query: " preco " });

    expect(result.map((p) => p.cnpj)).toEqual(["1"]);
  });

  it("combina todos os filtros", () => {
    const prices = [
      makePrice({ cnpj: "1", brand: "IPIRANGA", neighborhood: "CENTRO", tradeName: "Posto Central" }),
      makePrice({ cnpj: "2", brand: "IPIRANGA", neighborhood: "CENTRO", tradeName: "Outro" }),
      makePrice({ cnpj: "3", brand: "BRANCA", neighborhood: "CENTRO", tradeName: "Posto Central" }),
      makePrice({ cnpj: "4", brand: "IPIRANGA", neighborhood: "SANTOS DUMONT", tradeName: "Posto Central" }),
    ];

    const result = filterPrices(prices, {
      product: "GASOLINA COMUM",
      brand: "IPIRANGA",
      neighborhood: "CENTRO",
      query: "central",
    });

    expect(result.map((p) => p.cnpj)).toEqual(["1"]);
  });

  it("devolve lista vazia quando nada combina", () => {
    const prices = [makePrice()];

    expect(filterPrices(prices, { ...ALL, query: "inexistente" })).toEqual([]);
  });
});

describe("distinctValues", () => {
  it("devolve valores sem repetir (ignorando caixa) e em ordem alfabética", () => {
    const prices = [
      makePrice({ brand: "IPIRANGA" }),
      makePrice({ brand: "BRANCA" }),
      makePrice({ brand: "ipiranga" }),
    ];

    expect(distinctValues(prices, "brand")).toEqual(["BRANCA", "IPIRANGA"]);
  });

  it("ignora valores vazios ou em branco", () => {
    const prices = [makePrice({ brand: "" }), makePrice({ brand: "  " }), makePrice({ brand: "BRANCA" })];

    expect(distinctValues(prices, "brand")).toEqual(["BRANCA"]);
  });
});
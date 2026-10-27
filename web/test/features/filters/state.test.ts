import { describe, expect, it } from "vitest";
import { defaultProduct, resolveFilters } from "../../../src/features/filters/state";
import { makePrice } from "../../helpers";

const prices = [
  makePrice({ cnpj: "1", product: "GASOLINA COMUM", brand: "IPIRANGA", neighborhood: "CENTRO" }),
  makePrice({ cnpj: "2", product: "ETANOL", brand: "BRANCA", neighborhood: "SÃO JOSÉ" }),
];

describe("defaultProduct", () => {
  it("prefere gasolina comum", () => {
    expect(defaultProduct(prices)).toBe("GASOLINA COMUM");
  });

  it("usa o primeiro combustível em ordem alfabética quando não há gasolina comum", () => {
    const others = [makePrice({ product: "ETANOL" }), makePrice({ product: "DIESEL S10" })];

    expect(defaultProduct(others)).toBe("DIESEL S10");
  });

  it("devolve vazio quando não há registros", () => {
    expect(defaultProduct([])).toBe("");
  });
});

describe("resolveFilters", () => {
  it("usa o combustível padrão quando nada é pedido", () => {
    expect(resolveFilters(prices, {})).toEqual({
      product: "GASOLINA COMUM",
      brand: null,
      neighborhood: null,
      query: "",
    });
  });

  it("usa o combustível padrão quando o pedido não existe", () => {
    expect(resolveFilters(prices, { product: "QUEROSENE" }).product).toBe("GASOLINA COMUM");
  });

  it("aceita o pedido ignorando caixa e acento e devolve a grafia dos dados", () => {
    const result = resolveFilters(prices, { product: "etanol", brand: "branca", neighborhood: "sao jose" });

    expect(result).toEqual({ product: "ETANOL", brand: "BRANCA", neighborhood: "SÃO JOSÉ", query: "" });
  });

  it("descarta bandeira e bairro que não existem para o combustível", () => {
    const result = resolveFilters(prices, { product: "ETANOL", brand: "IPIRANGA", neighborhood: "CENTRO" });

    expect(result.brand).toBeNull();
    expect(result.neighborhood).toBeNull();
  });

  it("preserva a busca por nome", () => {
    expect(resolveFilters(prices, { query: "posto" }).query).toBe("posto");
  });
});
import { describe, expect, it } from "vitest";
import { parseFilters, serializeFilters } from "../../../src/features/filters/urlState";

describe("parseFilters", () => {
  it("lê os filtros da query string", () => {
    const result = parseFilters("?produto=ETANOL&bandeira=BRANCA&bairro=S%C3%83O+JOS%C3%89&busca=bom");

    expect(result).toEqual({ product: "ETANOL", brand: "BRANCA", neighborhood: "SÃO JOSÉ", query: "bom" });
  });

  it("ignora parâmetros ausentes ou vazios", () => {
    expect(parseFilters("?produto=&outro=1")).toEqual({});
  });
});

describe("serializeFilters", () => {
  it("omite o que não foi escolhido", () => {
    const query = serializeFilters({ product: "ETANOL", brand: null, neighborhood: null, query: "" });

    expect(query).toBe("produto=ETANOL");
  });

  it("faz ida e volta sem perder acentos e espaços", () => {
    const filters = { product: "GASOLINA COMUM", brand: "IPIRANGA", neighborhood: "SÃO JOSÉ", query: "bom preço" };

    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});
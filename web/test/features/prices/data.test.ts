import { describe, expect, it } from "vitest";
import { parsePrices } from "../../../src/features/prices/data";

const valid = {
  cnpj: "08220930000162",
  legalName: "RAZAO SOCIAL LTDA",
  tradeName: "NOME FANTASIA",
  address: "RUA EXEMPLO, 123",
  neighborhood: "CENTRO",
  brand: "BANDEIRA",
  product: "GASOLINA COMUM",
  price: 6.29,
  collectionDate: "2026-09-29",
};

describe("parsePrices", () => {
  it("aceita um registro no formato do JSON gerado pela aplicação", () => {
    expect(parsePrices([valid])).toEqual([valid]);
  });

  it("descarta registros inválidos e mantém os válidos", () => {
    const result = parsePrices([
      valid,
      { ...valid, price: 0 },
      { ...valid, price: "6.29" },
      { ...valid, collectionDate: "29/09/2026" },
      { ...valid, cnpj: undefined },
      null,
    ]);

    expect(result).toEqual([valid]);
  });

  it("lança erro quando o conteúdo não é uma lista", () => {
    expect(() => parsePrices({ cnpj: "1" })).toThrow();
  });
});
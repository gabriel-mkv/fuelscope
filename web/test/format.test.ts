import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, latestDate } from "../src/format";
import type { FuelPrice } from "../src/types";

function priceOn(collectionDate: string): FuelPrice {
  return {
    cnpj: "11111111000111",
    legalName: "RAZAO",
    tradeName: "POSTO",
    address: "RUA TESTE, 100",
    neighborhood: "CENTRO",
    brand: "BRANCA",
    product: "GASOLINA COMUM",
    price: 6.29,
    collectionDate,
  };
}

describe("format", () => {
  it("formata a data ISO como dd/mm/aaaa", () => {
    expect(formatDate("2026-09-29")).toBe("29/09/2026");
  });

  it("formata o preço em reais com vírgula decimal", () => {
    // O Intl usa espaço não separável entre "R$" e o valor; normaliza para comparar.
    expect(formatPrice(6.29).replace(/\s/g, " ")).toBe("R$ 6,29");
  });

  it("devolve a data de coleta mais recente", () => {
    const prices = [priceOn("2026-09-22"), priceOn("2026-09-29"), priceOn("2026-09-15")];

    expect(latestDate(prices)).toBe("2026-09-29");
  });

  it("devolve null quando não há registros", () => {
    expect(latestDate([])).toBeNull();
  });
});
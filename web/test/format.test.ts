import { describe, expect, it } from "vitest";
import { daysBetween, formatDate, formatPrice, latestDate, titleCase, todayInBrazil } from "../src/format";
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

describe("titleCase", () => {
  it("capitaliza cada palavra e mantém as preposições em minúsculas", () => {
    expect(titleCase("POSTO SÃO JOSÉ DE MINAS LTDA")).toBe("Posto São José de Minas Ltda");
  });

  it("mantém siglas de combustível e números colados", () => {
    expect(titleCase("GNV")).toBe("GNV");
    expect(titleCase("DIESEL S10")).toBe("Diesel S10");
  });

  it("capitaliza a primeira palavra mesmo sendo preposição", () => {
    expect(titleCase("DO CARMO")).toBe("Do Carmo");
  });
});

describe("daysBetween", () => {
  it("conta os dias entre duas datas ISO", () => {
    expect(daysBetween("2026-09-29", "2026-10-13")).toBe(14);
    expect(daysBetween("2026-10-13", "2026-10-13")).toBe(0);
  });

  it("atravessa a virada de ano", () => {
    expect(daysBetween("2025-12-28", "2026-01-03")).toBe(6);
  });
});

describe("todayInBrazil", () => {
  it("usa o fuso de São Paulo, não o UTC", () => {
    // 01:00 UTC de 28/10 ainda é 22:00 de 27/10 em São Paulo.
    expect(todayInBrazil(new Date("2026-10-28T01:00:00Z"))).toBe("2026-10-27");
  });
});
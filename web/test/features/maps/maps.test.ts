import { describe, expect, it } from "vitest";
import { mapsUrl } from "../../../src/features/maps/maps";
import { makePrice } from "../../helpers";

function queryOf(url: string): string | null {
  return new URL(url).searchParams.get("query");
}

describe("mapsUrl", () => {
  it("busca por nome, endereço, bairro e cidade", () => {
    const url = mapsUrl(makePrice({ tradeName: "POSTO A", address: "RUA TESTE, 100", neighborhood: "CENTRO" }));

    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(queryOf(url)).toBe("POSTO A, RUA TESTE, 100, CENTRO, Pará de Minas, MG");
  });

  it("omite partes vazias", () => {
    const url = mapsUrl(makePrice({ tradeName: "POSTO A", address: "  ", neighborhood: "" }));

    expect(queryOf(url)).toBe("POSTO A, Pará de Minas, MG");
  });

  it("codifica caracteres especiais sem quebrar a URL", () => {
    const url = mapsUrl(makePrice({ tradeName: "AUTO & CIA #1" }));

    expect(queryOf(url)).toContain("AUTO & CIA #1");
  });
}); 
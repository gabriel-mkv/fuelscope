import { describe, expect, it } from "vitest";
import {
  calculateCustomMode,
  calculateQuickMode,
  formatCostPerKm,
  formatPercent,
  parseDecimal,
  simulateRefuel,
  validateCustomInput,
  validateQuickInput,
  validateSimulationLiters,
} from "../../../src/features/calculator/calculator";

describe("parseDecimal", () => {
  it("aceita números inteiros e decimais com ponto ou vírgula", () => {
    expect(parseDecimal("6")).toBe(6);
    expect(parseDecimal("6.29")).toBe(6.29);
    expect(parseDecimal("6,29")).toBe(6.29);
    expect(parseDecimal(" 4,35 ")).toBe(4.35);
    expect(parseDecimal(5.5)).toBe(5.5);
  });

  it("retorna null para entradas vazias ou inválidas", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(undefined)).toBeNull();
  });
});

describe("Calculadora — Modo Rápido (Regra dos 70%)", () => {
  it("recomenda etanol quando a relação fica abaixo de 70%", () => {
    // Exemplo do prompt: Gasolina R$ 6,00, Etanol R$ 4,00 => (4,00 / 6,00) * 100 = 66,67%
    const result = calculateQuickMode({ gasolinePrice: 6.0, ethanolPrice: 4.0 });
    expect(result.recommendation).toBe("ethanol");
    expect(result.ratioPercent).toBeCloseTo(66.6667, 2);
    expect(result.parityEthanolPrice).toBeCloseTo(4.2, 2);
    expect(result.explanation).toContain("etanol é mais vantajoso");
  });

  it("recomenda gasolina quando a relação fica acima de 70%", () => {
    const result = calculateQuickMode({ gasolinePrice: 6.0, ethanolPrice: 4.5 });
    // (4.5 / 6.0) * 100 = 75%
    expect(result.recommendation).toBe("gasoline");
    expect(result.ratioPercent).toBe(75);
    expect(result.explanation).toContain("gasolina é mais vantajosa");
  });

  it("indica equivalência quando a relação é exatamente 70%", () => {
    // Gasolina R$ 6,00, Etanol R$ 4,20 => 4.20 / 6.00 = 0.70 = 70%
    const result = calculateQuickMode({ gasolinePrice: 6.0, ethanolPrice: 4.2 });
    expect(result.recommendation).toBe("equivalent");
    expect(result.ratioPercent).toBe(70);
    expect(result.explanation).toContain("equivalente");
  });

  it("funciona corretamente com preços contendo várias casas decimais", () => {
    const result = calculateQuickMode({ gasolinePrice: 5.899, ethanolPrice: 3.799 });
    // 3.799 / 5.899 ≈ 64.40%
    expect(result.recommendation).toBe("ethanol");
    expect(result.ratioPercent).toBeCloseTo(64.4, 1);
  });

  it("valida campos vazios no modo rápido", () => {
    const validation = validateQuickInput("", "");
    expect(validation.isValid).toBe(false);
    expect(validation.errors.gasolinePrice).toBe("Informe o preço da gasolina.");
    expect(validation.errors.ethanolPrice).toBe("Informe o preço do etanol.");
  });

  it("valida preços negativos ou inválidos no modo rápido", () => {
    const validation = validateQuickInput("-5.00", "abc");
    expect(validation.isValid).toBe(false);
    expect(validation.errors.gasolinePrice).toBe("Preço inválido para a gasolina.");
    expect(validation.errors.ethanolPrice).toBe("Preço inválido para o etanol.");
  });

  it("não permite preço da gasolina ou etanol igual a zero", () => {
    const validationGasZero = validateQuickInput("0", "4.00");
    expect(validationGasZero.isValid).toBe(false);
    expect(validationGasZero.errors.gasolinePrice).toBe("O preço da gasolina deve ser maior que zero.");

    const validationEthZero = validateQuickInput("6.00", "0");
    expect(validationEthZero.isValid).toBe(false);
    expect(validationEthZero.errors.ethanolPrice).toBe("O preço do etanol deve ser maior que zero.");
  });

  it("permite alteração dos valores e nova comparação com novos resultados", () => {
    const firstCalc = calculateQuickMode({ gasolinePrice: 6.0, ethanolPrice: 4.5 }); // 75% -> gasolina
    expect(firstCalc.recommendation).toBe("gasoline");

    const secondCalc = calculateQuickMode({ gasolinePrice: 6.0, ethanolPrice: 3.9 }); // 65% -> etanol
    expect(secondCalc.recommendation).toBe("ethanol");
  });
});

describe("Calculadora — Modo Personalizado (Consumo Real)", () => {
  it("recomenda etanol quando o custo por quilômetro com etanol for menor", () => {
    // Gasolina: R$ 6,00 / 10 km/L = R$ 0,60/km
    // Etanol: R$ 3,50 / 7 km/L = R$ 0,50/km
    const result = calculateCustomMode({
      gasolinePrice: 6.0,
      ethanolPrice: 3.5,
      gasolineConsumption: 10,
      ethanolConsumption: 7,
    });
    expect(result.recommendation).toBe("ethanol");
    expect(result.gasolineCostPerKm).toBe(0.6);
    expect(result.ethanolCostPerKm).toBe(0.5);
    expect(result.costDifferencePerKm).toBeCloseTo(0.1, 4);
    expect(result.economyPer100Km).toBeCloseTo(10.0, 2);
    expect(result.explanation).toContain("etanol custa");
  });

  it("recomenda gasolina quando o custo por quilômetro com gasolina for menor", () => {
    // Gasolina: R$ 5,00 / 12 km/L ≈ R$ 0,4167/km
    // Etanol: R$ 4,00 / 7 km/L ≈ R$ 0,5714/km
    const result = calculateCustomMode({
      gasolinePrice: 5.0,
      ethanolPrice: 4.0,
      gasolineConsumption: 12,
      ethanolConsumption: 7,
    });
    expect(result.recommendation).toBe("gasoline");
    expect(result.gasolineCostPerKm).toBeLessThan(result.ethanolCostPerKm);
    expect(result.explanation).toContain("gasolina custa");
  });

  it("indica custos equivalentes quando o custo por km for igual (exemplo da especificação)", () => {
    // Exemplo do prompt:
    // Gasolina: R$ 6,00 / 12 km/L = R$ 0,50/km
    // Etanol: R$ 4,00 / 8 km/L = R$ 0,50/km
    const result = calculateCustomMode({
      gasolinePrice: 6.0,
      ethanolPrice: 4.0,
      gasolineConsumption: 12,
      ethanolConsumption: 8,
    });
    expect(result.recommendation).toBe("equivalent");
    expect(result.gasolineCostPerKm).toBe(0.5);
    expect(result.ethanolCostPerKm).toBe(0.5);
    expect(result.costDifferencePerKm).toBe(0);
    expect(result.economyPer100Km).toBe(0);
    expect(result.explanation).toContain("mesmo custo estimado");
  });

  it("calcula corretamente com consumos e preços decimais", () => {
    // Gasolina R$ 6,29 / 11,5 km/L ≈ 0,54695 R$/km
    // Etanol R$ 4,19 / 8,2 km/L ≈ 0,51097 R$/km
    const result = calculateCustomMode({
      gasolinePrice: 6.29,
      ethanolPrice: 4.19,
      gasolineConsumption: 11.5,
      ethanolConsumption: 8.2,
    });
    expect(result.recommendation).toBe("ethanol");
    expect(result.gasolineCostPerKm).toBeCloseTo(0.547, 3);
    expect(result.ethanolCostPerKm).toBeCloseTo(0.511, 3);
    expect(result.economyPer100Km).toBeCloseTo(3.6, 1);
  });

  it("calcula a paridade real de rendimento do próprio veículo", () => {
    // Etanol 8 km/L / Gasolina 12 km/L = 66,67%
    const result = calculateCustomMode({
      gasolinePrice: 6.0,
      ethanolPrice: 4.0,
      gasolineConsumption: 12,
      ethanolConsumption: 8,
    });
    expect(result.vehicleParityPercent).toBeCloseTo(66.6667, 2);
  });

  it("valida campos vazios no modo personalizado", () => {
    const validation = validateCustomInput("", "", "", "");
    expect(validation.isValid).toBe(false);
    expect(validation.errors.gasolinePrice).toBe("Informe o preço da gasolina.");
    expect(validation.errors.ethanolPrice).toBe("Informe o preço do etanol.");
    expect(validation.errors.gasolineConsumption).toBe("Informe o consumo com gasolina.");
    expect(validation.errors.ethanolConsumption).toBe("Informe o consumo com etanol.");
  });

  it("não permite consumo igual a zero ou negativo", () => {
    const zeroCons = validateCustomInput("6.00", "4.00", "0", "-5");
    expect(zeroCons.isValid).toBe(false);
    expect(zeroCons.errors.gasolineConsumption).toBe("O consumo com gasolina deve ser maior que zero.");
    expect(zeroCons.errors.ethanolConsumption).toBe("Consumo inválido para o etanol.");
  });

  it("permite alteração dos dados e atualização imediata do resultado", () => {
    const inputA = {
      gasolinePrice: 6.0,
      ethanolPrice: 4.0,
      gasolineConsumption: 12,
      ethanolConsumption: 7, // Etanol: 4/7 = 0.571; Gasolina: 6/12 = 0.50 -> Gasolina vence
    };
    expect(calculateCustomMode(inputA).recommendation).toBe("gasoline");

    const inputB = {
      ...inputA,
      ethanolConsumption: 9, // Etanol: 4/9 = 0.444; Gasolina: 6/12 = 0.50 -> Etanol vence
    };
    expect(calculateCustomMode(inputB).recommendation).toBe("ethanol");
  });
});

describe("Simulação de abastecimento", () => {
  it("calcula custos totais e diferença para diferentes quantidades de litros", () => {
    // 50 litros:
    // Gasolina R$ 6,00 * 50 = R$ 300,00
    // Etanol R$ 4,00 * 50 = R$ 200,00
    // Diferença = R$ 100,00
    const sim50 = simulateRefuel({
      gasolinePrice: 6.0,
      ethanolPrice: 4.0,
      liters: 50,
    });
    expect(sim50.gasolineTotalCost).toBe(300);
    expect(sim50.ethanolTotalCost).toBe(200);
    expect(sim50.costDifference).toBe(100);
    expect(sim50.cheaperFuel).toBe("ethanol");

    // 30 litros:
    const sim30 = simulateRefuel({
      gasolinePrice: 5.5,
      ethanolPrice: 4.2,
      liters: 30,
    });
    expect(sim30.gasolineTotalCost).toBeCloseTo(165, 2);
    expect(sim30.ethanolTotalCost).toBeCloseTo(126, 2);
    expect(sim30.costDifference).toBeCloseTo(39, 2);
  });

  it("calcula distância estimada percorrida no modo personalizado", () => {
    // 50 litros com Gasolina 12 km/L = 600 km
    // 50 litros com Etanol 8 km/L = 400 km
    // Diferença = 200 km
    const sim = simulateRefuel({
      gasolinePrice: 6.0,
      ethanolPrice: 4.0,
      liters: 50,
      gasolineConsumption: 12,
      ethanolConsumption: 8,
    });
    expect(sim.gasolineDistance).toBe(600);
    expect(sim.ethanolDistance).toBe(400);
    expect(sim.distanceDifference).toBe(200);
  });

  it("valida quantidade de litros", () => {
    expect(validateSimulationLiters("").isValid).toBe(true);
    expect(validateSimulationLiters("").data).toBeNull();

    expect(validateSimulationLiters("50").isValid).toBe(true);
    expect(validateSimulationLiters("50").data).toBe(50);

    expect(validateSimulationLiters("0").isValid).toBe(false);
    expect(validateSimulationLiters("-10").isValid).toBe(false);
    expect(validateSimulationLiters("abc").isValid).toBe(false);
  });
});

describe("Formatadores auxiliares", () => {
  it("formata percentuais e custo por km", () => {
    expect(formatPercent(66.6667, 2)).toBe("66,67%");
    expect(formatCostPerKm(0.5)).toContain("/km");
  });
});

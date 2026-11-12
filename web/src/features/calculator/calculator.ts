import { formatPrice } from "../../shared/format";

export type Recommendation = "ethanol" | "gasoline" | "equivalent";

export interface QuickModeInput {
  gasolinePrice: number;
  ethanolPrice: number;
}

export interface QuickModeResult {
  mode: "quick";
  recommendation: Recommendation;
  ratioPercent: number;
  parityEthanolPrice: number;
  differencePercent: number;
  gasolinePrice: number;
  ethanolPrice: number;
  explanation: string;
}

export interface CustomModeInput {
  gasolinePrice: number;
  ethanolPrice: number;
  gasolineConsumption: number;
  ethanolConsumption: number;
}

export interface CustomModeResult {
  mode: "custom";
  recommendation: Recommendation;
  gasolineCostPerKm: number;
  ethanolCostPerKm: number;
  costDifferencePerKm: number;
  economyPer100Km: number;
  vehicleParityPercent: number;
  gasolinePrice: number;
  ethanolPrice: number;
  gasolineConsumption: number;
  ethanolConsumption: number;
  explanation: string;
}

export interface RefuelSimulationInput {
  gasolinePrice: number;
  ethanolPrice: number;
  liters: number;
  gasolineConsumption?: number;
  ethanolConsumption?: number;
}

export interface RefuelSimulationResult {
  liters: number;
  gasolineTotalCost: number;
  ethanolTotalCost: number;
  costDifference: number;
  cheaperFuel: Recommendation;
  gasolineDistance?: number;
  ethanolDistance?: number;
  distanceDifference?: number;
}

export interface ValidationSuccess<T> {
  isValid: true;
  data: T;
  errors: Record<string, never>;
}

export interface ValidationFailure {
  isValid: false;
  data?: undefined;
  errors: Record<string, string>;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Converte string digitada pelo usuário em número.
 * Aceita vírgula ou ponto como separador decimal.
 */
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (!value || typeof value !== "string") {
    return null;
  }
  const clean = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (clean === "") {
    return null;
  }
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

export function validateQuickInput(
  gasolinePriceStr: string,
  ethanolPriceStr: string,
): ValidationResult<QuickModeInput> {
  const errors: Record<string, string> = {};

  const gas = parseDecimal(gasolinePriceStr);
  if (gasolinePriceStr.trim() === "") {
    errors.gasolinePrice = "Informe o preço da gasolina.";
  } else if (gas === null || gas < 0) {
    errors.gasolinePrice = "Preço inválido para a gasolina.";
  } else if (gas === 0) {
    errors.gasolinePrice = "O preço da gasolina deve ser maior que zero.";
  }

  const eth = parseDecimal(ethanolPriceStr);
  if (ethanolPriceStr.trim() === "") {
    errors.ethanolPrice = "Informe o preço do etanol.";
  } else if (eth === null || eth < 0) {
    errors.ethanolPrice = "Preço inválido para o etanol.";
  } else if (eth === 0) {
    errors.ethanolPrice = "O preço do etanol deve ser maior que zero.";
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      gasolinePrice: gas!,
      ethanolPrice: eth!,
    },
    errors: {},
  };
}

export function validateCustomInput(
  gasolinePriceStr: string,
  ethanolPriceStr: string,
  gasolineConsumptionStr: string,
  ethanolConsumptionStr: string,
): ValidationResult<CustomModeInput> {
  const errors: Record<string, string> = {};

  const gas = parseDecimal(gasolinePriceStr);
  if (gasolinePriceStr.trim() === "") {
    errors.gasolinePrice = "Informe o preço da gasolina.";
  } else if (gas === null || gas < 0) {
    errors.gasolinePrice = "Preço inválido para a gasolina.";
  } else if (gas === 0) {
    errors.gasolinePrice = "O preço da gasolina deve ser maior que zero.";
  }

  const eth = parseDecimal(ethanolPriceStr);
  if (ethanolPriceStr.trim() === "") {
    errors.ethanolPrice = "Informe o preço do etanol.";
  } else if (eth === null || eth < 0) {
    errors.ethanolPrice = "Preço inválido para o etanol.";
  } else if (eth === 0) {
    errors.ethanolPrice = "O preço do etanol deve ser maior que zero.";
  }

  const gasCons = parseDecimal(gasolineConsumptionStr);
  if (gasolineConsumptionStr.trim() === "") {
    errors.gasolineConsumption = "Informe o consumo com gasolina.";
  } else if (gasCons === null || gasCons < 0) {
    errors.gasolineConsumption = "Consumo inválido para a gasolina.";
  } else if (gasCons === 0) {
    errors.gasolineConsumption = "O consumo com gasolina deve ser maior que zero.";
  }

  const ethCons = parseDecimal(ethanolConsumptionStr);
  if (ethanolConsumptionStr.trim() === "") {
    errors.ethanolConsumption = "Informe o consumo com etanol.";
  } else if (ethCons === null || ethCons < 0) {
    errors.ethanolConsumption = "Consumo inválido para o etanol.";
  } else if (ethCons === 0) {
    errors.ethanolConsumption = "O consumo com etanol deve ser maior que zero.";
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    data: {
      gasolinePrice: gas!,
      ethanolPrice: eth!,
      gasolineConsumption: gasCons!,
      ethanolConsumption: ethCons!,
    },
    errors: {},
  };
}

export function validateSimulationLiters(
  litersStr: string,
): ValidationResult<number | null> {
  if (litersStr.trim() === "") {
    return { isValid: true, data: null, errors: {} };
  }
  const liters = parseDecimal(litersStr);
  if (liters === null || liters <= 0) {
    return {
      isValid: false,
      errors: { liters: "A quantidade de litros deve ser maior que zero." },
    };
  }
  return { isValid: true, data: liters, errors: {} };
}

/** Formata percentual brasileiro com casas decimais (ex: 66,67%). */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/** Formata valor por km (ex: R$ 0,50/km). */
export function formatCostPerKm(cost: number): string {
  return `${formatPrice(cost)}/km`;
}

/**
 * Modo Rápido — Regra dos 70%
 * (Preço do etanol / Preço da gasolina) * 100
 */
export function calculateQuickMode(input: QuickModeInput): QuickModeResult {
  const ratioPercent = (input.ethanolPrice / input.gasolinePrice) * 100;
  const parityEthanolPrice = (input.gasolinePrice * 70) / 100;

  // Arredonda para 2 casas para verificar a equivalência exata a 70,00%
  const roundedRatio = Math.round(ratioPercent * 100) / 100;

  let recommendation: Recommendation;
  let explanation: string;

  if (roundedRatio < 70) {
    recommendation = "ethanol";
    explanation =
      `O etanol custa ${formatPercent(ratioPercent, 2)} do preço da gasolina, ` +
      `abaixo do limite de 70,00%. Pela regra geral tradicional, o etanol é mais vantajoso. ` +
      `Ele continuaria compensando até o preço de ${formatPrice(parityEthanolPrice)} por litro.`;
  } else if (roundedRatio > 70) {
    recommendation = "gasoline";
    explanation =
      `O etanol custa ${formatPercent(ratioPercent, 2)} do preço da gasolina, ` +
      `acima do limite de 70,00%. Pela regra geral tradicional, a gasolina é mais vantajosa. ` +
      `Para o etanol compensar, seu preço precisaria ser menor que ${formatPrice(parityEthanolPrice)} por litro.`;
  } else {
    recommendation = "equivalent";
    explanation =
      `O preço do etanol representa exatamente 70,00% do valor da gasolina. ` +
      `Pelo critério tradicional, os dois combustíveis possuem custo-benefício equivalente.`;
  }

  return {
    mode: "quick",
    recommendation,
    ratioPercent,
    parityEthanolPrice,
    differencePercent: Math.abs(ratioPercent - 70),
    gasolinePrice: input.gasolinePrice,
    ethanolPrice: input.ethanolPrice,
    explanation,
  };
}

/**
 * Modo Personalizado — Consumo real
 * Custo por km = Preço por litro / Consumo médio em km/L
 */
export function calculateCustomMode(input: CustomModeInput): CustomModeResult {
  const gasolineCostPerKm = input.gasolinePrice / input.gasolineConsumption;
  const ethanolCostPerKm = input.ethanolPrice / input.ethanolConsumption;

  const costDifferencePerKm = Math.abs(gasolineCostPerKm - ethanolCostPerKm);
  const economyPer100Km = costDifferencePerKm * 100;
  const vehicleParityPercent = (input.ethanolConsumption / input.gasolineConsumption) * 100;

  // Tolerância para equivalência: R$ 0,001 por km
  const roundedGasCost = Math.round(gasolineCostPerKm * 1000) / 1000;
  const roundedEthCost = Math.round(ethanolCostPerKm * 1000) / 1000;

  let recommendation: Recommendation;
  let explanation: string;

  if (roundedEthCost < roundedGasCost) {
    recommendation = "ethanol";
    explanation =
      `Com o consumo informado, o etanol custa ${formatCostPerKm(ethanolCostPerKm)} ` +
      `contra ${formatCostPerKm(gasolineCostPerKm)} da gasolina. ` +
      `A cada 100 km rodados, você economiza aproximadamente ${formatPrice(economyPer100Km)} abastecendo com etanol.`;
  } else if (roundedGasCost < roundedEthCost) {
    recommendation = "gasoline";
    explanation =
      `Com o consumo informado, a gasolina custa ${formatCostPerKm(gasolineCostPerKm)} ` +
      `contra ${formatCostPerKm(ethanolCostPerKm)} do etanol. ` +
      `A cada 100 km rodados, você economiza aproximadamente ${formatPrice(economyPer100Km)} abastecendo com gasolina.`;
  } else {
    recommendation = "equivalent";
    explanation =
      `Com o consumo informado, ambos os combustíveis possuem o mesmo custo estimado de ` +
      `${formatCostPerKm(gasolineCostPerKm)}. O custo-benefício é equivalente para o seu veículo.`;
  }

  return {
    mode: "custom",
    recommendation,
    gasolineCostPerKm,
    ethanolCostPerKm,
    costDifferencePerKm,
    economyPer100Km,
    vehicleParityPercent,
    gasolinePrice: input.gasolinePrice,
    ethanolPrice: input.ethanolPrice,
    gasolineConsumption: input.gasolineConsumption,
    ethanolConsumption: input.ethanolConsumption,
    explanation,
  };
}

/**
 * Simulação de abastecimento
 */
export function simulateRefuel(input: RefuelSimulationInput): RefuelSimulationResult {
  const gasolineTotalCost = input.gasolinePrice * input.liters;
  const ethanolTotalCost = input.ethanolPrice * input.liters;
  const costDifference = Math.abs(gasolineTotalCost - ethanolTotalCost);

  let cheaperFuel: Recommendation = "equivalent";
  if (Math.round(ethanolTotalCost * 100) < Math.round(gasolineTotalCost * 100)) {
    cheaperFuel = "ethanol";
  } else if (Math.round(gasolineTotalCost * 100) < Math.round(ethanolTotalCost * 100)) {
    cheaperFuel = "gasoline";
  }

  let gasolineDistance: number | undefined;
  let ethanolDistance: number | undefined;
  let distanceDifference: number | undefined;

  if (
    input.gasolineConsumption !== undefined &&
    input.gasolineConsumption > 0 &&
    input.ethanolConsumption !== undefined &&
    input.ethanolConsumption > 0
  ) {
    gasolineDistance = input.liters * input.gasolineConsumption;
    ethanolDistance = input.liters * input.ethanolConsumption;
    distanceDifference = Math.abs(gasolineDistance - ethanolDistance);
  }

  return {
    liters: input.liters,
    gasolineTotalCost,
    ethanolTotalCost,
    costDifference,
    cheaperFuel,
    gasolineDistance,
    ethanolDistance,
    distanceDifference,
  };
}

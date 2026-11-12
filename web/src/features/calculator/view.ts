import { el } from "../../shared/dom";
import { formatPrice } from "../../shared/format";
import { calculatorIcon, checkIcon, scaleIcon } from "../../components/icons";
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
  type CustomModeResult,
  type QuickModeResult,
  type Recommendation,
  type RefuelSimulationResult,
} from "./calculator";

type CalculatorMode = "quick" | "custom";

export function renderCalculator(container: HTMLElement): void {
  let mode: CalculatorMode = "quick";
  let hasCalculated = false;

  // Estado dos inputs
  const state = {
    gasolinePrice: "",
    ethanolPrice: "",
    gasolineConsumption: "",
    ethanolConsumption: "",
    liters: "",
  };

  // Elementos do DOM
  // Header
  const iconWrapper = el("div", { className: "calc-header-icon" }, [scaleIcon()]);
  const title = el("h2", {
    className: "calculator-title",
    text: "Etanol ou Gasolina?",
    attrs: { id: "calculator-title" },
  });
  const subtitle = el("p", {
    className: "calculator-subtitle",
    text: "Descubra qual combustível compensa mais para o seu bolso.",
  });
  const headerText = el("div", { className: "calculator-header-text" }, [title, subtitle]);
  const header = el("div", { className: "calculator-header" }, [iconWrapper, headerText]);

  // Tabs
  const tabQuick = el("button", {
    className: "calc-tab is-active",
    text: "Comparação rápida",
    attrs: {
      type: "button",
      role: "tab",
      "aria-selected": "true",
      "aria-controls": "calc-form-panel",
      id: "tab-quick",
    },
  });

  const tabCustom = el("button", {
    className: "calc-tab",
    text: "Comparação personalizada",
    attrs: {
      type: "button",
      role: "tab",
      "aria-selected": "false",
      "aria-controls": "calc-form-panel",
      id: "tab-custom",
    },
  });

  const tabs = el(
    "div",
    {
      className: "calc-tabs",
      attrs: { role: "tablist", "aria-label": "Modos de comparação da calculadora" },
    },
    [tabQuick, tabCustom],
  );

  // Inputs
  // 1. Preço Gasolina
  const inputGasPrice = el("input", {
    className: "calc-input",
    attrs: {
      type: "text",
      inputmode: "decimal",
      placeholder: "Ex: 5,89",
      id: "calc-input-gas-price",
      autocomplete: "off",
    },
  });
  const errorGasPrice = el("span", {
    className: "calc-error-msg",
    attrs: { id: "error-gas-price", role: "alert" },
  });
  const groupGasPrice = el("div", { className: "calc-field-group" }, [
    el("label", {
      className: "calc-label",
      text: "Preço da gasolina (R$/L)",
      attrs: { for: "calc-input-gas-price" },
    }),
    inputGasPrice,
    errorGasPrice,
  ]);

  // 2. Preço Etanol
  const inputEthPrice = el("input", {
    className: "calc-input",
    attrs: {
      type: "text",
      inputmode: "decimal",
      placeholder: "Ex: 3,99",
      id: "calc-input-eth-price",
      autocomplete: "off",
    },
  });
  const errorEthPrice = el("span", {
    className: "calc-error-msg",
    attrs: { id: "error-eth-price", role: "alert" },
  });
  const groupEthPrice = el("div", { className: "calc-field-group" }, [
    el("label", {
      className: "calc-label",
      text: "Preço do etanol (R$/L)",
      attrs: { for: "calc-input-eth-price" },
    }),
    inputEthPrice,
    errorEthPrice,
  ]);

  const pricesGrid = el("div", { className: "calc-grid calc-grid-prices" }, [groupGasPrice, groupEthPrice]);

  // 3. Consumo Gasolina
  const inputGasCons = el("input", {
    className: "calc-input",
    attrs: {
      type: "text",
      inputmode: "decimal",
      placeholder: "Ex: 12,0",
      id: "calc-input-gas-cons",
      autocomplete: "off",
    },
  });
  const errorGasCons = el("span", {
    className: "calc-error-msg",
    attrs: { id: "error-gas-cons", role: "alert" },
  });
  const groupGasCons = el("div", { className: "calc-field-group" }, [
    el("label", {
      className: "calc-label",
      text: "Consumo com gasolina (km/L)",
      attrs: { for: "calc-input-gas-cons" },
    }),
    inputGasCons,
    errorGasCons,
  ]);

  // 4. Consumo Etanol
  const inputEthCons = el("input", {
    className: "calc-input",
    attrs: {
      type: "text",
      inputmode: "decimal",
      placeholder: "Ex: 8,5",
      id: "calc-input-eth-cons",
      autocomplete: "off",
    },
  });
  const errorEthCons = el("span", {
    className: "calc-error-msg",
    attrs: { id: "error-eth-cons", role: "alert" },
  });
  const groupEthCons = el("div", { className: "calc-field-group" }, [
    el("label", {
      className: "calc-label",
      text: "Consumo com etanol (km/L)",
      attrs: { for: "calc-input-eth-cons" },
    }),
    inputEthCons,
    errorEthCons,
  ]);

  const consumptionGrid = el("div", { className: "calc-grid calc-grid-consumption" }, [groupGasCons, groupEthCons]);
  // Inicialmente oculto pois o modo padrão é o rápido
  consumptionGrid.hidden = true;

  // 5. Simulação de abastecimento (litros)
  const inputLiters = el("input", {
    className: "calc-input",
    attrs: {
      type: "text",
      inputmode: "decimal",
      placeholder: "Ex: 50",
      id: "calc-input-liters",
      autocomplete: "off",
    },
  });
  const errorLiters = el("span", {
    className: "calc-error-msg",
    attrs: { id: "error-liters", role: "alert" },
  });
  const groupLiters = el("div", { className: "calc-field-group calc-field-simulation" }, [
    el("div", { className: "calc-sim-label-wrapper" }, [
      el("label", {
        className: "calc-label",
        text: "Simulação de abastecimento (opcional)",
        attrs: { for: "calc-input-liters" },
      }),
      el("span", { className: "calc-label-hint", text: "Informe quantos litros pretende abastecer" }),
    ]),
    inputLiters,
    errorLiters,
  ]);

  // Botões de ação
  const btnSubmit = el(
    "button",
    {
      className: "btn-calc-submit",
      attrs: { type: "submit" },
    },
    [calculatorIcon(), el("span", { text: "Comparar combustíveis" })],
  );

  const btnClear = el(
    "button",
    {
      className: "btn-calc-clear",
      text: "Limpar",
      attrs: { type: "button", title: "Limpar todos os campos" },
    },
  );

  const actions = el("div", { className: "calc-actions" }, [btnSubmit, btnClear]);

  const form = el(
    "form",
    {
      className: "calc-form",
      attrs: {
        id: "calc-form-panel",
        role: "tabpanel",
        "aria-labelledby": "tab-quick",
        novalidate: "",
      },
    },
    [pricesGrid, consumptionGrid, groupLiters, actions],
  );

  // Container de resultados
  const resultsContainer = el("div", {
    className: "calc-results-container",
    attrs: { id: "calc-results", "aria-live": "polite" },
  });
  resultsContainer.hidden = true;

  function clearErrors(): void {
    errorGasPrice.textContent = "";
    errorEthPrice.textContent = "";
    errorGasCons.textContent = "";
    errorEthCons.textContent = "";
    errorLiters.textContent = "";
    inputGasPrice.classList.remove("is-invalid");
    inputEthPrice.classList.remove("is-invalid");
    inputGasCons.classList.remove("is-invalid");
    inputEthCons.classList.remove("is-invalid");
    inputLiters.classList.remove("is-invalid");
  }

  function applyErrors(errors: Record<string, string>): void {
    if (errors.gasolinePrice) {
      errorGasPrice.textContent = errors.gasolinePrice;
      inputGasPrice.classList.add("is-invalid");
    }
    if (errors.ethanolPrice) {
      errorEthPrice.textContent = errors.ethanolPrice;
      inputEthPrice.classList.add("is-invalid");
    }
    if (errors.gasolineConsumption) {
      errorGasCons.textContent = errors.gasolineConsumption;
      inputGasCons.classList.add("is-invalid");
    }
    if (errors.ethanolConsumption) {
      errorEthCons.textContent = errors.ethanolConsumption;
      inputEthCons.classList.add("is-invalid");
    }
    if (errors.liters) {
      errorLiters.textContent = errors.liters;
      inputLiters.classList.add("is-invalid");
    }
  }

  function renderResultView(
    result: QuickModeResult | CustomModeResult,
    simulation: RefuelSimulationResult | null,
  ): void {
    const isQuick = result.mode === "quick";

    // 1. Cabeçalho de recomendação
    let badgeText = "Etanol mais vantajoso";
    let badgeClass = "calc-badge calc-badge-ethanol";

    if (result.recommendation === "gasoline") {
      badgeText = "Gasolina mais vantajosa";
      badgeClass = "calc-badge calc-badge-gasoline";
    } else if (result.recommendation === "equivalent") {
      badgeText = "Custo-benefício equivalente";
      badgeClass = "calc-badge calc-badge-equivalent";
    }

    const badge = el("div", { className: badgeClass }, [checkIcon(), el("span", { text: badgeText })]);
    const explanationText = el("p", { className: "calc-result-explanation", text: result.explanation });

    const recommendationCard = el("div", { className: "calc-recommendation-card" }, [badge, explanationText]);

    // 2. Grid de métricas
    const metricCards: HTMLElement[] = [];

    if (isQuick) {
      const q = result as QuickModeResult;
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Relação de preços" }),
          el("strong", { className: "calc-metric-value", text: formatPercent(q.ratioPercent, 2) }),
          el("span", { className: "calc-metric-sub", text: "do valor da gasolina" }),
        ]),
      );
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Preço limite do etanol" }),
          el("strong", { className: "calc-metric-value", text: formatPrice(q.parityEthanolPrice) }),
          el("span", { className: "calc-metric-sub", text: "ponto de equilíbrio (70%)" }),
        ]),
      );
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Critério utilizado" }),
          el("strong", { className: "calc-metric-value", text: "Regra dos 70%" }),
          el("span", { className: "calc-metric-sub", text: "estimativa padrão de mercado" }),
        ]),
      );
    } else {
      const c = result as CustomModeResult;
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Custo por km (Gasolina)" }),
          el("strong", { className: "calc-metric-value", text: formatCostPerKm(c.gasolineCostPerKm) }),
          el("span", { className: "calc-metric-sub", text: `consumo: ${c.gasolineConsumption.toLocaleString("pt-BR")} km/L` }),
        ]),
      );
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Custo por km (Etanol)" }),
          el("strong", { className: "calc-metric-value", text: formatCostPerKm(c.ethanolCostPerKm) }),
          el("span", { className: "calc-metric-sub", text: `consumo: ${c.ethanolConsumption.toLocaleString("pt-BR")} km/L` }),
        ]),
      );
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Economia a cada 100 km" }),
          el("strong", {
            className: "calc-metric-value calc-metric-highlight",
            text: c.recommendation === "equivalent" ? "R$ 0,00" : formatPrice(c.economyPer100Km),
          }),
          el("span", {
            className: "calc-metric-sub",
            text: c.recommendation === "equivalent" ? "mesmo custo" : `com ${c.recommendation === "ethanol" ? "etanol" : "gasolina"}`,
          }),
        ]),
      );
      metricCards.push(
        el("div", { className: "calc-metric-card" }, [
          el("span", { className: "calc-metric-label", text: "Rendimento real do carro" }),
          el("strong", { className: "calc-metric-value", text: formatPercent(c.vehicleParityPercent, 1) }),
          el("span", { className: "calc-metric-sub", text: "paridade específica do veículo" }),
        ]),
      );
    }

    const metricsGrid = el("div", { className: "calc-metrics-grid" }, metricCards);

    // 3. Simulação de abastecimento (se houver)
    let simulationCard: HTMLElement | null = null;
    if (simulation) {
      const simItems: HTMLElement[] = [
        el("div", { className: "calc-sim-row" }, [
          el("span", { className: "calc-sim-fuel", text: "Custo total com Gasolina:" }),
          el("strong", { className: "calc-sim-price", text: formatPrice(simulation.gasolineTotalCost) }),
        ]),
        el("div", { className: "calc-sim-row" }, [
          el("span", { className: "calc-sim-fuel", text: "Custo total com Etanol:" }),
          el("strong", { className: "calc-sim-price", text: formatPrice(simulation.ethanolTotalCost) }),
        ]),
      ];

      let diffMessage = "";
      if (simulation.cheaperFuel === "equivalent") {
        diffMessage = "Os dois combustíveis resultam no mesmo valor total.";
      } else {
        const cheaperName = simulation.cheaperFuel === "ethanol" ? "etanol" : "gasolina";
        diffMessage = `Diferença de ${formatPrice(simulation.costDifference)} a favor do abastecimento com ${cheaperName}.`;
      }

      simItems.push(
        el("div", { className: "calc-sim-diff" }, [
          el("span", { className: "calc-sim-diff-text", text: diffMessage }),
        ]),
      );

      // Se no modo personalizado, inclui a distância estimada
      if (
        simulation.gasolineDistance !== undefined &&
        simulation.ethanolDistance !== undefined
      ) {
        const distGas = Math.round(simulation.gasolineDistance);
        const distEth = Math.round(simulation.ethanolDistance);
        const distDiff = Math.round(simulation.distanceDifference ?? 0);

        simItems.push(
          el("div", { className: "calc-sim-distance-block" }, [
            el("h4", { className: "calc-sim-distance-title", text: "Distância estimada com esse volume:" }),
            el("div", { className: "calc-sim-distance-grid" }, [
              el("div", { className: "calc-sim-distance-col" }, [
                el("span", { text: "Gasolina:" }),
                el("strong", { text: `${distGas.toLocaleString("pt-BR")} km` }),
              ]),
              el("div", { className: "calc-sim-distance-col" }, [
                el("span", { text: "Etanol:" }),
                el("strong", { text: `${distEth.toLocaleString("pt-BR")} km` }),
              ]),
              el("div", { className: "calc-sim-distance-col" }, [
                el("span", { text: "Diferença:" }),
                el("strong", { text: `${distDiff.toLocaleString("pt-BR")} km` }),
              ]),
            ]),
          ]),
        );
      }

      simulationCard = el("div", { className: "calc-simulation-result-card" }, [
        el("h3", {
          className: "calc-simulation-title",
          text: `Simulação de abastecimento para ${simulation.liters.toLocaleString("pt-BR")} litros`,
        }),
        el("div", { className: "calc-sim-body" }, simItems),
      ]);
    }

    // 4. Nota de rodapé explicativa
    const noteText = isQuick
      ? "Importante: A regra dos 70% é uma estimativa geral de mercado. O consumo real varia conforme o veículo, calibragem dos pneus, peso transportado e trânsito."
      : "Importante: Os resultados acima são estimativas baseadas exclusivamente no consumo e preços informados por você.";

    const note = el("p", { className: "calc-result-note", text: noteText });

    const resultChildren: HTMLElement[] = [recommendationCard, metricsGrid];
    if (simulationCard) {
      resultChildren.push(simulationCard);
    }
    resultChildren.push(note);

    resultsContainer.replaceChildren(...resultChildren);
    resultsContainer.hidden = false;
  }

  function executeCalculation(showValidationFeedback = true): boolean {
    if (showValidationFeedback) {
      clearErrors();
    }

    // Validação da simulação (opcional)
    const simVal = validateSimulationLiters(state.liters);
    if (!simVal.isValid) {
      if (showValidationFeedback) {
        applyErrors(simVal.errors);
      }
      resultsContainer.hidden = true;
      return false;
    }

    if (mode === "quick") {
      const val = validateQuickInput(state.gasolinePrice, state.ethanolPrice);
      if (!val.isValid) {
        if (showValidationFeedback) {
          applyErrors(val.errors);
        }
        resultsContainer.hidden = true;
        return false;
      }

      const quickResult = calculateQuickMode(val.data);
      let simulation: RefuelSimulationResult | null = null;
      if (simVal.data !== null && simVal.data !== undefined) {
        simulation = simulateRefuel({
          gasolinePrice: val.data.gasolinePrice,
          ethanolPrice: val.data.ethanolPrice,
          liters: simVal.data,
        });
      }

      hasCalculated = true;
      renderResultView(quickResult, simulation);
      return true;
    } else {
      const val = validateCustomInput(
        state.gasolinePrice,
        state.ethanolPrice,
        state.gasolineConsumption,
        state.ethanolConsumption,
      );
      if (!val.isValid) {
        if (showValidationFeedback) {
          applyErrors(val.errors);
        }
        resultsContainer.hidden = true;
        return false;
      }

      const customResult = calculateCustomMode(val.data);
      let simulation: RefuelSimulationResult | null = null;
      if (simVal.data !== null && simVal.data !== undefined) {
        simulation = simulateRefuel({
          gasolinePrice: val.data.gasolinePrice,
          ethanolPrice: val.data.ethanolPrice,
          liters: simVal.data,
          gasolineConsumption: val.data.gasolineConsumption,
          ethanolConsumption: val.data.ethanolConsumption,
        });
      }

      hasCalculated = true;
      renderResultView(customResult, simulation);
      return true;
    }
  }

  function handleInputChange(): void {
    state.gasolinePrice = inputGasPrice.value;
    state.ethanolPrice = inputEthPrice.value;
    state.gasolineConsumption = inputGasCons.value;
    state.ethanolConsumption = inputEthCons.value;
    state.liters = inputLiters.value;

    // Se o usuário já calculou anteriormente, recalcula automaticamente para evitar resultados defasados
    if (hasCalculated) {
      executeCalculation(false);
    }
  }

  function switchMode(newMode: CalculatorMode): void {
    if (mode === newMode) return;
    mode = newMode;

    if (mode === "quick") {
      tabQuick.classList.add("is-active");
      tabQuick.setAttribute("aria-selected", "true");
      tabCustom.classList.remove("is-active");
      tabCustom.setAttribute("aria-selected", "false");
      form.setAttribute("aria-labelledby", "tab-quick");
      consumptionGrid.hidden = true;
    } else {
      tabCustom.classList.add("is-active");
      tabCustom.setAttribute("aria-selected", "true");
      tabQuick.classList.remove("is-active");
      tabQuick.setAttribute("aria-selected", "false");
      form.setAttribute("aria-labelledby", "tab-custom");
      consumptionGrid.hidden = false;
    }

    clearErrors();

    // Se já havia calculado, tenta calcular com os novos campos; se faltar dado, oculta resultado para não mostrar modo anterior
    if (hasCalculated) {
      const success = executeCalculation(false);
      if (!success) {
        resultsContainer.hidden = true;
      }
    }
  }

  function clearAll(): void {
    state.gasolinePrice = "";
    state.ethanolPrice = "";
    state.gasolineConsumption = "";
    state.ethanolConsumption = "";
    state.liters = "";

    inputGasPrice.value = "";
    inputEthPrice.value = "";
    inputGasCons.value = "";
    inputEthCons.value = "";
    inputLiters.value = "";

    hasCalculated = false;
    clearErrors();
    resultsContainer.hidden = true;
    resultsContainer.replaceChildren();

    inputGasPrice.focus();
  }

  // Bind events
  tabQuick.addEventListener("click", () => switchMode("quick"));
  tabCustom.addEventListener("click", () => switchMode("custom"));

  inputGasPrice.addEventListener("input", handleInputChange);
  inputEthPrice.addEventListener("input", handleInputChange);
  inputGasCons.addEventListener("input", handleInputChange);
  inputEthCons.addEventListener("input", handleInputChange);
  inputLiters.addEventListener("input", handleInputChange);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    state.gasolinePrice = inputGasPrice.value;
    state.ethanolPrice = inputEthPrice.value;
    state.gasolineConsumption = inputGasCons.value;
    state.ethanolConsumption = inputEthCons.value;
    state.liters = inputLiters.value;

    const success = executeCalculation(true);
    if (success) {
      resultsContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  btnClear.addEventListener("click", clearAll);

  // Montagem no container
  container.replaceChildren(header, tabs, form, resultsContainer);
}

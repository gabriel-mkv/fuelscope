import { loadCurrentPrices } from "./data";
import { formatDate, latestDate } from "./format";

async function init(): Promise<void> {
  const lastCollection = document.querySelector<HTMLElement>("#last-collection");
  const status = document.querySelector<HTMLElement>("#status");
  
  if (!lastCollection || !status) return;

  try {
    const prices = await loadCurrentPrices();
    const latest = latestDate(prices);
    lastCollection.textContent = latest ? formatDate(latest) : "sem dados";
    status.textContent = `${prices.length} preços carregados.`;
  } catch (error) {
    console.error(error);
    lastCollection.textContent = "indisponível";
    status.textContent = "Não foi possível carregar os preços. Tente novamente mais tarde.";
  }
}

void init();
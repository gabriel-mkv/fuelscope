/**
 * Helpers para criação e renderização de ícones SVG.
 */

export function createSvg(html: string): SVGElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as SVGElement;
}

export function chartIcon(): SVGElement {
  return createSvg(`
    <svg class="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 3v18h18"/>
      <path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  `);
}

export function arrowIcon(): SVGElement {
  return createSvg(`
    <svg class="card-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M7 17L17 7"/>
      <path d="M7 7h10v10"/>
    </svg>
  `);
}

export function storeIcon(): SVGElement {
  return createSvg(`
    <svg class="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 21h18"/>
      <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
      <path d="M9 9h1"/>
      <path d="M9 13h1"/>
      <path d="M9 17h1"/>
      <path d="M14 9h1"/>
      <path d="M14 13h1"/>
      <path d="M14 17h1"/>
    </svg>
  `);
}

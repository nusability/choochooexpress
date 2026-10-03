// Tiny DOM helpers (no UI framework — research R11).

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  html = '',
  attrs: Record<string, string> = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function button(className: string, html: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `btn ${className}`, html, { type: 'button', 'aria-label': label });
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  // Keep taps on HUD buttons from reaching the canvas gesture recognizer.
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  return b;
}

export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

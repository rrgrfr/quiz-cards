export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

/**
 * Insert trusted static markup (icons only). User-provided data must never
 * reach this function: it is always rendered through textContent (D-110).
 */
export function staticMarkup(parent: Element, markup: string): void {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  parent.append(template.content);
}

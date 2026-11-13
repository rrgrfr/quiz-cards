import { el } from '../dom';

export function renderMessageScreen(title: string, text: string): HTMLElement {
  const screen = el('section', 'screen');
  const heading = el('h2', 'screen-title');
  heading.textContent = title;
  const note = el('p', 'screen-note');
  note.textContent = text;
  screen.append(heading, note);
  return screen;
}

import { downloadText, timestampedFilename } from '../../infrastructure/download';
import { APP_NAME } from '../../shared/config';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';

export interface CorruptedScreenOptions {
  raw: string;
  status: 'corrupted' | 'unsupported';
  reset: () => void;
}

/** Read-error screen: never overwrite unknown data silently (D-030). */
export function mountCorruptedScreen(root: HTMLElement, options: CorruptedScreenOptions): void {
  const shell = el('div', 'app');

  const header = el('header', 'app-header');
  const appTitle = el('h1', 'app-title');
  appTitle.textContent = APP_NAME;
  header.append(appTitle);

  const main = el('main', 'app-main');
  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.corrupted.title;

  const text = el('p', 'screen-note');
  text.textContent =
    options.status === 'unsupported' ? STRINGS.corrupted.unsupported : STRINGS.corrupted.text;

  const actions = el('div', 'inline-actions');

  const download = el('button', 'primary-button');
  download.type = 'button';
  download.textContent = STRINGS.corrupted.download;
  download.addEventListener('click', () => {
    downloadText(timestampedFilename('pq-state', 'json'), options.raw);
  });

  const reset = el('button', 'secondary-button');
  reset.type = 'button';
  reset.textContent = STRINGS.corrupted.reset;
  reset.addEventListener('click', () => {
    if (window.confirm(STRINGS.corrupted.resetConfirm)) options.reset();
  });

  actions.append(download, reset);
  screen.append(title, text, actions);
  main.append(screen);

  shell.append(header, main);
  root.replaceChildren(shell);
}

import type { Store } from '../../application/store';
import { createBackup, parseBackup } from '../../domain/backup';
import type { ImportIssue } from '../../domain/import-deck';
import { parseDeckFile } from '../../domain/import-deck';
import { LIMITS } from '../../domain/limits';
import { downloadText, timestampedFilename } from '../../infrastructure/download';
import { APP_VERSION } from '../../shared/config';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeIssue, describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';

function createFileInput(onFile: (file: File) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.className = 'file-input';
  input.tabIndex = -1;
  input.setAttribute('aria-hidden', 'true');
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) onFile(file);
  });
  return input;
}

function createIssuePanel(): HTMLElement {
  const panel = el('div', 'issues');
  panel.setAttribute('role', 'alert');
  panel.hidden = true;
  return panel;
}

function renderIssues(panel: HTMLElement, title: string, messages: string[]): void {
  panel.replaceChildren();
  const heading = el('p', 'issues-title');
  heading.textContent = title;
  const list = el('ul', 'issues-list');
  for (const message of messages) {
    const item = el('li');
    item.textContent = message;
    list.append(item);
  }
  panel.append(heading, list);
  panel.hidden = false;
}

function importIssueText(issue: ImportIssue): string {
  const message = describeIssue(issue.code);
  return issue.card ? `Карточка ${issue.card}: ${message}` : message;
}

function createSection(
  title: string,
  description: string,
  action: HTMLButtonElement,
  input: HTMLInputElement | null,
  panel: HTMLElement | null,
): HTMLElement {
  const section = el('section', 'settings-section');
  const heading = el('h3', 'section-title');
  heading.textContent = title;
  const text = el('p', 'screen-note');
  text.textContent = description;
  section.append(heading, text, action);
  if (input) section.append(input);
  if (panel) section.append(panel);
  return section;
}

export function renderSettings(store: Store, nav: Navigation): HTMLElement {
  const state = store.get();

  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.settings.title;

  const importPanel = createIssuePanel();
  const importInput = createFileInput((file) => {
    void handleImport(file);
  });
  const importButton = el('button', 'secondary-button');
  importButton.type = 'button';
  importButton.textContent = STRINGS.settings.importAction;
  importButton.addEventListener('click', () => importInput.click());

  const exportButton = el('button', 'secondary-button');
  exportButton.type = 'button';
  exportButton.textContent = STRINGS.settings.exportAction;
  exportButton.addEventListener('click', () => {
    if (!window.confirm(STRINGS.settings.exportWarning)) return;
    const json = createBackup(state, {
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
    });
    downloadText(timestampedFilename('quiz-backup', 'json'), json);
    showToast(STRINGS.settings.exported);
  });

  const restorePanel = createIssuePanel();
  const restoreInput = createFileInput((file) => {
    void handleRestore(file);
  });
  const restoreButton = el('button', 'secondary-button');
  restoreButton.type = 'button';
  restoreButton.textContent = STRINGS.settings.restoreAction;
  restoreButton.addEventListener('click', () => restoreInput.click());

  async function handleImport(file: File): Promise<void> {
    importPanel.hidden = true;

    if (file.size > LIMITS.importFileBytes) {
      renderIssues(importPanel, STRINGS.settings.importTitle, [STRINGS.issues['file-too-large']]);
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      renderIssues(importPanel, STRINGS.settings.importTitle, [STRINGS.issues.syntax]);
      return;
    }

    const parsed = parseDeckFile(text);
    if (!parsed.ok) {
      renderIssues(importPanel, STRINGS.settings.importTitle, parsed.issues.map(importIssueText));
      return;
    }

    const duplicate = store.get().decks.some((deck) => deck.title === parsed.value.title);
    if (duplicate && !window.confirm(STRINGS.settings.importDuplicate(parsed.value.title))) {
      return;
    }

    const imported = store.importDeck(parsed.value);
    if (!imported.ok) {
      showToast(describeStoreError(imported.error));
      return;
    }

    showToast(STRINGS.settings.importSuccess(parsed.value.title));
    nav.resume({ name: 'deck', deckId: imported.value.id });
  }

  async function handleRestore(file: File): Promise<void> {
    restorePanel.hidden = true;

    let text: string;
    try {
      text = await file.text();
    } catch {
      renderIssues(restorePanel, STRINGS.settings.restoreTitle, [STRINGS.issues.syntax]);
      return;
    }

    const parsed = parseBackup(text);
    if (!parsed.ok) {
      renderIssues(
        restorePanel,
        STRINGS.settings.restoreTitle,
        parsed.issues.map((issue) => describeIssue(issue.code)),
      );
      return;
    }

    const confirmed = window.confirm(
      STRINGS.settings.restoreConfirm(
        parsed.counts.decks,
        parsed.counts.cards,
        parsed.counts.sessions,
      ),
    );
    if (!confirmed) return;

    const restored = store.restore(parsed.state);
    if (!restored.ok) {
      showToast(describeStoreError(restored.error));
      return;
    }
    showToast(STRINGS.settings.restored);
  }

  const statsTitle = el('h3', 'section-title');
  statsTitle.textContent = STRINGS.settings.statsSection;

  const description = el('p', 'screen-note');
  description.textContent = STRINGS.settings.resetDescription;

  const saved = el('p', 'screen-note');
  saved.textContent =
    state.sessions.length === 0
      ? STRINGS.settings.resetEmpty
      : STRINGS.settings.savedSessions(state.sessions.length);

  const reset = el('button', 'danger-button');
  reset.type = 'button';
  reset.textContent = STRINGS.settings.reset;
  reset.addEventListener('click', () => {
    if (!window.confirm(STRINGS.settings.resetConfirm)) return;

    const result = store.resetStatistics();
    if (!result.ok) {
      showToast(describeStoreError(result.error));
      return;
    }
    showToast(STRINGS.settings.resetDone);
  });

  screen.append(
    title,
    createSection(
      STRINGS.settings.importSection,
      STRINGS.settings.importDescription,
      importButton,
      importInput,
      importPanel,
    ),
    createSection(
      STRINGS.settings.exportSection,
      STRINGS.settings.exportDescription,
      exportButton,
      null,
      null,
    ),
    createSection(
      STRINGS.settings.restoreSection,
      STRINGS.settings.restoreDescription,
      restoreButton,
      restoreInput,
      restorePanel,
    ),
    statsTitle,
    description,
    saved,
    reset,
  );

  return screen;
}

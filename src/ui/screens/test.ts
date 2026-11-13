import { TestSession } from '../../application/test-session';
import type { Store } from '../../application/store';
import { findDeck } from '../../domain/entities';
import { createId, nowIso } from '../../domain/ids';
import { STRINGS } from '../../shared/strings';
import { el } from '../dom';
import { describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { clearExitGuard, setExitGuard } from '../navigation-guard';
import { showToast } from '../toast';
import { renderMessageScreen } from './message';

export function renderTest(
  store: Store,
  nav: Navigation,
  deckId: string,
  count: number,
): HTMLElement {
  const state = store.get();
  const deck = findDeck(state, deckId);
  const cards = state.cards.filter((card) => card.deckId === deckId && !card.isArchived);

  if (!deck || deck.isArchived || cards.length === 0) {
    return renderMessageScreen(STRINGS.test.setupTitle, STRINGS.test.noCards);
  }

  const session = new TestSession(deck, cards, count, { now: nowIso, id: createId });

  setExitGuard(() => {
    const confirmed = window.confirm(STRINGS.test.exitConfirm);
    if (confirmed) clearExitGuard();
    return confirmed;
  });

  const screen = el('section', 'screen');

  const progress = el('div', 'progress');
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', String(session.total));
  const progressFill = el('div', 'progress-fill');
  progress.append(progressFill);

  const meta = el('p', 'screen-note');

  const question = el('h2', 'screen-title');

  const answers = el('div', 'answers test-answers');

  const feedback = el('p', 'feedback');
  feedback.hidden = true;

  const explanation = el('p', 'screen-note');
  explanation.hidden = true;

  const next = el('button', 'primary-button');
  next.type = 'button';
  next.hidden = true;

  let finishing = false;

  const updateProgress = (): void => {
    const answered = session.answeredCount;
    progressFill.style.width = `${(answered / session.total) * 100}%`;
    progress.setAttribute('aria-valuenow', String(answered));
    meta.textContent = `${STRINGS.test.question(session.number, session.total)} · ${STRINGS.test.correctSoFar(session.correctCount)}`;
  };

  const finish = (): void => {
    if (finishing) return;
    finishing = true;

    const data = session.buildSession();
    const saved = store.appendSession(data);
    if (!saved.ok) {
      finishing = false;
      showToast(describeStoreError(saved.error));
      return;
    }

    clearExitGuard();
    nav.push({
      name: 'test-result',
      deckId,
      count: session.plannedCount,
      correct: data.correctCount,
      total: data.questionCount,
    });
  };

  const onAnswer = (answerId: string, selected: HTMLButtonElement): void => {
    const result = session.answer(answerId);
    if (!result) return;

    for (const button of answers.querySelectorAll<HTMLButtonElement>('button')) {
      button.disabled = true;
      if (button.dataset.answerId === result.correctAnswerId) button.classList.add('is-correct');
      else if (button === selected) button.classList.add('is-wrong');
    }

    feedback.textContent = result.isCorrect ? STRINGS.test.correct : STRINGS.test.wrong;
    feedback.classList.toggle('is-correct', result.isCorrect);
    feedback.classList.toggle('is-wrong', !result.isCorrect);
    feedback.hidden = false;

    if (result.explanation) {
      explanation.textContent = result.explanation;
      explanation.hidden = false;
    }

    next.textContent = session.isLast ? STRINGS.test.finish : STRINGS.test.next;
    next.hidden = false;

    updateProgress();
  };

  const renderQuestion = (): void => {
    const current = session.current();
    question.textContent = current.card.question;

    const buttons = current.answers.map((answer) => {
      const button = el('button', 'answer-button');
      button.type = 'button';
      button.textContent = answer.text;
      button.dataset.answerId = answer.id;
      button.addEventListener('click', () => {
        onAnswer(answer.id, button);
      });
      return button;
    });

    answers.replaceChildren(...buttons);
    feedback.hidden = true;
    explanation.hidden = true;
    next.hidden = true;
    updateProgress();
  };

  next.addEventListener('click', () => {
    const outcome = session.next();
    if (outcome === 'blocked') return;
    if (outcome === 'finished') {
      finish();
      return;
    }
    renderQuestion();
  });

  renderQuestion();
  screen.append(progress, meta, question, answers, feedback, explanation, next);
  return screen;
}

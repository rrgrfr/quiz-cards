import type { Store } from '../../application/store';
import { findDeck } from '../../domain/entities';
import { LIMITS } from '../../domain/limits';
import { validateCard } from '../../domain/validate';
import { STRINGS } from '../../shared/strings';
import { createField } from '../components/field';
import { el } from '../dom';
import { describeFieldError, describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';
import { renderMessageScreen } from './message';

interface AnswerRow {
  root: HTMLElement;
  radio: HTMLInputElement;
  input: HTMLInputElement;
  setError(message?: string): void;
}

function createAnswerRow(index: number): AnswerRow {
  const root = el('div', 'answer-row');

  const radioLabel = el('label', 'answer-radio');
  const radio = el('input');
  radio.type = 'radio';
  radio.name = 'correct';
  radio.value = String(index);
  radio.setAttribute('aria-label', `${STRINGS.cardForm.correct}: ${index + 1}`);
  radioLabel.append(radio);

  const field = el('label', 'field');
  const label = el('span', 'field-label');
  label.textContent = `${STRINGS.cardForm.answer} ${index + 1}`;
  const input = el('input', 'field-control');
  input.maxLength = LIMITS.answer;
  input.autocomplete = 'off';
  input.autocapitalize = 'none';
  const error = el('span', 'field-error');
  error.hidden = true;
  field.append(label, input, error);

  root.append(radioLabel, field);

  return {
    root,
    radio,
    input,
    setError(message) {
      error.textContent = message ?? '';
      error.hidden = !message;
      field.classList.toggle('is-invalid', Boolean(message));
    },
  };
}

export function renderCardForm(store: Store, nav: Navigation, deckId: string): HTMLElement {
  const deck = findDeck(store.get(), deckId);
  if (!deck || deck.isArchived) {
    return renderMessageScreen(STRINGS.deck.notFound, STRINGS.deck.notFoundText);
  }

  const screen = el('section', 'screen');
  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.cardForm.title;

  const form = el('form', 'form');
  form.noValidate = true;

  const questionField = createField({
    label: STRINGS.cardForm.question,
    placeholder: STRINGS.cardForm.questionPlaceholder,
    maxLength: LIMITS.question,
    multiline: true,
    rows: 3,
  });

  const answersTitle = el('h3', 'section-title');
  answersTitle.textContent = STRINGS.cardForm.answers;
  const answersError = el('p', 'field-error');
  answersError.hidden = true;

  const answerRows = [0, 1, 2, 3].map(createAnswerRow);
  const answersBlock = el('div', 'answers');
  answersBlock.append(answersTitle, answersError, ...answerRows.map((row) => row.root));

  const explanationField = createField({
    label: STRINGS.cardForm.explanation,
    placeholder: STRINGS.cardForm.explanationPlaceholder,
    maxLength: LIMITS.explanation,
    multiline: true,
    rows: 3,
  });

  const actions = el('div', 'inline-actions');
  const submit = el('button', 'primary-button');
  submit.type = 'submit';
  submit.textContent = STRINGS.cardForm.submit;
  const cancel = el('button', 'secondary-button');
  cancel.type = 'button';
  cancel.textContent = STRINGS.common.cancel;
  cancel.addEventListener('click', () => {
    nav.back();
  });
  actions.append(submit, cancel);

  form.append(questionField.root, answersBlock, explanationField.root, actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    questionField.setError();
    explanationField.setError();
    answersError.hidden = true;
    for (const row of answerRows) row.setError();

    const checked = form.querySelector<HTMLInputElement>('input[name="correct"]:checked');
    const correctIndex = checked ? Number(checked.value) : null;

    const result = validateCard({
      question: questionField.control.value,
      answers: answerRows.map((row) => row.input.value),
      correctIndex,
      explanation: explanationField.control.value,
    });

    if (!result.ok) {
      for (const [field, error] of Object.entries(result.errors)) {
        const message = describeFieldError(error);
        if (field === 'question') questionField.setError(message);
        else if (field === 'explanation') explanationField.setError(message);
        else if (field === 'answers') {
          answersError.textContent = message;
          answersError.hidden = false;
        } else if (field === 'correct') {
          answersError.textContent = message;
          answersError.hidden = false;
        } else if (field.startsWith('answer-')) {
          const index = Number(field.slice('answer-'.length));
          answerRows[index]?.setError(message);
        }
      }
      questionField.control.focus();
      return;
    }

    const created = store.createCard(deckId, result.value);
    if (!created.ok) {
      showToast(describeStoreError(created.error));
      return;
    }
    nav.back();
  });

  screen.append(title, form);
  return screen;
}

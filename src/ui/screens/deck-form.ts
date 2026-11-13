import { LIMITS } from '../../domain/limits';
import { validateDeck } from '../../domain/validate';
import type { Store } from '../../application/store';
import { STRINGS } from '../../shared/strings';
import { createField } from '../components/field';
import { el } from '../dom';
import { describeFieldError, describeStoreError } from '../messages';
import type { Navigation } from '../navigation';
import { showToast } from '../toast';

export function renderDeckForm(store: Store, nav: Navigation): HTMLElement {
  const screen = el('section', 'screen');

  const title = el('h2', 'screen-title');
  title.textContent = STRINGS.deckForm.title;

  const form = el('form', 'form');
  form.noValidate = true;

  const nameField = createField({
    label: STRINGS.deckForm.name,
    placeholder: STRINGS.deckForm.namePlaceholder,
    maxLength: LIMITS.deckTitle,
  });
  const descriptionField = createField({
    label: STRINGS.deckForm.description,
    placeholder: STRINGS.deckForm.descriptionPlaceholder,
    maxLength: LIMITS.deckDescription,
    multiline: true,
    rows: 3,
  });

  const actions = el('div', 'inline-actions');
  const submit = el('button', 'primary-button');
  submit.type = 'submit';
  submit.textContent = STRINGS.deckForm.submit;
  const cancel = el('button', 'secondary-button');
  cancel.type = 'button';
  cancel.textContent = STRINGS.common.cancel;
  cancel.addEventListener('click', () => {
    nav.back();
  });

  actions.append(submit, cancel);
  form.append(nameField.root, descriptionField.root, actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    nameField.setError();
    descriptionField.setError();

    const result = validateDeck({
      title: nameField.control.value,
      description: descriptionField.control.value,
    });

    if (!result.ok) {
      for (const [field, error] of Object.entries(result.errors)) {
        const target = field === 'title' ? nameField : descriptionField;
        target.setError(describeFieldError(error));
      }
      nameField.control.focus();
      return;
    }

    const created = store.createDeck(result.value);
    if (!created.ok) {
      showToast(describeStoreError(created.error));
      return;
    }
    nav.back();
  });

  screen.append(title, form);
  return screen;
}

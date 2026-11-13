import { el } from '../dom';

export interface FieldOptions {
  label: string;
  value?: string;
  placeholder?: string;
  maxLength: number;
  multiline?: boolean;
  rows?: number;
  inputMode?: 'text' | 'none';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: string;
}

export interface Field {
  root: HTMLElement;
  control: HTMLInputElement | HTMLTextAreaElement;
  setError(message?: string): void;
}

export function createField(options: FieldOptions): Field {
  const root = el('label', 'field');

  const label = el('span', 'field-label');
  label.textContent = options.label;

  const control = options.multiline
    ? el('textarea', 'field-control')
    : el('input', 'field-control');
  control.value = options.value ?? '';
  control.placeholder = options.placeholder ?? '';
  control.maxLength = options.maxLength;
  control.setAttribute('autocapitalize', options.autoCapitalize ?? 'sentences');
  control.setAttribute('autocomplete', options.autoComplete ?? 'off');
  if (options.inputMode) control.setAttribute('inputmode', options.inputMode);
  if (control instanceof HTMLTextAreaElement) control.rows = options.rows ?? 3;

  const error = el('span', 'field-error');
  error.hidden = true;

  root.append(label, control, error);

  return {
    root,
    control,
    setError(message) {
      error.textContent = message ?? '';
      error.hidden = !message;
      root.classList.toggle('is-invalid', Boolean(message));
    },
  };
}

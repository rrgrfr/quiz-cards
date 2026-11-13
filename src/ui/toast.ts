export interface ToastAction {
  label: string;
  onClick: () => void;
}

let current: HTMLElement | null = null;
let hideTimer: number | undefined;

/** Show a transient message; an action keeps it on screen until tapped. */
export function showToast(message: string, action?: ToastAction): void {
  current?.remove();
  if (hideTimer !== undefined) {
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  toast.append(text);

  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      toast.remove();
      if (current === toast) current = null;
      action.onClick();
    });
    toast.append(button);
  } else {
    hideTimer = window.setTimeout(() => {
      toast.remove();
      if (current === toast) current = null;
    }, 4000);
  }

  current = toast;
  document.body.append(toast);
}

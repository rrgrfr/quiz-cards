import { STRINGS } from '../shared/strings';
import { showToast } from '../ui/toast';

/** Register the service worker and offer updates (D-100…D-103). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    void setup();
  });
}

async function setup(): Promise<void> {
  let registration: ServiceWorkerRegistration;

  try {
    registration = await navigator.serviceWorker.register('./sw.js');
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return;
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed') return;
      if (!navigator.serviceWorker.controller) return;

      showToast(STRINGS.update.message, {
        label: STRINGS.update.action,
        onClick: () => {
          installing.postMessage({ type: 'SKIP_WAITING' });
        },
      });
    });
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

import { STRINGS } from '../shared/strings';

/** Offline indicator for iPhone Safari (D-104). */
export function initNetworkBanner(): void {
  const banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.setAttribute('role', 'status');
  banner.textContent = STRINGS.offline;
  banner.hidden = navigator.onLine;
  document.body.append(banner);

  const update = (): void => {
    banner.hidden = navigator.onLine;
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
}

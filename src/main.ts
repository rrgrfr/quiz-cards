import './ui/styles.css';
import { Store } from './application/store';
import { initNetworkBanner } from './infrastructure/network';
import { registerServiceWorker } from './infrastructure/sw-register';
import { createLocalStorageAdapter } from './infrastructure/storage';
import { mountCorruptedScreen } from './ui/screens/corrupted';
import { mountApp } from './ui/shell';

const root = document.getElementById('app');

if (!root) {
  throw new Error('App root is missing');
}

const adapter = createLocalStorageAdapter(window.localStorage);
const loaded = adapter.load();

if (loaded.status === 'ok') {
  mountApp(root, new Store(adapter, loaded.state));
} else {
  mountCorruptedScreen(root, {
    raw: loaded.raw,
    status: loaded.status,
    reset: () => {
      adapter.clear();
      window.location.reload();
    },
  });
}

initNetworkBanner();
registerServiceWorker();

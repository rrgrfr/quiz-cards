import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { buildSwSource, collectFiles, contentVersion } from './build/sw';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
  "connect-src 'self'; manifest-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'none'";

function serviceWorkerPlugin(): Plugin {
  let distDir = '';

  return {
    name: 'dsh-service-worker',
    apply: 'build',
    configResolved(config) {
      distDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const files = collectFiles(distDir);
      const version = contentVersion(distDir, files);
      writeFileSync(resolve(distDir, 'sw.js'), buildSwSource(files, version), 'utf8');
      this.info(`service worker: ${files.length} files, version ${version}`);
    },
  };
}

function cspPlugin(): Plugin {
  return {
    name: 'dsh-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`;
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorkerPlugin(), cspPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
  },
});

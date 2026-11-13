import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildSwSource, collectFiles, contentVersion } from '../../build/sw';

describe('service worker generation', () => {
  const dirs: string[] = [];

  function makeTree(): string {
    const dir = mkdtempSync(join(tmpdir(), 'pq-sw-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>t</title>');
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
    writeFileSync(join(dir, 'sw.js'), 'old worker');
    return dir;
  }

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('collects nested files sorted and skips sw.js', () => {
    const dir = makeTree();

    expect(collectFiles(dir)).toEqual(['assets/app-abc123.js', 'index.html']);
  });

  it('derives a stable version that changes with content', () => {
    const dir = makeTree();
    const files = collectFiles(dir);
    const first = contentVersion(dir, files);
    const second = contentVersion(dir, files);

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{12}$/);

    writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(2)');

    expect(contentVersion(dir, files)).not.toBe(first);
  });

  it('embeds the version and every precache entry', () => {
    const source = buildSwSource(['index.html', 'assets/app-abc123.js'], 'abc123def456');

    expect(source).toContain('const VERSION = "abc123def456";');
    expect(source).toContain('"./"');
    expect(source).toContain('"./index.html"');
    expect(source).toContain('"./assets/app-abc123.js"');
    expect(source).toContain('SKIP_WAITING');
    expect(source).toContain("request.mode === 'navigate'");
  });
});

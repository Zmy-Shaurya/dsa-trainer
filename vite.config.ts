/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Emits sw.js with the build's file list as the precache; its version changes whenever any file does. */
function serviceWorker(): Plugin {
  return {
    name: 'dsa-sw',
    apply: 'build',
    generateBundle(_o, bundle) {
      const files = Object.keys(bundle);
      const hash = createHash('sha1');
      for (const f of files) {
        const c = bundle[f]!;
        hash.update(f).update('code' in c ? c.code : c.type === 'asset' ? c.source : '');
      }
      const precache = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './content/index.json', ...files.map((f) => `./${f}`)];
      const tpl = readFileSync('scripts/sw-template.js', 'utf8');
      const src = tpl
        .replace('__VERSION__', hash.update(tpl).digest('hex').slice(0, 12))
        .replace('__PRECACHE__', JSON.stringify([...new Set(precache)]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],
  base: './',
  test: { include: ['tests/unit/**/*.test.ts', 'tests/content/**/*.test.ts'], environment: 'node' },
});

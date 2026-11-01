import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(`src/theme/${f}`, 'utf8');
const tokens = read('tokens.css');
const all = tokens + read('global.css');
const defined = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

describe('theme tokens', () => {
  it('defines every custom property that the stylesheets use', () => {
    const used = new Set([...all.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!));
    const missing = [...used].filter((v) => !defined.has(v));
    expect(missing).toEqual([]);
  });

  it('gives the dark theme its own surface, text and accent', () => {
    const dark = tokens.slice(tokens.indexOf(':root[data-theme="dark"]'));
    for (const t of ['--bg', '--surface', '--text', '--muted', '--accent', '--border']) expect(dark).toContain(`${t}:`);
  });
});

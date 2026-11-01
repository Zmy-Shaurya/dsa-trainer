// npm run company:import -- <path-to-local-clone> [--repo URL] [--commit HASH] [--license SPDX] [--as-of YYYY-MM-DD]
// Converts a company-wise CSV dataset into content/companies/<id>.json (PRD 19). Nothing is downloaded.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildCompanies, countsOf } from '../src/domain/companies.ts';
import { knownProblemIds } from './tools-lib.ts';
import { loadConcepts, loadProblems, loadSheets, ROOT } from './content-lib.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const dir = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
  console.error('usage: npm run company:import -- <path-to-local-clone> [--repo URL] [--commit HASH] [--license SPDX] [--as-of YYYY-MM-DD]');
  process.exit(1);
}
const root = resolve(dir);

/** Licence gate: read the repo's own LICENSE before deciding what may be committed. */
function detectLicense(): string {
  const file = readdirSync(root).find((f) => /^(licen[sc]e|copying)(\.|$)/i.test(f));
  if (!file) return 'none';
  const t = readFileSync(join(root, file), 'utf8').slice(0, 4000).toLowerCase();
  if (t.includes('mit license') || t.includes('permission is hereby granted, free of charge')) return 'MIT';
  if (t.includes('apache license')) return 'Apache-2.0';
  if (t.includes('creative commons') && t.includes('attribution') && !t.includes('noncommercial')) return 'CC-BY';
  if (t.includes('redistribution and use in source and binary forms')) return 'BSD';
  if (t.includes('unlicense') || t.includes('cc0')) return 'public-domain';
  return 'other';
}
const PERMISSIVE = new Set(['MIT', 'Apache-2.0', 'CC-BY', 'BSD', 'public-domain']);
const found = detectLicense();
const license = flag('license') ?? found;

const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const files = walk(root).filter((f) => f.toLowerCase().endsWith('.csv'))
  .map((f) => ({ path: relative(root, f).replace(/\\/g, '/'), text: readFileSync(f, 'utf8') }));

const known = knownProblemIds(loadProblems(), loadSheets(), loadConcepts());
const repo = flag('repo') ?? 'local clone';
const source = { repo, license, ...(flag('commit') ? { commit: flag('commit')! } : {}) };
const { companies, skippedRows, ignored } = buildCompanies(files, {
  isKnown: (id) => known.has(id), asOf: flag('as-of') ?? new Date().toISOString().slice(0, 10), source,
});

const out = join(ROOT, 'companies');
mkdirSync(out, { recursive: true });
for (const c of companies) writeFileSync(join(out, `${c.id}.json`), JSON.stringify(c, null, 1));
writeFileSync(join(out, '_source.json'), JSON.stringify({ ...source, detectedLicense: found, importedAt: new Date().toISOString() }, null, 1));

console.log(`${companies.length} companies written to content/companies/ (${files.length} CSV files, ${skippedRows} rows without a problem slug skipped, ${ignored.length} files ignored).`);
for (const c of companies.slice(0, 5)) console.log(`  ${c.id}: ${JSON.stringify(countsOf(c))}`);
if (ignored.length) console.log(`  ignored (no CSV or no time window in the name): ${ignored.slice(0, 3).join(', ')}${ignored.length > 3 ? ', ...' : ''}`);
if (PERMISSIVE.has(license)) {
  console.log(`\nLicence: ${license}. The converted data MAY be committed. If you do: remove content/companies/ from .gitignore,`);
  console.log('add the repo, commit and licence to THIRD_PARTY.md, and keep the attribution on the in-app Credits page.');
} else {
  console.log(`\nLicence: ${license === 'none' ? 'none found' : license}. Do NOT commit or publish this data; content/companies/ is git-ignored, and so is public/content.`);
  console.log('Friends can load their own copy with the Company import on the Companies page.');
}

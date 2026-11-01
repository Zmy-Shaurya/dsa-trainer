// Compile and run every Java/C++ approach against tests.json (PRD §8.15).
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadProblems, folderOf } from './content-lib.ts';
import { cppMain, equal, isGen, javaMain, normalize, parseLine, type Case, type Json } from './verify-lib.ts';

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--'));
const useCache = !args.includes('--no-cache');
const CACHE = join(ROOT, '..', '.verify-cache.json');
const DRIVER_VERSION = 'v1';
const WORK = join(tmpdir(), 'dsa-verify');

// ---------- toolchain discovery ----------
const exe = (n: string) => (process.platform === 'win32' ? `${n}.exe` : n);
function candidates(tool: 'javac' | 'java' | 'g++'): string[] {
  const env = process.env[tool === 'g++' ? 'GXX' : tool.toUpperCase()];
  const out: string[] = env ? [env] : [];
  const pathDirs = (process.env.PATH ?? '').split(process.platform === 'win32' ? ';' : ':');
  out.push(...pathDirs.map((d) => join(d, exe(tool))));
  if (process.platform === 'win32') {
    const pf = process.env['ProgramFiles'] ?? 'C:\\Program Files';
    for (const root of [join(pf, 'Microsoft'), join(pf, 'Java'), join(pf, 'Eclipse Adoptium')])
      if (existsSync(root)) for (const d of readdirSync(root)) if (/jdk/i.test(d)) out.push(join(root, d, 'bin', exe(tool)));
    const pk = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
    if (existsSync(pk))
      for (const d of readdirSync(pk)) if (/WinLibs/i.test(d)) out.push(join(pk, d, 'mingw64', 'bin', exe(tool)));
  }
  return out.filter((p) => existsSync(p));
}
const found = (t: 'javac' | 'java' | 'g++') => candidates(t)[0];
const tools = { javac: found('javac'), java: found('java'), gxx: found('g++') };
const missing: string[] = [];
if (!tools.javac) missing.push('JDK 17+ (javac): winget install Microsoft.OpenJDK.17');
if (!tools.gxx) missing.push('g++ with C++17: winget install BrechtSanders.WinLibs.POSIX.UCRT');
if (missing.length) {
  console.error(`content:verify needs:\n${missing.map((m) => `  - ${m}`).join('\n')}\n(or set JAVAC / GXX env vars)`);
  process.exit(2);
}
// Run with the java that ships beside javac; a different java on PATH may be older than the classes.
const sibling = join(tools.javac!, '..', exe('java'));
const javaBin = existsSync(sibling) ? sibling : (tools.java ?? 'java');

// ---------- helpers ----------
interface Run { code: number | null; stdout: string; stderr: string; ms: number; timedOut: boolean }
const run = (file: string, argv: string[], cwd: string, timeout: number): Promise<Run> =>
  new Promise((resolve) => {
    const t0 = Date.now();
    execFile(file, argv, { cwd, timeout, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      const e = err as (NodeJS.ErrnoException & { killed?: boolean }) | null;
      resolve({ code: e ? (typeof e.code === 'number' ? e.code : 1) : 0, stdout, stderr, ms: Date.now() - t0, timedOut: !!e?.killed });
    });
  });
const sha = (...parts: string[]) => createHash('sha1').update(parts.join('\u0000')).digest('hex');
const harnessHash = sha(...['java/ListNode.java', 'java/TreeNode.java', 'java/Out.java', 'cpp/harness.h'].map((f) => readFileSync(join(ROOT, '_harness', f), 'utf8')));

type Cache = Record<string, { genOut: string[] }>;
const cache: Cache = useCache && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

// ---------- one (problem, approach, language) ----------
interface Result { problem: string; approach: string; lang: 'java' | 'cpp'; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string; genOut: string[]; warnings: number }

async function verifyOne(
  p: ReturnType<typeof loadProblems>[number], ap: NonNullable<typeof p.meta.approaches>[number], lang: 'java' | 'cpp', cases: Case[],
): Promise<Result> {
  const sig = p.meta.signature!;
  const base: Omit<Result, 'status' | 'detail'> = { problem: p.meta.id, approach: ap.id, lang, genOut: [], warnings: 0 };
  const src = readFileSync(join(p.dir, ap.files[lang]), 'utf8');
  const mine = cases.filter((c) => !c.skipApproaches?.includes(ap.id));
  const cacheKey = sha(DRIVER_VERSION, harnessHash, lang, src, JSON.stringify(sig), JSON.stringify(cases), ap.id);
  const hit = cache[cacheKey];
  if (hit) return { ...base, status: 'PASS', detail: 'cached', genOut: hit.genOut };

  const dir = join(WORK, folderOf(p.meta.id), `${ap.id}-${lang}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  let outLines: string[];
  let ms: number;
  if (lang === 'java') {
    for (const f of ['ListNode.java', 'TreeNode.java', 'Out.java']) cpSync(join(ROOT, '_harness', 'java', f), join(dir, f));
    writeFileSync(join(dir, 'Solution.java'), src);
    writeFileSync(join(dir, 'Main.java'), javaMain(sig, cases, ap.id));
    const c = await run(tools.javac!, ['-encoding', 'UTF-8', '-d', 'out', 'Solution.java', 'Main.java', 'ListNode.java', 'TreeNode.java', 'Out.java'], dir, 120_000);
    if (c.code !== 0) return { ...base, status: 'FAIL', detail: `javac: ${c.stderr.trim().split('\n').slice(0, 4).join(' | ')}` };
    const r = await run(javaBin, ['-cp', 'out', 'Main'], dir, 60_000);
    if (r.timedOut) return { ...base, status: 'FAIL', detail: 'timed out' };
    outLines = r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    ms = r.ms;
  } else {
    writeFileSync(join(dir, 'main.cpp'), `#include "harness.h"\n${src}\n${cppMain(sig, cases, ap.id)}`);
    const c = await run(tools.gxx!, ['-std=c++17', '-O2', '-Wall', '-Wextra', '-o', 'main', 'main.cpp', `-I${join(ROOT, '_harness', 'cpp')}`], dir, 180_000);
    if (c.code !== 0) return { ...base, status: 'FAIL', detail: `g++: ${c.stderr.trim().split('\n').filter((l) => /error/.test(l)).slice(0, 3).join(' | ')}` };
    base.warnings = (c.stderr.match(/warning:/g) ?? []).length;
    const r = await run(join(dir, exe('main')), [], dir, 60_000);
    if (r.timedOut) return { ...base, status: 'FAIL', detail: 'timed out' };
    outLines = r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    ms = r.ms;
  }

  if (outLines.length !== mine.length) return { ...base, status: 'FAIL', detail: `expected ${mine.length} output lines, got ${outLines.length}` };
  const genOut: string[] = [];
  let checker: ((i: unknown, o: unknown) => boolean) | undefined;
  if (sig.compare === 'checker') checker = (await import(pathToFileURL(join(p.dir, 'checker.mjs')).href)).default;
  for (let i = 0; i < mine.length; i++) {
    const c = mine[i]!;
    const got = parseLine(outLines[i]!);
    if (got instanceof Error) return { ...base, status: 'FAIL', detail: `case ${i + 1}: ${got.message}` };
    if (isGen(c)) {
      genOut.push(JSON.stringify(normalize(got, sig.compare)));
      continue;
    }
    const ok = checker ? checker(c.args, got) : equal(got, c.expected as Json, sig.compare);
    if (!ok) return { ...base, status: 'FAIL', detail: `case ${i + 1}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(got)}` };
  }
  // ponytail: wall-clock ceiling (JVM start included) instead of per-case timing; tighten if it misses a slow O(n^2).
  if (/^O\((1|log n|n|n log n)\)$/.test(ap.time) && mine.some(isGen) && ms > 5000)
    return { ...base, status: 'FAIL', detail: `claims ${ap.time} but took ${ms} ms on the large case` };
  cache[cacheKey] = { genOut };
  return { ...base, status: 'PASS', detail: `${ms} ms`, genOut };
}

// ---------- main ----------
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = Array.from({ length: items.length });
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  }));
  return out;
}

const problems = loadProblems().filter((p) => p.meta.tier <= 2 && p.meta.approaches?.length && (!only || p.meta.id === only));
if (problems.length === 0) {
  console.log('content:verify — nothing to verify.');
  process.exit(0);
}

const tasks: (() => Promise<Result>)[] = [];
for (const p of problems) {
  const cases = (JSON.parse(readFileSync(join(p.dir, 'tests.json'), 'utf8')) as { cases: Case[] }).cases;
  for (const ap of p.meta.approaches!) for (const lang of ['java', 'cpp'] as const) tasks.push(() => verifyOne(p, ap, lang, cases));
}

const results = await pool(tasks, 4, (t) => t());

// Differential check on generated cases: every approach/language must agree.
for (const p of problems) {
  const rs = results.filter((r) => r.problem === p.meta.id && r.status === 'PASS' && r.genOut.length);
  const ref = rs[0];
  if (!ref) continue;
  for (const r of rs) {
    if (JSON.stringify(r.genOut) !== JSON.stringify(ref.genOut)) {
      r.status = 'FAIL';
      r.detail = `generated-case output differs from ${ref.approach}/${ref.lang}`;
    }
  }
}

writeFileSync(CACHE, JSON.stringify(cache));
let fails = 0;
let warns = 0;
for (const r of results) {
  if (r.status === 'FAIL') fails++;
  warns += r.warnings;
  console.log(`${r.status.padEnd(4)}  ${r.problem} / ${r.approach} / ${r.lang}${r.status === 'FAIL' ? `  ${r.detail}` : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed, ${fails} failed${warns ? `, ${warns} C++ warnings` : ''}`);
process.exit(fails ? 1 : 0);

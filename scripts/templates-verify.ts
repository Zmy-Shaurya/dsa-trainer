// Compile-checks every template: `javac` for Java and `g++ -fsyntax-only -std=c++17` for C++ (PRD 16.2).
import { execFile } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTemplates } from './tools-lib.ts';
import { tools } from './toolchain.ts';

const missing: string[] = [];
if (!tools.javac) missing.push('JDK 17+ (javac): winget install Microsoft.OpenJDK.17');
if (!tools.gxx) missing.push('g++ with C++17: winget install BrechtSanders.WinLibs.POSIX.UCRT');
if (missing.length) {
  console.error(`templates:verify needs:\n${missing.map((m) => `  - ${m}`).join('\n')}\n(or set JAVAC / GXX env vars)`);
  process.exit(2);
}

const WORK = join(tmpdir(), 'dsa-templates');
rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, 'java'), { recursive: true });
mkdirSync(join(WORK, 'cpp'), { recursive: true });

const run = (file: string, argv: string[], cwd: string) =>
  new Promise<{ ok: boolean; out: string }>((resolve) =>
    execFile(file, argv, { cwd, timeout: 120_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) =>
      resolve({ ok: !err, out: `${stdout}${stderr}` })));

const items = loadTemplates().flatMap((p) => p.variants.map((v) => ({ name: `${p.id}/${v.id}`, v })));
const failures: string[] = [];

// Java: one javac run over every file; each template is a class body.
const javaFiles = items.map(({ name, v }, i) => {
  const file = `T${i}.java`;
  writeFileSync(join(WORK, 'java', file), `import java.util.*;\nimport java.io.*;\npublic class T${i} {\n${v.java}\n}\n`);
  return { name, file };
});
const j = await run(tools.javac!, ['-Xlint:-options', '-d', 'out', ...javaFiles.map((f) => f.file)], join(WORK, 'java'));
if (!j.ok) {
  for (const f of javaFiles) if (j.out.includes(f.file)) failures.push(`java ${f.name}`);
  console.error(j.out);
}

// C++: syntax check per template, a few at a time.
const cppFiles = items.map(({ name, v }, i) => {
  const file = `t${i}.cpp`;
  const main = /\bint main\s*\(/.test(v.cpp) ? '' : '\nint main() {}\n';
  writeFileSync(join(WORK, 'cpp', file), `#include <bits/stdc++.h>\nusing namespace std;\n${v.cpp}\n${main}`);
  return { name, file };
});
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < cppFiles.length) {
    const f = cppFiles[next++]!;
    const r = await run(tools.gxx!, ['-std=c++17', '-fsyntax-only', '-Wall', f.file], join(WORK, 'cpp'));
    if (!r.ok) {
      failures.push(`cpp ${f.name}`);
      console.error(`--- ${f.name}\n${r.out}`);
    }
  }
}));

if (failures.length) {
  console.error(`templates failed to compile: ${failures.join(', ')}`);
  process.exit(1);
}
console.log(`templates ok: ${items.length} templates compile in Java and C++`);

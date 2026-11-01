// Finds javac, java and g++ (PATH, JAVAC/JAVA/GXX env vars, or the usual Windows install dirs).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const exe = (n: string) => (process.platform === 'win32' ? `${n}.exe` : n);
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
export const tools = { javac: found('javac'), java: found('java'), gxx: found('g++') };


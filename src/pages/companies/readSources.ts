import { strFromU8, unzipSync } from 'fflate';
import type { SourceFile } from '../../domain/companies';

const WANTED = /\.(csv|json)$/i;

/** Picked files (CSV, JSON, zip, or a whole folder) as text with folder-style paths. Nothing leaves the device. */
export async function readSources(files: File[]): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  for (const f of files) {
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    if (/\.zip$/i.test(f.name)) {
      // only CSV/JSON entries are inflated, and none over 20 MB
      const z = unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (e) => WANTED.test(e.name) && !e.name.includes('__MACOSX') && e.originalSize < 20e6 });
      for (const [p, bytes] of Object.entries(z)) out.push({ path: p, text: strFromU8(bytes) });
    } else if (WANTED.test(f.name)) out.push({ path, text: await f.text() });
  }
  return out;
}

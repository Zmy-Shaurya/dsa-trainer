// Driver generation and output comparison for content:verify (PRD §8.15). Pure: no I/O.
import type { ParamType, Signature } from '../src/content/types.ts';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface Case {
  args?: Record<string, Json>;
  expected?: Json;
  // design problems
  ops?: string[];
  gen?: 'random-int-array';
  n?: number;
  seed?: number;
  range?: [number, number];
  arg?: string;
  fixed?: Record<string, Json>;
  skipApproaches?: string[];
}

const arr = (v: Json) => v as Json[];

// ---------- Java literals ----------
export function javaLit(type: ParamType, v: Json): string {
  const nums = (a: Json) => arr(a).join(',');
  switch (type) {
    case 'int': return String(v);
    case 'long': return `${v}L`;
    case 'double': return String(v);
    case 'boolean': return String(v);
    case 'string': return JSON.stringify(v);
    case 'char': return `'${v}'`;
    case 'int[]': return `new int[]{${nums(v)}}`;
    case 'long[]': return `new long[]{${arr(v).map((x) => `${x}L`).join(',')}}`;
    case 'double[]': return `new double[]{${nums(v)}}`;
    case 'string[]': return `new String[]{${arr(v).map((x) => JSON.stringify(x)).join(',')}}`;
    case 'char[]': return `new char[]{${[...String(v)].map((c) => `'${c}'`).join(',')}}`;
    case 'int[][]': return `new int[][]{${arr(v).map((r) => `{${nums(r)}}`).join(',')}}`;
    case 'string[][]': return `new String[][]{${arr(v).map((r) => `{${arr(r).map((x) => JSON.stringify(x)).join(',')}}`).join(',')}}`;
    case 'char[][]': return `new char[][]{${arr(v).map((r) => `{${[...String(r)].map((c) => `'${c}'`).join(',')}}`).join(',')}}`;
    case 'ListNode': {
      const o = Array.isArray(v) ? { values: v, pos: -1 } : (v as { values: Json[]; pos: number });
      return `Out.list(new int[]{${nums(o.values)}}, ${o.pos ?? -1})`;
    }
    case 'TreeNode': return `Out.tree(new Integer[]{${arr(v).map((x) => (x === null ? 'null' : String(x))).join(',')}})`;
    default: throw new Error(`unsupported java param type ${type}`);
  }
}

// ---------- C++ declarations: `decl(name)` returns a statement declaring the variable ----------
export function cppDecl(type: ParamType, name: string, v: Json): string {
  const vec = (t: string, items: string[]) => (items.length ? `std::vector<${t}> ${name} = {${items.join(',')}};` : `std::vector<${t}> ${name};`);
  const q = (x: Json) => JSON.stringify(x);
  const nested = (inner: string, rows: Json[], cell: (x: Json) => string) =>
    rows.length
      ? `std::vector<std::vector<${inner}>> ${name} = {${rows.map((r) => `std::vector<${inner}>{${arr(r).map(cell).join(',')}}`).join(',')}};`
      : `std::vector<std::vector<${inner}>> ${name};`;
  switch (type) {
    case 'int': return `int ${name} = ${v};`;
    case 'long': return `long long ${name} = ${v}LL;`;
    case 'double': return `double ${name} = ${v};`;
    case 'boolean': return `bool ${name} = ${v};`;
    case 'string': return `std::string ${name} = ${q(v)};`;
    case 'char': return `char ${name} = '${v}';`;
    case 'int[]': return vec('int', arr(v).map(String));
    case 'long[]': return vec('long long', arr(v).map((x) => `${x}LL`));
    case 'double[]': return vec('double', arr(v).map(String));
    case 'string[]': return vec('std::string', arr(v).map((x) => q(x)));
    case 'char[]': return vec('char', [...String(v)].map((c) => `'${c}'`));
    case 'int[][]': return nested('int', arr(v), String);
    case 'string[][]': return nested('std::string', arr(v), (x) => q(x));
    case 'char[][]': return nested('char', arr(v).map((r) => [...String(r)] as Json), (x) => `'${x}'`);
    case 'ListNode': {
      const o = Array.isArray(v) ? { values: v, pos: -1 } : (v as { values: Json[]; pos: number });
      return `ListNode* ${name} = buildList(std::vector<int>{${arr(o.values).join(',')}}, ${o.pos ?? -1});`;
    }
    case 'TreeNode': return `TreeNode* ${name} = buildTree(std::vector<int>{${arr(v).map((x) => (x === null ? 'INT_MIN' : String(x))).join(',')}});`;
    default: throw new Error(`unsupported c++ param type ${type}`);
  }
}

// ---------- Drivers ----------
function genJava(c: Case, name: string): string {
  const [lo, hi] = c.range ?? [-1000, 1000];
  return `long x = ${c.seed ?? 1}L; int[] ${name} = new int[${c.n}];
        for (int i = 0; i < ${c.n}; i++) { x = x * 6364136223846793005L + 1442695040888963407L; ${name}[i] = ${lo} + (int) ((x >>> 33) % ${hi - lo + 1}L); }`;
}
function genCpp(c: Case, name: string): string {
  const [lo, hi] = c.range ?? [-1000, 1000];
  return `uint64_t x = ${c.seed ?? 1}ULL; std::vector<int> ${name}(${c.n});
        for (int i = 0; i < ${c.n}; i++) { x = x * 6364136223846793005ULL + 1442695040888963407ULL; ${name}[i] = ${lo} + (int) ((x >> 33) % ${hi - lo + 1}ULL); }`;
}

export function isGen(c: Case) {
  return c.gen !== undefined;
}

export function javaMain(sig: Signature, cases: Case[], skip: string): string {
  const body = cases.map((c) => {
    if (c.skipApproaches?.includes(skip)) return '';
    if (sig.kind === 'design') {
      const cls = c.ops![0]!;
      const lines = c.ops!.slice(1).map((op, i) => {
        const a = arr(c.args![i + 1] as Json).join(',');
        return (c.expected as Json[])[i + 1] === null ? `o.${op}(${a}); r.add(null);` : `r.add(o.${op}(${a}));`;
      });
      return `{ try { ${cls} o = new ${cls}(${arr(c.args![0] as Json).join(',')}); List<Object> r = new ArrayList<>(); r.add(null);
        ${lines.join('\n        ')}
        System.out.println(Out.str(r)); } catch (Throwable t) { System.out.println("ERROR " + t); } }`;
    }
    const decls: string[] = [];
    const call: string[] = [];
    sig.params.forEach((p, i) => {
      const v = `a${i}`;
      if (c.gen && (c.arg ?? sig.params[0]!.name) === p.name) decls.push(genJava(c, v));
      else decls.push(`${javaType(p.type)} ${v} = ${javaLit(p.type, (c.gen ? c.fixed : c.args)![p.name] as Json)};`);
      call.push(v);
    });
    const rt = sig.returns === 'ListNode' || sig.returns === 'TreeNode' ? sig.returns : 'Object';   // typed so null prints as []
    return `{ try { ${decls.join(' ')} ${rt} r = new Solution().${sig.name}(${call.join(', ')}); System.out.println(Out.str(r)); } catch (Throwable t) { System.out.println("ERROR " + t); } }`;
  });
  return `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        ${body.filter(Boolean).join('\n        ')}\n    }\n}\n`;
}

export function cppMain(sig: Signature, cases: Case[], skip: string): string {
  const body = cases.map((c) => {
    if (c.skipApproaches?.includes(skip)) return '';
    if (sig.kind === 'design') {
      const cls = c.ops![0]!;
      const lines = c.ops!.slice(1).map((op, i) => {
        const a = arr(c.args![i + 1] as Json).join(',');
        return (c.expected as Json[])[i + 1] === null ? `o.${op}(${a}); r.push_back("null");` : `r.push_back(str(o.${op}(${a})));`;
      });
      const ctorArgs = arr(c.args![0] as Json).join(',');
      return `{ try { ${cls} o${ctorArgs ? `(${ctorArgs})` : ''}; std::vector<std::string> r{"null"};
        ${lines.join('\n        ')}
        std::string out = "["; for (size_t i = 0; i < r.size(); i++) out += (i ? "," : "") + r[i];
        std::cout << out << "]\\n"; } catch (const std::exception& e) { std::cout << "ERROR " << e.what() << "\\n"; } }`;
    }
    const decls: string[] = [];
    const call: string[] = [];
    sig.params.forEach((p, i) => {
      const v = `a${i}`;
      if (c.gen && (c.arg ?? sig.params[0]!.name) === p.name) decls.push(genCpp(c, v));
      else decls.push(cppDecl(p.type, v, (c.gen ? c.fixed : c.args)![p.name] as Json));
      call.push(v);
    });
    return `{ try { ${decls.join(' ')} auto r = Solution().${sig.name}(${call.join(', ')}); std::cout << str(r) << "\\n"; } catch (const std::exception& e) { std::cout << "ERROR " << e.what() << "\\n"; } }`;
  });
  return `int main() {\n    ${body.filter(Boolean).join('\n    ')}\n    return 0;\n}\n`;
}

function javaType(t: ParamType): string {
  const m: Record<string, string> = {
    int: 'int', long: 'long', double: 'double', boolean: 'boolean', string: 'String', char: 'char',
    'int[]': 'int[]', 'long[]': 'long[]', 'double[]': 'double[]', 'string[]': 'String[]', 'char[]': 'char[]',
    'int[][]': 'int[][]', 'string[][]': 'String[][]', 'char[][]': 'char[][]', ListNode: 'ListNode', TreeNode: 'TreeNode',
  };
  const r = m[t];
  if (!r) throw new Error(`unsupported java type ${t}`);
  return r;
}

// ---------- Comparison ----------
const key = (v: Json) => JSON.stringify(v);
const sortVals = (a: Json[]) => [...a].sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));

export function normalize(v: Json, mode: Signature['compare'] = 'exact'): Json {
  if (mode === 'unordered' && Array.isArray(v)) return sortVals(v);
  if (mode === 'unordered-nested' && Array.isArray(v)) return sortVals(v.map((x) => (Array.isArray(x) ? sortVals(x) : x)));
  return v;
}

export function equal(actual: Json, expected: Json, mode: Signature['compare'] = 'exact'): boolean {
  if (typeof mode === 'object' && typeof actual === 'number' && typeof expected === 'number')
    return Math.abs(actual - expected) <= mode.float;
  return key(normalize(actual, mode)) === key(normalize(expected, mode));
}

/** Parse one stdout line; returns an Error for "ERROR ..." or unparsable output. */
export function parseLine(line: string): Json | Error {
  if (line.startsWith('ERROR')) return new Error(line);
  try {
    return JSON.parse(line) as Json;
  } catch {
    return new Error(`unparsable output: ${line.slice(0, 80)}`);
  }
}

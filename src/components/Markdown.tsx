import { Fragment, type ReactNode } from 'react';
import { CodePanel } from './CodePanel';

// Tiny renderer for our own cheat sheets: headings, paragraphs, lists, tables, fenced code, `code` and **bold**.

const inline = (s: string): ReactNode[] =>
  s.split(/(`[^`]+`|\*\*[^*]+\*\*)/).filter(Boolean).map((part, i) =>
    part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code>
      : part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <Fragment key={i}>{part}</Fragment>);

const cells = (row: string) =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) { i++; continue; }
    const fence = /^```(\w*)/.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i++]!);
      i++;
      const lang = fence[1];
      out.push(lang === 'java' || lang === 'cpp'
        ? <CodePanel key={key++} lang={lang} code={body.join('\n')} />
        : <pre key={key++}><code>{body.join('\n')}</code></pre>);
      continue;
    }
    const h = /^(#{1,3}) (.*)/.exec(line);
    if (h) {
      const Tag = `h${h[1]!.length}` as 'h1' | 'h2' | 'h3';
      out.push(<Tag key={key++}>{inline(h[2]!)}</Tag>);
      i++;
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) rows.push(cells(lines[i++]!));
      const [head, , ...body] = rows;
      out.push(
        <div key={key++} className="tablewrap">
          <table className="matrix">
            <thead><tr>{head?.map((c, j) => <th key={j} scope="col">{inline(c)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const li = /^(- |\d+\. )/;
    if (li.test(line)) {
      const ordered = /^\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && li.test(lines[i]!)) items.push(lines[i++]!.replace(li, ''));
      const Tag = ordered ? 'ol' : 'ul';
      out.push(<Tag key={key++}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</Tag>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3} |```|\||- |\d+\. )/.test(lines[i]!)) para.push(lines[i++]!);
    out.push(<p key={key++}>{inline(para.join(' '))}</p>);
  }
  return <div className="md">{out}</div>;
}

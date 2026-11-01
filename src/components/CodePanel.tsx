import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import type { Lang } from '../engine/types';

hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);

interface Props {
  code: string;
  lang: Lang;
  /** 0-based highlighted line(s). */
  active?: number | number[];
}

export function CodePanel({ code, lang, active }: Props) {
  // Highlighted line by line so the visualizer can mark the current line. Source is our own code, not user input.
  const lines = useMemo(() => code.split('\n').map((l) => hljs.highlight(l, { language: lang }).value || ' '), [code, lang]);
  const hot = new Set(Array.isArray(active) ? active : active === undefined ? [] : [active]);
  return (
    <div className="code">
      <div className="code-head">
        <span className="muted">{lang === 'java' ? 'Java' : 'C++'}</span>
        <button className="btn" aria-label="Copy code" onClick={() => void navigator.clipboard?.writeText(code)}>Copy</button>
      </div>
      <pre aria-label={`${lang} code`}>
        {lines.map((html, i) => (
          <div key={i} className={hot.has(i) ? 'line hot' : 'line'} aria-current={hot.has(i) ? 'step' : undefined}>
            <span className="ln">{i + 1}</span>
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ))}
      </pre>
    </div>
  );
}

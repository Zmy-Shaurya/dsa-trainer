import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { loadIndex } from '../content/loader';
import type { ContentIndex } from '../content/types';

interface Entry { id: string; title: string; kind: string; to: string; hint?: string; extra?: string }

const PAGES: [string, string, string?][] = [
  ['Today', '/'], ['Skill tree', '/tree'], ['Practice', '/practice'], ['Sheets', '/practice/sheet'], ['Review cards', '/review'],
  ['Card browser', '/review/browse'], ['Learning paths', '/paths'], ['Companies', '/companies'], ['Visualizers', '/visualize'],
  ['Race algorithms', '/visualize/race'], ['Cheat sheets', '/learn/cheatsheets'], ['Java and C++ guide', '/learn/java-cpp'],
  ['Templates', '/learn/templates'], ['Big-O plotter', '/tools/bigo'], ['Complexity quiz', '/tools/complexity-quiz'],
  ['Pattern trainer', '/tools/pattern-trainer'], ['Progress', '/progress'], ['Data, backup and sync', '/data'],
  ['Import from LeetCode', '/import/leetcode'], ['Compare with a friend', '/data/compare'], ['Credits', '/credits'],
];

/** Subsequence match with a bonus for prefixes and word starts; null when the query does not fit. */
export function score(query: string, text: string): number | null {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  const at = t.indexOf(q);
  if (at >= 0) return 100 - at - (t.length - q.length) * 0.1 + (at === 0 || t[at - 1] === ' ' ? 20 : 0);
  let ti = 0, s = 0, run = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const f = t.indexOf(ch, ti);
    if (f < 0) return null;
    run = f === ti ? run + 1 : 0;
    s += 1 + run + (f === 0 || t[f - 1] === ' ' ? 3 : 0);
    ti = f + 1;
  }
  return s;
}

function useEntries(open: boolean): Entry[] {
  const [index, setIndex] = useState<ContentIndex>();
  const [viz, setViz] = useState<{ id: string; name: string; blurb: string }[]>([]);
  useEffect(() => {
    if (!open) return;
    void loadIndex().then(setIndex, () => undefined);
    void import('../engine/algos').then((m) => setViz(m.ALGOS.map((a) => ({ id: a.id, name: a.name, blurb: a.blurb }))), () => undefined);
  }, [open]);
  return useMemo(() => {
    const out: Entry[] = PAGES.map(([title, to]) => ({ id: `p:${to}`, title, kind: 'Page', to }));
    if (index) {
      for (const c of index.concepts) out.push({ id: `c:${c.id}`, title: c.title, kind: 'Concept', to: `/concept/${c.id}` });
      for (const p of index.problems) {
        out.push({ id: `q:${p.id}`, title: p.title, kind: 'Problem', to: `/problem/${encodeURIComponent(p.id)}`, hint: p.difficulty, extra: p.lcNumber ? `#${p.lcNumber}` : '' });
      }
      for (const c of index.cheatsheets) out.push({ id: `s:${c.id}`, title: c.title, kind: 'Cheat sheet', to: `/learn/cheatsheets/${c.id}` });
      for (const t of index.templates) out.push({ id: `t:${t.id}`, title: t.title, kind: 'Template', to: '/learn/templates' });
    }
    for (const v of viz) out.push({ id: `v:${v.id}`, title: v.name, kind: 'Visualizer', to: `/visualize/${v.id}`, hint: v.blurb });
    return out;
  }, [index, viz]);
}

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !root) return;
      const f = [...root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); back?.focus?.(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const entries = useEntries(true);
  const [q, setQ] = useState('');
  const [cur, setCur] = useState(0);
  const uid = useId();
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    if (!q.trim()) return entries.filter((e) => e.kind === 'Page').slice(0, 9);
    const scored: [Entry, number][] = [];
    for (const e of entries) {
      const s = score(q, e.title) ?? (e.extra ? score(q, e.extra) : null);
      if (s !== null) scored.push([e, s + (e.kind === 'Page' ? 6 : 0)]);
    }
    return scored.sort((a, b) => b[1] - a[1]).slice(0, 40).map(([e]) => e);
  }, [entries, q]);

  useEffect(() => { setCur(0); }, [q]);
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [cur]);

  const go = (e?: Entry) => { if (!e) return; onClose(); nav(e.to); };

  return (
    <Modal label="Search and jump" onClose={onClose}>
      <div className="pal-input">
        <MagnifyingGlass size={20} aria-hidden />
        <input
          autoFocus role="combobox" aria-expanded aria-controls={`${uid}-list`} aria-activedescendant={results[cur] ? `${uid}-${cur}` : undefined}
          aria-autocomplete="list" aria-label="Search pages, problems, concepts and visualizers" placeholder="Search problems, concepts, visualizers, pages…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCur((c) => Math.min(c + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setCur((c) => Math.max(c - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); go(results[cur]); }
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <ul ref={list} id={`${uid}-list`} role="listbox" aria-label="Results" className="pal-list">
        {results.map((r, i) => (
          <li key={r.id} id={`${uid}-${i}`} role="option" aria-selected={i === cur} className={i === cur ? 'on' : ''}
            onMouseMove={() => setCur(i)} onClick={() => go(r)}>
            <span className="pal-title">{r.title}{r.extra && <span className="muted"> {r.extra}</span>}</span>
            {r.hint && <span className={`pal-hint ${['easy', 'medium', 'hard'].includes(r.hint) ? `diff-${r.hint}` : 'muted'}`}>{r.hint}</span>}
            <span className="pal-kind">{r.kind}</span>
          </li>
        ))}
        {!results.length && <li className="pal-empty" role="presentation">Nothing matches "{q}". Try a problem name, a concept, or a topic like "heap".</li>}
      </ul>
      <p className="pal-foot muted"><kbd>↑</kbd> <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>?</kbd> for all shortcuts</p>
    </Modal>
  );
}

const SHORTCUTS: [string, [string, string][]][] = [
  ['Anywhere', [['Ctrl or Cmd + K', 'Search and jump'], ['?', 'Show this list'], ['Esc', 'Close a dialog']]],
  ['Practice list', [['/', 'Focus search'], ['J / K', 'Move down / up'], ['O', 'Open the problem'], ['S', 'Cycle status'], ['C', 'Cycle confidence']]],
  ['Review session', [['Space', 'Show the answer'], ['1 to 4', 'Rate Again, Hard, Good, Easy'], ['U', 'Undo'], ['S', 'Suspend the card'], ['E', 'Edit the card']]],
  ['Visualizer', [['Space', 'Play or pause'], ['← / →', 'Step back / forward'], ['Home / End', 'Jump to the start / end'], ['[ / ]', 'Previous / next event'], ['R', 'Reset'], ['P', 'Toggle Predict mode'], ['D', 'Toggle Drive mode']]],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Keyboard shortcuts" onClose={onClose}>
      <div className="dlg-head"><h2>Keyboard shortcuts</h2><button className="btn" onClick={onClose}>Close</button></div>
      <div className="shortcuts">
        {SHORTCUTS.map(([group, rows]) => (
          <section key={group}>
            <h3>{group}</h3>
            <dl>{rows.map(([k, d]) => <div key={k}><dt>{k.split(' / ').map((x) => <kbd key={x}>{x}</kbd>)}</dt><dd>{d}</dd></div>)}</dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

/** Opens the palette on Ctrl/Cmd+K and the shortcut list on ?, unless the user is typing. */
export function useOverlayKeys(open: (which: 'palette' | 'help') => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open('palette'); return; }
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); open('help'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
}

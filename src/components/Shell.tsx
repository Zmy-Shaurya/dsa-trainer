import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { loadIndex } from '../content/loader';
import { syncIfChanged } from '../db/cards';
import { useSettings } from '../db/hooks';
import { setSetting } from '../db/settings';
import { applyUpdate, useUpdateReady } from '../pwa';

export const APP_NAME = 'DSA Studio';

/** The optional third item keeps a section highlighted on all its sub-pages. */
const NAV: [to: string, label: string, prefix?: string][] = [
  ['/', 'Today'],
  ['/tree', 'Tree'],
  ['/practice', 'Practice'],
  ['/review', 'Review'],
  ['/paths', 'Paths', '/paths'],
  ['/companies', 'Companies', '/companies'],
  ['/visualize', 'Visualize'],
  ['/learn/cheatsheets', 'Learn', '/learn'],
  ['/tools/bigo', 'Tools', '/tools'],
  ['/progress', 'Progress'],
  ['/data', 'Data'],
];

export function Shell() {
  const s = useSettings();
  const { pathname } = useLocation();
  const updateReady = useUpdateReady();

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [s.theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = s.palette;
    document.documentElement.dataset.reduced = s.reducedMotion;
  }, [s.palette, s.reducedMotion]);

  // Card sync (PRD 8.17): runs once per content version.
  useEffect(() => {
    loadIndex().then((i) => syncIfChanged(i.contentVersion, i.cardIds)).catch(() => undefined);
  }, []);

  const nextTheme = { system: 'light', light: 'dark', dark: 'system' } as const;

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <nav className="sidebar" aria-label="Main">
        <div className="brand">{APP_NAME}</div>
        {NAV.map(([to, label, prefix]) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive || (!!prefix && pathname.startsWith(prefix)) ? 'active' : '')}>
            <span className="label">{label}</span>
            <span aria-hidden className="icon">{label[0]}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <header className="topbar">
          <div className="seg" role="group" aria-label="Code language">
            {(['java', 'cpp'] as const).map((l) => (
              <button key={l} aria-pressed={s.language === l} onClick={() => setSetting('language', l)}>
                {l === 'java' ? 'Java' : 'C++'}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => setSetting('theme', nextTheme[s.theme])} aria-label={`Theme: ${s.theme}`}>
            Theme: {s.theme}
          </button>
        </header>
        {updateReady && (
          <div className="banner" role="status">
            <span>New version available.</span>
            <button className="btn" onClick={applyUpdate}>Reload</button>
          </div>
        )}
        <main id="main" className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BookOpen, Buildings, MagnifyingGlass, CardsThree, ChartLineUp, Database, Desktop, House, MapTrifold, Moon, Pulse, Sun, TreeStructure, Wrench, Code,
  type Icon,
} from '@phosphor-icons/react';
import { loadIndex } from '../content/loader';
import { syncIfChanged } from '../db/cards';
import { useSettings } from '../db/hooks';
import { setSetting } from '../db/settings';
import { applyUpdate, useUpdateReady } from '../pwa';
import { CommandPalette, ShortcutsDialog, useOverlayKeys } from './Overlays';

export const APP_NAME = 'DSA Studio';

/** The optional fourth item keeps a section highlighted on all its sub-pages. */
const NAV: [to: string, label: string, icon: Icon, prefix?: string][] = [
  ['/', 'Today', House],
  ['/tree', 'Tree', TreeStructure],
  ['/practice', 'Practice', Code],
  ['/review', 'Review', CardsThree],
  ['/paths', 'Paths', MapTrifold, '/paths'],
  ['/companies', 'Companies', Buildings, '/companies'],
  ['/visualize', 'Visualize', Pulse],
  ['/learn/cheatsheets', 'Learn', BookOpen, '/learn'],
  ['/tools/bigo', 'Tools', Wrench, '/tools'],
  ['/progress', 'Progress', ChartLineUp],
  ['/data', 'Data', Database],
];

const THEME_ICON = { system: Desktop, light: Sun, dark: Moon } as const;

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2.2" />
        <circle cx="5.5" cy="19" r="2.2" />
        <circle cx="18.5" cy="19" r="2.2" />
        <path d="M12 7.2v4.3M12 11.5 6.4 16.9M12 11.5l5.6 5.4" />
      </svg>
    </span>
  );
}

export function Shell() {
  const s = useSettings();
  const { pathname } = useLocation();
  const updateReady = useUpdateReady();
  const [overlay, setOverlay] = useState<'palette' | 'help' | null>(null);
  const openOverlay = useCallback((w: 'palette' | 'help') => setOverlay(w), []);
  useOverlayKeys(openOverlay);
  useEffect(() => { setOverlay(null); }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      try { localStorage.setItem('dsa-theme', s.theme); } catch { /* storage blocked: the inline script falls back to the system theme */ }
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a0f0e' : '#f2f4f0');
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

  // A new page starts at the top (hash routing keeps the old scroll position).
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  // Card sync (PRD 8.17): runs once per content version.
  useEffect(() => {
    loadIndex().then((i) => syncIfChanged(i.contentVersion, i.cardIds)).catch(() => undefined);
  }, []);

  const nextTheme = { system: 'light', light: 'dark', dark: 'system' } as const;
  const ThemeIcon = THEME_ICON[s.theme];

  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <nav className="sidebar" aria-label="Main">
        <NavLink to="/" className="brand" aria-label={`${APP_NAME}, home`}>
          <BrandMark />
          <span className="brand-text">{APP_NAME}<small>Java and C++ practice</small></span>
        </NavLink>
        {NAV.map(([to, label, Ico, prefix]) => {
          const on = pathname === to || (!!prefix && pathname.startsWith(prefix)) || (to !== '/' && !prefix && pathname.startsWith(`${to}/`));
          return (
            <NavLink key={to} to={to} end={to === '/'} title={label} aria-label={label} className={`nav${on ? ' active' : ''}`}>
              <span aria-hidden className="icon"><Ico size={21} weight={on ? 'fill' : 'regular'} /></span>
              <span className="label">{label}</span>
            </NavLink>
          );
        })}
        <p className="side-foot"><b>Local-first.</b> Progress lives on this device. Export a backup from Data.</p>
      </nav>
      <div className="main">
        <header className="topbar">
          <NavLink to="/" className="brand topbar-brand" aria-label={`${APP_NAME}, home`}><BrandMark /><span>{APP_NAME}</span></NavLink>
          <button className="btn search-btn" onClick={() => setOverlay('palette')} aria-label="Search and jump (Ctrl K)">
            <MagnifyingGlass size={18} aria-hidden />
            <span className="theme-label">Search</span>
            <kbd aria-hidden>Ctrl K</kbd>
          </button>
          <div className="seg" role="group" aria-label="Code language">
            {(['java', 'cpp'] as const).map((l) => (
              <button key={l} aria-pressed={s.language === l} onClick={() => setSetting('language', l)}>
                {l === 'java' ? 'Java' : 'C++'}
              </button>
            ))}
          </div>
          <button className="btn" onClick={() => setSetting('theme', nextTheme[s.theme])} aria-label={`Theme: ${s.theme}`}>
            <ThemeIcon size={18} aria-hidden />
            <span className="theme-label">Theme: {s.theme}</span>
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
        {overlay === 'palette' && <CommandPalette onClose={() => setOverlay(null)} />}
        {overlay === 'help' && <ShortcutsDialog onClose={() => setOverlay(null)} />}
      </div>
    </div>
  );
}

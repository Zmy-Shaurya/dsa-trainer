import { NavLink } from 'react-router-dom';

export const LEARN_LINKS: [to: string, label: string][] = [
  ['/learn/cheatsheets', 'Cheat sheets'],
  ['/learn/java-cpp', 'Java ⇄ C++'],
  ['/learn/templates', 'Templates'],
];

export const TOOL_LINKS: [to: string, label: string][] = [
  ['/tools/bigo', 'Big-O plotter'],
  ['/tools/complexity-quiz', 'Complexity quiz'],
  ['/tools/pattern-trainer', 'Pattern trainer'],
];

/** Tabs shared by the Learn and Tools pages. */
export function SubNav({ links }: { links: [string, string][] }) {
  return (
    <nav className="subnav no-print" aria-label="Section">
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
      ))}
    </nav>
  );
}

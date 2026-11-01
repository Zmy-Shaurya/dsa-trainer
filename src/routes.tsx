import { lazy, Suspense } from 'react';
import { createHashRouter, Link, type RouteObject } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Skeleton } from './components/Skeleton';

const Placeholder = lazy(() => import('./pages/Placeholder'));
const Data = lazy(() => import('./pages/Data'));
const FriendCompare = lazy(() => import('./pages/FriendCompare'));
const Credits = lazy(() => import('./pages/Credits'));
const Paths = lazy(() => import('./pages/Paths'));
const PathPage = lazy(() => import('./pages/Path'));
const Companies = lazy(() => import('./pages/Companies'));
const Company = lazy(() => import('./pages/Company'));
const Visualize = lazy(() => import('./pages/Visualize'));
const Visualizer = lazy(() => import('./pages/Visualizer'));
const Race = lazy(() => import('./pages/Race'));

const Practice = lazy(() => import('./pages/Practice'));
const Problem = lazy(() => import('./pages/Problem'));
const Sheet = lazy(() => import('./pages/Sheet'));
const BulkImport = lazy(() => import('./pages/BulkImport'));
const Tree = lazy(() => import('./pages/Tree'));
const Concept = lazy(() => import('./pages/Concept'));
const Review = lazy(() => import('./pages/Review'));
const Browse = lazy(() => import('./pages/Browse'));
const Today = lazy(() => import('./pages/Today'));
const Progress = lazy(() => import('./pages/Progress'));
const BigO = lazy(() => import('./pages/BigO'));
const ComplexityQuiz = lazy(() => import('./pages/ComplexityQuiz'));
const PatternTrainer = lazy(() => import('./pages/PatternTrainer'));
const JavaCpp = lazy(() => import('./pages/JavaCpp'));
const Templates = lazy(() => import('./pages/Templates'));
const Cheatsheets = lazy(() => import('./pages/Cheatsheets'));
const CheatsheetView = lazy(() => import('./pages/CheatsheetView'));

/** Every route from PRD §7. Pages become real in later phases. */
const PLACEHOLDERS: [path: string, title: string][] = [
  ['settings', 'Settings'],
];

const wrap = (el: React.ReactNode) => <Suspense fallback={<Skeleton />}>{el}</Suspense>;

const children: RouteObject[] = [
  { index: true, element: wrap(<Today />) },
  { path: 'progress', element: wrap(<Progress />) },
  { path: 'tools/bigo', element: wrap(<BigO />) },
  { path: 'tools/complexity-quiz', element: wrap(<ComplexityQuiz />) },
  { path: 'tools/pattern-trainer', element: wrap(<PatternTrainer />) },
  { path: 'learn/java-cpp', element: wrap(<JavaCpp />) },
  { path: 'learn/templates', element: wrap(<Templates />) },
  { path: 'learn/cheatsheets', element: wrap(<Cheatsheets />) },
  { path: 'learn/cheatsheets/:id', element: wrap(<CheatsheetView />) },
  ...PLACEHOLDERS.map(([path, title]): RouteObject => ({
    path: path === '/' ? undefined : path,
    index: path === '/',
    element: wrap(<Placeholder title={title} />),
  })),
  { path: 'paths', element: wrap(<Paths />) },
  { path: 'paths/:id', element: wrap(<PathPage />) },
  { path: 'companies', element: wrap(<Companies />) },
  { path: 'companies/:id', element: wrap(<Company />) },
  { path: 'visualize', element: wrap(<Visualize />) },
  { path: 'visualize/race', element: wrap(<Race />) },
  { path: 'visualize/:id', element: wrap(<Visualizer />) },
  { path: 'tree', element: wrap(<Tree />) },
  { path: 'concept/:id', element: wrap(<Concept />) },
  { path: 'review', element: wrap(<Review />) },
  { path: 'review/browse', element: wrap(<Browse />) },
  { path: 'practice', element: wrap(<Practice />) },
  { path: 'practice/sheet', element: wrap(<Sheet />) },
  { path: 'practice/sheet/:sheetId', element: wrap(<Sheet />) },
  { path: 'problem/:id', element: wrap(<Problem />) },
  { path: 'import/leetcode', element: wrap(<BulkImport />) },
  { path: 'data', element: wrap(<Data />) },
  { path: 'data/compare', element: wrap(<FriendCompare />) },
  { path: 'credits', element: wrap(<Credits />) },
];

function NotFound() {
  return (
    <div role="alert">
      <h1>Page not found</h1>
      <p className="muted">That address does not match anything in DSA Studio. <Link to="/">Go to Today</Link></p>
    </div>
  );
}

function Crashed() {
  return (
    <main className="card" role="alert">
      <h1>Something went wrong</h1>
      <p className="muted">Your data is safe on this device. <a href="#/">Reload the app</a>, and export a backup from Data if it keeps happening.</p>
    </main>
  );
}

export const router = createHashRouter([
  { path: '/', element: <Shell />, errorElement: <Crashed />, children: [...children, { path: '*', element: <NotFound /> }] },
]);

# DSA Studio — Product Requirements Document

| | |
|---|---|
| **Working title** | DSA Studio (placeholder; a single `APP_NAME` constant controls the name everywhere) |
| **Doc version** | 1.0 |
| **Date** | 2026-11-01 |
| **Status** | Approved for build; nothing beyond a bare scaffold exists yet (see §5.4) |
| **Owner** | The project owner (sole primary user; will share the finished app with a few friends) |
| **Document type** | Single source of truth. Self-contained: a brand-new chat with no history MUST be able to build the whole product from this file alone. |

---

## 0. How to use this document

**Audience:** an AI coding assistant (or human developer) starting from zero.

1. Read the whole document before writing code. Sections are numbered; cross-references look like `§8.3`.
2. Requirement words follow RFC 2119: **MUST**, **SHOULD**, **MAY**.
3. Build in the phase order of **§22**. Do not skip ahead. At the end of every phase, `npm run typecheck`, `npm run lint`, `npm test`, `npm run content:validate` and `npm run build` MUST all pass.
4. If information is missing, look in **§23 (Open questions)** for the stated default. Only ask the owner when a question truly blocks progress; otherwise take the default and note the assumption in `README.md`.
5. If this PRD conflicts with anything said earlier in a chat, **this PRD wins**.
6. The owner prefers **execution over explanation**: build working things, report briefly, use short bullet points instead of long paragraphs in any teaching copy and in status messages.
7. Never invent facts about problems (difficulty, constraints, company frequency). Data comes from the sources in §8 and §19, or it is marked `unverified: true`.

---

## 1. Product summary

### 1.1 One-liner
A **local-first, no-AI DSA learning workstation** for people who code in **Java and C++**: skill tree, algorithm visualizers, short cheat cards, a verified practice bank with multiple approaches per problem, spaced repetition, quizzes, progress tracking, company-tagged lists and learning paths, all in one place, with every byte of user data stored on the user's own device and exportable.

### 1.2 The problem
DSA preparation is scattered across many tools that do not talk to each other:
- Visualizers (VisuAlgo, USFCA, etc.) have no link to practice or notes.
- Theory sites (GfG, CP-Algorithms) are long and passive.
- Practice sites (LeetCode, NeetCode, Striver sheets) track nothing about *understanding*, only "accepted".
- Flashcards (Anki) and notes (Notion/Obsidian) live elsewhere and drift out of sync with what was actually learned.

### 1.3 The solution
One app where every concept is connected to: its **visualizer**, its **short cheat card**, its **flashcards**, its **practice problems (with multiple approaches)**, its **common mistakes**, and the **user's own progress**, with a skill tree that shows what to learn next and a daily plan that decides what to do today.

### 1.4 What it is NOT
- **Not an AI tutor.** No LLM calls, no chat, no generated explanations at runtime. All content is hand-authored, deterministic, verified.
- Not a judge/online compiler (v1 never executes user code).
- Not a social platform (no accounts, feeds, leaderboards, servers).

### 1.5 Platform
- Static single-page web app (SPA), installable PWA, works fully offline after first load.
- Responsive: desktop first, comfortable on phones for reading notes, doing flashcard reviews and daily-plan checklists.

### 1.6 Success criteria (measurable)
| # | Criterion |
|---|---|
| S1 | After the first load, the app works with the network disabled (all pages, visualizers, reviews). |
| S2 | A user can export 100% of their data to one JSON file and re-import it on a fresh browser with zero loss (round-trip test passes). |
| S3 | The "Today" page produces a sensible plan in under 100 ms and the plan is completable in the chosen time budget (30/60/90 min). |
| S4 | Every published solution (Java and C++) compiles and passes its test cases in `content:verify`. |
| S5 | Every concept card fits the length limits of §8.13 (enforced by script). |
| S6 | Initial JS bundle ≤ 250 KB gzipped (content is lazy-loaded separately). |
| S7 | Visualizers run at 60 fps for n ≤ 30 elements / ≤ 12 graph nodes. |
| S8 | At the end of Phase 10 the practice bank contains ~500 problems across 3 content tiers (§8.16). |

---

## 2. Principles and non-goals

### 2.1 Principles
- **P1 Deterministic, not generative.** Everything shown was authored and verified ahead of time.
- **P2 Local-first.** IndexedDB is the source of truth. No login. No backend. No analytics. The only network use is optional: loading app updates and following outbound links.
- **P3 Short beats long.** Notes are cards, not essays. Hard length limits are enforced by tooling (§8.13). A deep-dive section is optional and collapsed by default.
- **P4 Active over passive.** Predict-then-reveal, drive-the-algorithm, break-it, quizzes and reveal-gated hints beat watching and reading.
- **P5 Original content, copyright-safe.** Never store problem statements or other sites' editorials/solutions. Store titles, links, tags, and our own paraphrased one-liners and original code.
- **P6 Content is files.** Adding a problem/concept/sheet means adding files, not editing app code.
- **P7 Java and C++ are first-class.** Every code surface has a Java and a C++ version and a global language toggle. Language-specific traps are a feature.
- **P8 Verified correctness.** A wrong solution in a teaching tool is worse than none. All solutions are compiled and run against tests by a script.
- **P9 Soft gating.** The skill tree recommends; it never traps. Locked nodes can always be opened ("Unlock anyway").
- **P10 Fast and keyboard-friendly.** Command palette, shortcuts for the player and review.
- **P11 Graceful degradation.** Anything that depends on an external thing (LeetCode, a GitHub dataset, File System Access API) has a manual fallback.

### 2.2 Non-goals (v1)
- AI tutoring/chat/explanations; automatic LeetCode account sync (manual import only, §14.7); running user code in the browser (a later optional "paste & compare" exists in §22 Phase 11, no execution); accounts, servers, cloud sync; leaderboards or social features; payments; reproducing problem statements.

---

## 3. Decisions log (all decisions made with the owner)

| ID | Decision |
|---|---|
| D1 | Product is **not** an AI tutor. Deterministic content only. |
| D2 | All user data is stored **on the user's device** (IndexedDB) and is **exportable** (JSON, Markdown zip, CSV, Anki TSV). |
| D3 | Modules in scope: skill tree, visualizers, notes/cheat cards, flashcards with spaced repetition, practice bank with multiple sheets, progress heatmaps and streaks, Big-O plotter, complexity quiz, company-tagged lists, learning paths, manual LeetCode import. |
| D4 | **Skill tree** is the primary navigation for learning; mastery is computed, not self-reported (§14.1). |
| D5 | **Multiple practice sheets** (NeetCode 150, Blind 75, Grind 75, Striver A2Z and SDE sheets, Love Babbar 450 …). Same problem across sheets is **deduplicated by problem ID**: solve once, tick everywhere. User can import custom sheets. |
| D6 | Notes must be **short and not boring**: fixed card format, hard length caps, "30-second view" first, optional collapsed deep dive. |
| D7 | **LeetCode sync is manual** (toggle, bulk paste/CSV import with matching and an unmatched list). No scraping, no proxy, no extension in v1. |
| D8 | **Multiple approaches per problem** (brute → better → optimal) shown as an "approach ladder" with the one key insight that unlocks each jump, plus compare mode. |
| D9 | ~**500 most common problems** with approaches/solutions, delivered in **3 content tiers** (§8.16). All content original; all solutions test-verified. |
| D10 | Two separate tag systems: **status** (not started / attempted / solved) and **confidence** (cleared / need review / don't understand), plus optional **solve mode** (alone / with hint / saw solution) and **mistake tags**. |
| D11 | Cheat sheets and a **Big-O growth plotter** and a **complexity quiz** are in scope. |
| D12 | **Export/import** everything; optional folder auto-sync (File System Access API) and encrypted backup. |
| D13 | **Curated learning paths** are in scope (Placement 30 days, Interview 60 days, etc.). |
| D14 | **Company-tagged problem lists** are in scope, seeded from a GitHub dataset the owner has (licence checked first; fallback is a local import page). |
| D15 | Project is for the **owner's personal use**, shared with **a few friends**. Polish for usability, not for scale. No multi-tenant concerns. |
| D16 | **Java and C++** are the supported languages. Python/JS are out of scope. |
| D17 | **Content as files** (folder per problem; YAML metadata + real `.java`/`.cpp` source files that are compiled in verification). |
| D18 | **Code lab (in-browser execution) is dropped for v1**: Java/C++ cannot run in the browser the way Python can. Optional later: "paste & compare" with no execution. |
| D19 | Local verification script (compile and run all solutions) is the substitute for a code lab and guarantees content quality. |
| D20 | Streaks have **freezes** so one missed day is not punishing; weekly goals; badges tied to the skill tree. |
| D21 | Extra ideas accepted: pattern-recognition trainer, daily plan, mistake journal, problem re-surfacing, compare mode, algorithm race, predict-then-reveal, drive mode, break-it mode, Java/C++ language guide, friend progress compare (import-only). |
| D22 | Hosting is static (Vercel/Netlify/GitHub Pages). Router is **HashRouter** so any static host works with no rewrite rules. |

---

## 4. Users and key flows

### 4.1 Personas
- **Owner (primary):** a CS student/developer preparing for campus placements and tech interviews; codes in Java and C++; wants one place and wants to *understand*, not memorise.
- **Friend (secondary):** gets the URL, uses their own local data; may import the owner's sheet files or compare progress. No special features beyond import/export.

### 4.2 Key flows
1. **Daily session:** open *Today* → follow plan (due cards → resurfaced problems → new concept + problems → optional quiz) → streak updates.
2. **Learn a concept:** *Skill tree* → node hub → read 30-second card → run visualizer (predict mode) → add cards to deck → solve core problems.
3. **Solve a problem:** problem page → open on LeetCode → return → log status/confidence/solve mode/mistake tags/time → write one-line "my insight" → optionally add review card.
4. **Stuck on a problem:** reveal hints one at a time → approach ladder (locked until "I'm stuck") → compare brute vs optimal in visualizer.
5. **Review:** *Review* page → cards with 4 ratings → session summary.
6. **Prepare for a company:** *Companies* → pick company → filtered list sorted by frequency → add to a custom plan or a path.
7. **Bulk-mark solved:** paste titles/slugs/CSV → match → preview → commit.
8. **Backup/restore:** *Data* page → export JSON (optionally encrypted) → import on another browser.
9. **Share with a friend:** export a sheet or progress file → friend imports (sheet) or loads as read-only comparison (progress).

---

## 5. Tech stack and project setup

### 5.1 Stack (use the latest stable versions at install time)
| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | `strict`, `noUncheckedIndexedAccess` on |
| UI | React 19 | Function components + hooks |
| Build | Vite | Static output in `dist/` |
| Routing | `react-router-dom` v7 with `createHashRouter` | D22 |
| Local DB | `dexie` v4 + `dexie-react-hooks` (`useLiveQuery`) | IndexedDB wrapper |
| UI state | `zustand` | Ephemeral UI state only (player state, modals, language toggle mirror). Persistent state lives in Dexie. |
| Styling | Plain CSS + CSS variables (design tokens, §20.3) | No CSS framework. CSS Modules allowed. |
| Spaced repetition | `ts-fsrs` | FSRS algorithm, desired retention 0.9 |
| Code highlighting | `highlight.js` (core + `java` + `cpp` only) | Rendered line by line so the visualizer can highlight lines |
| Markdown | `marked` + `DOMPurify` (sanitize) | Notes are short; user note editor is a `<textarea>` with live preview |
| Search | `minisearch` | Index of content built at build time; user notes indexed at runtime |
| Zip | `fflate` | Markdown zip export/import |
| PWA | `vite-plugin-pwa` (Workbox) | Precache shell; runtime-cache content JSON |
| Charts | Hand-rolled SVG (heatmap, plotter, bars) | Avoid a chart dependency |
| Animation | CSS transitions; respect `prefers-reduced-motion` | `framer-motion` MAY be added later, not required |
| Tests | `vitest`, `@testing-library/react`, `fake-indexeddb`; Playwright for 2–3 smoke e2e tests | |
| Lint | `oxlint` (scaffold default) or ESLint | Pick one, keep it fast |
| Content scripts | Node ≥ 20, `tsx` to run TS scripts, `yaml` to parse YAML | |
| Verification toolchain | JDK 17+ (`javac`, `java`) and `g++` with `-std=c++17` on the author's machine | Only needed for `content:verify` |

### 5.2 npm scripts (MUST exist)
```
dev                 vite dev server
build               tsc -b && content:build && vite build
preview             vite preview
typecheck           tsc -b --noEmit
lint                oxlint
test                vitest run
test:e2e            playwright test
content:build       tsx scripts/content-build.ts      (YAML/MD -> public/content/*.json + search index)
content:validate    tsx scripts/content-validate.ts   (schema, links, length limits)
content:verify      tsx scripts/content-verify.ts     (compile + run Java/C++ against tests.json)
company:import      tsx scripts/company-import.ts <path-to-dataset>
sheet:import        tsx scripts/sheet-import.ts <file>
```

### 5.3 Conventions
- Dates in storage are **ISO 8601 strings** (UTC). "Day keys" are local-date strings `YYYY-MM-DD`, computed with a configurable day-rollover hour (default 04:00, so late-night study counts for the previous day).
- IDs: see §8.1.
- No `any`. No default exports except page components. Domain code in `src/domain` MUST be pure (no React, no Dexie, no `Date.now()` without an injected clock).
- Every domain function that depends on "now" takes `now: Date` as a parameter for testability.

### 5.4 Current repository state (important)
A scaffold exists at `dsa-studio/` (Vite + React + TypeScript template, dependencies installed: `dexie`, `dexie-react-hooks`, `zustand`, `react-router-dom`, dev: `vitest`). The Vite template's demo files were deleted (`src/App.tsx`, `src/main.tsx`, `src/App.css`, `src/index.css`, assets), so **the app does not currently render or build**. Two early draft files exist: `src/engine/types.ts` and `src/engine/algos/bubbleSort.ts`. They use a simplified frame type and are **superseded by §14.2**; replace or delete them freely. A new chat MAY start from scratch (`npm create vite@latest`) or reuse this scaffold; this PRD is authoritative either way.

---

## 6. Architecture

### 6.1 Layers (dependencies point downward only)
```
UI (pages, components)
  ↓ uses
State hooks (useLiveQuery wrappers, zustand UI store)
  ↓ uses
Data layer (src/db: Dexie schema, repositories, import/export, crypto, fs-sync)
  ↓ uses
Domain (src/domain: PURE functions: mastery, streak, plan, srs wrappers, matching, resurfacing, paths, bigo)
  ↓ uses
Content (src/content: typed loader over generated JSON; types shared with scripts)
```
Rules: Domain never imports React/Dexie. UI never talks to Dexie directly; it uses repository functions or hooks in `src/db/hooks.ts`. Content is read-only at runtime.

### 6.2 Repository layout
```
dsa-studio/
  PRD.md  README.md  package.json  index.html  vite.config.ts  tsconfig*.json
  content/                       # AUTHORED SOURCE (not bundled directly)
    concepts/<concept-id>.yaml
    problems/<slug>/
      meta.yaml                  # metadata + approaches index + short notes
      notes.md                   # OPTIONAL deep dive (<= 300 words)
      tests.json                 # test cases for verification (+ signature in meta.yaml)
      approaches/<n>-<id>.java
      approaches/<n>-<id>.cpp
    sheets/<sheet-id>.yaml
    paths/<path-id>.yaml
    cards/<concept-id>.yaml
    quizzes/complexity/<topic>.yaml
    quizzes/patterns.yaml
    cheatsheets/<id>.md          # printable one-pagers (complexity table, STL/Collections map, ...)
    language-guide/<id>.yaml     # Java<->C++ mapping cards and traps
    templates/<pattern-id>.java  # copy-paste pattern templates
    templates/<pattern-id>.cpp
    _harness/java/ListNode.java TreeNode.java ...   # helper classes for verification
    _harness/cpp/ListNode.h TreeNode.h ...
    companies/                   # GENERATED by company:import (git-ignored if licence unclear)
  scripts/                       # content-build, content-validate, content-verify, company-import, sheet-import
  public/content/                # GENERATED JSON (git-ignored): index.json, problems/<slug>.json, search-index.json
  src/
    main.tsx  App.tsx  routes.tsx
    theme/tokens.css  theme/global.css
    domain/    mastery.ts streak.ts plan.ts srs.ts matching.ts resurfacing.ts paths.ts bigo.ts dates.ts
    db/        schema.ts repo/*.ts hooks.ts export.ts import.ts migrations/ crypto.ts fsSync.ts csv.ts zip.ts
    content/   types.ts loader.ts search.ts
    engine/    types.ts player.ts algos/*.ts renderers/*.tsx
    pages/     Today.tsx Tree.tsx Concept.tsx Practice.tsx Problem.tsx Review.tsx Visualize.tsx ...
    components/ (CodeBlock, Chip, StatusPicker, ProgressRing, Heatmap, ...)
    state/ui.ts
    lib/ id.ts hash.ts
  tests/ unit/ component/ e2e/ fixtures/
```
**Why content is outside `src/`:** so solutions can be compiled and tested with real toolchains, and so contributors never touch app code.

### 6.3 Content flow
`content/*` (YAML/MD/source) → `content:validate` (rules) → `content:verify` (compile + run) → `content:build` (emit JSON into `public/content/`) → app loads `index.json` at start and fetches per-problem JSON lazily → service worker caches them for offline.

---

## 7. Routes and navigation

HashRouter. All routes lazy-loaded (`React.lazy`) except the shell.

| Route | Page | Purpose |
|---|---|---|
| `/` | Today | Daily plan, due count, streak, quick actions |
| `/tree` | Skill tree | DAG of concepts with mastery |
| `/concept/:id` | Concept hub | 30-second card, visualizers, cards, core problems, resources |
| `/visualize` | Visualizer catalog | All algorithms grouped by category |
| `/visualize/:id` | Visualizer | Player, code panel, modes |
| `/practice` | Practice | All problems with filters |
| `/practice/sheet/:sheetId` | Sheet view | One sheet with progress/overlap |
| `/problem/:id` | Problem | Detail, approaches, tracking |
| `/review` | Review session | Spaced repetition session |
| `/review/browse` | Card browser | Search/edit/suspend cards, add custom cards |
| `/learn/cheatsheets` | Cheat sheets index | Printable one-pagers |
| `/learn/cheatsheets/:id` | Cheat sheet | One sheet |
| `/learn/java-cpp` | Java ⇄ C++ guide | Mapping cards, traps |
| `/learn/templates` | Templates | Pattern templates (copy button, per language) |
| `/tools/bigo` | Big-O plotter | Growth curves + constraints helper |
| `/tools/complexity-quiz` | Complexity quiz | Sessions of snippets |
| `/tools/pattern-trainer` | Pattern trainer | "Which pattern?" drills |
| `/paths` | Learning paths | List |
| `/paths/:id` | Path | Day-by-day schedule and progress |
| `/companies` | Companies | List with your progress |
| `/companies/:id` | Company | Filtered problem list |
| `/progress` | Progress | Heatmap, streaks, weak spots, reports |
| `/import/leetcode` | Bulk import | Manual LeetCode sync |
| `/data` | Data | Export/import/backup/sync/encryption/friend compare |
| `/settings` | Settings | See §18 |

**Global chrome:** left sidebar (desktop) / bottom bar (mobile) with Today, Tree, Practice, Review (with due badge), Visualize, Learn, Tools, Progress, Data. Top bar: search/command palette (Ctrl/Cmd+K), **language toggle (Java ⇄ C++)**, streak flame, theme toggle.

---

## 8. Content system

### 8.1 Identifiers
| Entity | ID rule | Example |
|---|---|---|
| LeetCode problem | the LeetCode slug | `two-sum` |
| Non-LeetCode problem | `<site>:<slug>` where site ∈ `gfg`, `cf`, `cses`, `cn`, `hr`, `ext` | `gfg:rotate-array`, `cf:1520A` |
| Concept | kebab-case | `binary-search` |
| Pattern | kebab-case | `sliding-window` |
| Sheet / Path / Company | kebab-case | `neetcode-150`, `placement-30`, `amazon` |
| Card | authored `c:<conceptId>:<n>`; generated `p:<problemId>:<kind>`; user `u:<uuid>` | `c:binary-search:3` |
| Quiz item | `cq:<n>` (complexity), `pq:<n>` (pattern) | `cq:12` |

Non-LeetCode problems that are the same problem as a LeetCode problem set `equivalentTo: <slug>` in their `meta.yaml`. Progress for an equivalent problem is stored under the **canonical** (LeetCode) ID, so solving it anywhere ticks every sheet. Problems with no equivalent keep their own ID and are **link-only** (no approaches required).

### 8.2 Problem folder
```
content/problems/two-sum/
  meta.yaml
  notes.md                 (optional)
  tests.json
  approaches/1-brute.java      approaches/1-brute.cpp
  approaches/2-hashmap.java    approaches/2-hashmap.cpp
```
Tier 3 problems (§8.16) have only `meta.yaml` (no approaches/tests required).

### 8.3 `meta.yaml` schema
```ts
interface ProblemMeta {
  id: string;                      // folder name = id
  platform: 'leetcode' | 'gfg' | 'codeforces' | 'cses' | 'codingninjas' | 'hackerrank' | 'other';
  lcNumber?: number;               // optional; only if verified
  title: string;
  url: string;                     // outbound link (we never store statements)
  difficulty: 'easy' | 'medium' | 'hard';
  tier: 1 | 2 | 3;                 // content depth, §8.16
  equivalentTo?: string;           // canonical problem id (see §8.1)
  topics: string[];                // coarse: arrays, strings, hashing, trees, graphs, dp, ...
  patterns: string[];              // pattern ids; first is primary
  concepts: string[];              // concept ids; first is primary (drives mastery, §14.1)
  insight: string;                 // THE one idea, own words, <= 160 chars
  tells: string[];                 // 2-4 "how to recognise this" signals, own words
  hints?: string[];                // 1-3 progressive hints shown BEFORE the approach ladder (reveal gate, §14.5)
  traps?: { java?: string[]; cpp?: string[]; both?: string[] };  // language traps, <= 3 each
  followups?: string[];            // related problem ids
  estimatedMinutes?: number;       // default by difficulty: 15/30/45
  signature?: Signature;           // required for tier 1-2 (needed by verify)
  approaches?: Approach[];         // required for tier 1-2
  unverified?: boolean;            // set if difficulty/number not confirmed
  // DERIVED at build time, NEVER authored: sheets[], companies[], companyFreq{}
}

interface Approach {
  id: string;                      // 'brute', 'hashmap', 'two-pointers'
  name: string;                    // 'Brute force'
  idea: string;                    // <= 200 chars, own words
  unlock?: string;                 // the single insight that gets you from the previous approach to this one, <= 140 chars
  time: string;                    // 'O(n^2)'
  space: string;                   // 'O(1)'
  preferWhen?: string;             // <= 120 chars, e.g. 'input already sorted'
  visualizer?: string;             // AlgoDef id for compare mode (§14.2)
  files: { java: string; cpp: string };  // relative paths to source files
  isOptimal?: boolean;             // exactly one approach should be true
}

interface Signature {
  name: string;                    // method name
  params: { name: string; type: ParamType }[];
  returns: ParamType | 'void';
  mutates?: string;                // param name if the answer is the mutated param (in-place problems)
  compare?: 'exact' | 'unordered' | 'unordered-nested' | { float: number } | 'checker';
  kind?: 'function' | 'design';    // 'design' = class with operations (MinStack, LRUCache)
}
type ParamType =
  | 'int' | 'long' | 'double' | 'boolean' | 'string' | 'char'
  | 'int[]' | 'long[]' | 'double[]' | 'string[]' | 'char[]'
  | 'int[][]' | 'char[][]' | 'string[][]'
  | 'ListNode' | 'TreeNode' | 'ListNode[]';
```
**Language trap lists** are short and specific, e.g. Java: "`map.get(x)` returns `Integer`; unboxing `null` throws NPE"; C++: "`unordered_map::operator[]` inserts a default element, use `find`".

### 8.4 Approach source files
- Java file: `class Solution { public <ret> <name>(...) { ... } }`. C++ file: `class Solution { public: <ret> <name>(...) { ... } };`.
- Lines between `// @hide-start` and `// @hide-end` are compiled by verify but **hidden in the UI** (use for `import java.util.*;`-style boilerplate only when it would be noise; imports that teach something SHOULD stay visible).
- No `main` method in approach files; the verify script generates the driver (§8.15).
- Code style: ≤ 100 columns, 4-space indent, descriptive variable names, a one-line comment on the key line only. No clever one-liners.
- Each approach MUST be an independently correct solution (never rely on another file).

### 8.5 `tests.json`
```json
{
  "cases": [
    { "args": { "nums": [2,7,11,15], "target": 9 }, "expected": [0,1] },
    { "args": { "nums": [3,2,4], "target": 6 }, "expected": [1,2] },
    { "args": { "nums": [3,3], "target": 6 }, "expected": [0,1] }
  ]
}
```
- ≥ 5 cases, MUST include: minimum size, duplicates, negatives (if allowed), already-sorted, reverse-sorted, and one "large-ish" case (n≈1000–10000) generated deterministically by an optional `generate` entry (`{"gen":"random-int-array","n":5000,"seed":7}`) when the approach is O(n log n) or better. Brute-force approaches are skipped on large cases via `"skipApproaches": ["brute"]`.
- Test data is our own. Where an official example is a trivial public example, it MAY be reused (they are facts, not expression), but prefer original cases.
- `ListNode`/`TreeNode` values in args/expected are serialised as arrays (level-order with `null` for trees; value list for linked lists).
- **Design problems** (`kind: design`): `{ "ops": ["MinStack","push","push","getMin"], "args": [[],[0],[-1],[]], "expected": [null,null,null,-1] }`.

### 8.6 `notes.md` (optional)
Plain Markdown, ≤ 300 words, shown under a collapsed "Deep dive". Only when the idea truly needs it (a proof sketch, a diagram in ASCII, a tricky invariant).

### 8.7 Concept file — `content/concepts/<id>.yaml`
```ts
interface Concept {
  id: string;
  title: string;
  track: 'foundations' | 'arrays-strings' | 'linear-ds' | 'trees' | 'graphs' | 'recursion-dp' | 'advanced';
  order: number;                   // tiebreak for layout and "next up"
  prereqs: string[];               // concept ids
  card: ConceptCard;               // §14.3
  visualizers?: string[];          // AlgoDef ids shown on the hub
  coreProblems: string[];          // 4-8 problem ids that define "mastered" (§14.1); may be empty only if quizOnly
  quizOnly?: boolean;              // foundation concepts with no suitable problems (mastery = retention + quizzes)
  moreProblems?: string[];
  resources?: { title: string; url: string; kind: 'video' | 'article' | 'docs' }[];  // curated links, 0-3
}
interface ConceptCard {
  idea: string;                    // one line
  useWhen: string[];               // 3-5 signals
  complexity: { time: string; space: string; note?: string };
  template: { java: string; cpp: string };   // <= 15 lines each
  pitfalls: string[];              // top 3
  deepDive?: string;               // optional markdown <= 400 words, collapsed
}
```
A complete example is in §24.2.

### 8.8 Sheet file — `content/sheets/<sheet-id>.yaml`
```yaml
id: neetcode-150
name: NeetCode 150
author: NeetCode          # attribution of the list, not of any content
sourceUrl: https://neetcode.io/practice   # where the list was taken from
asOf: 2026-11-01
description: Curated 150 problems grouped by topic.
sections:
  - title: Arrays & Hashing
    problems: [contains-duplicate, valid-anagram, two-sum, group-anagrams, top-k-frequent-elements]
  - title: Two Pointers
    problems: [valid-palindrome, "3sum", container-with-most-water]
```
- Only problem **IDs/order/section names** are stored. Problem IDs not present in `content/problems/` are auto-created as **stub problems** by the build (title from slug, `tier: 3`, `unverified: true`) so every sheet renders completely.
- Custom user sheets (stored in IndexedDB) use the same shape in JSON (`customSheets` table, §9.2).
- Lists MUST be taken from the public lists the owner points to (see §23). Do not guess membership from memory; if a list can't be sourced, skip that sheet and note it in `README.md`.

### 8.9 Path file — `content/paths/<path-id>.yaml`
```yaml
id: placement-30
name: Placement in 30 days
description: Core patterns for campus placements.
language: any
hoursPerDay: 1.5
days:
  - day: 1
    title: Complexity and arrays
    concepts: [complexity-basics, arrays-strings]
    problems: [contains-duplicate, two-sum]
    focus: "Big-O quiz x5, read arrays card"
  - day: 2
    title: Hashing
    concepts: [hashing]
    problems: [valid-anagram, group-anagrams]
# days may repeat the same concept; 'review' days list no new items:
  - day: 7
    title: Review week 1
    review: true
    problems: []
```
Fields: `day` (1-based), `concepts`, `problems`, optional `quizzes: [complexity|pattern]`, optional `review: true`, optional `optional: [problem ids]` (dropped first when compressing a schedule, §15).

### 8.10 Cards file — `content/cards/<concept-id>.yaml`
```yaml
concept: binary-search
cards:
  - id: 1
    type: basic
    front: "Why write mid as lo + (hi - lo) / 2?"
    back: "Avoids int overflow of lo + hi."
  - id: 2
    type: cloze
    text: "Binary search needs the search space to be {{c1::monotonic}} in the condition."
  - id: 3
    type: code
    prompt: "Fill the blank: move left boundary when a[mid] < target"
    code:
      java: "if (a[mid] < target) lo = ____;"
      cpp:  "if (a[mid] < target) lo = ____;"
    answer: "mid + 1"
  - id: 4
    type: complexity
    prompt: "Time to binary search a sorted array of n items?"
    answer: "O(log n)"
```
Types: `basic`, `cloze` (`{{c1::…}}`, one deletion per card in v1), `code` (fill-the-blank), `complexity`, `trap` (language trap: front shows a snippet, back explains). IDs are stable integers; the app card id is `c:<concept>:<id>`. Updating text keeps scheduling state (matched by id).

### 8.11 Quiz files
`content/quizzes/complexity/<topic>.yaml`
```yaml
items:
  - id: 1
    topic: loops
    code:
      java: |
        int count = 0;
        for (int i = 1; i < n; i *= 2)
            count++;
      cpp: |
        int count = 0;
        for (int i = 1; i < n; i *= 2)
            count++;
    time: "O(log n)"               # string, OR { java: "O(n^2)", cpp: "O(n)" } when the answer differs by language
    space: "O(1)"                  # same rule as time
    options:                       # 4-5 plausible choices (time)
      time: ["O(1)", "O(log n)", "O(n)", "O(n log n)"]
      space: ["O(1)", "O(log n)", "O(n)"]
    why: "i doubles each step, so about log2(n) iterations."
    trap: false                    # true if the snippet is a known trick (amortised, language-specific)
    concepts: [complexity-basics]
```
`content/quizzes/patterns.yaml`
```yaml
items:
  - id: 1
    problem: longest-substring-without-repeating-characters
    prompt: "Longest stretch of a string with no repeated character."   # own paraphrase, never the official text
    answer: sliding-window
    distractors: [two-pointers, prefix-sum, dp-1d, monotonic-stack]
    tells: ["contiguous range", "constraint broken by adding right end", "shrink from the left"]
```

### 8.12 Cheat sheets and language guide
- `cheatsheets/*.md`: Markdown with a small front-matter (`title`, `printable: true`). Examples: `big-o-complexities`, `collections-complexity` (per structure: Java and C++ operations), `patterns-at-a-glance`, `bit-tricks`, `cp-header-cpp`.
- `language-guide/*.yaml`: mapping cards:
```yaml
id: priority-queue
title: PriorityQueue vs priority_queue
java: |
  PriorityQueue<Integer> minHeap = new PriorityQueue<>();            // min-heap by default
  PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Collections.reverseOrder());
cpp: |
  priority_queue<int> maxHeap;                                       // max-heap by default
  priority_queue<int, vector<int>, greater<int>> minHeap;
trap: "Default order is opposite in the two languages."
```

### 8.13 Validation rules (enforced by `content:validate`; failing any = build fails)
| Rule | Limit |
|---|---|
| Problem `insight` | ≤ 160 chars |
| Problem `tells` | 2–4 items, each ≤ 70 chars |
| Problem `traps.*` | ≤ 3 items per group, each ≤ 100 chars |
| Approach `idea` | ≤ 200 chars; `unlock` ≤ 140; `preferWhen` ≤ 120 |
| Problem `hints` | ≤ 3 items, each ≤ 120 chars (required for tier 1) |
| Approaches per tier-1 problem | 2–4; exactly one `isOptimal: true` |
| Concept card `idea` | ≤ 140 chars |
| Concept card `useWhen` | 3–5 items ≤ 80 chars each |
| Concept card `pitfalls` | exactly 3 items ≤ 100 chars |
| Concept card `template` | ≤ 15 lines per language |
| `deepDive` / `notes.md` | ≤ 400 / ≤ 300 words |
| IDs | unique, kebab-case, folder name = id |
| References | every referenced concept/problem/pattern/sheet id exists (stubs excepted for sheets) |
| Prereq graph | acyclic; every concept reachable from a root |
| Sheets | no duplicate problem ids within a sheet |
| Cards | cloze has exactly one `{{c1::…}}`; ids unique within file |
| Quizzes | answer ∈ options; ≥ 3 distractors for patterns |
| Copyright guard | no field > 400 chars of prose; warn if text matches a denylist of statement phrases ("Given an array of integers…", "You are given…", "Return the …" at start of insight/prompt) |
| Link hygiene | URLs are https and on an allowlist of domains (leetcode.com, geeksforgeeks.org, codeforces.com, cses.fi, naukri.com/code360, hackerrank.com, youtube.com, cp-algorithms.com, github.com, …) |

### 8.14 Build pipeline (`content:build`)
Outputs (all in `public/content/`):
- `index.json`: `{ contentVersion, concepts[], problems[] (lightweight: id,title,difficulty,tier,topics,patterns,concepts), sheets[], paths[], companies[], patterns[], cheatsheets[] (metadata), languageGuide[], quizzes { complexityCount, patternCount } }`.
- `problems/<id>.json`: full meta + approach source text for both languages (so a problem page loads one small file, ~5–20 KB).
- `concepts/<id>.json`, `cards/<concept>.json`, `quizzes/complexity.json`, `quizzes/patterns.json`, `templates.json`, `cheatsheets/<id>.json`.
- `search-index.json`: MiniSearch serialised index over concept titles/ideas, problem titles/patterns/topics, cheat sheet titles.
- Derived fields: `sheets[]` and `companies[]` on each problem, `companyFreq`, reverse maps (problem → sheets, concept → problems).
- `contentVersion` = `YYYY-MM-DD` + short hash of all inputs.

### 8.15 Verification pipeline (`content:verify`)
1. For each tier-1/2 problem and each approach and each language: copy the approach into a temp dir, **generate a driver** from `signature` + `tests.json` (literals are inlined, so no JSON parser is needed in Java/C++), compile, run each case with a 5 s timeout.
2. Drivers print results in a canonical JSON-like text form; Node parses and compares using `signature.compare`:
   - `exact`: deep equality; `unordered`: sort before compare; `unordered-nested`: sort inner and outer; `{float: eps}`: tolerance; `checker`: a per-problem `checker.mjs` receives (input, output) and returns boolean (for "any valid answer" problems).
3. Java: `javac -d out Solution.java Main.java && java -cp out Main` (with `_harness/java` helpers on the classpath). C++: `g++ -std=c++17 -O2 -Wall -Wextra -o main Solution.cpp main.cpp -I_harness/cpp`; warnings are reported, errors fail.
4. Complexity sanity: for approaches annotated `O(n)`/`O(n log n)`, run the large case and fail if it exceeds 2 s (catches an accidental O(n²)).
5. Output: a table `problem × approach × lang → PASS/FAIL/SKIP` plus a non-zero exit on any FAIL. Results are cached by file content hash in `.verify-cache.json`; only changed files are re-run.
6. `design` problems: the driver instantiates the class named in `ops[0]` and invokes the subsequent operations with the given args; return values compared with `expected` (`null` for void).
7. The script MUST work on the owner's machine with JDK 17+ and g++ available; it prints a clear message and exits non-zero (not crash) if a toolchain is missing.

### 8.16 Content tiers and volume plan
| Tier | Count (target) | Required content |
|---|---|---|
| **1** | ~150 (NeetCode-150-equivalent core) | All approaches (2–4) in **Java + C++**, tests, insight, tells, traps, hints, visualizer link where one exists |
| **2** | ~200 | 2–3 approaches in **Java + C++**, tests, insight, tells |
| **3** | ~150 | Meta only: pattern(s), difficulty, insight, tells, link-out; no code required |
| Stubs | any | Auto-generated for sheet/company entries that have no authored folder |

Target for "top 500 common problems" = Tier 1+2+3. The first release milestone (end of Phase 3) is **30 tier-1 problems fully written**, to prove the pipeline before scaling (§22).

### 8.17 Content updates and versioning
- On app start the loader compares `index.json.contentVersion` to the last seen version (stored in `meta`). If changed, run **card sync**: add new authored cards (suspended until their concept is opened), update changed text in place preserving scheduling, mark removed cards as `orphaned` (kept if the user has review history, hidden otherwise).
- User data never depends on content files except by stable IDs. Removing/renaming a content ID requires adding an alias in `content/aliases.yaml` (`old-id: new-id`) which the app applies when reading user records.

---

## 9. Data model (IndexedDB via Dexie)

Database name `dsa-studio`. Everything the user creates or changes lives here. Content (problems, concepts, …) is **not** copied into the DB; records reference content by stable IDs (§8.1).

### 9.1 Dexie schema (version 1)
```ts
db.version(1).stores({
  meta:            'key',
  settings:        'key',
  progress:        'problemId, status, confidence, nextResurfaceAt, updatedAt',
  attempts:        'id, problemId, at',
  notes:           'id, [scope+refId], updatedAt',
  cards:           'id, conceptId, problemId, due, state, suspended',
  reviewLogs:      'id, cardId, at',
  activityDays:    'date',
  quizResults:     'id, kind, conceptId, at',
  customSheets:    'id, updatedAt',
  pathState:       'pathId',
  conceptState:    'conceptId',
  dailyPlans:      'date',
  bookmarks:       'id, kind, refId',
  friendSnapshots: 'id',
});
```
Schema changes require a new `db.version(n)` with `.upgrade()`, a migration function for export files (§10.5) and a fixture-based test.

### 9.2 Record types
```ts
type Status = 'not_started' | 'attempted' | 'solved';
type Confidence = 'cleared' | 'need_review' | 'dont_understand';
type SolveMode = 'alone' | 'hint' | 'solution';
type MistakeTag =
  | 'wrong_pattern' | 'wrong_data_structure' | 'off_by_one' | 'edge_case' | 'tle'
  | 'overflow' | 'logic_bug' | 'language_syntax' | 'misread_problem'
  | 'gave_up_early' | 'forgot_template';

interface ProgressRecord {
  problemId: string;                 // canonical id (§8.1)
  status: Status;
  confidence: Confidence | null;
  solveMode: SolveMode | null;       // how the latest solve happened
  firstSolvedAt: string | null;
  lastAttemptAt: string | null;
  attempts: number;
  totalTimeSec: number;
  bestTimeSec: number | null;
  mistakeTags: MistakeTag[];         // union over recent attempts (last 5)
  resurface: { stage: number; nextAt: string | null };   // §13.3
  starred: boolean;
  source: 'manual' | 'bulk_import';  // bulk imports do not feed streaks unless dated (§14.7)
  updatedAt: string;
}

interface AttemptRecord {
  id: string;                        // uuid
  problemId: string;
  at: string;
  outcome: 'solved' | 'failed' | 'abandoned';
  mode: SolveMode | null;
  durationSec: number | null;
  approachId?: string;               // which approach they used/ended on
  language?: 'java' | 'cpp';
  mistakeTags: MistakeTag[];
  note?: string;                     // <= 280 chars
  imported?: boolean;                // true for rows created by bulk import (§14.7); excluded from activity unless the user opts in
}

interface NoteRecord {
  id: string;                        // 'n:problem:<id>' | 'n:concept:<id>' | 'n:free:<uuid>'
  scope: 'problem' | 'concept' | 'free';
  refId: string | null;
  title?: string;                    // free notes only
  body: string;                      // soft cap 1000 chars with live counter (short by design)
  createdAt: string; updatedAt: string;
}

interface CardRecord {
  id: string;                        // §8.1
  source: 'authored' | 'generated' | 'user';
  conceptId?: string; problemId?: string;
  // content stored ONLY for source !== 'authored' (authored text comes from content files)
  type?: 'basic' | 'cloze' | 'code' | 'complexity' | 'trap';
  front?: string; back?: string; clozeText?: string;
  fsrs: FsrsCardJson;                // ts-fsrs Card with Dates as ISO strings
  due: string;                       // duplicated from fsrs for indexing
  state: 0 | 1 | 2 | 3;              // New, Learning, Review, Relearning
  suspended: boolean;
  orphaned?: boolean;                // authored card removed from content
  createdAt: string; updatedAt: string;
}

interface ReviewLogRecord {
  id: string; cardId: string; at: string;
  rating: 1 | 2 | 3 | 4;             // Again, Hard, Good, Easy
  durationMs: number;
  fsrsLog: unknown;                  // ts-fsrs ReviewLog JSON
}

interface ActivityDay {              // CACHE, rebuildable from logs (see §10.4) except planCompleted
  date: string;                      // local day key
  solved: number; attempted: number; reviews: number;
  quizzes: number; quizCorrect: number;
  planCompleted: boolean;
}

interface QuizResult {
  id: string; kind: 'complexity' | 'pattern' | 'predict';
  itemId: string; conceptId?: string;
  correct: boolean; answer: string; durationMs: number; at: string;
}

interface CustomSheet { id: string; name: string; sections: { title: string; problems: string[] }[]; createdAt: string; updatedAt: string; }

interface PathState {
  pathId: string; startedAt: string; status: 'active' | 'paused' | 'done';
  shiftDays: number;                 // how many days the schedule has slipped (§15)
  completed: Record<string, boolean>;// keys: 'd3:p:two-sum', 'd3:c:hashing', 'd3:q:complexity'
  moved?: Record<string, number>;    // itemKey -> day it was moved to by Compress (§15.3)
  dropped?: string[];                // itemKeys dropped by Compress
  snapshot?: unknown;                // full Path definition for generated paths (§15.4)
}

interface ConceptState {
  conceptId: string;
  learned: boolean;                  // user ticked "I get it"
  unlockOverride: boolean;           // "Unlock anyway"
  viewedAt: string | null;
  vizRuns: number;
}

interface DailyPlan { date: string; budgetMin: 30 | 60 | 90; items: PlanItem[]; createdAt: string; }   // §13.2
interface Bookmark { id: string; kind: 'problem' | 'concept' | 'visualizer' | 'cheatsheet'; refId: string; at: string; }
interface FriendSnapshot { id: string; name: string; importedAt: string; progress: { problemId: string; status: Status; confidence: Confidence | null }[]; }
```
`meta` keys: `schemaVersion`, `deviceId` (uuid), `createdAt`, `lastContentVersion`, `lastExportAt`, `lastBackupReminderAt`, `fsHandleName`.

### 9.3 Rules
- **Single writer helpers:** every mutation goes through a repository function that also updates `updatedAt`, writes an `AttemptRecord` where relevant, and updates `ActivityDay`.
- **Canonical problem IDs:** `progress` is always keyed by canonical ID; repository functions resolve `equivalentTo` and `aliases.yaml`.
- **Bulk operations** use Dexie transactions.
- **Failure handling:** a `QuotaExceededError` or blocked upgrade shows a blocking dialog with an "Export now" button.
- **No PII:** no email, no name required. `FriendSnapshot.name` is a label the user types.

---

## 10. Export, import, backup and sync

### 10.1 Formats
| Format | Contents | Purpose |
|---|---|---|
| **Full JSON** (`dsa-studio-backup-YYYY-MM-DD.json`) | Everything in §9 | Lossless backup/restore, moving devices |
| **Encrypted JSON** (`.dsabackup`) | Same, AES-GCM encrypted | Private backups |
| **Markdown zip** (`dsa-studio-notes-….zip`) | `notes/problems/<id>.md`, `notes/concepts/<id>.md`, `notes/free/<id>.md`, each with front-matter (`id`, `scope`, `refId`, `updatedAt`) | Human-readable, Obsidian/Git friendly; **round-trip importable** |
| **Progress CSV** | `problemId,title,status,confidence,solveMode,firstSolvedAt,lastAttemptAt,attempts,totalTimeSec,mistakeTags` | Spreadsheets |
| **Anki TSV** | `front<TAB>back<TAB>tags` of all cards (cloze rendered Anki-style) | Leave the app / second brain |
| **Sheet JSON** | A custom sheet (`CustomSheet`) | Share lists with friends |
| **Progress snapshot JSON** | `{ name, progress[] }` minimal | Friend compare (§10.7) |

### 10.2 Full JSON envelope
```json
{
  "app": "dsa-studio",
  "schemaVersion": 1,
  "exportedAt": "2026-11-01T06:30:00.000Z",
  "deviceId": "b0b2…",
  "contentVersion": "2026-11-01-ab12cd",
  "data": {
    "settings": [], "progress": [], "attempts": [], "notes": [], "cards": [],
    "reviewLogs": [], "activityDays": [], "quizResults": [], "customSheets": [],
    "pathState": [], "conceptState": [], "dailyPlans": [], "bookmarks": [], "friendSnapshots": []
  }
}
```
### 10.3 Import
- **Validate first** (zod-style runtime schema or hand-written guards): reject unknown `app`, a `schemaVersion` newer than the app, or malformed records, with a readable error list. Nothing is written until validation passes.
- **Preview:** show counts per table and the export date. Offer **Replace all** (wipe then insert; requires typing `REPLACE` to confirm) or **Merge**.
- **Auto-snapshot:** before any import, the app downloads a safety backup of the current data (user can untick).

### 10.4 Merge rules
- `progress`, `notes`, `cards` (scheduling state), `customSheets`, `conceptState`, `pathState`: per key, record with the **newer `updatedAt`** wins; the loser is listed in a "Merge report" (downloadable).
- `attempts`, `reviewLogs`, `quizResults`: **union by id**.
- `activityDays` is a **cache**: after merge, `rebuildActivityDays()` recomputes `solved/attempted/reviews/quizzes` from `attempts`, `reviewLogs`, `quizResults`, plus merges `planCompleted` by OR. Bulk-imported solved items without dates contribute nothing (§14.7).
- `friendSnapshots`: union by id.
- `settings`: imported values win only for keys the user ticks in the preview ("Also import settings").

### 10.5 Migrations
- `src/db/migrations/vN_to_vN+1.ts` are **pure** functions on the export envelope. Importing an old file runs the chain up to the current version. Every migration has a fixture in `tests/fixtures/export-vN.json` and a test that imports it and asserts invariants.
- The Dexie `.upgrade()` for the live DB mirrors the same change.

### 10.6 Backup safety features
- `navigator.storage.persist()` requested on first meaningful action; the Data page shows persisted status and estimated usage (`navigator.storage.estimate()`).
- **Backup reminder** banner when `lastExportAt` is older than 7 days (configurable) and there is new data since.
- **Folder auto-sync (optional, Chrome/Edge):** user picks a folder via `showDirectoryPicker()`; the handle is stored in IndexedDB (handles are structured-cloneable). On a debounce (30 s after changes) and on `visibilitychange → hidden`, the app writes `dsa-studio-backup.json` and the notes tree (`notes/**/*.md`). If permission lapses, show a one-click "Re-authorize". Feature-detected; hidden on unsupported browsers.
- **Encrypted backup:** Web Crypto. KDF PBKDF2-SHA-256, **600,000** iterations, 16-byte random salt; cipher **AES-256-GCM**, 12-byte random IV. File format: `{ "app":"dsa-studio", "encrypted":true, "v":1, "kdf":{"name":"PBKDF2","hash":"SHA-256","iterations":600000,"salt":"<b64>"}, "iv":"<b64>", "ciphertext":"<b64>" }`. Wrong passphrase → authentication failure message; never write plaintext temp files.
- **No network** is involved in any export/import path.

### 10.7 Friend compare (read-only)
Import a friend's **progress snapshot** (or full JSON, from which only progress is read) into `friendSnapshots`. UI: two-column compare by sheet/topic: "you only", "friend only", "both", with counts and per-sheet percentages. Never merges into the user's own data.

---

## 11. PWA, offline and performance

- `vite-plugin-pwa` with `registerType: 'prompt'` (show "New version available — Reload"; never reload silently while a review session or visualizer run is active).
- **Precache** the app shell (HTML, JS, CSS, icons) and `public/content/index.json`. **Runtime cache** `public/content/**` with `StaleWhileRevalidate`. A "Download everything for offline" button on Data prefetches all content JSON (progress bar; ~10–30 MB expected at full content).
- Web app manifest: name, short_name, icons (192/512 + maskable), theme/background colours, `display: standalone`.
- Code-split by route; visualizer renderers and `highlight.js` languages are loaded on demand. Budget in S6.
- All heavy work (search index load, CSV/zip building, KDF) runs off the main thread where practical (`Worker`), or is chunked.

---

## 12. Global behaviours

### 12.1 Language toggle (Java ⇄ C++)
- A persistent control in the top bar; stored in `settings.language`. It switches **every** code surface: visualizer code panel, approach ladder, concept templates, templates library, language traps, cloze/code cards, complexity quiz snippets.
- A "Show both side by side" option on approach and template views (two-column on desktop).
- Items that exist in only one language fall back to the other with a small badge ("Java only").

### 12.2 Theme
`system | light | dark`, persisted. CSS variables (§20.3). Charts and visualizer tones have light/dark variants and non-colour cues (§20.4).

### 12.3 Search and command palette (Ctrl/Cmd+K)
- Searches: concepts, problems (title, slug, patterns, topics), cheat sheets, language-guide cards, **user notes** (runtime index), sheets, companies, pages/actions.
- Actions: "Go to …", "Start review", "Toggle language", "Export data", "Open random weak problem". Results grouped by type, keyboard-navigable, recent items first.
- Implementation: MiniSearch with prefix + fuzzy 0.2; user-notes index rebuilt incrementally.

### 12.4 Keyboard shortcuts
| Where | Keys |
|---|---|
| Global | `Ctrl/Cmd+K` palette · `g t` Today · `g p` Practice · `g r` Review · `g v` Visualize · `L` toggle language · `?` shortcut help |
| Visualizer player | `Space` play/pause · `←/→` step · `Home/End` first/last · `[`/`]` slower/faster · `R` reset · `P` toggle predict mode |
| Review | `Space` show answer · `1–4` Again/Hard/Good/Easy · `U` undo last · `S` suspend · `E` edit |
| Practice table | `/` focus filter · `j/k` move · `s` cycle status · `c` cycle confidence · `o` open on LeetCode |

### 12.5 Notifications
No push notifications, no email. In-app banners only (backup reminder, new content version, path behind schedule).

---

## 13. Today page and daily plan

### 13.1 Page content
1. Header: date, **streak** (flame + days) with freezes banked, weekly goal ring.
2. **Time budget** selector: 30 / 60 / 90 min (default from settings).
3. **Plan checklist** (§13.2) with estimated minutes, each item deep-linking to the right page; items tick automatically when completion criteria are met.
4. Due-cards card (count, "Start review").
5. Active path card: "Day 7 of 30" (if any).
6. Quick actions: *Random problem from a weak concept*, *5-question pattern drill*, *Complexity quiz*, *Open skill tree*.
7. Banners: backup reminder, new content version, path behind schedule.

### 13.2 Plan item type and generation
```ts
interface PlanItem {
  id: string;
  kind: 'review' | 'resurface' | 'concept' | 'problem' | 'quiz' | 'path';
  title: string;
  refId?: string;               // conceptId | problemId | quiz kind
  estMinutes: number;
  done: boolean;
  reason: string;               // short, deterministic ("12 cards due", "stage 2 resurfacing", "next node in your tree")
}
```
`buildDailyPlan(input): PlanItem[]` is a **pure function** in `src/domain/plan.ts`. Inputs: `now`, `budgetMin`, settings (`newCardsPerDay`, day rollover), `dueCardCount`, `newCardCount`, `resurfaceDue` (problems), `progressMap`, `masteryMap`, `conceptStateMap`, content graph (concepts, core problems, difficulty), active path + today's path items, and recent history (last 7 `ActivityDay`).

Algorithm (deterministic; ties broken by concept `order` then id):
1. **Reviews:** `reviewMin = min(0.5 × dueCardCount, 0.35 × budget)`. Include one `review` item with `cards = floor(reviewMin / 0.5)` (completion = that many reviews logged today). Skip if 0 due.
2. **Resurfacing:** from `resurfaceDue` sorted by days overdue (desc), take up to 2 while total ≤ 0.30 × budget. Each costs 0.6 × its normal estimate (15/30/45 → 9/18/27).
3. **New learning:**
   - If an active path has uncompleted items for today's path day (including slipped items, §15), use those in order; items consume budget by their estimates.
   - Else pick **next concept**: among concepts whose prereqs all have mastery ≥ 0.5 (or `unlockOverride`), `mastery < 0.8`, choose the smallest depth, then smallest `order`. Add a `concept` item (est 10 min: read card + run visualizer) unless already viewed in the last 3 days, then add its unsolved `coreProblems` in ascending difficulty while budget remains (but at most 3).
4. **Fill:** if ≥ 10 min remain: add a 5-question `quiz` (pattern trainer if the concept is a pattern concept, otherwise complexity). If ≥ 20 min remain and a weak concept exists (lowest mastery with ≥ 3 attempts), add one problem from its core list.
5. **Order for display:** reviews → resurfaced → new learning → quiz/fill.
6. **Freeze for the day:** persist to `dailyPlans[date]` on first generation so items don't move while the user works. "Regenerate" button rebuilds (keeping `done` items done). Changing the budget regenerates.
7. **Completion criteria:** `review` = planned count of reviews logged today; `resurface`/`problem` = an attempt logged today for that problem; `concept` = hub opened and ≥ 1 visualizer run, or "I get it" ticked; `quiz` = ≥ 5 answers today; `path` = the path item's own criteria. When all non-optional items are done → `ActivityDay.planCompleted = true` (shows a small celebration; counts toward badges, not required for the streak).

### 13.3 Problem resurfacing (spaced practice for problems)
- **Eligible:** `status = solved` and (`confidence ∈ {need_review, dont_understand}` or `solveMode ∈ {hint, solution}`); or `status = attempted` and `lastAttemptAt` ≥ 2 days ago.
- **Ladder:** intervals `[3, 7, 14, 30, 60]` days by `resurface.stage`. When a problem becomes eligible, `stage = 0`, `nextAt = firstEligibleAt + 3 d`.
- **After a revisit attempt:** solved *alone* and confidence `cleared` → `stage += 1`, `nextAt = now + intervals[stage]` (past the last stage → `nextAt = null`, done); solved with hint/solution or `need_review` → keep stage, `nextAt = now + intervals[stage]`; failed/`dont_understand` → `stage = 0`, `nextAt = now + 3 d`.
- Optional setting (default **off**): resurface *every* solved problem 30/90 days after it was cleared.
- A `resurfaceDue` problem is one with `nextAt ≤ now`.

---

## 14. Core learning features

### 14.1 Skill tree (concept map)

**Purpose:** show what to learn, in what order, and how well you know it. It is the primary learning navigation.

**Data:** all `Concept` files (§8.7). Seed list with prerequisites is in §24.1.

**Layout:**
- Layered DAG, left-to-right. `depth(node) = 1 + max(depth(prereq))` (roots depth 0). Within a layer order by `track` then `order` then barycenter of parents to reduce crossings. Computed in pure TS (no layout library), rendered as SVG with pan (drag) and zoom (wheel/pinch, `+`/`−`, "fit").
- A **track filter** (chips) dims other tracks; a **search** box focuses a node; a **legend** explains states.

**Node visuals:** circular **progress ring** = mastery (0–100%); fill colour by state; icon for state; label below; small badge with `solved/core` count. Hover/focus tooltip: title, one-line idea, mastery breakdown (problems / retention / quizzes), prerequisites missing.

**Node states**
| State | Rule |
|---|---|
| `locked` | any prerequisite has mastery < 0.5 and no `unlockOverride` |
| `available` | all prerequisites ≥ 0.5 (or overridden) and mastery = 0 and not viewed |
| `in_progress` | 0 < mastery < 0.8, or viewed |
| `mastered` | mastery ≥ 0.8 |
Locked nodes are **fully clickable**; the hub shows "Recommended first: <prereq>" and an **Unlock anyway** button (sets `unlockOverride`). **Next up** = the available/in-progress node with the smallest depth and `order` whose mastery < 0.8; it pulses subtly and is surfaced on Today.

**Mastery formula** (pure function `computeMastery(conceptId, inputs) → { total, problems, retention, quiz }` in `src/domain/mastery.ts`)

1. **Problem score** for each problem `p`:
   `base(p)` = 0 if `not_started`; 0.1 if `attempted`; if `solved`: 1.0 (`alone`), 0.7 (`hint`), 0.35 (`solution`), 0.7 if `solveMode` is null (e.g. bulk import).
   `confMult(p)` = 1.0 `cleared`; 0.7 `need_review`; 0.3 `dont_understand`; 0.85 if null.
   `s(p) = base(p) × confMult(p)`.
2. **Problems component** `P = Σ w·s(p) / Σ w` over the concept's `coreProblems` (weight `w = 1` if this concept is the problem's *primary* concept, else 0.5). Problems not in `coreProblems` do not affect mastery.
3. **Retention component** `R` = mean FSRS retrievability (at `now`) over this concept's cards with `reps > 0` and not suspended; `null` if none.
4. **Quiz component** `Q` = mean correctness of the last 5 `QuizResult`s tagged with this concept; `null` if none.
5. `total` = weighted average of the **available** components with weights `P 0.60, R 0.25, Q 0.15`, renormalised over those that are not null. If `P` has no core problems solved/attempted and `R`,`Q` are null → `total = 0`.
6. Clamp to [0,1]. Optional **concept "I get it" tick** adds `+0.05` (cap 1) to `total` to reward conscious reading (shown separately in the tooltip).

**Edge cases:** a concept with 0 core problems is invalid unless `quizOnly: true` (then `P` is null and mastery uses `R` and `Q` only; with neither, mastery is 0 and the user can still tick "I get it"). Cycles are a validation error. Deleting a concept ID without alias leaves its `conceptState` orphaned and ignored.

**Acceptance:** unit tests for `computeMastery` (≥ 12 cases incl. nulls and weights) and the layering function; Playwright test that a locked node can be opened and unlocked.

### 14.2 Visualizer

#### 14.2.1 The step engine (core idea)
Every algorithm is a **pure function that precomputes an array of frames** from an input. The player only plays/pauses/scrubs frames; renderers only draw a frame. Adding an algorithm = one file; no new UI.

```ts
type Lang = 'java' | 'cpp';
type Tone = 'neutral' | 'compare' | 'swap' | 'active' | 'sorted' | 'found'
          | 'range' | 'dim' | 'error' | 'visited' | 'frontier' | 'path';

interface Cell { value: number | string; tone?: Tone; label?: string }
interface Pointer { name: string; index: number }

interface ArrayView  { kind: 'array'; name?: string; cells: Cell[]; pointers: Pointer[];
                       style: 'bars' | 'boxes';
                       brackets?: { from: number; to: number; label?: string }[] }   // window / sorted prefix / search range
interface TreeView   { kind: 'tree'; root: string | null;
                       nodes: { id: string; value: number | string; left?: string; right?: string; tone?: Tone }[];
                       pointers?: { name: string; nodeId: string }[] }
interface GraphView  { kind: 'graph';
                       nodes: { id: string; label: string; x: number; y: number; tone?: Tone; note?: string }[];
                       edges: { from: string; to: string; weight?: number; directed?: boolean; tone?: Tone }[] }
interface GridView   { kind: 'grid'; rows: number; cols: number; cells: Cell[][]; pointers?: { name: string; r: number; c: number }[] }
interface TableView  { kind: 'table'; rowLabels: string[]; colLabels: string[]; cells: Cell[][];
                       arrows?: { from: [number, number]; to: [number, number] }[] }   // DP dependencies
interface ListView   { kind: 'list'; nodes: { id: string; value: number | string; next: string | null; tone?: Tone }[];
                       pointers: { name: string; nodeId: string }[] }
type View = ArrayView | TreeView | GraphView | GridView | TableView | ListView;

interface AuxView { structure: 'stack' | 'queue' | 'deque' | 'heap' | 'set' | 'map' | 'list';
                    name: string; items: (string | number)[]; highlight?: number[] }

interface PredictPrompt { question: string; kind: 'choice' | 'index'; choices?: string[]; answer: string | number; explain: string }
interface PickPrompt    { question: string; target: 'node' | 'cell' | 'index'; valid: (string | number)[]; explainWrong?: Record<string, string> }

interface Frame {
  views: View[];                       // one or more (e.g. merge sort: main array + aux array)
  aux?: AuxView[];                     // queue/stack/heap/set/map panels
  line: string;                        // key into AlgoDef.lines[lang]
  message: string;                     // one short sentence for the live caption
  vars?: Record<string, string | number | boolean | null>;   // watch panel
  counters: Record<string, number>;    // e.g. { comparisons: 12, swaps: 5 }; MUST include 'ops' for compare/race
  invariant?: string;                  // e.g. 'Everything left of i is sorted'
  event?: string;                      // 'swap' | 'found' | 'push' ... enables "jump to next <event>"
  predict?: PredictPrompt;             // pauses in Predict mode
  pick?: PickPrompt;                   // pauses in Drive mode
}

interface AlgoDef {
  id: string; name: string;
  category: 'sorting' | 'searching' | 'graph' | 'tree' | 'dp' | 'linear' | 'backtracking' | 'hashing' | 'string' | 'misc';
  concepts: string[];                  // concept ids
  blurb: string; time: string; space: string;
  input: InputSpec;                    // describes editor + validation + presets
  defaults: unknown;                   // default input
  code: Record<Lang, string>;
  lines: Record<Lang, Record<string, number | number[]>>;   // frame.line -> 0-based line(s)
  run(input: unknown): Frame[];        // PURE, deterministic, <= 5000 frames
  invariants?: string[];
  modes: { predict?: boolean; drive?: boolean; breakIt?: BreakItChallenge[]; race?: boolean };
}
```
**Contract tests (MUST, per algorithm):** (1) final frame satisfies the algorithm's postcondition (sorted / found index correct / distances correct); (2) every `frame.line` key exists in `lines.java` and `lines.cpp`; (3) frames are deep-copied (mutating one frame cannot affect another); (4) ≤ 5000 frames for the maximum allowed input; (5) `run` is deterministic (same input → identical frames); (6) `predict`/`pick` prompts' answers are consistent with the *next* frame.

#### 14.2.2 Player UI
- **Controls:** play/pause, step back/forward, first/last, speed (0.25×, 0.5×, 1×, 2×, 4×; base 800 ms/frame), scrubber with frame ticks, "jump to next/previous `<event>`", loop toggle, reset. Frame counter "Step 12 / 87".
- **Panels:** main canvas (view renderers), **code panel** (current language, current `line` highlighted, gutter line numbers, copy button), **live caption** (`message`), **watch panel** (`vars`), **counters**, **invariant strip**, **aux structures**.
- **Input editor:** typed input with validation and inline errors; `Randomize` (seeded), presets (*random, sorted, reversed, nearly sorted, few unique*), `Paste test case` (accepts `[2,7,11,15]` and `nums = [2,7,11,15], target = 9` forms), share via URL (`#/visualize/bubble-sort?input=5,3,1`).
- **Input limits:** arrays 1–20 for `bars`, 1–30 for `boxes`, values −99…999; graphs ≤ 12 nodes; grids ≤ 10×10; strings ≤ 20 chars; trees ≤ 31 nodes. Exceeding shows a clear message, never freezes.
- **Accessibility:** caption is `aria-live="polite"`; with `prefers-reduced-motion` frames switch instantly (no tweening); tones are never the only cue (§20.4).

#### 14.2.3 Modes
| Mode | Behaviour |
|---|---|
| **Watch** (default) | Normal playback. |
| **Predict, then reveal** | Playback pauses at frames with `predict`; user answers (choice or clicks an index); correct/incorrect feedback with `explain`; results saved as `QuizResult(kind='predict')` tagged with the algorithm's concepts (feeds mastery `Q`). Toggle `P`. |
| **You drive** (Drive) | At frames with `pick`, the user clicks the next node/cell/index; wrong picks show `explainWrong` or a generic hint and don't advance; after 2 wrong picks "Show me". Only for algorithms flagged `drive` (BFS, DFS, Dijkstra, topological sort, binary search, merge step). |
| **Break it** | Each `BreakItChallenge` provides `flawed(input)` and `reference(input)` pure functions and a goal. The user crafts an input; the app runs both and shows a diff. Goals: `wrong-output` (outputs differ) or `worst-case` (op count ≥ threshold). Challenges to ship: *Greedy coin change* (coins `[1,3,4]`, amount 6: greedy 3 coins vs optimal 2), *Binary search with `lo < hi` loop* (single-element arrays fail), *BST validate by checking only children*, *Dijkstra with a negative edge*, *Quick sort first-pivot worst case* (sorted input), *Is selection sort stable?* (needs labelled elements like `2a`, `2b`). |
| **Compare** (approaches) | On a problem page: two approaches that both have a `visualizer` run side by side on the same input, advancing by the shared `ops` counter; summary: "Brute: 45 ops · Hash map: 9 ops (n = 10)". |
| **Race** | Pick 2–4 algorithms of one category; same input; each advances one frame per tick; finishing order by total `ops` with a table of comparisons/swaps. Clearly labelled "steps, not wall-clock time". |

#### 14.2.4 Renderers
SVG for arrays (bars/boxes), trees (positions: x = in-order index, y = depth; ≤ 31 nodes), graphs (explicit `x,y`; presets use circular layout), linked lists; CSS grid for `grid` and `table`. Transitions ≤ 300 ms (position/colour). Each renderer is a React component `({ view }) => JSX` registered in a map by `view.kind`.

#### 14.2.5 Catalogue and phasing
| Phase | Visualizers (id → category) |
|---|---|
| **1 (core)** | `bubble-sort`, `selection-sort`, `insertion-sort`, `merge-sort`, `quick-sort` (sorting); `linear-search`, `binary-search` (searching) |
| **9 (expansion)** | sorting: `heap-sort`, `counting-sort`. linear: `two-pointers-sorted-pair`, `sliding-window-max-sum`, `longest-unique-substring`, `prefix-sums`, `kadane`, `monotonic-stack-next-greater`, `reverse-linked-list`, `floyd-cycle`. searching: `binary-search-on-answer`, `quickselect`. trees: `bst-insert-search-delete`, `tree-traversals` (in/pre/post/level), `heap-push-pop`, `trie-insert-search`. graphs: `bfs-graph`, `dfs-graph`, `flood-fill-grid` (islands), `dijkstra`, `topological-sort-kahn`, `union-find`, `kruskal`, `prim`, `bellman-ford`. dp: `climbing-stairs-dp`, `coin-change-dp`, `knapsack-01`, `lcs`, `edit-distance`, `lis`. backtracking: `subsets`, `permutations`, `n-queens`, `combination-sum`. hashing/strings: `hashmap-internals` (buckets/collisions/resize), `kmp`. misc: `sieve`, `recursion-call-stack` (fibonacci with/without memo). |
Every visualizer lists its `concepts`, so it appears on the right concept hub and in the catalogue.

### 14.3 Concept hub and cheat cards

**Hub page `/concept/:id` layout (top to bottom):**
1. Header: title, mastery ring with breakdown, state chip, prerequisites (chips with their mastery), "I get it" tick.
2. **30-second card:** `idea`, `useWhen` (bullets), complexity chip, `template` (current language, copy button; "show both" toggle), `pitfalls` (3 bullets), collapsed **Deep dive**.
3. **Visualizers** (cards linking to `/visualize/:id`).
4. **Core problems** (progress x/y, status chips; "Start next" button) and **More problems**.
5. **Flashcards:** `n due · m total · k new`; button **Add this concept's cards to my deck** (authored cards start *suspended* and are unsuspended on click; respects the daily new-card limit).
6. **Your common mistakes here** (aggregated `mistakeTags` across this concept's problems).
7. **Resources** (0–3 curated links).
8. **My insight** (note ≤ 1000 chars, with counter).

**Length rules** are enforced (§8.13). Style rules for authors: second person, imperative, no filler, no "In this section we will…"; prefer a diagram or table to a paragraph; every sentence must carry information.

**Cheat sheets** (`/learn/cheatsheets`): each is a single printable page (print CSS) — complexity table (sorting algorithms, data-structure operations), "patterns at a glance" (signal → pattern → template link), bit tricks, Java/C++ collections complexity, and a C++ competitive-programming header.

### 14.4 Practice bank and sheets

**Practice page `/practice`:** one table of all problems (authored + stubs).
- **Columns:** star · status icon · title (link) · difficulty · patterns (chips) · confidence chip · solve mode · last attempt · sheets (count + popover) · companies (count + popover) · tier badge.
- **Filters** (URL-synced): sheet, topic, pattern, concept, difficulty, status, confidence, company, tier, "has approaches", "starred", "due for resurfacing". **Sort:** order in sheet (when a sheet is selected), difficulty, last attempt, company frequency (when a company is selected). Text search over title/slug.
- **Bulk actions** (select rows): set status, set confidence, star, add to custom sheet.
- **Row actions:** open problem page; open on LeetCode (external link icon); quick-set status via `s` / confidence via `c`.

**Sheets:** `/practice/sheet/:sheetId` shows sections with per-section and overall progress bars, plus:
- **Overlap view:** pick sheet A and B → counts of `A∩B`, `A∖B`, `B∖A`, and "Completing A also covers x% of B"; your progress in each part.
- **Dedupe rule (D5):** progress is per canonical problem ID, so a problem is solved everywhere at once.
- **Custom sheets:** create, rename, reorder, add via the table's bulk action, **import** from JSON/CSV (`section,problem` where `problem` is a slug, URL or title, resolved with the matcher of §14.7), **export** as Sheet JSON.
- Bundled sheets (sources in §23): NeetCode 150, Blind 75, Grind 75, Striver A2Z, Striver SDE, Love Babbar 450. If a list can't be sourced, it is omitted rather than guessed.

**Problem page `/problem/:id`:**
1. **Header:** title, difficulty, **Open on LeetCode** button (new tab), star, chips for sheets, companies, patterns, concepts.
2. **30-second view:** *insight*, *tells* (bullets), language traps for the current language (+ "both").
3. **Tracker panel:** status, confidence, solve mode, timer (start/stop/manual), **Log attempt** (§14.6), next resurface date.
4. **Hints → Approach ladder** (§14.5).
5. **My insight** note (≤ 280 chars).
6. **Attempt history** (timeline with outcome, mode, time, mistake tags).
7. **Follow-ups & related** (same pattern/concept, `followups`).
8. **Add review card** button (creates a `generated` card: front "Key idea of <title>", back = `insight`).
Tier-3 / stub problems show the same page minus approaches, with a note "Link-only problem".

### 14.5 Approach ladder (multiple approaches per problem)

- Approaches are ordered brute → optimal. The ladder is a vertical stepper: *Brute force → Better → Optimal*, each step showing name, time/space chips, and between steps the **unlock insight** ("sort first, then two pointers can't skip the answer").
- **Reveal gate (default ON; Settings → "Reveal approaches gradually"):** (1) **Hints** appear one at a time (`hints[]`), each increments `hintsUsed`. (2) **"I'm stuck"** reveals the ladder with names and complexities only. (3) Per approach: **Show idea** → **Show code** (current language; "both" toggle). Revealing any code suggests `solveMode = solution` when logging; using ≥ 1 hint suggests `hint`.
- With the gate OFF, everything is visible.
- **Compare mode:** if ≥ 2 approaches have `visualizer`, a "Run both" button opens the side-by-side player (§14.2.3).
- **Preferred-when** line: "Prefer this when: input already sorted."
- **Code view:** syntax highlighted, copy button, line numbers, language toggle; hidden boilerplate lines (§8.4) are collapsed behind a "show imports" link.

### 14.6 Tracking: status, confidence, solve mode, mistakes

- **Two independent tag systems (D10):** `status` (not started/attempted/solved) and `confidence` (cleared/need review/don't understand). `solveMode` (alone/hint/solution) is optional. Setting `solved` without an attempt creates an `AttemptRecord(outcome='solved', at=now)`.
- **Log attempt dialog:** outcome; solve mode (preselected from hints/code reveals); time (timer value or manual minutes); approach used; mistake tags (multi-select chips from `MistakeTag`); note ≤ 280 chars; confidence (if solved); checkbox **"Add a review card"** (default from settings).
- **Effects:** (a) `progress` upserted; (b) `ActivityDay` incremented; (c) resurfacing recalculated (§13.3); (d) mastery recomputed for the problem's concepts.
- **"Don't understand" helper:** shows a banner "Revisit: <weakest prerequisite or the concept itself>" with a link, chosen as the concept of the problem with the lowest mastery, falling back to its weakest prerequisite if the concept is not yet viewed.
- **Mistake journal** (on `/progress`): distribution of tags (last 30/90 days and all-time), "recurring mistakes" (a tag in ≥ 3 of the last 10 attempts), tag × concept matrix, and a "drill this" button that opens a filtered list of problems where that mistake occurred.

### 14.7 Manual LeetCode sync (no network)

**Entry points:** (1) one-click status toggle everywhere; (2) **Bulk import** page `/import/leetcode`.

**Bulk import input** (paste or file upload; any mix per line):
- problem URLs (`https://leetcode.com/problems/two-sum/…`),
- slugs (`two-sum`),
- numbered titles (`1. Two Sum`, `#1 Two Sum`),
- plain titles (`Two Sum`),
- CSV with an optional header; recognised columns (case-insensitive): `title|name|problem`, `slug|url|link`, `number|id|#`, `status` (rows import only if solved-like: `solved|accepted|ac|done|✓|yes`), `date|solved_at`, `difficulty`, `confidence`.

**Matching (`src/domain/matching.ts`, pure, unit-tested with ≥ 30 cases):**
1. Normalise: trim, strip list numbering (`12.`, `12)`, `#12`), strip trailing difficulty tags (`(Easy)`), collapse whitespace, lowercase.
2. URL → extract slug with `/problems\/([a-z0-9-]+)/`; exact ID lookup.
3. Leading number → lookup by `lcNumber` (only for problems that have it).
4. Slugify the title (non-alphanumerics → `-`, collapse) → exact lookup.
5. Fuzzy: token-set Jaccard ≥ 0.85, or Levenshtein ≤ 2 on slugs of length ≥ 8; the best candidate is marked **fuzzy** and requires an explicit tick in the preview.
6. Anything else → **Unmatched**.

**Preview table:** matched (✓), fuzzy (tick to accept), already solved (skipped), unmatched (with search-to-pick, "Skip", and "Keep in unmatched list"). The unmatched list is persisted in `meta.unmatchedImports` so the user can resolve it later.

**Commit options:** *Solved date*: unknown (default) / today / pick a date / per-row date (CSV). *Credit to heatmap & streak*: **off by default** (bulk imports must not inflate streaks); when on, only rows with an explicit date are credited. Imported rows set `status = solved`, `source = 'bulk_import'`, leave `confidence` and `solveMode` null, and create an `AttemptRecord` with `imported: true` only when a date is available. **Undo:** the previous records of touched problems are saved in `meta.lastImportUndo` and an "Undo last import" button is available for the session and for 24 hours.

### 14.8 Flashcards and spaced repetition

- **Algorithm:** FSRS via `ts-fsrs` (use its documented API at install time: create an empty card, `next(card, now, rating)` for scheduling, retrievability getter for mastery). Parameters: `request_retention = settings.desiredRetention` (0.9), fuzz on, default weights. Ratings: 1 Again, 2 Hard, 3 Good, 4 Easy. Dates serialised as ISO strings in `CardRecord.fsrs`.
- **Card sources:**
  1. **Authored** (from `content/cards/*.yaml`): created in the DB as `suspended: true` the first time the app sees them; unsuspended by "Add this concept's cards to my deck" (§14.3).
  2. **Generated:** (a) **review cards** from a problem page (front "Key idea of <title>", back = `insight`); (b) **quiz-miss cards** `q:<quizItemId>` created automatically when a complexity/pattern question is answered wrong (setting on by default); (c) **need-review cards** when confidence is set to `need_review`/`dont_understand` (setting on by default; one card per problem, id `p:<problemId>:insight`).
  3. **User cards:** `u:<uuid>` created in the card browser (basic or cloze).
- **Card types / faces:** `basic` (front → back); `cloze` (text with one `[…]` hole → reveal fills it); `code` (snippet with `____` in the current language → answer); `complexity` (prompt → answer); `trap` (snippet → what goes wrong). All are **self-graded** (no typed-answer checking). Code/trap cards show the current language, with Java/C++ toggle on the card.
- **Session:** queue order = learning/relearning due → review due (earliest due first) → new cards interleaved at about **1 new per 4 reviews** until `newCardsPerDay` (default 10); `maxReviewsPerDay` default 100 (0 = unlimited). Progress bar, timer per card (for `durationMs`), keyboard `Space` / `1–4` / `U` undo (restores the previous card state and deletes the last log) / `S` suspend / `E` edit (user/generated cards only; authored cards are read-only but can be suspended, or "copied to my cards").
- **Leeches:** `lapses ≥ 8` → suspend automatically and show a banner "Leech: rewrite it or drop it".
- **Cram mode:** review a chosen concept's cards ignoring due dates, **without** changing scheduling (no logs).
- **Browser `/review/browse`:** table with search, filter by concept/type/state/suspended, bulk suspend/unsuspend/delete (user/generated only), create user card.
- **Stats (on /progress):** reviews per day (bar), retention rate (Good+Easy / all, last 30 days), card counts by state, 30-day forecast of due cards.
- **Orphans:** authored cards removed from content are hidden unless they have review history.

### 14.9 Quizzes

**Complexity quiz `/tools/complexity-quiz`**
- Session = 10 items (configurable 5/10/20), filter by topic (`loops`, `recursion`, `amortised`, `strings`, `data-structures`, `language-traps`) or concept.
- Each item: code snippet in the **current language**; choose **time** and **space** from the options; **Check** reveals correct answers, the `why` line (one–two sentences), and a **Trap!** badge when `trap: true`. An item is **correct only if both time and space are right**; partial credit is shown but recorded as incorrect.
- Selection weighting: unseen first; otherwise weight = `1 + 2 × (wrong in last 3 attempts)`. Never repeat an item within a session.
- Wrong answers create a quiz-miss card (setting). Results saved as `QuizResult(kind='complexity')`.
- Seed items must include language-specific traps (see §24.5): Java `String +=` in a loop (O(n²)) vs C++ `std::string +=` (amortised O(n)); `ArrayList.remove(0)` O(n); `LinkedList.get(i)` O(n); amortised two-pointer loops; nested loops that are *not* O(n²); recursion trees (`fib` O(2ⁿ), merge sort O(n log n), subsets O(n·2ⁿ)); harmonic loops O(n log n); `sort` inside a loop.

**Pattern trainer `/tools/pattern-trainer`**
- Shows a **problem title + our own paraphrased one-line prompt** (never the official statement) and asks "Which pattern?" with 6 options (answer + distractors, shuffled with a seeded RNG).
- After answering: reveals the **tells** that point to the pattern, links to the pattern's concept/template and the problem. Results saved as `QuizResult(kind='pattern')`; accuracy per pattern appears on /progress ("Pattern spotter" accuracy).
- Modes: 5-question drill (used by the daily plan), "weak patterns only", "timed (30 s each)".

### 14.10 Big-O growth plotter `/tools/bigo`

- **Curves:** `1`, `log n`, `√n`, `n`, `n log n`, `n²`, `n³`, `2ⁿ`, `n!` (checkbox per curve; colours from the tone palette with distinct dash patterns for accessibility).
- **Controls:** `n` slider (log scale 1 → 10⁶, plus a number input), **operations/second** preset (10⁷, **10⁸ default**, 10⁹), y-axis linear/log, "zoom to selected n".
- **Chart:** SVG, hand-rolled; curves computed in **log space** (using `lgamma` for `n!`) to avoid overflow; values above 10³⁰⁰ display as "∞ (huge)". Markers at the chosen `n`.
- **Table at selected n:** each complexity → operation count (scientific notation) → estimated time at the chosen speed in human units (ms, s, min, h, days, years, or "longer than the age of the universe" when > 4.3×10¹⁷ s). Rows beyond ~1 s are tinted as "too slow".
- **Constraint helper:** input `n ≤ ____` → suggests feasible complexities using this table (rule of thumb at ~10⁸ simple ops):
  | n up to | Feasible |
  |---|---|
  | 10–11 | O(n!) |
  | 20–25 | O(2ⁿ) |
  | 500 | O(n³) |
  | 5,000 | O(n²) |
  | 10⁶ | O(n log n) |
  | 10⁸ | O(n) |
  | 10⁹+ | O(log n) / O(1) |
- Disclaimer line: "Rule of thumb, not a benchmark."

### 14.11 Progress, streaks, heatmap, goals, reports

**Heatmap (`/progress`, also a compact version on Today):** GitHub-style SVG grid, 53 columns × 7 rows; week starts on Monday (setting). Activity units per day: `units = 3·solved + attempted + floor(reviews/10) + floor(quizzes/5)` (imported rows excluded unless opted in). Levels: 0 → none; 1–2 → L1; 3–5 → L2; 6–9 → L3; ≥ 10 → L4. Tooltip: date + counts. Range: last 12 months or a chosen calendar year. Colours via tokens with 5 steps in light and dark.

**Active day:** a day is active if `solved ≥ 1 || attempted ≥ 1 || reviews ≥ settings.streakMinReviews (5) || quizzes ≥ 5`.

**Streak algorithm** (pure, `src/domain/streak.ts`, deterministic replay over `ActivityDay`s — no stored streak state):
```
streak = 0; freezes = 0; longest = 0
for day d from firstActiveDay to today:
    if active(d):            streak += 1; longest = max(longest, streak)
                             if streak % 7 == 0: freezes = min(2, freezes + 1)
    else if d == today:      pass                      # today isn't over yet; do not break
    else if freezes > 0:     freezes -= 1; mark d as 'frozen'   # streak value unchanged
    else:                    streak = 0
return { streak, longest, freezes, frozenDays }
```
UI: flame + number, tooltip "2 freezes banked", frozen days drawn with a snowflake on the heatmap. A freeze is consumed automatically for a missed day. Unit tests must cover: empty history, single day, gap with/without freeze, freeze cap, today-not-yet-active, rollover hour.

**Weekly goal:** default **5 problems solved + 50 card reviews** per week (Mon–Sun), configurable; shown as two rings on Today and Progress.

**Weak-topic report:** (1) concepts with `mastery < 0.5` and some activity, sorted ascending, each with a "Practice" button (opens next unsolved core problem); (2) **stale** concepts (mastery ≥ 0.5 but untouched for 30 days: retention risk); (3) pattern accuracy table from `QuizResult`s; (4) mistake journal (§14.6).

**Other charts:** problems solved per week (bar, 12 weeks), time per pattern (sum of attempt durations by primary pattern), solve-mode distribution (alone/hint/solution), difficulty distribution, per-sheet and per-company progress bars, review stats (§14.8).

**Badges (derived, not stored):** First solve · 10/50/100/250/500 solved · 7/30/100-day streak · First concept mastered · Track mastered (all concepts in a track ≥ 0.8) · Sheet 25/50/100% · 100/1000 reviews · 20 correct quiz answers in a row · Pattern spotter (≥ 90% on ≥ 50 pattern items) · Perfect week (weekly goal met 4 weeks in a row). Each badge has a pure `earned(state) → { earned: boolean; at?: string }`.

**Weekly report image:** "Export weekly report" renders a 1080×1350 PNG via `<canvas>`: week range, solved by difficulty, reviews, streak, top concept progress, mini heatmap strip, "mistake of the week", app name. Buttons: Download PNG, Copy to clipboard. Entirely local.

---

## 15. Learning paths

### 15.1 Path model
Defined in §8.9. A path is an ordered set of days; each day has concepts, problems, optional quizzes, an optional `review: true` marker and `optional` items. Paths are content files; **generated** paths (company-based, §15.4) are produced at runtime and snapshotted into `PathState` when started.

### 15.2 Schedule semantics
- Starting a path sets `startedAt = today` (day key). `todayIndex = daysBetween(startedAt, today) + 1 − shiftDays` (clamped to ≥ 1). Items completed are stored in `PathState.completed` by key `d<N>:p:<id>`, `d<N>:c:<id>`, `d<N>:q:<kind>`; completing a problem in the practice flow (attempt logged / marked solved) auto-completes matching path items on any day (so work done early is credited).
- **Behind detection (on app open):** required items from days `< todayIndex` that are not complete. Show a banner "Behind by *k* items" with three actions:
  1. **Shift schedule** (`shiftDays += 1` or choose N): every remaining day moves later.
  2. **Compress** (§15.3).
  3. **Ignore** (keep going; items stay visible under "Overdue").
- Finishing the last day marks the path `done` and shows a summary (items done, mastery gained per concept).

### 15.3 Compress algorithm (pure function, previewed before applying)
Let `D_rem` = days left (including today). `U` = unfinished required items from past days in original order.
1. Remove `optional` items and `review: true` days from the remaining days first.
2. Append `U` to the remaining days round-robin so that each day gets at most `ceil(|U| / D_rem)` extra items, keeping concept order.
3. Re-estimate each day's minutes (problems: 15/30/45 min for easy/medium/hard; concept 10 min; quiz 5 min). If a day exceeds `hoursPerDay × 60 × 1.25`, push its lowest-priority items (problems with highest difficulty first) to later days; if no later day has room, mark them `dropped`.
4. Show a diff (moved / dropped items) and ask to **Apply** or **Cancel**. Applying stores `PathState.moved` / `PathState.dropped`.

### 15.4 Generated company paths ("Prepare for <company>")
From `/companies/:id`: choose window (default `6m`), number of problems (default 60, max 150), time per day (default 1.5 h). Deterministic algorithm: take top-N problems by `freq` (ties by difficulty then id) → sort by (primary concept depth asc, difficulty asc) → fill days up to the time budget with each problem's estimate → prepend the **concept** items needed (first occurrence of each concept gets a `concepts` entry, scheduled the day before its first problem) → insert a `review` day after every 6 days. The result is snapshotted as `PathState.snapshot` so later company-data refreshes do not alter an active path.

### 15.5 Bundled paths (authored)
`placement-30`, `interview-60`, `beginner-to-intermediate` (45 days), `cp-basics-30`. Outlines in §24.6.

---

## 16. Java ⇄ C++ language guide and template library

### 16.1 Language guide `/learn/java-cpp`
- Cards from `content/language-guide/*.yaml` (§8.12): side-by-side Java and C++ code, a one-line trap, optional "complexity" chip. Filter by category: *collections, strings, numbers & overflow, sorting & comparators, memory & references, I/O, recursion limits*.
- **Seed list (author all of these, each ≤ 120 words incl. code):**
  `arraylist-vs-vector`, `hashmap-vs-unordered-map` (iteration order, `[]` inserts in C++, `get` returns null in Java), `hashset-vs-unordered-set`, `treemap-vs-map` (both ordered, O(log n); floor/ceiling vs lower_bound/upper_bound), `priority-queue` (Java min-heap by default vs C++ max-heap by default), `deque-and-stack` (use `ArrayDeque`, not legacy `Stack`), `strings-immutability` (`+=` in a loop; `StringBuilder` vs `std::string` append), `substring-cost`, `sorting-and-comparators` (`a - b` overflow, use `Integer.compare`; C++ comparator must be a strict weak order, never `<=`), `stability` (`Collections.sort`/object `Arrays.sort` stable; `std::sort` unstable → `stable_sort`), `integer-overflow` (Java wraps, **C++ signed overflow is undefined behaviour**), `integer-division-and-modulo` (truncation toward zero; sign of `%` follows the dividend; `Math.floorMod`), `abs-int-min` (`Math.abs(Integer.MIN_VALUE)` is negative), `integer-cache` (`==` on boxed `Integer` outside −128…127), `list-remove-ambiguity` (`List<Integer>.remove(int)` vs `remove(Object)`), `char-arithmetic` (`c - 'a'`, casts), `arrays-2d` (initialisation, jagged vs contiguous, `fill`), `vector-bool` (bit-packed proxy), `pass-by-value-vs-reference` (C++ `&`; Java object references are passed by value), `null-vs-nullptr`, `bit-operations` (`>>>` in Java; `__builtin_popcount` vs `Integer.bitCount`; right shift of negatives), `recursion-depth` (deep recursion may overflow the stack in both; prefer iteration beyond ~10⁴–10⁵), `fast-io` (`BufferedReader` vs `cin.tie(nullptr)` + `ios::sync_with_stdio(false)`), `unordered-map-anti-hash` (CP only), `swap-and-min-max` (`Math.min` vs `std::min`, `std::swap`).
- Each card has `trap` text; the Learn page offers a **"Trap of the day"** (deterministic by date) and a mini-quiz made of the cards (feeds `trap` flashcards).

### 16.2 Template library `/learn/templates`
- One page per pattern with **Java and C++ templates** (≤ 25 lines each), "When to use", "Pitfalls", links to the concept and 3–5 problems; copy button; language toggle and side-by-side.
- **Seed templates:** binary search (exact, lower bound, upper bound, on answer), sliding window (fixed, variable), two pointers (opposite ends, same direction), prefix sum (1D, 2D), monotonic stack, BFS (graph, grid, multi-source), DFS (recursive, iterative), topological sort (Kahn), union-find (path compression + union by rank), Dijkstra (priority queue), trie, heap top-k, backtracking (subsets, permutations, combinations), DP (1D, 2D grid, knapsack, LIS with binary search, LCS), segment tree / Fenwick, KMP / Z-function, modular exponentiation, fast I/O header (C++), custom comparator (both).
- Templates are **compile-checked** by `content:verify` (`javac` / `g++ -fsyntax-only`) and, where feasible, executed against a tiny built-in test.

---

## 17. Later features (not in the MVP; see Phases 9–11)

- **Data-structure playground:** build a BST/heap/graph/linked list by hand (add/remove nodes, drag), then run any compatible visualizer on it (reuses the step engine with a custom input).
- **Mock interview mode:** timed (30/45 min) random problem (filtered by difficulty/concept/company, unsolved or "need review" first), **no hints**, a self-review checklist at the end (*clarified requirements, stated brute force, optimised, analysed complexity, tested edge cases, communicated*), saved as an `AttemptRecord` with `mock: true` (extend the record type when implementing) and summarised in a "mock history" table.
- **Paste & compare (no execution):** paste your own solution beside the approach ladder; side-by-side view with a self-review checklist (complexity matches? edge cases? naming?). Never executes code.

---

## 18. Settings reference

Stored in `settings` (key/value). Defaults are applied when a key is missing.

| Key | Default | Meaning |
|---|---|---|
| `language` | `'java'` | Global code language (`'java' \| 'cpp'`) |
| `showBothLanguages` | `false` | Side-by-side code by default |
| `theme` | `'system'` | `'system' \| 'light' \| 'dark'` |
| `palette` | `'default'` | `'default' \| 'colorblind'` (alternative tone palette) |
| `reducedMotion` | `'system'` | Respect OS setting or force on/off |
| `dayRolloverHour` | `4` | Hour at which a new "day" starts for streaks/plans |
| `weekStart` | `'monday'` | Heatmap / weekly goal start |
| `defaultBudgetMin` | `60` | Daily plan budget (30/60/90) |
| `newCardsPerDay` | `10` | New cards introduced per day |
| `maxReviewsPerDay` | `100` | 0 = unlimited |
| `desiredRetention` | `0.9` | FSRS request retention (0.8–0.97) |
| `revealGate` | `true` | Gradual reveal of approaches (§14.5) |
| `autoCardOnNeedReview` | `true` | Create a review card when confidence = need review / don't understand |
| `autoCardOnQuizMiss` | `true` | Create a card when a quiz answer is wrong |
| `autoCardOnLog` | `false` | Pre-tick "Add a review card" in the log dialog |
| `streakMinReviews` | `5` | Reviews needed for an active day |
| `weeklyGoal` | `{ problems: 5, reviews: 50 }` | Weekly goal |
| `backupReminderDays` | `7` | Banner when last export is older and data changed |
| `creditImportedActivity` | `false` | Count dated bulk-import rows in heatmap/streak |
| `resurfaceAllSolved` | `false` | Also resurface cleared problems after 30/90 days |
| `playerSpeed` | `1` | Default visualizer speed |
| `confirmDestructive` | `true` | Confirm deletes/replace-imports |

---

## 19. Company-tagged problem lists

**Source:** a GitHub repository of company-wise question lists that the owner already has (URL to be provided, §23). The app never calls GitHub at runtime.

**Licence gate (MUST do first):** read the repo's `LICENSE`.
- **Permissive / attribution licence** (MIT, Apache-2.0, CC-BY…): `company:import` converts the data and the result MAY be committed under `content/companies/`; add the repo, commit hash and licence to `THIRD_PARTY.md` and to the in-app credits.
- **No licence or restrictive licence:** do **not** commit or bundle the data. Keep `content/companies/` git-ignored; the owner runs `npm run company:import -- <path-to-local-clone>` on their own machine, and the in-app **Company import** (on `/companies`, accepts the repo's CSV files or a zip) lets friends load their own copy. The app works fully without any company data (the Companies page shows an import prompt).

**Keep only the mapping:** `company → window → [{ problemId, freq }]`. Do not copy titles/statements beyond what the source provides as metadata, and never copy editorial content.

**Parsing (tolerant):** accept CSV headers case-insensitively: `ID|#`, `Title|Name`, `URL|Link`, `Difficulty`, `Acceptance`, `Frequency|Occurrence|Freq`. Extract the slug from the URL (`/problems\/([a-z0-9-]+)/`). Detect the **time window** from the file name or folder (map phrases such as *30 days*, *3 months*, *6 months*, *more than 6 months*, *all* to `'30d' | '3m' | '6m' | '6m+' | 'all'`). Company ID = slugified directory name. Problems not in `content/problems/` become **stub problems** (title from the CSV, difficulty from the CSV flagged `unverified`).

```ts
interface CompanyData {
  id: string; name: string; asOf: string;
  source: { repo: string; commit?: string; license: string };
  windows: Partial<Record<'30d' | '3m' | '6m' | '6m+' | 'all', { problemId: string; freq: number | null }[]>>;
}
```
**Build output:** `public/content/companies/index.json` (id, name, counts per window) and one lazy file per company (`companies/<id>.json`) to keep the initial payload small.

**UI:** `/companies` — searchable grid; each card shows `done/total` for the default window (`6m`) and a progress bar. `/companies/:id` — window tabs, list sorted by `freq` (desc), the practice-table filters, progress summary ("Amazon: 41/120"), **Add all to a custom sheet**, **Make a path from this list** (§15.4). A visible label states *"Snapshot as of <asOf>. Community-sourced; frequency is approximate."* Refreshing the data never touches user progress.

---

## 20. UI / UX specification

### 20.1 Layout and responsiveness
| Breakpoint | Layout |
|---|---|
| ≥ 1100 px | Left sidebar (expanded, labels), content area max-width 1200 px; visualizer uses a 2-pane split (canvas left, code/watch right) |
| 700–1099 px | Sidebar collapsed to icons; visualizer stacks canvas above code |
| < 700 px | Bottom navigation (Today, Tree, Practice, Review, More); tables become cards; visualizer is single column with a sticky control bar |

Top bar (all sizes): search/command palette, language toggle (segmented control "Java | C++"), streak flame with number, theme toggle, overflow menu.

### 20.2 Page wireframes (guidance, not pixel-exact)
**Today**
```
┌ Today · Sun 1 Nov            🔥 12 (2 ❄)     Goal ◔ 3/5  ◔ 31/50 ┐
│ Budget: [30] [60•] [90]                        [Regenerate]      │
│ ┌ Plan ───────────────────────────────────────────────────────┐  │
│ │ ☐ Review 18 cards                         ~9 min   [Start] │  │
│ │ ☐ Revisit: Container With Most Water      ~18 min  (stage 1)│  │
│ │ ☐ Concept: Sliding Window  (next in your tree) ~10 min     │  │
│ │ ☐ Problem: Longest Substring Without Repeating… ~30 min    │  │
│ │ ☐ 5-question pattern drill                  ~5 min         │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ Heatmap (compact)   Path: Placement 30 · Day 7/30   Banners…     │
└───────────────────────────────────────────────────────────────────┘
```
**Skill tree:** full-bleed SVG canvas, track chips + search at top-left, legend bottom-left, zoom controls bottom-right, "Next up" card top-right.

**Concept hub:** single column on mobile; two columns on desktop (left: 30-second card + visualizers; right: problems, flashcards, mistakes, resources).

**Problem page:** left (≈ 60%): 30-second view, hints/approach ladder; right: tracker, timer, my insight, attempt history. On mobile the tracker is a sticky bottom sheet.

**Visualizer**
```
┌ Bubble Sort   [Watch|Predict|Break]  Input: [6,3,8,2,9,1,5] [🎲][presets▼][paste]
│ ┌ Canvas ──────────────────────┐ ┌ Code  [Java|C++] ─────────────┐
│ │   ▇  ▅▅ ▇▇▇ …  (bars)        │ │ 1 void bubbleSort(int[] a) {   │
│ │   i  j  j+1  pointers         │ │ 4   if (a[j] > a[j+1]) {  ◀──  │
│ └───────────────────────────────┘ └────────────────────────────────┘
│ Caption: "Is 8 > 2? Yes, swap them."   Invariant: tail is sorted
│ Watch: i=2 j=3   Counters: comparisons 14 · swaps 6
│ ⏮ ◀ ▶/⏸ ▶ ⏭   ──●────────── Step 21/54    Speed [1×▼]
└───────────────────────────────────────────────────────────────────┘
```
**Review session:** centred card, progress bar on top, question face → "Show answer" → four rating buttons with next-interval hints ("<1m · 10m · 1d · 4d").

### 20.3 Design tokens (CSS variables on `:root`, overridden for dark)
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#fafaf9` | `#121214` |
| `--surface` | `#ffffff` | `#1a1a1d` |
| `--surface-2` | `#f4f4f2` | `#232327` |
| `--text` | `#1c1917` | `#ececea` |
| `--muted` | `#6b6b66` | `#a1a1a8` |
| `--border` | `#e4e4e0` | `#2e2e33` |
| `--accent` | `#4338ca` | `#818cf8` |
| `--accent-contrast` | `#ffffff` | `#0b0b0f` |
| `--ok` / `--warn` / `--danger` | `#15803d` / `#b45309` / `#b91c1c` | `#4ade80` / `#fbbf24` / `#f87171` |

**Visualizer tones (default palette, light / dark):** `compare #d97706 / #fbbf24` · `swap #dc2626 / #f87171` · `active #4338ca / #818cf8` · `sorted #15803d / #4ade80` · `found #0f766e / #2dd4bf` · `range #2563eb / #60a5fa` · `dim #a8a29e / #57534e` (50% opacity) · `error #be123c / #fb7185` · `visited #7c3aed / #a78bfa` · `frontier #c2410c / #fb923c` · `path #0e7490 / #22d3ee` · `neutral #78716c / #a8a29e`.
**Colour-blind palette (Okabe–Ito based):** `compare #E69F00`, `swap #D55E00`, `sorted #009E73`, `found #56B4E9`, `range #0072B2`, `active #CC79A7`, `visited #8E6BBF`, `frontier #F0E442`, `path #000000/#FFFFFF`, others unchanged.

**Heatmap ramp (L0–L4):** light `#ebedf0 → #c6e48b → #7bc96f → #239a3b → #196127`; dark `#232327 → #0e4429 → #006d32 → #26a641 → #39d353`.

**Typography:** system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), mono stack (`ui-monospace, "SF Mono", Menlo, Consolas, monospace`); **no web fonts, no CDN**. Base 16 px (14 px in dense tables). Scale: 12 / 14 / 16 / 18 / 22 / 28 / 36. Line-height 1.5 body, 1.3 headings.
**Spacing:** 4 px base: 4, 8, 12, 16, 24, 32, 48. **Radius:** 6 / 10 / 16. **Shadows:** one subtle elevation for cards/popovers.
**Motion:** micro 120 ms, UI 200 ms, visualizer 300 ms; easing `cubic-bezier(.2,.8,.2,1)`; disabled under `prefers-reduced-motion`.
**Icons:** inline SVG (a small set under `src/components/icons`); an icon library MAY be added.

### 20.4 Accessibility (WCAG 2.2 AA target)
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI graphics in both themes (verify tokens with a script in tests).
- **Never colour alone.** Tone → extra cue: `compare` double outline · `swap` ⇄ glyph above the pair · `sorted` check/underline · `found` ✓ badge · `range` bracket · `error` ✕ · `visited` filled dot · `frontier` dashed outline · `path` thick stroke · `dim` reduced opacity.
- Full keyboard operation; visible focus ring; logical tab order; skip link; `aria-live` captions; roles/labels on custom widgets (tree nodes are focusable buttons; arrow keys move between connected nodes).
- Touch targets ≥ 40 px on mobile. Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Code blocks are selectable and have a copy button with an accessible label.

### 20.5 Copy, empty, error and loading states
- Tone: short, direct, no fluff, no emoji in functional UI (a flame/snowflake icon for streaks is fine).
- **Empty states** always offer the next action ("No cards due. Add a concept's cards →").
- **Errors** say what happened and what to do; data-loss risks (quota, blocked upgrade) are blocking dialogs with "Export now".
- **Loading:** skeletons for lists; the visualizer shows its static first frame instantly.
- Confirm destructive actions (delete card, replace-import) per `confirmDestructive`.

---

## 21. Non-functional requirements

### 21.1 Performance
- Initial JS ≤ 250 KB gzip (route-split; `highlight.js` languages and renderers lazy). First meaningful paint < 2 s on a mid-range laptop; interactions < 100 ms.
- Practice table virtualised (windowed list) for > 200 rows; search < 50 ms for 5,000 items.
- Visualizer: 60 fps for the §14.2.2 input limits; frame generation < 50 ms.
- Per-problem content fetch ≤ 20 KB gzip typical.

### 21.2 Reliability and data safety
- All writes in transactions; the app never leaves half-applied imports (single transaction per import).
- Daily automatic **in-DB snapshot** is NOT used (storage is the thing at risk); safety relies on user exports, backup reminders, `storage.persist()`, and the optional folder sync (§10.6).
- Boot self-check: detect IndexedDB unavailability (private mode / blocked) → show a clear "storage unavailable" page that still allows read-only browsing of content.

### 21.3 Security
- Strict Content-Security-Policy via `<meta>` / host headers: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'`. No `eval`, no inline scripts.
- Markdown rendered with `marked` then **DOMPurify** (allow-list); external links `target="_blank" rel="noopener noreferrer"`.
- Import files are untrusted: validate shape/length; cap sizes (e.g. JSON ≤ 100 MB, single text field ≤ 100 KB); never evaluate content.
- No secrets exist in the app; encryption passphrases are never stored.

### 21.4 Privacy
- No analytics, telemetry, cookies, or third-party requests. Fonts/icons are bundled. The only outbound navigation is user-initiated links.
- Data leaves the device only through user-triggered exports.

### 21.5 Browser support
Latest two versions of Chrome, Edge, Firefox, Safari (≥ 16.4). Features that need Chromium (File System Access) are feature-detected and hidden elsewhere.

### 21.6 Testing strategy
| Layer | Tooling | MUST cover |
|---|---|---|
| Domain unit | Vitest | `mastery` (≥ 12 cases), `streak` (≥ 10), `plan` (determinism, budget fit, edge cases), `resurfacing` ladder, `matching` (≥ 30 inputs), `paths` compress, `bigo` formulas, FSRS wrapper, layering for the tree |
| Engine contract | Vitest | §14.2.1 contract tests for **every** algorithm |
| Data | Vitest + `fake-indexeddb` | repository functions; export→import round trip; migrations from fixtures; merge rules |
| Content | scripts | `content:validate` in CI; `content:verify` for all tier-1/2 |
| Components | Testing Library | StatusPicker, Player controls, Review card, Import preview |
| E2E | Playwright (3–5 smoke) | first-run → toggle language → run visualizer → mark problem solved → export JSON; offline reload; review session |
Coverage target: domain ≥ 90 % lines; overall not enforced.

### 21.7 Code quality and tooling
Prettier + oxlint (or ESLint); `strict` TypeScript; CI (GitHub Actions on `ubuntu-latest`, which has JDK and g++ available through `setup-java`/`apt`) running typecheck, lint, test, `content:validate`, `content:verify`, build. Conventional commits. `README.md` documents setup, scripts, content authoring in 10 lines, and how to add a visualizer.

### 21.8 Legal and content policy
- **No problem statements.** Titles, slugs, links, tags, our own one-line paraphrases and original code only. Never copy editorials, other sites' explanations or solutions.
- Dataset attributions in `THIRD_PARTY.md` and an in-app **Credits** page (sheet authors, company dataset, libraries).
- Footer disclaimer: *"Not affiliated with LeetCode, NeetCode, Striver, GeeksforGeeks, or any listed company. Names are used only to link to and categorise publicly available lists."*
- Sheets/lists are factual orderings of public problems; still keep attribution and do not reproduce accompanying prose.
- The app is for personal use and sharing with friends; if it ever becomes public, re-review licences first.

---

## 22. Roadmap and phases

**Rules:** build in order; each phase ends with the global Definition of Done (**DoD**): `typecheck`, `lint`, `test`, `content:validate`, `build` green; README updated; a short demo script (what to click) written in `README.md`. After each phase, summarise in ≤ 10 bullets and **ask the owner before starting the next phase**. The **MVP = Phases 0–3.**

### Phase 0 — Foundations
- Project setup per §5 (scripts, strict TS, lint, Vitest, Playwright skeleton, Prettier).
- Theme tokens + global CSS, app shell (sidebar, top bar, bottom nav), hash router with lazy placeholder pages for all routes in §7.
- Dexie schema v1 (§9), repository skeleton, `meta` bootstrap (deviceId, createdAt), settings store with defaults (§18), language toggle + theme toggle persisted.
- Export/import skeleton: full JSON envelope with validation and **round-trip test**.
- Content scripts skeleton: `content:validate` and `content:build` handling two sample concept/problem files; loader in `src/content`.
- **DoD extra:** toggles persist across reload; export → clear DB → import restores everything.

### Phase 1 — Visualizer core
- Engine types, `usePlayer`, array renderer (bars/boxes), code panel with highlighting and line sync, caption/watch/counters/invariant, input editor (presets, randomise, paste, URL share), catalogue page, `/visualize/:id`.
- Algorithms: bubble, selection, insertion, merge, quick sort; linear and binary search (Java + C++ code with line maps).
- **Predict mode.** Contract tests for all 7. Keyboard shortcuts (§12.4).
- **DoD extra:** results of predict questions saved as `QuizResult`; reduced-motion honoured.

### Phase 2 — Content pipeline and practice bank
- Full YAML schemas, `content:validate` rules (§8.13), `content:build` outputs (§8.14), `content:verify` (§8.15, Java + C++, caching, compare modes).
- Author the **first 30 tier-1 problems** (§24.3) completely: meta, 2–4 approaches ×2 languages, tests, hints, traps.
- Practice table + filters + problem page + **approach ladder with reveal gate**; tracker (status, confidence, solve mode, timer, log attempt, mistake tags); `progress`/`attempts` repositories; `ActivityDay` updates.
- Sheets: Blind 75 and NeetCode 150 rendered from sourced lists (§23), stubs auto-created; per-sheet progress + overlap view; custom sheets (create/import/export).
- Manual bulk import (§14.7) with matcher tests.
- **DoD extra:** `content:verify` all green for the 30 problems; export/import includes the new tables.

### Phase 3 — Concepts, skill tree, cheat cards (**MVP complete**)
- Author all concepts in §24.1 with real short cards (§8.13 limits) and core problems; mastery computation (§14.1); tree layout + page (pan/zoom, tracks, search, states, next-up); concept hub (§14.3); "I get it"; unlock override.
- Link visualizers to concepts; show core-problem progress on nodes.
- **DoD extra:** tree renders all nodes without overlap at default zoom; `computeMastery` tests; Playwright test for locked → unlock anyway.

### Phase 4 — Flashcards and spaced repetition
- FSRS wrapper, `cards`/`reviewLogs` repos, authored-card sync (§8.17), review session UI with keyboard, undo, suspend, leech handling, cram mode, card browser, user cards, card generation hooks (§14.8), stats.
- Authored cards for **all concepts** (≥ 6 each).
- **DoD extra:** scheduling matches `ts-fsrs` reference outputs in tests; undo restores state exactly.

### Phase 5 — Progress, streaks, Today
- Heatmap, streak replay, weekly goal, badges, weak-topic report, mistake journal, charts, weekly report PNG.
- Today page and `buildDailyPlan`, resurfacing ladder (§13), plan freezing and completion detection, banners.
- **DoD extra:** plan function deterministic and within budget in property tests.

### Phase 6 — Tools, language guide, templates
- Big-O plotter + constraint helper; complexity quiz (**≥ 60 items**, including language-trap items); pattern trainer (**≥ 60 items**); Java ⇄ C++ guide (all seed cards, §16.1); template library (all seed templates compile-checked, §16.2); printable cheat sheets.

### Phase 7 — Data ownership, offline, sharing
- Full merge import (§10.4) with merge report, safety snapshot, migrations framework; Markdown zip (round-trip), CSV, Anki TSV; encrypted backup; folder auto-sync; backup reminders; storage persistence UI; PWA with update prompt and "download for offline"; friend compare; Credits page.

### Phase 8 — Companies and learning paths
- Company import (§19) with licence gate; Companies pages; generated company paths (§15.4); bundled paths (§24.6) with behind-detection, shift and compress.

### Phase 9 — Visualizer expansion and modes
- Remaining visualizers (§14.2.5), renderers for trees/graphs/grids/tables/lists, **Drive**, **Break it** (all six challenges), **Compare** (hook into problem pages), **Race**.

### Phase 10 — Content scale-up and polish
- Author in **batches of ~20 problems** (each batch must pass `content:verify`): grow to tier 1 ≈ 150, tier 2 ≈ 200, tier 3 ≈ 150; remaining sheets (Striver A2Z/SDE, Babbar 450, Grind 75) and equivalence mappings.
- Accessibility audit (axe + manual keyboard), performance pass (bundle analysis, virtualised lists), empty/error states sweep, README and contribution guide.

### Phase 11 — Optional extras
- Data-structure playground, mock interview mode, paste & compare (§17).

---

## 23. Open questions, risks, glossary

### 23.1 Open questions (with defaults to use if the owner does not answer)
| # | Question | Default |
|---|---|---|
| Q1 | URL of the company-wise GitHub dataset (and its licence)? | Ask in Phase 8. Until provided, ship the **import-your-own** flow (§19); never fabricate company data. |
| Q2 | Sources for the practice sheets (NeetCode 150, Blind 75, Grind 75, Striver A2Z / SDE, Love Babbar 450)? | Use the official public pages of each list (the creators' own sites/repos). Skip any list that cannot be sourced and record that in `README.md`. Store only problem IDs/order/section names (§8.8). |
| Q3 | Final product name? | Keep **DSA Studio** (`APP_NAME` constant). |
| Q4 | Hosting? | Static hosting (Vercel/Netlify/GitHub Pages); `dist/` output; HashRouter means no rewrite rules are needed. |
| Q5 | Default theme? | `system`. |
| Q6 | Are JDK 17+ and `g++` (C++17) installed on the owner's machine? | Assume yes; `content:verify` prints exact install hints if not. |
| Q7 | Non-LeetCode problems in Striver/Babbar sheets? | Link-only stub problems; use `equivalentTo` where an equivalent LeetCode problem is known with certainty. |
| Q8 | Day rollover hour and streak thresholds? | 04:00; 1 solve/attempt or 5 reviews or 5 quiz answers (§14.11). |
| Q9 | Repository and commits? | `git init`; one commit per phase milestone; optional private GitHub repo. |
| Q10 | Should friends' data ever merge into the owner's? | No. Friend data is read-only comparison (§10.7). |

### 23.2 Risks and mitigations
| Risk | Mitigation |
|---|---|
| **Content effort** (500 problems × approaches × 2 languages) | Tiering (§8.16), batches of ~20, strict schemas so batches are cheap to review, verify script to catch errors, stubs make sheets complete from day one |
| **Verification harness complexity** (linked lists, trees, design problems) | Phase it: primitives/arrays first, then `ListNode`/`TreeNode` helpers, then `design` kind; unsupported problems are tier 2 "no-verify" with an explicit `verify: skip` and reason (reviewed manually) |
| **Browser storage eviction / user clears data** | `storage.persist()`, backup reminders, folder sync, one-click export, clear warning on the Data page |
| **Copyright / licences** | §21.8; never store statements; licence gate for datasets (§19); `THIRD_PARTY.md` |
| **Wrong metadata** (difficulty, numbers) | `unverified` flag, validation, ingest from sources not memory; difficulty letters in §24.1 are *from memory* until checked |
| **Scope creep** | Phases with DoD; MVP = Phases 0–3; extras only in Phase 11 |
| **`ts-fsrs` API drift** | Wrap it in `src/domain/srs.ts`; pin the version; reference tests |
| **File System Access API availability** | Feature-detected, optional, never required |
| **Bundle/content size** | Lazy per-problem JSON; route splitting; SW runtime cache |
| **Overwhelming daily plan** | Hard caps, 30/60/90 budgets, freeze-for-the-day, "Regenerate" |

### 23.3 Glossary
- **Frame:** one snapshot of an algorithm run (§14.2.1). **Step engine:** the generator/player/renderer architecture built on frames.
- **Concept:** a node in the skill tree (e.g. `binary-search`). **Pattern:** a problem-solving technique (e.g. `sliding-window`) used to tag problems and drive the pattern trainer.
- **Tier:** depth of content authored for a problem (§8.16). **Stub problem:** auto-created minimal problem so a sheet/company list is complete.
- **Sheet:** a curated ordered list of problems. **Path:** a day-by-day schedule. **Plan:** today's generated checklist.
- **Mastery:** computed 0–1 score for a concept (§14.1). **Canonical ID:** the LeetCode slug used as the problem's identity everywhere.
- **Resurfacing:** spaced re-attempts of problems (§13.3). **FSRS:** the spaced repetition algorithm for cards. **Leech:** a card with ≥ 8 lapses.
- **Cloze:** a fill-in-the-blank flashcard. **Reveal gate:** progressive disclosure of hints/approaches (§14.5).
- **Snapshot (data):** a dated copy of an external list (company data) — never live.

---

## 24. Appendices (seed content and worked examples)

### 24.1 Concept tree seed (≈ 40 nodes) with core problems
Difficulty letters (E/M/H) are **from memory**; set `unverified: true` on each problem until confirmed against the source list at ingest. `quizOnly` concepts have no core problems (mastery uses retention + quizzes only). A problem may be a core problem of several concepts; its *primary* concept (first in its `concepts` array) gets weight 1, others 0.5 (§14.1).

| Concept id | Track | Prereqs | Core problems |
|---|---|---|---|
| `complexity-basics` | foundations | — | *quizOnly* |
| `java-cpp-essentials` | foundations | — | *quizOnly* (language-guide trap cards + quizzes) |
| `recursion-basics` | foundations | — | fibonacci-number E, pow-x-n M, same-tree E, maximum-depth-of-binary-tree E |
| `bit-manipulation` | foundations | — | single-number E, number-of-1-bits E, counting-bits E, missing-number E, reverse-bits E |
| `math-basics` | foundations | complexity-basics | happy-number E, plus-one E, pow-x-n M, count-primes M |
| `arrays-strings` | arrays-strings | complexity-basics, java-cpp-essentials | contains-duplicate E, best-time-to-buy-and-sell-stock E, move-zeroes E, majority-element E, plus-one E |
| `hashing` | arrays-strings | arrays-strings | two-sum E, valid-anagram E, group-anagrams M, top-k-frequent-elements M, longest-consecutive-sequence M |
| `prefix-sums` | arrays-strings | arrays-strings | range-sum-query-immutable E, product-of-array-except-self M, subarray-sum-equals-k M |
| `two-pointers` | arrays-strings | arrays-strings | valid-palindrome E, two-sum-ii-input-array-is-sorted M, 3sum M, container-with-most-water M, trapping-rain-water H |
| `sliding-window` | arrays-strings | two-pointers, hashing | longest-substring-without-repeating-characters M, longest-repeating-character-replacement M, permutation-in-string M, minimum-window-substring H, sliding-window-maximum H |
| `sorting` | arrays-strings | arrays-strings, complexity-basics, recursion-basics | sort-colors M, sort-an-array M, kth-largest-element-in-an-array M, merge-intervals M |
| `binary-search` | arrays-strings | arrays-strings, complexity-basics | binary-search E, search-a-2d-matrix M, koko-eating-bananas M, find-minimum-in-rotated-sorted-array M, search-in-rotated-sorted-array M, time-based-key-value-store M |
| `intervals` | arrays-strings | sorting | merge-intervals M, insert-interval M, non-overlapping-intervals M |
| `matrix-grids` | arrays-strings | arrays-strings | rotate-image M, spiral-matrix M, set-matrix-zeroes M, valid-sudoku M |
| `greedy` | arrays-strings | sorting | maximum-subarray M, jump-game M, gas-station M, non-overlapping-intervals M |
| `strings-advanced` | arrays-strings | hashing, two-pointers | find-the-index-of-the-first-occurrence-in-a-string E, repeated-substring-pattern E, longest-palindromic-substring M |
| `linked-lists` | linear-ds | arrays-strings | reverse-linked-list E, merge-two-sorted-lists E, linked-list-cycle E, remove-nth-node-from-end-of-list M, reorder-list M, add-two-numbers M, lru-cache M |
| `stack` | linear-ds | arrays-strings | valid-parentheses E, min-stack M, evaluate-reverse-polish-notation M, implement-queue-using-stacks E |
| `queue-deque` | linear-ds | arrays-strings | implement-queue-using-stacks E, design-circular-queue M, sliding-window-maximum H |
| `monotonic-stack` | linear-ds | stack | daily-temperatures M, car-fleet M, largest-rectangle-in-histogram H |
| `binary-trees` | trees | recursion-basics, linked-lists | invert-binary-tree E, maximum-depth-of-binary-tree E, diameter-of-binary-tree E, balanced-binary-tree E, same-tree E, subtree-of-another-tree E |
| `tree-traversals` | trees | binary-trees, stack, queue-deque | binary-tree-level-order-traversal M, binary-tree-right-side-view M, count-good-nodes-in-binary-tree M, construct-binary-tree-from-preorder-and-inorder-traversal M, serialize-and-deserialize-binary-tree H |
| `bst` | trees | binary-trees, binary-search | validate-binary-search-tree M, lowest-common-ancestor-of-a-binary-search-tree M, kth-smallest-element-in-a-bst M |
| `heaps` | trees | binary-trees, sorting | last-stone-weight E, kth-largest-element-in-an-array M, k-closest-points-to-origin M, task-scheduler M, find-median-from-data-stream H |
| `tries` | trees | binary-trees, hashing | implement-trie-prefix-tree M, design-add-and-search-words-data-structure M, word-search-ii H |
| `range-queries` | trees | binary-trees, prefix-sums | range-sum-query-mutable M, count-of-smaller-numbers-after-self H |
| `graph-basics` | graphs | hashing, queue-deque | clone-graph M, number-of-provinces M |
| `bfs` | graphs | graph-basics | rotting-oranges M, word-ladder H, clone-graph M |
| `dfs` | graphs | graph-basics, recursion-basics, stack | number-of-islands M, max-area-of-island M, pacific-atlantic-water-flow M, surrounded-regions M |
| `grid-graphs` | graphs | matrix-grids, bfs, dfs | number-of-islands M, rotting-oranges M, max-area-of-island M, pacific-atlantic-water-flow M |
| `topological-sort` | graphs | bfs, dfs | course-schedule M, course-schedule-ii M |
| `union-find` | graphs | graph-basics | number-of-provinces M, redundant-connection M, accounts-merge M |
| `shortest-paths` | graphs | bfs, heaps | network-delay-time M, cheapest-flights-within-k-stops M |
| `mst` | graphs | union-find, sorting | min-cost-to-connect-all-points M |
| `backtracking` | recursion-dp | recursion-basics | subsets M, permutations M, combination-sum M, word-search M, palindrome-partitioning M, letter-combinations-of-a-phone-number M, n-queens H |
| `divide-conquer` | recursion-dp | recursion-basics, sorting | sort-an-array M, median-of-two-sorted-arrays H, kth-largest-element-in-an-array M, pow-x-n M |
| `dp-1d` | recursion-dp | recursion-basics, arrays-strings | climbing-stairs E, house-robber M, coin-change M, longest-increasing-subsequence M, word-break M, decode-ways M |
| `dp-2d` | recursion-dp | dp-1d, matrix-grids | unique-paths M, longest-common-subsequence M, edit-distance M |
| `dp-strings` | recursion-dp | dp-2d | longest-palindromic-substring M, palindromic-substrings M, longest-common-subsequence M, edit-distance M, decode-ways M |
| `dp-knapsack` | recursion-dp | dp-1d | partition-equal-subset-sum M, target-sum M, coin-change-ii M |

(`order` values follow the table order. Adjust core problems freely as long as `content:validate` passes.)

### 24.2 Worked example — concept file
```yaml
# content/concepts/binary-search.yaml
id: binary-search
title: Binary Search
track: arrays-strings
order: 12
prereqs: [arrays-strings, complexity-basics]
visualizers: [binary-search, binary-search-on-answer]
coreProblems:
  - binary-search
  - search-a-2d-matrix
  - koko-eating-bananas
  - find-minimum-in-rotated-sorted-array
  - search-in-rotated-sorted-array
  - time-based-key-value-store
card:
  idea: "Halve a sorted or monotonic search space each step."
  useWhen:
    - "Sorted or rotated-sorted array"
    - "Smallest X such that a yes/no check passes"
    - "Answer lies in a numeric range with a monotonic check"
  complexity: { time: "O(log n)", space: "O(1)" }
  template:
    java: |
      int lo = 0, hi = n - 1;
      while (lo <= hi) {
          int mid = lo + (hi - lo) / 2;      // no overflow
          if (a[mid] == target) return mid;
          if (a[mid] < target) lo = mid + 1;
          else hi = mid - 1;
      }
      return -1;
    cpp: |
      int lo = 0, hi = (int)a.size() - 1;
      while (lo <= hi) {
          int mid = lo + (hi - lo) / 2;      // no overflow
          if (a[mid] == target) return mid;
          if (a[mid] < target) lo = mid + 1;
          else hi = mid - 1;
      }
      return -1;
  pitfalls:
    - "Use mid = lo + (hi - lo) / 2; lo + hi can overflow int"
    - "Pick lo <= hi or lo < hi once, then keep the loop invariant consistent"
    - "If mid does not shrink the range you get an infinite loop"
  deepDive: |
    **Invariant:** the answer, if it exists, is always inside `[lo, hi]`.
    **Binary search on the answer:** if `ok(x)` is monotonic (false…false true…true), search for the first `true`.
resources:
  - { title: "Binary search (CP-Algorithms)", url: "https://cp-algorithms.com/num_methods/binary_search.html", kind: article }
```

### 24.3 First 30 tier-1 problems (Phase 2)
`two-sum`, `contains-duplicate`, `valid-anagram`, `group-anagrams`, `top-k-frequent-elements`, `best-time-to-buy-and-sell-stock`, `valid-palindrome`, `3sum`, `container-with-most-water`, `longest-substring-without-repeating-characters`, `valid-parentheses`, `min-stack`, `binary-search`, `search-in-rotated-sorted-array`, `find-minimum-in-rotated-sorted-array`, `koko-eating-bananas`, `reverse-linked-list`, `merge-two-sorted-lists`, `linked-list-cycle`, `invert-binary-tree`, `maximum-depth-of-binary-tree`, `binary-tree-level-order-traversal`, `validate-binary-search-tree`, `number-of-islands`, `course-schedule`, `climbing-stairs`, `house-robber`, `coin-change`, `subsets`, `merge-intervals`.
Every other problem in §24.1 is created as a stub (tier 3) until authored in Phase 10.

### 24.4 Worked example — problem folder (`two-sum`)
`content/problems/two-sum/meta.yaml`
```yaml
id: two-sum
platform: leetcode
lcNumber: 1
title: Two Sum
url: https://leetcode.com/problems/two-sum/
difficulty: easy
tier: 1
topics: [arrays, hashing]
patterns: [hashing-complement]
concepts: [hashing, arrays-strings]
insight: "For each x, ask whether target − x was already seen."
tells:
  - "Find a pair with a given sum"
  - "Unsorted input, indices required"
  - "One pass beats checking every pair"
hints:
  - "What must be true about the other number?"
  - "Could you remember the numbers you already passed?"
traps:
  java:
    - "map.get returns Integer; unboxing null throws NPE, so test for null first"
  cpp:
    - "unordered_map::operator[] inserts a default 0; use find()"
  both:
    - "Look up the complement before inserting, so an element never pairs with itself"
followups: [two-sum-ii-input-array-is-sorted, 3sum]
signature:
  name: twoSum
  params: [{ name: nums, type: "int[]" }, { name: target, type: int }]
  returns: "int[]"
  compare: unordered
approaches:
  - id: brute
    name: Brute force
    idea: "Check every pair (i, j) until the sum matches."
    time: "O(n^2)"
    space: "O(1)"
    preferWhen: "n is tiny and memory is extremely tight"
    files: { java: approaches/1-brute.java, cpp: approaches/1-brute.cpp }
  - id: hashmap
    name: Hash map, one pass
    unlock: "Remember each value's index so the complement lookup is O(1)."
    idea: "Scan once; look up target − x in a map of seen values, then insert x."
    time: "O(n)"
    space: "O(n)"
    isOptimal: true
    files: { java: approaches/2-hashmap.java, cpp: approaches/2-hashmap.cpp }
```
`approaches/1-brute.java`
```java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) return new int[]{i, j};
            }
        }
        return new int[]{};
    }
}
```
`approaches/2-hashmap.java`
```java
import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();      // value -> index
        for (int i = 0; i < nums.length; i++) {
            Integer j = seen.get(target - nums[i]);        // null if absent
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}
```
`approaches/1-brute.cpp`
```cpp
// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        int n = nums.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (nums[i] + nums[j] == target) return {i, j};
            }
        }
        return {};
    }
};
```
`approaches/2-hashmap.cpp`
```cpp
// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;                      // value -> index
        for (int i = 0; i < (int)nums.size(); i++) {
            auto it = seen.find(target - nums[i]);
            if (it != seen.end()) return {it->second, i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
```
`tests.json`
```json
{
  "cases": [
    { "args": { "nums": [2,7,11,15], "target": 9 },  "expected": [0,1] },
    { "args": { "nums": [3,2,4],     "target": 6 },  "expected": [1,2] },
    { "args": { "nums": [3,3],       "target": 6 },  "expected": [0,1] },
    { "args": { "nums": [-3,4,3,90], "target": 0 },  "expected": [0,2] },
    { "args": { "nums": [0,4,3,0],   "target": 0 },  "expected": [0,3] },
    { "args": { "nums": [1,5,9,14,20], "target": 34 }, "expected": [3,4] },
    { "gen": "random-int-array", "n": 100000, "seed": 7, "skipApproaches": ["brute"] }
  ]
}
```
Generated cases have no `expected`: `content:verify` runs **differential testing** — every non-skipped approach in both languages must produce the same normalised output (and, for problems with a `checker`, a valid one).

### 24.5 Seed quiz items and cards
**Complexity quiz (author at least these in Phase 6, then ≥ 60 total).** `time`/`space` may be a string or `{ java, cpp }` when the answer differs by language.

| # | Snippet (Java shown) | Time | Space | Why / trap |
|---|---|---|---|---|
| 1 | `for (int i = 1; i < n; i *= 2) count++;` | O(log n) | O(1) | i doubles each step |
| 2 | `for (i=0;i<n;i++) for (j=i+1;j<n;j++) count++;` | O(n²) | O(1) | n(n−1)/2 pairs |
| 3 | `for (i=1;i<=n;i++) for (j=i;j<=n;j+=i) count++;` | O(n log n) | O(1) | harmonic series: n/1 + n/2 + … ; **trap** |
| 4 | `String s=""; for (i<n) s += 'a';` | Java **O(n²)** · C++ (`std::string +=`) **O(n)** | O(n) | each Java `+=` copies the string; C++ append is amortised O(1); **language trap** |
| 5 | `int j=0; for (i<n){ while (j<n && a[j]-a[i]<=k) j++; best=max(best,j-i);}` (sorted `a`) | O(n) | O(1) | `j` never moves backwards: amortised; **trap** |
| 6 | `int fib(int n){ return n<2? n : fib(n-1)+fib(n-2); }` | O(2ⁿ) | O(n) | exponential calls; stack depth n |
| 7 | `while (!list.isEmpty()) list.remove(0);` (`ArrayList`) | O(n²) | O(1) | each remove(0) shifts all elements; **trap** |

**Pattern trainer seeds (own paraphrases):**
| Problem | Prompt | Answer | Tells |
|---|---|---|---|
| longest-substring-without-repeating-characters | "Longest stretch of a string with no repeated character." | sliding-window | contiguous range · constraint breaks when adding right end · shrink from left |
| two-sum-ii-input-array-is-sorted | "Find a pair in a sorted list that adds to a target." | two-pointers | sorted input · pair/sum · move the end that fixes the sum |
| koko-eating-bananas | "Smallest speed that still finishes in time." | binary-search-on-answer | "minimum X such that…" · monotonic yes/no check · numeric range |
| daily-temperatures | "For each day, how long until a warmer one?" | monotonic-stack | next greater element · process in one pass · pop smaller values |
| course-schedule | "Can every course be finished given prerequisite pairs?" | topological-sort | dependencies · detect a cycle · order of tasks |
| number-of-islands | "Count connected land regions in a grid." | flood-fill | grid of cells · connected components · mark visited |
| coin-change | "Fewest coins that make an amount." | dp-1d | optimal substructure · overlapping subproblems · greedy fails on some coin sets |

**Card examples:** *basic* "Why `mid = lo + (hi - lo) / 2`?" → "Avoids int overflow of `lo + hi`."; *cloze* "Binary search needs the condition to be {{c1::monotonic}} over the search space."; *trap* "Java: `list.remove(1)` on `List<Integer>` removes …?" → "the element at **index** 1; use `remove(Integer.valueOf(1))` to remove the **value**."; *complexity* "Time to build a heap from n items?" → "O(n) with bottom-up heapify (not n log n)".

### 24.6 Path outlines
**`placement-30`** (≈ 1.5 h/day; items reference §24.1/§24.3 content):
| Day | Concepts | Problems / activities |
|---|---|---|
| 1 | complexity-basics, arrays-strings | contains-duplicate, best-time-to-buy-and-sell-stock; complexity quiz ×5 |
| 2 | hashing | valid-anagram, two-sum, group-anagrams |
| 3 | hashing | top-k-frequent-elements, longest-consecutive-sequence |
| 4 | prefix-sums | product-of-array-except-self |
| 5 | two-pointers | valid-palindrome, 3sum |
| 6 | two-pointers | container-with-most-water; pattern drill |
| 7 | *review* | resurfaced items + weak spots |
| 8 | sliding-window | longest-substring-without-repeating-characters |
| 9 | sliding-window | minimum-window-substring *(optional)*; pattern drill |
| 10 | stack, monotonic-stack | valid-parentheses, min-stack, daily-temperatures |
| 11 | sorting, binary-search | binary-search, search-in-rotated-sorted-array |
| 12 | binary-search | find-minimum-in-rotated-sorted-array, koko-eating-bananas |
| 13 | linked-lists | reverse-linked-list, merge-two-sorted-lists, linked-list-cycle |
| 14 | *review* | resurfaced items + weak spots |
| 15 | recursion-basics, binary-trees | invert-binary-tree, maximum-depth-of-binary-tree |
| 16 | tree-traversals, bst | binary-tree-level-order-traversal, validate-binary-search-tree |
| 17 | bst | lowest-common-ancestor-of-a-binary-search-tree |
| 18 | heaps | kth-largest-element-in-an-array, find-median-from-data-stream *(optional)* |
| 19 | graph-basics, dfs, grid-graphs | number-of-islands |
| 20 | graphs | clone-graph, course-schedule |
| 21 | *review* | resurfaced items + weak spots |
| 22 | backtracking | subsets, permutations |
| 23 | backtracking | combination-sum |
| 24 | dp-1d | climbing-stairs, house-robber |
| 25 | dp-1d | coin-change |
| 26 | dp-1d | longest-increasing-subsequence, word-break |
| 27 | intervals, greedy | merge-intervals |
| 28 | — | timed set of 3 mixed problems + pattern drill |
| 29 | — | weakest concept's core problems |
| 30 | *review* | mock set + final review |

**`interview-60`:** 8 weeks + buffer — W1 arrays/hashing/two pointers · W2 sliding window, stack, binary search · W3 linked lists, trees · W4 BST, heaps, tries, graph basics · W5 graphs (BFS/DFS/topological/union-find/shortest paths) · W6 backtracking + DP 1D · W7 DP 2D/strings/knapsack, intervals, greedy · W8 mocks, company-specific lists, weak spots · 4 buffer days. Each week ends with a review day.
**`beginner-to-intermediate`** (45 days) follows the same format emphasising easy → medium. **`cp-basics-30`** adds math, bit tricks, fast IO, modular arithmetic, sieve, DSU, segment tree/Fenwick, Dijkstra, with C++ templates first.

### 24.7 Pattern IDs (seed)
`two-pointers`, `fast-slow-pointers`, `sliding-window`, `prefix-sum`, `hashing-complement`, `frequency-map`, `binary-search`, `binary-search-on-answer`, `monotonic-stack`, `monotonic-deque`, `merge-intervals`, `linked-list-reversal`, `tree-dfs`, `tree-bfs`, `bst-property`, `top-k-heap`, `two-heaps`, `k-way-merge`, `topological-sort`, `union-find`, `graph-bfs-shortest`, `graph-dfs-components`, `flood-fill`, `dijkstra`, `backtracking-subsets`, `backtracking-permutations`, `backtracking-combinations`, `dp-1d`, `dp-grid`, `dp-knapsack`, `dp-lcs`, `dp-lis`, `greedy`, `bit-manipulation`, `trie`, `matrix-traversal`, `divide-and-conquer`, `design-data-structure`, `math-number-theory`.

### 24.8 Prompts for starting a new chat
**A. Build prompt (paste together with `PRD.md`):**
```
I'm building "DSA Studio". The complete spec is the attached PRD.md. Read all of it first.
Rules: follow §22 phases in order; start with the phase I name (default Phase 0).
At the start: list what you will build this phase as a task list, then implement it without asking
questions unless something truly blocks you (use the defaults in §23.1 otherwise).
At the end of the phase: run typecheck, lint, tests, content:validate, build; fix failures;
then give me ≤ 10 bullets (what works, how to try it, assumptions) and stop.
I prefer execution over explanation and short bullet points. Do not add AI features.
Current repo state: <paste `ls` or say "empty folder">. Phase to build: <Phase N>.
```
**B. Content-batch prompt:**
```
Using PRD.md §8 and the worked example in §24.4, write problems: <list of slugs> as tier <1|2>.
For each: meta.yaml, 2–4 approaches in Java AND C++, tests.json (≥ 5 cases + edge cases), hints, traps.
Original wording only (no problem statements, no copied editorials). Keep to the length limits in §8.13.
Then run `npm run content:validate` and `npm run content:verify` and fix every failure.
Report: table of problem × approach × language → PASS/FAIL, and anything marked unverified.
```
**C. Review prompt:**
```
Audit the repo against PRD.md §<n>–§<m>. List deviations as: requirement → status (done/partial/missing) → file.
Fix the missing ones unless they need my decision, in which case ask me with options.
```

### 24.9 Global Definition of Done (every feature)
- Works in Java **and** C++ where code is shown; works in light and dark; works with keyboard; works on a 380 px wide screen.
- Persists user data through repositories (never directly from UI); included in export/import and covered by the round-trip test.
- Domain logic has unit tests; content passes `content:validate` and `content:verify`.
- No network calls added; no `any`; no console errors; accessibility cues beyond colour present.
- README/PRD updated if behaviour or schema changed (bump schemaVersion + migration when a stored shape changes).

*End of PRD.*


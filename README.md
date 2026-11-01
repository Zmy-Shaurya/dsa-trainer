# DSA Studio

Local-first DSA learning workstation (Java + C++). Spec: [PRD.md](PRD.md). Status: **Phases 0-4 done**.

```
npm install
npm run dev        # http://localhost:5173
npm run typecheck && npm run lint && npm test && npm run content:validate && npm run build
```

## Phase 0 demo
- Toggle Java/C++ and theme in the top bar; reload, they persist.
- Data page: Export JSON, then Import JSON (type `REPLACE`) restores everything (also covered by `tests/unit/export.test.ts`).
- All routes from PRD §7 exist as placeholders.

## Phase 1 demo (visualizer core)
- Visualize → pick an algorithm (bubble, selection, insertion, merge, quick, linear search, binary search).
- Play/step/scrub, change speed, jump to the next event (swap, compare, ...), loop. Keys: Space, ←/→, Home/End, `[` `]`, R, P.
- Type or paste an input (`5,3,1`, `[2,7,11,15]`, `nums = [2,7,11,15], target = 9`), pick a preset, or Share link (`#/visualize/bubble-sort?input=5,3,1`).
- Predict mode: playback stops at each question; answers are saved as `quizResults` (kind `predict`) and bump today's activity.
- Java/C++ toggle switches the code panel; the current line is highlighted.
- Contract tests for all 7 algorithms: `tests/unit/algos.test.ts`.

## Phase 2 demo (content pipeline and practice)
- `npm run content:validate` / `content:build` / `content:verify` (all 30 tier-1 problems, Java + C++, 138 checks; add a problem id to run one; `--no-cache` to force).
- Practice: search (`/`), filters synced to the URL, sorting, bulk actions, keys j/k/o/s/c.
- Problem page: 30-second view, hints, approach ladder (each rung gated), hidden boilerplate toggle, timer, Log attempt with mistake tags, My insight, attempt history.
- Sheets: Blind 75 and NeetCode 150 (150 problems, 120 are link-only stubs), per-section progress, overlap view, custom sheets (create, rename, reorder, import, export JSON).
- Import from LeetCode (`#/import/leetcode`): paste or upload, preview matched / close / already solved / unmatched, 24 h undo.

## Phase 3 demo (skill tree and concept hubs) - MVP
- Skill tree (`#/tree`): 40 concepts in 6 tracks, laid out as a left-to-right DAG. Drag to pan, wheel or +/- to zoom, Fit, track chips, search, legend, "Next up".
- Rings show mastery (problems 60%, retention 25%, quizzes 15%, "I get it" +5%); badges show solved/core problems. Locked nodes still open.
- Concept hub (`#/concept/<id>`): 30-second card with Java/C++ template, pitfalls, visualizers, core problems with "Start next", your common mistakes, My insight, "I get it", and "Unlock anyway" on locked concepts.
- Try it: open Sliding Window (locked), press Unlock anyway; solve two-sum on the Practice page and watch Hashing's ring move.
- Tests: `tests/unit/mastery.test.ts` (mastery, node states, layout), `tests/e2e/tree.spec.ts` (locked -> unlock anyway; not run here).

## Phase 4 demo (flashcards and spaced repetition)
- 242 authored cards (6+ per concept) in `content/cards/`, checked by `content:validate` (one cloze hole, ids unique, code cards have blanks).
- Open a concept, press "Add this concept's cards to my deck", then Review > Start session. Keys: Space reveals, 1-4 rate, U undo, S suspend, E edit (your own and generated cards).
- FSRS scheduling through `ts-fsrs` (`src/domain/srs.ts`), 1 new card per 4 reviews, daily new and review limits, leech suspension at 8 lapses, cram mode (no schedule changes), card browser with filters, bulk actions and card creation, stats on the Review page.
- Cards from problems: "Make review card" on a problem page; confidence set to need review / don't understand makes a card automatically (setting). Quiz-miss cards have a helper ready for the quizzes in Phase 6.
- Concept mastery now includes retention from your cards.
- Tests: `tests/unit/cards.test.ts` (scheduling matches ts-fsrs, queue, undo restores state exactly, sync, leeches, export round-trip).

## Phase 5 demo (progress, streaks, Today)
- Today (`/`): date, streak with banked freezes, two weekly-goal rings, a 30/60/90 minute plan, cards due, quick actions, banners (backup reminder, new content version) and a compact heatmap. The plan is built once per day and frozen; changing the budget rebuilds it and keeps finished items.
- The plan: reviews (up to 35% of the budget), up to 2 resurfaced problems, the next concept in your tree with its easiest core problems, and one weak-spot problem if 20+ minutes remain. `buildDailyPlan` is pure; property tests check that it is deterministic and never over budget.
- Resurfacing ladder (3, 7, 14, 30, 60 days) is applied whenever an attempt is logged or confidence changes: hinted or unsure solves and stale attempts enter it, clean revisits climb it, failures reset it.
- Progress (`/progress`): 53-week heatmap with year selector and snowflakes on frozen days, streak replay, weekly goals, solved per week, solve modes, difficulty, time per pattern, sheet progress, review stats, weak and stale topics, mistake journal (30/90 days or all time, recurring tags, tag by concept matrix, click a tag to drill it in Practice), 19 badges and a weekly report PNG (1080 x 1350, Download and Copy).
- Streaks are never stored: they are replayed from ActivityDays (7 active days bank a freeze, max 2, today never breaks the streak).
- Tests: `tests/unit/phase5.test.ts` and `tests/unit/dailyPlan.test.ts` (streak cases: empty, single day, gap with and without freeze, freeze cap, today not yet active, rollover hour).

## Phase 6 demo (tools, language guide, templates)
- Big-O plotter (`/tools/bigo`): pick curves (1 to n!), slide n from 1 to 10^6, log or linear y, zoom to n, ops/second presets; the table shows ops and time per curve, tints "too slow" rows and has a constraint helper ("n = 10^5: O(n log n) or better"). Maths is done in log10, so 2ⁿ and n! never overflow ("∞ (huge)" above 10^300).
- Complexity quiz (`/tools/complexity-quiz`): 62 items in 6 topics incl. Java/C++ traps. Time and space must both be right; unseen items first, then recent misses weigh more. Wrong answers become review cards when the setting is on.
- Pattern trainer (`/tools/pattern-trainer`): 80 problem statements, six options each; drill, weak-patterns and timed (30 s) modes, with "the tell" and a link to the template after each answer.
- Java ⇄ C++ guide (`/learn/java-cpp`): all 25 seed cards, category chips, side-by-side view, trap of the day and a 4-question trap mini-quiz.
- Templates (`/learn/templates`): 36 variants in Java and C++ (36 compile-checked), with when-to-use, pitfalls and related problems. Cheat sheets (`/learn/cheatsheets`): 5 printable pages (Print button, print CSS).
- Today: the plan's quiz item is a pattern drill when the next concept is a pattern, otherwise a complexity quiz; quick actions link to both. It ticks after 5 quiz answers.
- Tests: `tests/unit/phase6.test.ts` (big-o maths, `recordQuizAnswer`, plan quiz item) and `tests/content/phase6-content.test.ts` (seeded selection, grading, content minimums).

## Phase 7 demo (data ownership, offline, sharing)
- Data (`/data`): full backup (JSON), encrypted backup (`.dsabackup`: PBKDF2-SHA-256 600,000 rounds, AES-256-GCM, passphrase never stored), notes as a Markdown zip, progress CSV, Anki TSV and a progress snapshot for friends. Nothing here uses the network.
- Import: pick a file, see a preview (counts, export date), then **Merge** (newer `updatedAt` wins; logs are unioned; the activity cache is recomputed) or **Replace all** (type `REPLACE`). A safety backup downloads first unless unticked; settings are imported only if ticked; the merge report is downloadable. Old files go through the migration chain (`src/db/migrations`, fixture `tests/fixtures/export-v1.json`). A notes `.zip` merges back by newer `updatedAt`.
- Storage: shows whether the browser protects the data and how much space is used; asks for protection on your first click. The Today backup reminder now also needs new data since the last backup.
- Folder sync (Chrome/Edge only): `dsa-studio-backup.json` plus `notes/**/*.md` in a folder you pick, 30 s after changes and when the tab is hidden; one-click re-authorize.
- Offline: after the first visit the built app opens with no connection (checked with the server stopped). "Download everything for offline" caches every content file. A new build shows "New version available. Reload"; it never reloads on its own.
- Friend compare (`/data/compare`): load a friend's snapshot (or full backup); see you only / both / friend only per sheet. Read-only, never merged. Credits (`/credits`) and `THIRD_PARTY.md`.
- Tests: `tests/unit/phase7.test.ts` (migrations, merge rules and idempotence, activity rebuild, encryption round-trip and wrong passphrase, CSV, Anki, notes zip round-trip, compare).

## Phase 8 demo (learning paths and companies)
- Paths (`/paths`): `placement-30` (follows the PRD table), `interview-60`, `beginner-to-intermediate` (45 days) and `cp-basics-30`, all in `content/paths/*.yaml` and checked by `content:validate` (days numbered in order, known concepts and problems, review days empty, no problem twice). Start one and day 1 is today; one path is active at a time (starting another pauses it).
- A path page lists every day with ticks. Solved problems and concepts marked learned are credited without a tick, on any day. Falling behind shows "Behind by k items" with **Shift** (1 day or N), **Compress** (a preview of what moves or drops, then Apply or Cancel) or **Ignore** (items stay under Overdue). Finishing the last required item marks the path done.
- Today shows the active path ("Day 6 of 30"), a behind-schedule banner, and builds the plan from the path's items (slipped first) instead of "next concept".
- Companies (`/companies`): no company data is bundled (PRD Q1 is still open). **Import company lists** takes CSV files, a folder or a zip with one folder per company and the time window in each file name (`3. Six Months.csv`, `30 days.csv`), or a `CompanyData` JSON. Columns are matched case-insensitively (Title/Name, URL/Link, Difficulty, Frequency/Occurrence; `85%` is read as 85). Rows with no problem link are skipped and counted, never guessed.
- A company page has window tabs, filters, a done/total summary, **Add all to a custom sheet** and **Make a path from this list**: top N by frequency (default 60, max 150), easier concepts first, filled to your hours a day, each concept's lesson the day before its first problem, a review day after every 6 days. The path keeps its own snapshot, so re-importing never changes it.
- Owner flow: `npm run company:import -- <path-to-local-clone> --repo URL --commit HASH` writes `content/companies/*.json` (git-ignored) and prints a licence verdict; `content:build` then bundles them as `public/content/companies/`. If the licence is permissive, remove the ignore line, add the repo, commit and licence to `THIRD_PARTY.md`.
- Tests: `tests/unit/phase8.test.ts` (schedule, behind detection, compress, plan items, generated paths, CSV parsing, storage) and `tests/content/phase8-content.test.ts` (the four paths, the sample fixture in `tests/fixtures/company-sample`, whose frequencies are made up).

## Phase 9 demo (visualizer expansion and modes)
- `/visualize` now lists 48 visualizers in ten groups: the original 7 plus all 39 from PRD 14.2.5 (heap and counting sort, two pointers, sliding window, Kadane, prefix sums, monotonic stack, linked lists, binary search on the answer, quickselect; BST, traversals, heap, trie; BFS, DFS, flood fill, Dijkstra, topological sort, union-find, Kruskal, Prim, Bellman-Ford; six DP tables; subsets, permutations, N-Queens, combination sum; hash table, KMP, sieve, recursion tree) and two Two Sum variants used by Compare. Each has Java and C++ code with line highlighting, a caption, variables and an `ops` counter.
- Tree, graph, grid, table and list renderers sit beside the array one (`src/components/views.tsx`); stacks, queues, maps and sets show under the picture. Algorithms with a non-array input take a text box with a help line and example presets (`A-B:4 A-C:1 start=A`, `insert 50, search 40`, `abcde | ace`, `1, 3, 4 | amount = 6`); links share the text.
- Mode switch: **Watch**, **Predict** (as before), **Drive** and **Break it**; each appears only where it applies. In **Drive** the player stops at a question and you click the next node, cell or index (BFS, DFS, Dijkstra, topological sort, binary search, the merge step of merge sort). A wrong click explains why; after 2 wrong clicks **Show me** outlines the answer. Results are saved as `predict` quiz results (`drive:<algo>:<step>`).
- **Break it** (`src/engine/breakit.ts`): six flawed implementations, each with Java and C++ code. Greedy coin change, binary search with `lo < hi`, BST validation that only checks children, Dijkstra with a negative edge, quick sort with a first-element pivot (goal: the quadratic maximum) and "is selection sort stable?" (labelled duplicates like `2a`, `2b`). Start input works; find one that does not, use Hint after one try and Show me after two; a short lesson explains the failure.
- **Race** (`/visualize/race`, also "Race it" on a visualizer): 2 to 4 algorithms of one kind on one shared input, one frame per tick, ranked by total `ops` with ties sharing a place and a table of comparisons, swaps and writes. Labelled "steps, not wall-clock time".
- **Compare** (problem page, inside a collapsed "Compare approaches" block): approaches that name a `visualizer` run side by side, synchronised by operations, with the summary line "Brute force: 45 ops · Hash map, one pass: 20 ops (n = 10)". Added to Two Sum (brute vs hash map) and Binary Search (linear vs binary).
- Tests: `tests/unit/algos.test.ts` runs the six contract checks over all 48 (postcondition via each algorithm's `check`, line keys in both languages, deep copies, 5000-frame cap, determinism, predict and pick answers, non-decreasing `ops`); `tests/unit/phase9.test.ts` covers parsing limits, Drive prompts, the six challenges, Race and Compare; `tests/content/phase9-content.test.ts` checks every concept hub and approach points at a real visualizer.

## Phase 10 demo (content batch and polish)

- Eleven new tier-1 problems (Missing Number, Single Number, Majority Element, Maximum Subarray, Product of Array Except Self, Plus One, Happy Number, Is Subsequence, Longest Common Prefix, Number of 1 Bits, Power of Two). Each has two approaches in Java and C++ and passes `npm run content:verify` (182 runs).
- Open any of them from Browse, for example `#/problem/missing-number`, and compare the brute force with the optimal approach.
- A bad address (`#/nope`, `#/paths/none`) now shows a plain "not found" message instead of a framework error; a crash in a page shows a "your data is safe" screen.
- `CONTRIBUTING.md` explains the problem folder format and the validate / verify workflow for adding batches of about 20.

## UI refresh

- Press `Ctrl/Cmd + K` anywhere to search pages, problems, concepts and visualizers; press `?` for the keyboard shortcut list. Today shows an "Up next" card for the single best next action. Phase 10 batch 2 adds 13 more verified problems (54 total).
- New look: one teal accent on a green-tinted stone palette, with a matching dark theme (all colors are tokens in `src/theme/tokens.css`). Geist and JetBrains Mono are bundled through npm, so they work offline, and icons come from Phosphor.
- Layout: a glass sidebar with icons (icon-only on tablets, a scrolling tab bar on phones), a sticky blurred top bar, a two-column Today, a focused column for review sessions, and skeleton screens while pages load.
- Smaller things: the saved theme is applied before first paint (no light flash in dark mode), pages open scrolled to the top, unknown addresses show a not-found page, and the PWA icon and favicon match the new brand.
- Reduced-motion settings still switch every animation off.

## Assumptions
- Project lives at the repo root (no `dsa-studio/` subfolder).
- `content:verify` needs JDK 17+ and g++ (found via PATH, `JAVAC`/`GXX`, or the usual Windows install dirs).
- Sheet lists come from the public NeetCode data file (as of 2026-11-01); problem ids are its link slugs.
- `lcNumber` and difficulty on the 30 authored problems were written from memory and not cross-checked.
- Concept refs are now strict errors in `content:validate`; core problems without an authored folder still show as link-only stubs (warnings).
- Stub problems created from concepts have a placeholder difficulty of medium and are marked unverified.
- Opening a locked concept does not unlock it; only progress or "Unlock anyway" does. A concept you open that is not locked becomes "in progress".
- Cards are sorted new-first by id within the new-card quota; fuzz is on for real reviews and off in tests.
- Review stats appear on both the Review and Progress pages.
- The 242 card texts were written by hand; the code and trap snippets are not compiled.
- The 40 concept cards (templates included) were written by hand and not compiled.
- The "make a review card" button on a problem and `autoCardOnLog` wait for cards (Phase 4).
- Bulk-import undo does not rebuild heatmap credit given by that import.
- `test:e2e` needs `npx playwright install` first.
- Path items reach the daily plan as ordinary `problem`, `concept` and `quiz` items (reason: "day 6 of 30 · path name"), not as a separate `path` kind, so they tick by the usual rules (an attempt today, "I get it" or a visualizer run, 5 quiz answers). A path change rebuilds today's plan and keeps finished items.
- A concept plan item counts as done when you tick "I get it" or open a visualizer linked to that concept (counted as opened, not as understood).
- Plan items stay ticked once done; undoing an attempt does not untick them.
- Regenerating the plan (budget change) keeps finished items on top, so the total can exceed the new budget.
- Badges are computed from your data and never stored. Weekly report Copy needs a browser that allows image clipboard writes; Download always works.
- Both new pages were checked in a browser by hand; the Playwright specs are still not run (browsers not installed).
- The language guide is one file (`content/language-guide/guide.yaml`), not one file per card.
- `templates:verify` (part of `content:verify`) compiles every template (javac, `g++ -fsyntax-only`); templates are not run against test cases.
- Big-O timings are a rule of thumb at the chosen ops/second, not a benchmark.
- The 62 complexity answers and 80 pattern labels were written by hand and not independently reviewed.
- The new tool pages were checked in a browser by hand; print layout was not checked on paper.
- The service worker is hand-written (no vite-plugin-pwa): it precaches the build's files, caches content with stale-while-revalidate, and works only in the built app, not under `npm run dev`.
- Dexie is still schema v1, so there are no real migrations yet; the chain and its test use a synthetic one.
- A friend snapshot from a full backup only reads progress. Friend names are not unique ids (name plus export time).
- Folder sync writes unencrypted files and was only checked for type safety, not against a real folder (the browser pane has no folder picker).
- Merging does not delete anything: a record removed on one device comes back from the other file. Daily plans are never merged (yours win).
- Icons are generated by `scripts/make-icons.ts` (simple bars on a dark tile); install and update prompts were not tried on a phone.
- Imported company lists live in the browser's `meta` store, not in the backup: exports never contain them, and re-importing replaces a company's list without touching progress.
- A problem counts as done on a path when it is solved at any time, including before the path started. "Mastery gained" in the finished summary shows current mastery, since the start value is not stored.
- Compress places overdue items in blocks (in order) over the remaining non-review days; a day over 125% of the budget pushes its hardest problems later or drops them. Concept lessons in generated paths can take a day slightly past the hours budget.
- Companies and paths were checked in a browser by hand with a made-up sample company; no real company dataset has been imported (waiting on its URL and licence).
- Dropped and moved items are not merged specially: `pathState` follows the usual newer-`updatedAt` rule.
- Contract test 6 for Drive: the frame after a pick prompt records the correct answer in `vars.picked`, which must be one of `pick.valid`. Every pick has exactly one valid answer; ties (equal distances, several zero in-degree nodes) are resolved alphabetically and the wrong-answer text says so.
- Graph limits: letters A to L (12 nodes), at most 20 edges, weights -99..99 (non-negative except Bellman-Ford and Break it), no self-loops or duplicate edges; Kruskal and Prim need a connected graph. Grids are up to 10 x 10, strings up to 20 characters (pattern 8, DP strings 10), trees up to 31 slots.
- Inputs that blow past the 5000-frame cap are rejected rather than truncated: N-Queens is limited to n <= 6, permutations and subsets to 5 elements, recursion to fib(8), the sieve to 100.
- The trie and call tree are drawn with computed layouts and are checked by eye in a browser, not by pixel tests; Drive on array and grid pick targets is covered by unit tests only (only the graph picker was clicked through in the browser).
- Compare exists only where a problem approach names a `visualizer`: Two Sum and Binary Search so far. Other problems need brute-force visualizers first (Phase 10 content work).
- Race gives the same array to every contestant; counting sort only accepts 0..15, so a race that includes it rejects other values with that message.
- Compare and Race count steps, not time, and different kinds of steps (a comparison and a hash insert) are weighted equally as one op each.
- Phase 10 is only started: 54 of the ~500 planned problems are authored (the PRD target is tier 1 about 150, tier 2 about 200, tier 3 about 150). The remaining batches, the Striver, Babbar and Grind sheets and their equivalence mappings are not done; `CONTRIBUTING.md` is the recipe for continuing.
- The accessibility check was a scripted audit of names, labels, headings and landmarks across the main routes in a browser; axe was not installed and no screen-reader pass was done. The only unlabeled control is the hidden file input on Data.
- No bundle changes were needed: every page is already a lazy chunk and the main chunk is about 80 kB gzipped. The longest list is Browse (170 problems), which is not virtualised.
- The UI refresh changed styling and markup only; behaviour, routes and data are untouched. It was checked in a browser by hand at desktop, tablet and phone widths in both themes, plus a scripted check for horizontal overflow and console errors on every route.
- The contrast audit was scripted and covered text on the main pages; the SVG visualizer colors and the colorblind palette were not re-measured after the palette change.
- The theme choice is mirrored into `localStorage` (key `dsa-theme`) only so the page can paint in the right theme; the real setting still lives in IndexedDB.

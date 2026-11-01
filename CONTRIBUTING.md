# Contributing content

DSA Studio is content-driven. Most contributions are new problems, and each one is a folder
you can check by machine before it ships.

## Add a problem (a batch of about 20 at a time)

1. Make `content/problems/<slug>/` where `<slug>` is the LeetCode URL slug.
2. Write `meta.yaml`. Copy `content/problems/contains-duplicate/meta.yaml` and change it.
   - `tier`: 1 (core), 2 (important) or 3 (stretch). Tier 1 needs 2 to 4 approaches and hints; tier 2 needs 2 to 3.
   - `patterns` must come from the closed list in `scripts/content-lib.ts` (`PATTERNS`).
   - `concepts` must be ids of files in `content/concepts/`.
   - `signature` (name, params, returns, `compare: exact`) is needed for tiers 1 and 2. The test harness builds the driver from it.
   - Put the best approach last and mark it `isOptimal: true`. Give each approach an `idea`, `time`, `space`; write `unlock` for the insight that leads to it.
3. For each approach add `approaches/<n>-<id>.java` and `.cpp`.
   - Java: `class Solution { ... }`, `import java.util.*;` at the top.
   - C++: keep the `// @hide-start ... // @hide-end` header, then `class Solution { public: ... };`.
4. Write `tests.json`: `{ "cases": [ { "args": {...}, "expected": ... } ] }`. Cover the empty, single, duplicate and extreme cases, and
   for performance-sensitive problems add a generated case (`"gen": "random-int-array"`) that skips the slow approach with `skipApproaches`.
5. Compute `expected` with a reference you trust (a few lines of Python is fine) rather than by hand.

## Check it

```bash
npm run content:validate   # structure, links, ids, patterns
npm run content:verify     # compiles and runs every approach in Java and C++ against tests.json
npm run content:build      # rebuild public/content
npm run typecheck && npm run lint && npm test && npm run build
```

`content:verify` is the gate: a problem is not done until every approach passes in both languages.

## Other content

- Concepts: `content/concepts/*.yaml`. List a concept's `visualizers:` so each visualizer is reachable from a hub.
- Sheets and company lists: see `content/sheets/` and `npm run company:import`. Do not commit a licensed dataset.
- Visualizers: `src/engine/algos/`. A new algorithm must pass the shared contract tests in `tests/unit/algos.test.ts`.

## Rules of thumb

- No AI-generated claims about interviews or companies. Cite nothing you cannot link.
- Link only to hosts on the allow list in `scripts/content-lib.ts`.
- Keep explanations short: one insight sentence, two or three "tells", hints that escalate from nudge to near-answer.

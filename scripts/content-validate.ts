import { knownProblemIds, loadTools, validateTools } from './tools-lib.ts';
import { loadCompanies, loadPaths, validateCompanies, validatePaths } from './paths-lib.ts';
import { loadCards, loadConcepts, loadProblems, loadSheets, validate, validateCards } from './content-lib.ts';

const concepts = loadConcepts();
const problems = loadProblems();
const sheets = loadSheets();
const cards = loadCards();
const r = validate(concepts, problems, sheets, { strictConceptRefs: true });
const tools = loadTools();
const known = knownProblemIds(problems, sheets, concepts);
const paths = loadPaths();
const companies = loadCompanies();
const errors = [...r.errors, ...validateCards(concepts, cards), ...validateTools(tools, concepts, known), ...validatePaths(paths, concepts, known), ...validateCompanies(companies)];
if (r.warnings.length) console.warn(r.warnings.map((w) => `  warn: ${w}`).join('\n'));
if (errors.length) {
  console.error(errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`content ok: ${concepts.length} concepts, ${problems.length} problems, ${sheets.length} sheets, ${cards.reduce((n, f) => n + f.cards.length, 0)} cards, ${tools.complexity.length} complexity and ${tools.patterns.length} pattern quiz items, ${tools.guide.length} guide cards, ${tools.templates.reduce((n, t) => n + t.variants.length, 0)} templates, ${tools.cheatsheets.length} cheat sheets, ${paths.length} paths, ${companies.length} companies`);

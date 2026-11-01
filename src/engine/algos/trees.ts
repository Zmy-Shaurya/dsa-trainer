// Phase 9: tree-shaped visualizers (BST, traversals, heap, trie).
import { arr, aux, Rec, same, treeFromLevels } from '../build';
import { fail, ok, type Parsed } from '../parse';
import type { AlgoDef, Frame, GraphView, TreeView, Tone } from '../types';

const tokens = (t: string) => t.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
const inorderOf = (n: BNode | null, out: number[] = []): number[] => (n ? (inorderOf(n.l, out), out.push(n.v), inorderOf(n.r, out)) : out);

// ---------------------------------------------------------------------- BST
interface BNode { v: number; l: BNode | null; r: BNode | null }
type BstOp = { op: 'insert' | 'search' | 'delete'; v: number };
interface BstIn { ops: BstOp[] }
const ins = (...v: number[]): BstOp[] => v.map((x) => ({ op: 'insert', v: x }));

const bstView = (root: BNode | null, tone: Record<number, Tone> = {}, ptr: { name: string; nodeId: string }[] = []): TreeView => {
  const nodes: TreeView['nodes'] = [];
  const walk = (t: BNode | null) => {
    if (!t) return;
    nodes.push({ id: String(t.v), value: t.v, ...(t.l ? { left: String(t.l.v) } : {}), ...(t.r ? { right: String(t.r.v) } : {}), ...(tone[t.v] ? { tone: tone[t.v] } : {}) });
    walk(t.l);
    walk(t.r);
  };
  walk(root);
  return { kind: 'tree', root: root ? String(root.v) : null, nodes, pointers: ptr };
};

export const bst: AlgoDef<BstIn> = {
  id: 'bst-insert-search-delete', name: 'BST: insert, search, delete', category: 'tree', concepts: ['bst', 'binary-trees'],
  blurb: 'Smaller values go left, larger go right. Deleting a node with two children swaps in its in-order successor.',
  time: 'O(h) per operation', space: 'O(h)', input: {}, modes: {},
  defaults: { ops: [...ins(50, 30, 70, 20, 40, 60, 80), { op: 'search', v: 40 }, { op: 'delete', v: 30 }, { op: 'delete', v: 50 }] },
  samples: [
    { ops: [{ op: 'insert', v: 1 }] },
    { ops: [{ op: 'search', v: 5 }, { op: 'delete', v: 5 }] },
    { ops: [...ins(1, 2, 3, 4, 5), { op: 'delete', v: 1 }, { op: 'delete', v: 3 }] },
    { ops: [...ins(5, 5, 3, 3), { op: 'delete', v: 5 }, { op: 'delete', v: 3 }] },
  ],
  custom: {
    help: 'Operations separated by commas: insert 50, search 40, delete 30 (or i50, s40, d30). Up to 20 operations, values -99..999.',
    parse: (t): Parsed<BstIn> => {
      const ops: BstOp[] = [];
      for (const tok of tokens(t)) {
        const m = /^(insert|search|delete|i|s|d)\s*(-?\d+)$/i.exec(tok);
        if (!m) return fail(`"${tok}" is not an operation. Write insert 5, search 5 or delete 5.`);
        const v = Number(m[2]);
        if (v < -99 || v > 999) return fail('Values must be between -99 and 999.');
        ops.push({ op: ({ i: 'insert', s: 'search', d: 'delete' } as const)[m[1]![0]!.toLowerCase() as 'i' | 's' | 'd'], v });
      }
      return ops.length < 1 || ops.length > 20 ? fail('Enter 1 to 20 operations.') : ok({ ops });
    },
    format: (v) => v.ops.map((o) => `${o.op} ${o.v}`).join(', '),
    presets: [{ label: 'degenerate (sorted inserts)', text: 'insert 1, insert 2, insert 3, insert 4, insert 5, search 5' }, { label: 'delete with two children', text: 'insert 8, insert 4, insert 12, insert 2, insert 6, insert 10, delete 4, delete 8' }],
  },
  code: {
    java: `Node insert(Node t, int v) {
    if (t == null) return new Node(v);
    if (v < t.val) t.left = insert(t.left, v);
    else if (v > t.val) t.right = insert(t.right, v);
    return t;
}
boolean search(Node t, int v) {
    while (t != null && t.val != v)
        t = v < t.val ? t.left : t.right;
    return t != null;
}
Node delete(Node t, int v) {
    if (t == null) return null;
    if (v < t.val) t.left = delete(t.left, v);
    else if (v > t.val) t.right = delete(t.right, v);
    else {
        if (t.left == null) return t.right;
        if (t.right == null) return t.left;
        Node s = t.right; while (s.left != null) s = s.left;
        t.val = s.val; t.right = delete(t.right, s.val);
    }
    return t;
}`,
    cpp: `Node* insert(Node* t, int v) {
    if (t == nullptr) return new Node(v);
    if (v < t->val) t->left = insert(t->left, v);
    else if (v > t->val) t->right = insert(t->right, v);
    return t;
}
bool search(Node* t, int v) {
    while (t != nullptr && t->val != v)
        t = v < t->val ? t->left : t->right;
    return t != nullptr;
}
Node* erase(Node* t, int v) {
    if (t == nullptr) return nullptr;
    if (v < t->val) t->left = erase(t->left, v);
    else if (v > t->val) t->right = erase(t->right, v);
    else {
        if (t->left == nullptr) return t->right;
        if (t->right == nullptr) return t->left;
        Node* s = t->right; while (s->left != nullptr) s = s->left;
        t->val = s->val; t->right = erase(t->right, s->val);
    }
    return t;
}`,
  },
  lines: same({ 'insert-cmp': [2, 3], 'insert-null': 1, 'insert-dup': 4, 'search-cmp': [7, 8], 'search-hit': 9, 'search-miss': 9, 'delete-cmp': [12, 13], 'delete-null': 11, 'delete-leaf': 15, 'delete-one': [15, 16], 'delete-two': [17, 18] }),
  run({ ops }) {
    const r = new Rec();
    let root: BNode | null = null;
    const answers: string[] = [];
    const A = () => [aux('list', 'in-order', inorderOf(root))];
    const f = (line: string, message: string, tone: Record<number, Tone> = {}, event?: string, vars: Frame['vars'] = {}) =>
      r.add({ views: [bstView(root, tone)], aux: A(), line, message, ...(event ? { event } : {}), vars });
    for (const { op, v } of ops) {
      if (op === 'insert') {
        if (!root) { root = { v, l: null, r: null }; r.count('writes'); f('insert-null', `Tree is empty: ${v} becomes the root.`, { [v]: 'found' }, 'insert', { op, v }); continue; }
        let t: BNode = root;
        for (;;) {
          r.count('comparisons');
          f('insert-cmp', v === t.v ? `${v} is already here.` : `${v} ${v < t.v ? '<' : '>'} ${t.v}: go ${v < t.v ? 'left' : 'right'}.`, { [t.v]: 'compare' }, 'compare', { op, v });
          if (v === t.v) { f('insert-dup', `Duplicates are ignored.`, { [t.v]: 'dim' }, 'insert', { op, v }); break; }
          const side: 'l' | 'r' = v < t.v ? 'l' : 'r';
          if (!t[side]) { t[side] = { v, l: null, r: null }; r.count('writes'); f('insert-null', `Empty slot found: attach ${v} here.`, { [v]: 'found' }, 'insert', { op, v }); break; }
          t = t[side]!;
        }
      } else if (op === 'search') {
        let t: BNode | null = root;
        let hit = false;
        while (t) {
          r.count('comparisons');
          f('search-cmp', t.v === v ? `${t.v} = ${v}: found.` : `${v} ${v < t.v ? '<' : '>'} ${t.v}: go ${v < t.v ? 'left' : 'right'}.`, { [t.v]: t.v === v ? 'found' : 'compare' }, 'compare', { op, v });
          if (t.v === v) { hit = true; break; }
          t = v < t.v ? t.l : t.r;
        }
        answers.push(hit ? '1' : '0');
        f(hit ? 'search-hit' : 'search-miss', hit ? `${v} is in the tree.` : `Reached null: ${v} is not in the tree.`, {}, hit ? 'found' : 'not-found', { op, v, found: hit });
      } else {
        let parent: BNode | null = null;
        let t: BNode | null = root;
        while (t && t.v !== v) {
          r.count('comparisons');
          f('delete-cmp', `${v} ${v < t.v ? '<' : '>'} ${t.v}: go ${v < t.v ? 'left' : 'right'}.`, { [t.v]: 'compare' }, 'compare', { op, v });
          parent = t;
          t = v < t.v ? t.l : t.r;
        }
        if (!t) { f('delete-null', `${v} is not in the tree: nothing to delete.`, {}, 'not-found', { op, v }); continue; }
        r.count('comparisons');
        f('delete-cmp', `Found ${v}.`, { [v]: 'error' }, 'compare', { op, v });
        const replace = (child: BNode | null) => { if (!parent) root = child; else if (parent.l === t) parent.l = child; else parent.r = child; };
        if (t.l && t.r) {
          let sp: BNode = t;
          let s: BNode = t.r;
          while (s.l) { sp = s; s = s.l; }
          f('delete-two', `Two children: replace ${v} with its in-order successor ${s.v} (smallest value on the right).`, { [v]: 'swap', [s.v]: 'swap' }, 'successor', { op, v, successor: s.v });
          if (sp === t) sp.r = s.r; else sp.l = s.r;
          t.v = s.v;
          r.count('writes', 2);
          f('delete-two', `${s.v} now sits where ${v} was; its old slot is removed.`, { [s.v]: 'found' }, 'delete', { op, v });
        } else {
          replace(t.l ?? t.r);
          r.count('writes');
          f(t.l || t.r ? 'delete-one' : 'delete-leaf', t.l || t.r ? `One child: it takes ${v}'s place.` : `${v} is a leaf: just remove it.`, {}, 'delete', { op, v });
        }
      }
    }
    r.add({ views: [bstView(root)], aux: A(), line: 'search-hit', event: 'done', message: `Done. In-order: ${inorderOf(root).join(', ') || '(empty)'}.`, vars: { result: inorderOf(root).join(','), answers: answers.join(',') } });
    return r.frames;
  },
  check: ({ ops }, f) => {
    const s = new Set<number>();
    const ans: string[] = [];
    for (const o of ops) { if (o.op === 'insert') s.add(o.v); else if (o.op === 'delete') s.delete(o.v); else ans.push(s.has(o.v) ? '1' : '0'); }
    const last = f.at(-1)!.vars!;
    if (last.result !== [...s].sort((a, b) => a - b).join(',')) return 'wrong tree contents';
    return last.answers === ans.join(',') ? null : 'wrong search answers';
  },
};

// --------------------------------------------------------------- traversals
interface LevelsIn { levels: (number | null)[] }
export const traversals: AlgoDef<LevelsIn> = {
  id: 'tree-traversals', name: 'Tree traversals', category: 'tree', concepts: ['tree-traversals', 'recursion-basics'],
  blurb: 'In-order, pre-order, post-order and level-order on the same tree: where the visit happens decides the order.',
  time: 'O(n)', space: 'O(h)', input: {}, modes: {},
  defaults: { levels: [1, 2, 3, 4, 5, null, 7] },
  samples: [{ levels: [1] }, { levels: [1, null, 2, null, null, null, 3] }, { levels: [4, 2, 6, 1, 3, 5, 7] }, { levels: [1, 2, null, 3, null, null, null, 4] }],
  custom: {
    help: 'The tree level by level, left to right, with null for a missing node: 1, 2, 3, 4, 5, null, 7. A child needs a parent. Up to 31 slots.',
    parse: (t): Parsed<LevelsIn> => {
      const toks = t.replace(/[[\]]/g, ' ').split(/[\s,]+/).filter(Boolean);
      if (toks.length < 1 || toks.length > 31) return fail('Enter 1 to 31 slots.');
      const levels: (number | null)[] = [];
      for (const tok of toks) {
        if (/^(null|none|-|#)$/i.test(tok)) levels.push(null);
        else if (/^-?\d+$/.test(tok) && Number(tok) >= -99 && Number(tok) <= 999) levels.push(Number(tok));
        else return fail(`"${tok}" is not a number between -99 and 999 or null.`);
      }
      if (levels[0] === null) return fail('The first slot is the root; it cannot be null.');
      for (let i = 1; i < levels.length; i++) if (levels[i] !== null && levels[Math.floor((i - 1) / 2)] === null) return fail(`Slot ${i} has no parent (slot ${Math.floor((i - 1) / 2)} is null).`);
      return ok({ levels });
    },
    format: (v) => v.levels.map((x) => (x === null ? 'null' : x)).join(', '),
    presets: [{ label: 'skewed', text: '1, null, 2, null, null, null, 3' }, { label: 'perfect', text: '4, 2, 6, 1, 3, 5, 7' }],
  },
  code: {
    java: `void inorder(Node t) {
    if (t == null) return;
    inorder(t.left);
    visit(t);
    inorder(t.right);
}
void preorder(Node t) {
    if (t == null) return;
    visit(t);
    preorder(t.left);
    preorder(t.right);
}
void postorder(Node t) {
    if (t == null) return;
    postorder(t.left);
    postorder(t.right);
    visit(t);
}
void levelOrder(Node root) {
    Queue<Node> q = new ArrayDeque<>(List.of(root));
    while (!q.isEmpty()) {
        Node t = q.poll(); visit(t);
        if (t.left != null) q.add(t.left);
        if (t.right != null) q.add(t.right);
    }
}`,
    cpp: `void inorder(Node* t) {
    if (t == nullptr) return;
    inorder(t->left);
    visit(t);
    inorder(t->right);
}
void preorder(Node* t) {
    if (t == nullptr) return;
    visit(t);
    preorder(t->left);
    preorder(t->right);
}
void postorder(Node* t) {
    if (t == nullptr) return;
    postorder(t->left);
    postorder(t->right);
    visit(t);
}
void levelOrder(Node* root) {
    queue<Node*> q; q.push(root);
    while (!q.empty()) {
        Node* t = q.front(); q.pop(); visit(t);
        if (t->left != nullptr) q.push(t->left);
        if (t->right != nullptr) q.push(t->right);
    }
}`,
  },
  lines: same({
    'in-start': 0, 'in-left': 2, 'in-visit': 3, 'in-right': 4,
    'pre-start': 6, 'pre-visit': 8, 'pre-left': 9, 'pre-right': 10,
    'post-start': 12, 'post-left': 14, 'post-right': 15, 'post-visit': 16,
    'level-start': 19, 'level-visit': 21, 'level-enqueue': [22, 23], done: 25,
  }),
  run({ levels }) {
    const r = new Rec();
    const n = levels.length;
    const has = (i: number) => i < n && levels[i] != null;
    let out: number[] = [];
    let seen = new Set<number>();
    let queue: number[] = [];
    const results: string[] = [];
    const f = (line: string, message: string, cur: number | null, order: string, event?: string) =>
      r.add({
        views: [treeFromLevels(levels, (i) => (i === cur ? 'active' : seen.has(i) ? 'visited' : undefined))],
        aux: [aux('list', `${order} output`, out), ...(order === 'level' ? [aux('queue', 'queue', queue.map((q) => levels[q]!))] : [])],
        line, message, ...(event ? { event } : {}), vars: { order, visited: out.length },
      });
    const visit = (i: number, order: 'in' | 'pre' | 'post' | 'level') => {
      out = [...out, levels[i]!];
      seen = new Set([...seen, i]);
      r.count('visits');
      f(`${order}-visit`, `Visit ${levels[i]}.`, i, order, 'visit');
    };
    const rec = (i: number, order: 'in' | 'pre' | 'post') => {
      if (order === 'pre') visit(i, order);
      for (const [side, c] of [['left', 2 * i + 1], ['right', 2 * i + 2]] as const) {
        if (side === 'right' && order === 'in') visit(i, order);
        if (has(c)) {
          r.count('calls');
          f(`${order}-${side}`, `Go to the ${side} child of ${levels[i]}.`, i, order, 'descend');
          rec(c, order);
        }
      }
      if (order === 'post') visit(i, order);
    };
    for (const order of ['in', 'pre', 'post'] as const) {
      out = [];
      seen = new Set();
      f(`${order}-start`, `${order === 'in' ? 'In-order: left, node, right' : order === 'pre' ? 'Pre-order: node, left, right' : 'Post-order: left, right, node'}.`, null, order, 'start');
      rec(0, order);
      results.push(out.join(','));
    }
    out = [];
    seen = new Set();
    queue = [0];
    f('level-start', 'Level-order: use a queue, visit level by level.', null, 'level', 'start');
    while (queue.length) {
      const i = queue.shift()!;
      visit(i, 'level');
      const kids = [2 * i + 1, 2 * i + 2].filter(has);
      queue.push(...kids);
      if (kids.length) { r.count('enqueues', kids.length); f('level-enqueue', `Enqueue ${kids.map((k) => levels[k]).join(' and ')}.`, i, 'level', 'enqueue'); }
    }
    results.push(out.join(','));
    r.add({ views: [treeFromLevels(levels, () => 'visited')], aux: [aux('list', 'level output', out)], line: 'done', event: 'done', message: 'All four orders done.', vars: { result: results.join('|') } });
    return r.frames;
  },
  check: ({ levels }, f) => {
    const has = (i: number) => i < levels.length && levels[i] != null;
    const inn = (i: number): number[] => (has(i) ? [...inn(2 * i + 1), levels[i]!, ...inn(2 * i + 2)] : []);
    const pre = (i: number): number[] => (has(i) ? [levels[i]!, ...pre(2 * i + 1), ...pre(2 * i + 2)] : []);
    const post = (i: number): number[] => (has(i) ? [...post(2 * i + 1), ...post(2 * i + 2), levels[i]!] : []);
    const lvl = levels.filter((x): x is number => x !== null);
    // heap-index order is level order only when the array is "complete enough": level order = array order of non-null slots
    const exp = [inn(0), pre(0), post(0), lvl].map((a) => a.join(',')).join('|');
    return f.at(-1)!.vars!.result === exp ? null : 'wrong traversal order';
  },
};

// --------------------------------------------------------------------- heap
type HeapOp = { op: 'push'; v: number } | { op: 'pop' };
const pushes = (...v: number[]): HeapOp[] => v.map((x) => ({ op: 'push', v: x }));
const pops = (n: number): HeapOp[] => Array.from({ length: n }, () => ({ op: 'pop' }));
interface HeapIn { ops: HeapOp[] }
export const heap: AlgoDef<HeapIn> = {
  id: 'heap-push-pop', name: 'Min-heap: push and pop', category: 'tree', concepts: ['heaps'],
  blurb: 'A heap is a tree stored in an array. Push sifts up, pop moves the last item to the root and sifts down.',
  time: 'O(log n) per operation', space: 'O(n)', input: {}, modes: { predict: true },
  defaults: { ops: [...pushes(5, 3, 8, 1, 9, 2), ...pops(2)] },
  samples: [
    { ops: [{ op: 'push', v: 1 }, { op: 'pop' }] },
    { ops: [{ op: 'pop' }, { op: 'push', v: 2 }, { op: 'push', v: 2 }, { op: 'pop' }, { op: 'pop' }] },
    { ops: [...pushes(7, 6, 5, 4, 3, 2, 1), ...pops(3)] },
  ],
  custom: {
    help: 'Operations: push 5, push 3, pop. Up to 20 operations; the heap holds at most 15 items.',
    parse: (t): Parsed<HeapIn> => {
      const ops: HeapOp[] = [];
      let size = 0;
      for (const tok of tokens(t)) {
        const m = /^(?:push\s*(-?\d+)|pop)$/i.exec(tok);
        if (!m) return fail(`"${tok}" is not an operation. Write push 5 or pop.`);
        if (m[1] !== undefined) {
          const v = Number(m[1]);
          if (v < -99 || v > 999) return fail('Values must be between -99 and 999.');
          ops.push({ op: 'push', v });
          size++;
        } else { ops.push({ op: 'pop' }); size = Math.max(0, size - 1); }
        if (size > 15) return fail('At most 15 items in the heap.');
      }
      return ops.length < 1 || ops.length > 20 ? fail('Enter 1 to 20 operations.') : ok({ ops });
    },
    format: (v) => v.ops.map((o) => (o.op === 'pop' ? 'pop' : `push ${o.v}`)).join(', '),
    presets: [{ label: 'heap sort by pops', text: 'push 9, push 4, push 7, push 1, push 8, pop, pop, pop, pop, pop' }],
  },
  code: {
    java: `void push(int[] h, int x) {
    h[size] = x; int i = size++;
    while (i > 0 && h[(i - 1) / 2] > h[i]) {
        swap(h, i, (i - 1) / 2); i = (i - 1) / 2;
    }
}
int pop(int[] h) {
    int top = h[0];
    h[0] = h[--size];
    siftDown(h, 0);
    return top;
}
void siftDown(int[] h, int i) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < size && h[l] < h[m]) m = l;
        if (r < size && h[r] < h[m]) m = r;
        if (m == i) return;
        swap(h, i, m); i = m;
    }
}`,
    cpp: `void push(vector<int>& h, int x) {
    h.push_back(x); int i = h.size() - 1;
    while (i > 0 && h[(i - 1) / 2] > h[i]) {
        swap(h[i], h[(i - 1) / 2]); i = (i - 1) / 2;
    }
}
int pop(vector<int>& h) {
    int top = h[0];
    h[0] = h.back(); h.pop_back();
    siftDown(h, 0);
    return top;
}
void siftDown(vector<int>& h, int i) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < (int)h.size() && h[l] < h[m]) m = l;
        if (r < (int)h.size() && h[r] < h[m]) m = r;
        if (m == i) return;
        swap(h[i], h[m]); i = m;
    }
}`,
  },
  lines: same({ place: 1, 'up-compare': 2, 'up-swap': 3, 'take-top': 7, 'move-last': 8, 'down-compare': [14, 15], 'down-swap': 17, 'down-done': 16, empty: 7 }),
  run({ ops }) {
    const r = new Rec();
    const h: number[] = [];
    const popped: number[] = [];
    const f = (line: string, message: string, tone: Record<number, Tone> = {}, event?: string, extra?: Partial<Frame>) =>
      r.add({ views: [treeFromLevels(h, (i) => tone[i]), arr(h, { tones: tone, name: 'array' })], line, message, ...(event ? { event } : {}), vars: { size: h.length }, ...extra });
    for (const o of ops) {
      if (o.op === 'push') {
        h.push(o.v);
        let i = h.length - 1;
        r.count('writes');
        f('place', `Push ${o.v}: put it in the first free slot (index ${i}).`, { [i]: 'active' }, 'push');
        while (i > 0) {
          const p = Math.floor((i - 1) / 2);
          r.count('comparisons');
          const up = h[p]! > h[i]!;
          f('up-compare', `Parent ${h[p]} ${up ? '>' : '≤'} child ${h[i]}: ${up ? 'swap up' : 'heap order holds'}.`, { [i]: 'compare', [p]: 'compare' }, 'compare', {
            predict: { question: `Parent is ${h[p]}, new item is ${h[i]}. Swap?`, kind: 'choice', choices: ['Yes', 'No'], answer: up ? 'Yes' : 'No', explain: up ? 'In a min-heap the parent must be the smaller one.' : 'The parent is already smaller or equal: stop.' },
          });
          if (!up) break;
          [h[p], h[i]] = [h[i]!, h[p]!];
          r.count('swaps');
          f('up-swap', `Swapped: ${h[p]} moves up.`, { [p]: 'swap', [i]: 'swap' }, 'swap');
          i = p;
        }
      } else if (!h.length) {
        f('empty', 'The heap is empty: nothing to pop.', {}, 'empty');
      } else {
        const top = h[0]!;
        popped.push(top);
        f('take-top', `Pop: the minimum ${top} is at the root.`, { 0: 'found' }, 'pop');
        const last = h.pop()!;
        if (h.length) h[0] = last;
        r.count('writes');
        f('move-last', h.length ? `Move the last item ${last} to the root.` : 'That was the only item.', { 0: 'active' }, 'move');
        let i = 0;
        while (h.length) {
          const l = 2 * i + 1;
          const rt = l + 1;
          let m = i;
          if (l < h.length) { r.count('comparisons'); if (h[l]! < h[m]!) m = l; }
          if (rt < h.length) { r.count('comparisons'); if (h[rt]! < h[m]!) m = rt; }
          f('down-compare', m === i ? `${h[i]} is not larger than its children.` : `Smaller child ${h[m]} is below ${h[i]}: swap down.`, { [i]: 'compare', ...(l < h.length ? { [l]: 'compare' } : {}), ...(rt < h.length ? { [rt]: 'compare' } : {}) }, 'compare', {
            predict: { question: `Sifting ${h[i]} down. Swap with a child?`, kind: 'choice', choices: ['Yes', 'No'], answer: m === i ? 'No' : 'Yes', explain: m === i ? 'It is already no bigger than both children.' : 'A child is smaller, so it must come up.' },
          });
          if (m === i) { f('down-done', 'Heap order restored.', { [i]: 'found' }, 'settle'); break; }
          [h[i], h[m]] = [h[m]!, h[i]!];
          r.count('swaps');
          f('down-swap', `Swapped ${h[i]} up.`, { [i]: 'swap', [m]: 'swap' }, 'swap');
          i = m;
        }
      }
    }
    r.add({ views: [treeFromLevels(h), arr(h, { name: 'array' })], line: 'empty', event: 'done', message: `Done. Popped in order: ${popped.join(', ') || '(none)'}.`, vars: { result: popped.join(','), size: h.length } });
    return r.frames;
  },
  check: ({ ops }, f) => {
    const ref: number[] = [];
    const popped: number[] = [];
    for (const o of ops) { if (o.op === 'push') ref.push(o.v); else if (ref.length) { ref.sort((a, b) => a - b); popped.push(ref.shift()!); } }
    return f.at(-1)!.vars!.result === popped.join(',') ? null : 'wrong pop order';
  },
};

// --------------------------------------------------------------------- trie
type TrieOp = { op: 'insert' | 'search' | 'prefix'; w: string };
interface TrieIn { ops: TrieOp[] }
interface TNode { id: number; ch: string; kids: Map<string, TNode>; end: boolean }

export const trie: AlgoDef<TrieIn> = {
  id: 'trie-insert-search', name: 'Trie: insert, search, prefix', category: 'tree', concepts: ['tries'],
  blurb: 'One node per letter; words sharing a prefix share a path. A flag marks where a whole word ends.',
  time: 'O(length)', space: 'O(total letters)', input: {}, modes: {},
  defaults: { ops: [{ op: 'insert', w: 'cat' }, { op: 'insert', w: 'car' }, { op: 'insert', w: 'dog' }, { op: 'search', w: 'car' }, { op: 'search', w: 'ca' }, { op: 'prefix', w: 'ca' }, { op: 'prefix', w: 'cow' }] },
  samples: [
    { ops: [{ op: 'insert', w: 'a' }, { op: 'search', w: 'a' }] },
    { ops: [{ op: 'search', w: 'x' }, { op: 'prefix', w: 'x' }] },
    { ops: [{ op: 'insert', w: 'apple' }, { op: 'insert', w: 'app' }, { op: 'search', w: 'app' }, { op: 'prefix', w: 'appl' }, { op: 'search', w: 'appl' }] },
  ],
  custom: {
    help: 'Operations: insert cat, search cat, prefix ca (startsWith). Lowercase words up to 8 letters, up to 12 operations, at most 40 inserted letters.',
    parse: (t): Parsed<TrieIn> => {
      const ops: TrieOp[] = [];
      let letters = 0;
      for (const tok of tokens(t)) {
        const m = /^(insert|search|prefix|startswith|i|s|p)\s+([a-z]{1,8})$/i.exec(tok);
        if (!m) return fail(`"${tok}" is not an operation. Write insert cat, search cat or prefix ca (lowercase, 1 to 8 letters).`);
        const op = ({ i: 'insert', s: 'search', p: 'prefix', startswith: 'prefix' } as Record<string, TrieOp['op']>)[m[1]!.toLowerCase()] ?? (m[1]!.toLowerCase() as TrieOp['op']);
        if (op === 'insert') letters += m[2]!.length;
        ops.push({ op, w: m[2]!.toLowerCase() });
      }
      if (ops.length < 1 || ops.length > 12) return fail('Enter 1 to 12 operations.');
      return letters > 40 ? fail('At most 40 inserted letters in total.') : ok({ ops });
    },
    format: (v) => v.ops.map((o) => `${o.op} ${o.w}`).join(', '),
    presets: [{ label: 'shared prefixes', text: 'insert car, insert card, insert care, insert cart, search car, prefix car, search ca' }],
  },
  code: {
    java: `class Trie {
    Node root = new Node();
    void insert(String w) {
        Node t = root;
        for (char c : w.toCharArray()) {
            if (t.next[c - 'a'] == null) t.next[c - 'a'] = new Node();
            t = t.next[c - 'a'];
        }
        t.end = true;
    }
    boolean search(String w) {
        Node t = find(w);
        return t != null && t.end;
    }
    boolean startsWith(String p) { return find(p) != null; }
    Node find(String s) {
        Node t = root;
        for (char c : s.toCharArray()) {
            t = t.next[c - 'a'];
            if (t == null) return null;
        }
        return t;
    }
}`,
    cpp: `struct Trie {
    Node* root = new Node();
    void insert(const string& w) {
        Node* t = root;
        for (char c : w) {
            if (t->next[c - 'a'] == nullptr) t->next[c - 'a'] = new Node();
            t = t->next[c - 'a'];
        }
        t->end = true;
    }
    bool search(const string& w) {
        Node* t = find(w);
        return t != nullptr && t->end;
    }
    bool startsWith(const string& p) { return find(p) != nullptr; }
    Node* find(const string& s) {
        Node* t = root;
        for (char c : s) {
            t = t->next[c - 'a'];
            if (t == nullptr) return nullptr;
        }
        return t;
    }
};`,
  },
  lines: same({ 'insert-step': [4, 5, 6], 'insert-end': 8, 'find-step': [17, 18], 'find-miss': 19, 'find-end': 21, 'answer-search': 12, 'answer-prefix': 14, done: 14 }),
  run({ ops }) {
    const r = new Rec();
    let ids = 0;
    const root: TNode = { id: ids++, ch: '•', kids: new Map(), end: false };
    const view = (hi: Record<number, Tone> = {}): GraphView => {
      const pos = new Map<number, { x: number; y: number }>();
      let leaves = 0;
      let depthMax = 0;
      const leafCount = (t: TNode): number => (t.kids.size ? [...t.kids.values()].reduce((a, k) => a + leafCount(k), 0) : 1);
      const total = leafCount(root);
      const depth = (t: TNode): number => (t.kids.size ? 1 + Math.max(...[...t.kids.values()].map(depth)) : 0);
      depthMax = depth(root);
      const dy = depthMax ? Math.min(44, 230 / depthMax) : 0;
      const place = (t: TNode, d: number): number => {
        const kids = [...t.kids.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, k]) => k);
        let x: number;
        if (!kids.length) x = 20 + (leaves++) * (total > 1 ? 280 / (total - 1) : 0) + (total > 1 ? 0 : 140);
        else { const xs = kids.map((k) => place(k, d + 1)); x = (xs[0]! + xs[xs.length - 1]!) / 2; }
        pos.set(t.id, { x: Math.round(x), y: Math.round(30 + d * dy) });
        return x;
      };
      place(root, 0);
      const nodes: GraphView['nodes'] = [];
      const edges: GraphView['edges'] = [];
      const walk = (t: TNode) => {
        const p = pos.get(t.id)!;
        nodes.push({ id: `n${t.id}`, label: t.ch, x: p.x, y: p.y, ...(hi[t.id] ? { tone: hi[t.id] } : {}), ...(t.end ? { note: '✓' } : {}) });
        for (const k of t.kids.values()) { edges.push({ from: `n${t.id}`, to: `n${k.id}`, ...(hi[k.id] ? { tone: hi[k.id] } : {}) }); walk(k); }
      };
      walk(root);
      return { kind: 'graph', nodes, edges };
    };
    const results: string[] = [];
    const f = (line: string, message: string, hi: Record<number, Tone> = {}, event?: string, vars: Frame['vars'] = {}) =>
      r.add({ views: [view(hi)], line, message, ...(event ? { event } : {}), vars });
    const find = (w: string, opName: string): TNode | null => {
      let t = root;
      const path: Record<number, Tone> = { [root.id]: 'visited' };
      for (const c of w) {
        r.count('steps');
        const nx = t.kids.get(c);
        if (!nx) { f('find-miss', `No '${c}' child: ${opName} "${w}" fails here.`, { ...path, [t.id]: 'error' }, 'miss', { op: opName, w }); return null; }
        t = nx;
        path[t.id] = 'visited';
        f('find-step', `Follow '${c}'.`, { ...path, [t.id]: 'active' }, 'step', { op: opName, w });
      }
      f('find-end', `Reached the end of "${w}".`, { ...path, [t.id]: 'found' }, 'arrive', { op: opName, w });
      return t;
    };
    for (const { op, w } of ops) {
      if (op === 'insert') {
        let t = root;
        const path: Record<number, Tone> = { [root.id]: 'visited' };
        for (const c of w) {
          r.count('steps');
          let nx = t.kids.get(c);
          const made = !nx;
          if (!nx) { nx = { id: ids++, ch: c, kids: new Map(), end: false }; t.kids.set(c, nx); r.count('writes'); }
          t = nx;
          path[t.id] = 'visited';
          f('insert-step', made ? `No '${c}' child yet: create one.` : `'${c}' already exists: follow it.`, { ...path, [t.id]: made ? 'found' : 'active' }, made ? 'create' : 'step', { op, w });
        }
        t.end = true;
        r.count('writes');
        f('insert-end', `Mark "${w}" as a complete word (✓).`, { ...path, [t.id]: 'found' }, 'insert', { op, w });
      } else {
        const t = find(w, op);
        const res = op === 'search' ? !!t && t.end : !!t;
        results.push(res ? '1' : '0');
        f(op === 'search' ? 'answer-search' : 'answer-prefix', `${op === 'search' ? 'search' : 'startsWith'}("${w}") = ${res}${op === 'search' && t && !t.end ? ' (the path exists, but no word ends here)' : ''}.`, t ? { [t.id]: res ? 'found' : 'error' } : {}, res ? 'found' : 'not-found', { op, w, answer: res });
      }
    }
    r.add({ views: [view()], line: 'done', event: 'done', message: `Done. Answers: ${results.join(', ') || '(none)'}.`, vars: { result: results.join(',') } });
    return r.frames;
  },
  check: ({ ops }, f) => {
    const words = new Set<string>();
    const prefixes = new Set<string>(['']);
    const res: string[] = [];
    for (const o of ops) {
      if (o.op === 'insert') { words.add(o.w); for (let i = 1; i <= o.w.length; i++) prefixes.add(o.w.slice(0, i)); }
      else res.push((o.op === 'search' ? words.has(o.w) : prefixes.has(o.w)) ? '1' : '0');
    }
    return f.at(-1)!.vars!.result === res.join(',') ? null : 'wrong answers';
  },
};

export const TREE_ALGOS = [bst, traversals, heap, trie];

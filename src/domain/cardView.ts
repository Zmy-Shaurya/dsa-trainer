import type { AuthoredCard, CardType } from '../content/types';

/** What the review screen renders, whatever the card's source. */
export interface CardView {
  type: CardType;
  question: string;
  code?: { java: string; cpp: string };
  answer: string;
  /** cloze only: the sentence with the hole filled in */
  filled?: string;
}

export interface StoredFields {
  type?: CardType;
  front?: string;
  back?: string;
  clozeText?: string;
}

const HOLE = /\{\{c1::([^}]*)\}\}/;

export function toView(c: Omit<Partial<AuthoredCard>, 'id'> & StoredFields & { id?: unknown }): CardView | null {
  const type = c.type ?? 'basic';
  const cloze = c.text ?? (c as StoredFields).clozeText;
  if (type === 'cloze') {
    const m = cloze ? HOLE.exec(cloze) : null;
    if (!cloze || !m) return null;
    return { type, question: cloze.replace(HOLE, '[…]'), answer: m[1]!, filled: cloze.replace(HOLE, '$1') };
  }
  if (type === 'basic') return c.front && c.back ? { type, question: c.front, answer: c.back } : null;
  if (!c.prompt || !c.answer) return null;
  return { type, question: c.prompt, answer: c.answer, ...(c.code ? { code: c.code } : {}) };
}

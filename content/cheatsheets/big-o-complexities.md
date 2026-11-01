---
title: Big-O at a glance
printable: true
---

## Growth order

From fastest to slowest: `O(1)`, `O(log n)`, `O(√n)`, `O(n)`, `O(n log n)`, `O(n²)`, `O(n³)`, `O(2ⁿ)`, `O(n!)`.

## What the input size allows

Rule of thumb at about 10⁸ simple operations, not a benchmark.

| n up to | Feasible |
|---|---|
| 10 to 11 | O(n!) |
| 20 to 25 | O(2ⁿ) |
| 500 | O(n³) |
| 5,000 | O(n²) |
| 10⁶ | O(n log n) |
| 10⁸ | O(n) |
| 10⁹ and more | O(log n) or O(1) |

## Common patterns

| Code shape | Time |
|---|---|
| One loop over n | O(n) |
| Loop that halves or doubles | O(log n) |
| Loop inside a loop, both over n | O(n²) |
| Inner loop runs a constant number of times | O(n) |
| Harmonic loop `j += i` | O(n log n) |
| Two pointers that only move forward | O(n) |
| Sort, then scan | O(n log n) |
| Recursion with two calls on n - 1 | O(2ⁿ) |
| Recursion `T(n) = 2T(n/2) + n` | O(n log n) |
| All subsets, copied out | O(n · 2ⁿ) |
| All permutations, copied out | O(n · n!) |

## Reminders

- Drop constants and lower-order terms, but keep different variables apart: `O(n + m)`.
- Amortised cost is the average over a whole run, for example appending to a dynamic array.
- Recursion uses stack space equal to its depth.
- Hash operations are expected O(1); the worst case is O(n).

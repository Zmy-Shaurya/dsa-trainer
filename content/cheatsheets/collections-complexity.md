---
title: Collections complexity (Java and C++)
printable: true
---

## Sequences

| Structure | Access | Add at end | Insert or remove at front | Search |
|---|---|---|---|---|
| `ArrayList` / `vector` | O(1) | O(1) amortised | O(n) | O(n) |
| `LinkedList` / `list` | O(n) | O(1) | O(1) | O(n) |
| `ArrayDeque` / `deque` | O(1) | O(1) | O(1) | O(n) |
| Array / `array` | O(1) | fixed size | fixed size | O(n) |

## Hash-based

| Structure | Insert | Lookup | Remove | Order |
|---|---|---|---|---|
| `HashMap` / `unordered_map` | O(1) expected | O(1) expected | O(1) expected | none |
| `HashSet` / `unordered_set` | O(1) expected | O(1) expected | O(1) expected | none |
| `LinkedHashMap` | O(1) expected | O(1) expected | O(1) expected | insertion |

## Ordered and heap-based

| Structure | Insert | Lookup | Remove | Notes |
|---|---|---|---|---|
| `TreeMap` / `map` | O(log n) | O(log n) | O(log n) | sorted keys, floor and ceiling |
| `TreeSet` / `set` | O(log n) | O(log n) | O(log n) | sorted, floor and ceiling |
| `PriorityQueue` / `priority_queue` | O(log n) | peek O(1) | poll O(log n) | Java min-heap, C++ max-heap |

## Traps

- `ArrayList.remove(0)` and `vector::erase(begin)` are O(n).
- `LinkedList.get(i)` is O(n).
- C++ `map[key]` inserts a default value when the key is missing.
- Java `String +=` in a loop is O(n²); use `StringBuilder`.
- Removing an arbitrary element from a `PriorityQueue` is O(n).

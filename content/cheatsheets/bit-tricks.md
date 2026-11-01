---
title: Bit tricks
printable: true
---

## Everyday operations

| Goal | Expression |
|---|---|
| Test bit i | `(x >> i) & 1` |
| Set bit i | `x \| (1 << i)` |
| Clear bit i | `x & ~(1 << i)` |
| Toggle bit i | `x ^ (1 << i)` |
| Lowest set bit | `x & -x` |
| Clear lowest set bit | `x & (x - 1)` |
| Is a power of two (x > 0) | `(x & (x - 1)) == 0` |
| Multiply or divide by 2ᵏ | `x << k`, `x >> k` |
| Swap without a temp | `a ^= b; b ^= a; a ^= b;` |

## XOR facts

- `x ^ x = 0` and `x ^ 0 = x`, so pairs cancel: the single number in a list of pairs is the XOR of everything.
- XOR is its own inverse, which makes it useful for toggling and for parity.

## Counting and scanning

- Java: `Integer.bitCount(x)`, `Long.numberOfTrailingZeros(x)`, `Integer.highestOneBit(x)`.
- C++: `__builtin_popcount(x)`, `__builtin_ctz(x)`, `__builtin_clz(x)`.
- Loop over subsets of an n-element set with `for (int mask = 0; mask < (1 << n); mask++)`.

## Language traps

- Java `>>>` shifts in zeros, `>>` keeps the sign. C++ has no `>>>`; use an unsigned type.
- `1 << 31` overflows an `int`; use `1L << 31` or `1LL << 31`.
- Signed overflow is undefined behaviour in C++.

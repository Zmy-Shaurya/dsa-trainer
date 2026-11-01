---
title: C++ competitive programming header
printable: true
---

## Starter file

```cpp
#include <bits/stdc++.h>
using namespace std;

using ll = long long;
const int MOD = 1'000'000'007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int& x : a) cin >> x;

    cout << accumulate(a.begin(), a.end(), 0LL) << '\n';
}
```

## Notes

- `bits/stdc++.h` is a GCC convenience header. It is not portable to every compiler.
- Compile with `g++ -std=c++17 -O2 -Wall -o main main.cpp`.
- Use `'\n'` rather than `endl`; `endl` flushes the buffer every time.
- After `sync_with_stdio(false)`, do not mix `cin` with `scanf`.
- Read into `long long` when sums or products can pass 2³¹.
- Take the modulus after every multiplication: `a * b % MOD` in `long long`.

## Handy one-liners

| Goal | Code |
|---|---|
| Sort descending | `sort(a.rbegin(), a.rend())` |
| Remove duplicates | `a.erase(unique(a.begin(), a.end()), a.end())` |
| Largest element | `*max_element(a.begin(), a.end())` |
| Count equal values | `count(a.begin(), a.end(), x)` |
| Fill with a value | `fill(a.begin(), a.end(), -1)` |
| Next permutation | `next_permutation(a.begin(), a.end())` |

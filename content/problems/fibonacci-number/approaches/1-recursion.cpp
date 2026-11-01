// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int fib(int n) {
        return n < 2 ? n : fib(n - 1) + fib(n - 2);
    }
};

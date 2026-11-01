// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    int ways(int n, vector<int>& memo) {
        if (n <= 2) return n;
        if (memo[n] != 0) return memo[n];                     // already computed
        memo[n] = ways(n - 1, memo) + ways(n - 2, memo);
        return memo[n];
    }

public:
    int climbStairs(int n) {
        vector<int> memo(n + 1, 0);
        return ways(n, memo);
    }
};

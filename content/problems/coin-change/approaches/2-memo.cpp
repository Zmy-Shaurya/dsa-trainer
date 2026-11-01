// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    int fewest(vector<int>& coins, long long remaining, vector<int>& memo) {
        if (remaining == 0) return 0;
        if (remaining < 0) return -1;
        if (memo[remaining] != -2) return memo[remaining];
        int best = -1;
        for (int coin : coins) {
            int sub = fewest(coins, remaining - coin, memo);
            if (sub >= 0 && (best == -1 || sub + 1 < best)) best = sub + 1;
        }
        memo[remaining] = best;
        return best;
    }

public:
    int coinChange(vector<int>& coins, int amount) {
        vector<int> memo(amount + 1, -2);                     // -2 means not computed yet
        return fewest(coins, amount, memo);
    }
};

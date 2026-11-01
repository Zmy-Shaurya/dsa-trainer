// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    int fewest(vector<int>& coins, long long remaining) {
        if (remaining == 0) return 0;
        if (remaining < 0) return -1;
        int best = -1;
        for (int coin : coins) {
            int sub = fewest(coins, remaining - coin);
            if (sub >= 0 && (best == -1 || sub + 1 < best)) best = sub + 1;
        }
        return best;
    }

public:
    int coinChange(vector<int>& coins, int amount) {
        return fewest(coins, amount);
    }
};

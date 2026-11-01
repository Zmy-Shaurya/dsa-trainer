// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int best = 0;
        int n = prices.size();
        for (int buy = 0; buy < n; buy++) {
            for (int sell = buy + 1; sell < n; sell++) {
                best = max(best, prices[sell] - prices[buy]);
            }
        }
        return best;
    }
};

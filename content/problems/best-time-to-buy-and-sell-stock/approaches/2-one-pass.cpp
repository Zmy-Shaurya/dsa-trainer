// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int minPrice = INT_MAX;
        int best = 0;
        for (int price : prices) {
            minPrice = min(minPrice, price);               // cheapest day so far
            best = max(best, price - minPrice);
        }
        return best;
    }
};

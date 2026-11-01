// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int findMin(vector<int>& nums) {
        int best = nums[0];
        for (int x : nums) best = min(best, x);
        return best;
    }
};

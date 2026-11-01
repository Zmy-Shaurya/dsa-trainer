// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int rob(vector<int>& nums) {
        int n = nums.size();
        if (n == 1) return nums[0];
        vector<int> best(n);
        best[0] = nums[0];
        best[1] = max(nums[0], nums[1]);
        for (int i = 2; i < n; i++) {
            best[i] = max(best[i - 1], best[i - 2] + nums[i]);
        }
        return best[n - 1];
    }
};

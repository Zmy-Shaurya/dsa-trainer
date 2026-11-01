// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    int best(vector<int>& nums, int i) {
        if (i >= (int)nums.size()) return 0;
        int skip = best(nums, i + 1);
        int take = nums[i] + best(nums, i + 2);               // robbing i forces skipping i + 1
        return max(skip, take);
    }

public:
    int rob(vector<int>& nums) {
        return best(nums, 0);
    }
};

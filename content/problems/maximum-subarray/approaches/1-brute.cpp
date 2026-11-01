// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int maxSubArray(vector<int>& nums) {
        int best = nums[0];
        for (int i = 0; i < (int)nums.size(); i++) {
            int sum = 0;
            for (int j = i; j < (int)nums.size(); j++) {
                sum += nums[j];
                best = max(best, sum);
            }
        }
        return best;
    }
};

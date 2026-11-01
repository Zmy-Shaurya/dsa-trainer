// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool canJump(vector<int>& nums) {
        int n = nums.size();
        vector<bool> ok(n, false);
        ok[0] = true;
        for (int i = 0; i < n; i++) {
            if (!ok[i]) continue;
            for (int j = i + 1; j <= min(n - 1, i + nums[i]); j++) ok[j] = true;
        }
        return ok[n - 1];
    }
};

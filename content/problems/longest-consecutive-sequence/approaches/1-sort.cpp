// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        if (nums.empty()) return 0;
        vector<int> a = nums;
        sort(a.begin(), a.end());
        int best = 1, run = 1;
        for (int i = 1; i < (int)a.size(); i++) {
            if (a[i] == a[i - 1]) continue;
            run = (a[i] == a[i - 1] + 1) ? run + 1 : 1;
            best = max(best, run);
        }
        return best;
    }
};

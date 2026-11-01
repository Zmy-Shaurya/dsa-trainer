// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int longestConsecutive(vector<int>& nums) {
        unordered_set<int> set(nums.begin(), nums.end());
        int best = 0;
        for (int x : set) {
            if (set.count(x - 1)) continue;
            int y = x;
            while (set.count(y + 1)) y++;
            best = max(best, y - x + 1);
        }
        return best;
    }
};

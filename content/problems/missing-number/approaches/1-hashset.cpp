// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        unordered_set<int> seen(nums.begin(), nums.end());
        for (int i = 0; i <= (int)nums.size(); i++) if (!seen.count(i)) return i;
        return -1;
    }
};

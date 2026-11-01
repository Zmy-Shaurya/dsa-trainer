// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        unordered_map<int, int> cnt;
        for (int x : nums) if (++cnt[x] > (int)nums.size() / 2) return x;
        return -1;
    }
};

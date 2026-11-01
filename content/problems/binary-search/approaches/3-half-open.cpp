// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int lo = 0, hi = nums.size();                         // search in [lo, hi)
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid;                                    // mid may still be the answer
        }
        return lo < (int)nums.size() && nums[lo] == target ? lo : -1;
    }
};

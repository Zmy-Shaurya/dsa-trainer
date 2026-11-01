// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        vector<int> sorted = nums;
        sort(sorted.begin(), sorted.end());
        for (size_t i = 1; i < sorted.size(); i++) {
            if (sorted[i] == sorted[i - 1]) return true;   // equal neighbours
        }
        return false;
    }
};

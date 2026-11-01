// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool containsDuplicate(vector<int>& nums) {
        unordered_set<int> seen;
        for (int x : nums) {
            if (!seen.insert(x).second) return true;       // second is false if already present
        }
        return false;
    }
};

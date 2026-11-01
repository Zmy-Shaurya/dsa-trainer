// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int missingNumber(vector<int>& nums) {
        int x = nums.size();
        for (int i = 0; i < (int)nums.size(); i++) x ^= i ^ nums[i];
        return x;
    }
};

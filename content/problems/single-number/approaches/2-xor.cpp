// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int singleNumber(vector<int>& nums) {
        int r = 0;
        for (int x : nums) r ^= x;
        return r;
    }
};

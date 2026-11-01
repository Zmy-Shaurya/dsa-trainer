// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int rob(vector<int>& nums) {
        int skipPrev = 0, takePrev = 0;                       // best totals ending before / at the last house
        for (int x : nums) {
            int next = max(takePrev, skipPrev + x);
            skipPrev = takePrev;
            takePrev = next;
        }
        return takePrev;
    }
};

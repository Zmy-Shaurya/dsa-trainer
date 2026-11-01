// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int maxArea(vector<int>& height) {
        int left = 0, right = (int)height.size() - 1;
        int best = 0;
        while (left < right) {
            int area = min(height[left], height[right]) * (right - left);
            best = max(best, area);
            if (height[left] < height[right]) left++;      // the shorter wall limits the area
            else right--;
        }
        return best;
    }
};

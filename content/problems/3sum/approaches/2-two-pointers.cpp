// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        vector<int> a = nums;
        sort(a.begin(), a.end());
        vector<vector<int>> result;
        int n = a.size();
        for (int i = 0; i < n - 2; i++) {
            if (a[i] > 0) break;                              // smallest value positive: no zero sum
            if (i > 0 && a[i] == a[i - 1]) continue;          // skip duplicate first value
            int left = i + 1, right = n - 1;
            while (left < right) {
                int sum = a[i] + a[left] + a[right];
                if (sum < 0) left++;
                else if (sum > 0) right--;
                else {
                    result.push_back({a[i], a[left], a[right]});
                    left++;
                    right--;
                    while (left < right && a[left] == a[left - 1]) left++;   // skip duplicate pair values
                }
            }
        }
        return result;
    }
};

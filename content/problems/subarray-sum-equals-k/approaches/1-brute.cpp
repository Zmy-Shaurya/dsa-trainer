// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int subarraySum(vector<int>& nums, int k) {
        int count = 0;
        for (int i = 0; i < (int)nums.size(); i++) {
            int sum = 0;
            for (int j = i; j < (int)nums.size(); j++) {
                sum += nums[j];
                if (sum == k) count++;
            }
        }
        return count;
    }
};

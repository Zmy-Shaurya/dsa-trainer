// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> twoSum(vector<int>& numbers, int target) {
        for (int i = 0; i < (int)numbers.size(); i++) {
            int lo = i + 1, hi = (int)numbers.size() - 1, need = target - numbers[i];
            while (lo <= hi) {
                int mid = lo + (hi - lo) / 2;
                if (numbers[mid] == need) return {i + 1, mid + 1};
                if (numbers[mid] < need) lo = mid + 1; else hi = mid - 1;
            }
        }
        return {-1, -1};
    }
};

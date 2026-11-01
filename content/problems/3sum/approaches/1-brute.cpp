// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        vector<int> a = nums;
        sort(a.begin(), a.end());
        set<vector<int>> found;
        int n = a.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if (a[i] + a[j] + a[k] == 0) found.insert({a[i], a[j], a[k]});   // sorted triple dedupes
                }
            }
        }
        return vector<vector<int>>(found.begin(), found.end());
    }
};

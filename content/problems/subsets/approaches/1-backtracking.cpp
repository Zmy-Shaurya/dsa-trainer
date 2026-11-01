// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    void explore(vector<int>& nums, int start, vector<int>& path, vector<vector<int>>& result) {
        result.push_back(path);                               // every path is a subset
        for (int i = start; i < (int)nums.size(); i++) {
            path.push_back(nums[i]);                          // choose
            explore(nums, i + 1, path, result);               // explore
            path.pop_back();                                  // undo
        }
    }

public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> result;
        vector<int> path;
        explore(nums, 0, path, result);
        return result;
    }
};

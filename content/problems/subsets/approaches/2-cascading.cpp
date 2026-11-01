// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<int>> subsets(vector<int>& nums) {
        vector<vector<int>> result = {{}};                    // the empty subset
        for (int x : nums) {
            int size = result.size();
            for (int i = 0; i < size; i++) {
                vector<int> copy = result[i];
                copy.push_back(x);
                result.push_back(copy);
            }
        }
        return result;
    }
};

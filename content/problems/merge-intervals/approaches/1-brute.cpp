// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        vector<vector<int>> list = intervals;
        bool merged = true;
        while (merged) {
            merged = false;
            for (size_t i = 0; i < list.size() && !merged; i++) {
                for (size_t j = i + 1; j < list.size() && !merged; j++) {
                    if (list[i][0] <= list[j][1] && list[j][0] <= list[i][1]) {   // overlap or touch
                        list[i][0] = min(list[i][0], list[j][0]);
                        list[i][1] = max(list[i][1], list[j][1]);
                        list.erase(list.begin() + j);
                        merged = true;
                    }
                }
            }
        }
        sort(list.begin(), list.end(), [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
        return list;
    }
};

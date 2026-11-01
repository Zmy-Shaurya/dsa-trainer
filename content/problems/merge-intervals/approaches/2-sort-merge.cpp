// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<int>> merge(vector<vector<int>>& intervals) {
        vector<vector<int>> sorted = intervals;
        sort(sorted.begin(), sorted.end(), [](const vector<int>& a, const vector<int>& b) { return a[0] < b[0]; });
        vector<vector<int>> result;
        for (auto& cur : sorted) {
            if (result.empty() || result.back()[1] < cur[0]) {
                result.push_back(cur);                        // gap: start a new interval
            } else {
                result.back()[1] = max(result.back()[1], cur[1]);   // overlap: extend the end
            }
        }
        return result;
    }
};

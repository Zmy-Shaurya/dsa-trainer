// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        vector<int> values;
        for (auto& entry : count) values.push_back(entry.first);
        sort(values.begin(), values.end(), [&](int a, int b) { return count[a] > count[b]; });
        values.resize(k);
        return values;
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        vector<vector<int>> buckets(nums.size() + 1);
        for (auto& entry : count) buckets[entry.second].push_back(entry.first);
        vector<int> result;
        for (int freq = nums.size(); freq >= 1 && (int)result.size() < k; freq--) {
            for (int value : buckets[freq]) {
                if ((int)result.size() < k) result.push_back(value);
            }
        }
        return result;
    }
};

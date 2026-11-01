// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> topKFrequent(vector<int>& nums, int k) {
        unordered_map<int, int> count;
        for (int x : nums) count[x]++;
        priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> heap;   // min-heap by count
        for (auto& entry : count) {
            heap.push({entry.second, entry.first});
            if ((int)heap.size() > k) heap.pop();             // drop the least frequent
        }
        vector<int> result;
        while (!heap.empty()) {
            result.push_back(heap.top().second);
            heap.pop();
        }
        return result;
    }
};

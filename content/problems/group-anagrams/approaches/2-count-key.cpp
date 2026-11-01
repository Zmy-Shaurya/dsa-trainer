// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (const string& word : strs) {
            int count[26] = {0};
            for (char c : word) count[c - 'a']++;
            string key;
            for (int c : count) key += to_string(c) + "#";    // '#' keeps 1,11 apart from 11,1
            groups[key].push_back(word);
        }
        vector<vector<string>> result;
        for (auto& entry : groups) result.push_back(entry.second);
        return result;
    }
};

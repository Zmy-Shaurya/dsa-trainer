// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<vector<string>> groupAnagrams(vector<string>& strs) {
        unordered_map<string, vector<string>> groups;
        for (const string& word : strs) {
            string key = word;
            sort(key.begin(), key.end());                     // same for all anagrams
            groups[key].push_back(word);
        }
        vector<vector<string>> result;
        for (auto& entry : groups) result.push_back(entry.second);
        return result;
    }
};

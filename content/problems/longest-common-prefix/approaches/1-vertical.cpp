// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        for (int i = 0; i < (int)strs[0].size(); i++) {
            char c = strs[0][i];
            for (int k = 1; k < (int)strs.size(); k++) {
                if (i == (int)strs[k].size() || strs[k][i] != c) return strs[0].substr(0, i);
            }
        }
        return strs[0];
    }
};

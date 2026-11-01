// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        vector<string> s = strs;
        sort(s.begin(), s.end());
        const string& a = s.front();
        const string& b = s.back();
        size_t i = 0;
        while (i < a.size() && i < b.size() && a[i] == b[i]) i++;
        return a.substr(0, i);
    }
};

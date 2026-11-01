// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool repeatedSubstringPattern(string s) {
        string d = s + s;
        return d.substr(1, d.size() - 2).find(s) != string::npos;
    }
};

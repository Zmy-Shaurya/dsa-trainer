// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool isSubsequence(string s, string t) {
        size_t pos = 0;
        for (char c : s) {
            pos = t.find(c, pos);
            if (pos == string::npos) return false;
            pos++;
        }
        return true;
    }
};

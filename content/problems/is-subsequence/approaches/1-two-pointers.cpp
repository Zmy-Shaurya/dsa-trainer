// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool isSubsequence(string s, string t) {
        int i = 0;
        for (int j = 0; j < (int)t.size() && i < (int)s.size(); j++) {
            if (s[i] == t[j]) i++;
        }
        return i == (int)s.size();
    }
};

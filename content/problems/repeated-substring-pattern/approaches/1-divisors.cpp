// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool repeatedSubstringPattern(string s) {
        int n = s.size();
        for (int k = 1; k <= n / 2; k++) {
            if (n % k != 0) continue;
            string block = s.substr(0, k), built;
            for (int i = 0; i < n / k; i++) built += block;
            if (built == s) return true;
        }
        return false;
    }
};

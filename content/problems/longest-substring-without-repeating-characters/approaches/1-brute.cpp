// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        int best = 0;
        int n = s.size();
        for (int start = 0; start < n; start++) {
            unordered_set<char> seen;
            int end = start;
            while (end < n && seen.insert(s[end]).second) end++;   // stops at the first repeat
            best = max(best, end - start);
        }
        return best;
    }
};

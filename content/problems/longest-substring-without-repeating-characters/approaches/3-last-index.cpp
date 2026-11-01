// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        vector<int> lastSeen(256, -1);
        int left = 0, best = 0;
        for (int right = 0; right < (int)s.size(); right++) {
            int c = (unsigned char)s[right];
            if (lastSeen[c] >= left) left = lastSeen[c] + 1;   // jump past the previous copy
            lastSeen[c] = right;
            best = max(best, right - left + 1);
        }
        return best;
    }
};

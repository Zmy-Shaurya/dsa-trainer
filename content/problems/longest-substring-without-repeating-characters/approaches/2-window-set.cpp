// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_set<char> window;
        int left = 0, best = 0;
        for (int right = 0; right < (int)s.size(); right++) {
            while (window.count(s[right])) {
                window.erase(s[left]);                        // shrink until the repeat is gone
                left++;
            }
            window.insert(s[right]);
            best = max(best, right - left + 1);
        }
        return best;
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool isValid(string s) {
        bool removed = true;
        while (removed) {
            removed = false;
            for (const char* pair : {"()", "[]", "{}"}) {
                size_t pos = s.find(pair);
                if (pos != string::npos) {
                    s.erase(pos, 2);
                    removed = true;
                }
            }
        }
        return s.empty();
    }
};

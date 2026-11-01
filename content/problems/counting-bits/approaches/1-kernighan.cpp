// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> res(n + 1);
        for (int i = 0; i <= n; i++) {
            int x = i, c = 0;
            while (x != 0) {
                x &= x - 1;
                c++;
            }
            res[i] = c;
        }
        return res;
    }
};

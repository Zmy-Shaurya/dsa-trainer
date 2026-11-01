// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int hammingWeight(int n) {
        unsigned int u = n;
        int count = 0;
        for (int i = 0; i < 32; i++) {
            count += (u >> i) & 1u;
        }
        return count;
    }
};

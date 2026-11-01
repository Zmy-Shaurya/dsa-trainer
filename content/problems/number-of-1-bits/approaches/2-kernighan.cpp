// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int hammingWeight(int n) {
        unsigned int u = n;
        int count = 0;
        while (u != 0) {
            u &= u - 1;
            count++;
        }
        return count;
    }
};

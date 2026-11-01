// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int reverse(int x) {
        long long r = 0;
        long long v = x;
        while (v != 0) {
            r = r * 10 + v % 10;
            v /= 10;
        }
        return (r < INT_MIN || r > INT_MAX) ? 0 : (int)r;
    }
};

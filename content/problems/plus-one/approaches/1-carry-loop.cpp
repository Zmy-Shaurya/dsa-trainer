// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        vector<int> res = digits;
        int carry = 1;
        for (int i = (int)res.size() - 1; i >= 0 && carry > 0; i--) {
            int s = res[i] + carry;
            res[i] = s % 10;
            carry = s / 10;
        }
        if (carry) res.insert(res.begin(), 1);
        return res;
    }
};

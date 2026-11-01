// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> plusOne(vector<int>& digits) {
        vector<int> res = digits;
        for (int i = (int)res.size() - 1; i >= 0; i--) {
            if (res[i] < 9) {
                res[i]++;
                return res;
            }
            res[i] = 0;
        }
        res.insert(res.begin(), 1);
        return res;
    }
};

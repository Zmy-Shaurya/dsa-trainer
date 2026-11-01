// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    vector<int> dailyTemperatures(vector<int>& temperatures) {
        int n = temperatures.size();
        vector<int> res(n, 0), st;
        for (int i = 0; i < n; i++) {
            while (!st.empty() && temperatures[st.back()] < temperatures[i]) {
                int j = st.back();
                st.pop_back();
                res[j] = i - j;
            }
            st.push_back(i);
        }
        return res;
    }
};

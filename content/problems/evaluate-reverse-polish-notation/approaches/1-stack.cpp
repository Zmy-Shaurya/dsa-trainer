// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<int> st;
        for (const string& t : tokens) {
            if (t == "+" || t == "-" || t == "*" || t == "/") {
                int b = st.back(); st.pop_back();
                int a = st.back(); st.pop_back();
                st.push_back(t == "+" ? a + b : t == "-" ? a - b : t == "*" ? a * b : a / b);
            } else {
                st.push_back(stoi(t));
            }
        }
        return st.back();
    }
};

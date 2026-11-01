// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<int> st(tokens.size());
        int top = 0;
        for (const string& t : tokens) {
            if (t.size() == 1 && string("+-*/").find(t[0]) != string::npos) {
                int b = st[--top], a = st[--top];
                char op = t[0];
                st[top++] = op == '+' ? a + b : op == '-' ? a - b : op == '*' ? a * b : a / b;
            } else {
                st[top++] = stoi(t);
            }
        }
        return st[0];
    }
};

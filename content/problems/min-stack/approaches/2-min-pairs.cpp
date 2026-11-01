// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class MinStack {
    stack<pair<int, int>> st;                                 // {value, min so far}

public:
    MinStack() {}

    void push(int val) {
        int best = st.empty() ? val : min(val, st.top().second);
        st.push({val, best});
    }

    void pop() { st.pop(); }

    int top() { return st.top().first; }

    int getMin() { return st.top().second; }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class MinStack {
    vector<int> items;

public:
    MinStack() {}

    void push(int val) { items.push_back(val); }

    void pop() { items.pop_back(); }

    int top() { return items.back(); }

    int getMin() {
        int best = INT_MAX;
        for (int x : items) best = min(best, x);              // scan every time
        return best;
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    bool hasCycle(int node, vector<vector<int>>& next, vector<int>& state) {
        if (state[node] == 1) return true;                    // back on the current path
        if (state[node] == 2) return false;
        state[node] = 1;
        for (int nb : next[node]) {
            if (hasCycle(nb, next, state)) return true;
        }
        state[node] = 2;
        return false;
    }

public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> next(numCourses);
        for (auto& p : prerequisites) next[p[1]].push_back(p[0]);   // prerequisite -> course
        vector<int> state(numCourses, 0);                     // 0 new, 1 on path, 2 done
        for (int i = 0; i < numCourses; i++) {
            if (hasCycle(i, next, state)) return false;
        }
        return true;
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {
        vector<vector<int>> next(numCourses);
        vector<int> indegree(numCourses, 0);
        for (auto& p : prerequisites) {
            next[p[1]].push_back(p[0]);                       // prerequisite -> course
            indegree[p[0]]++;
        }
        queue<int> q;
        for (int i = 0; i < numCourses; i++) {
            if (indegree[i] == 0) q.push(i);
        }
        int taken = 0;
        while (!q.empty()) {
            int course = q.front();
            q.pop();
            taken++;
            for (int nb : next[course]) {
                if (--indegree[nb] == 0) q.push(nb);          // all prerequisites done
            }
        }
        return taken == numCourses;
    }
};

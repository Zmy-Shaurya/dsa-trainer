// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int numIslands(vector<vector<char>>& grid) {
        int rows = grid.size(), cols = grid[0].size();
        int dirs[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int islands = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++;
                queue<pair<int, int>> q;
                q.push({r, c});
                grid[r][c] = '0';                             // mark when enqueued
                while (!q.empty()) {
                    auto [cr, cc] = q.front();
                    q.pop();
                    for (auto& d : dirs) {
                        int nr = cr + d[0], nc = cc + d[1];
                        if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] == '1') {
                            grid[nr][nc] = '0';
                            q.push({nr, nc});
                        }
                    }
                }
            }
        }
        return islands;
    }
};

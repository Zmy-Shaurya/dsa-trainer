import java.util.*;

class Solution {
    public int numIslands(char[][] grid) {
        int rows = grid.length, cols = grid[0].length;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int islands = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++;
                Deque<int[]> queue = new ArrayDeque<>();
                queue.add(new int[]{r, c});
                grid[r][c] = '0';                             // mark when enqueued
                while (!queue.isEmpty()) {
                    int[] cell = queue.poll();
                    for (int[] d : dirs) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && grid[nr][nc] == '1') {
                            grid[nr][nc] = '0';
                            queue.add(new int[]{nr, nc});
                        }
                    }
                }
            }
        }
        return islands;
    }
}

import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        List<List<Integer>> next = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) next.add(new ArrayList<>());
        for (int[] p : prerequisites) next.get(p[1]).add(p[0]);   // prerequisite -> course
        int[] state = new int[numCourses];                    // 0 new, 1 on path, 2 done
        for (int i = 0; i < numCourses; i++) {
            if (hasCycle(i, next, state)) return false;
        }
        return true;
    }

    private boolean hasCycle(int node, List<List<Integer>> next, int[] state) {
        if (state[node] == 1) return true;                    // back on the current path
        if (state[node] == 2) return false;
        state[node] = 1;
        for (int nb : next.get(node)) {
            if (hasCycle(nb, next, state)) return true;
        }
        state[node] = 2;
        return false;
    }
}

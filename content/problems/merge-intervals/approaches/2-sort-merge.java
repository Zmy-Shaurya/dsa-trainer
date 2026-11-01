import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        int[][] sorted = intervals.clone();
        Arrays.sort(sorted, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> result = new ArrayList<>();
        for (int[] cur : sorted) {
            if (result.isEmpty() || result.get(result.size() - 1)[1] < cur[0]) {
                result.add(new int[]{cur[0], cur[1]});        // gap: start a new interval
            } else {
                int[] last = result.get(result.size() - 1);
                last[1] = Math.max(last[1], cur[1]);          // overlap: extend the end
            }
        }
        return result.toArray(new int[0][]);
    }
}

import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        List<int[]> list = new ArrayList<>();
        for (int[] iv : intervals) list.add(new int[]{iv[0], iv[1]});
        boolean merged = true;
        while (merged) {
            merged = false;
            for (int i = 0; i < list.size() && !merged; i++) {
                for (int j = i + 1; j < list.size() && !merged; j++) {
                    int[] a = list.get(i), b = list.get(j);
                    if (a[0] <= b[1] && b[0] <= a[1]) {       // overlap or touch
                        a[0] = Math.min(a[0], b[0]);
                        a[1] = Math.max(a[1], b[1]);
                        list.remove(j);
                        merged = true;
                    }
                }
            }
        }
        list.sort((a, b) -> Integer.compare(a[0], b[0]));
        return list.toArray(new int[0][]);
    }
}

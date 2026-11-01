import java.util.*;

class Solution {
    public int longestConsecutive(int[] nums) {
        if (nums.length == 0) return 0;
        int[] a = nums.clone();
        Arrays.sort(a);
        int best = 1, run = 1;
        for (int i = 1; i < a.length; i++) {
            if (a[i] == a[i - 1]) continue;
            run = (a[i] == a[i - 1] + 1) ? run + 1 : 1;
            best = Math.max(best, run);
        }
        return best;
    }
}

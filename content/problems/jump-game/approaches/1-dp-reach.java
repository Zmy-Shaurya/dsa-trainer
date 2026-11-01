import java.util.*;

class Solution {
    public boolean canJump(int[] nums) {
        int n = nums.length;
        boolean[] ok = new boolean[n];
        ok[0] = true;
        for (int i = 0; i < n; i++) {
            if (!ok[i]) continue;
            for (int j = i + 1; j <= Math.min(n - 1, i + nums[i]); j++) ok[j] = true;
        }
        return ok[n - 1];
    }
}

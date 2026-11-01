import java.util.*;

class Solution {
    public int missingNumber(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) seen.add(x);
        for (int i = 0; i <= nums.length; i++) if (!seen.contains(i)) return i;
        return -1;
    }
}

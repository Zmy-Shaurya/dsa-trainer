import java.util.*;

class Solution {
    public int majorityElement(int[] nums) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) {
            int c = cnt.merge(x, 1, Integer::sum);
            if (c > nums.length / 2) return x;
        }
        return -1;
    }
}

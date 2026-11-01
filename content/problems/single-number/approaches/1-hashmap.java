import java.util.*;

class Solution {
    public int singleNumber(int[] nums) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.merge(x, 1, Integer::sum);
        for (Map.Entry<Integer, Integer> e : cnt.entrySet()) if (e.getValue() == 1) return e.getKey();
        return -1;
    }
}

import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        List<Integer> values = new ArrayList<>(count.keySet());
        values.sort((a, b) -> count.get(b) - count.get(a));   // most frequent first
        int[] result = new int[k];
        for (int i = 0; i < k; i++) result[i] = values.get(i);
        return result;
    }
}

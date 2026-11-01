import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        List<List<Integer>> buckets = new ArrayList<>();
        for (int i = 0; i <= nums.length; i++) buckets.add(new ArrayList<>());
        for (Map.Entry<Integer, Integer> e : count.entrySet()) buckets.get(e.getValue()).add(e.getKey());
        int[] result = new int[k];
        int size = 0;
        for (int freq = nums.length; freq >= 1 && size < k; freq--) {
            for (int value : buckets.get(freq)) {
                if (size < k) result[size++] = value;
            }
        }
        return result;
    }
}

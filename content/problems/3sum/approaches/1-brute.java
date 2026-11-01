import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        Set<List<Integer>> found = new LinkedHashSet<>();
        for (int i = 0; i < sorted.length; i++) {
            for (int j = i + 1; j < sorted.length; j++) {
                for (int k = j + 1; k < sorted.length; k++) {
                    if (sorted[i] + sorted[j] + sorted[k] == 0) {
                        found.add(Arrays.asList(sorted[i], sorted[j], sorted[k]));   // sorted triple dedupes
                    }
                }
            }
        }
        return new ArrayList<>(found);
    }
}

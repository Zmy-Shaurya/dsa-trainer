import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        explore(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private void explore(int[] nums, int start, List<Integer> path, List<List<Integer>> result) {
        result.add(new ArrayList<>(path));                    // every path is a subset
        for (int i = start; i < nums.length; i++) {
            path.add(nums[i]);                                // choose
            explore(nums, i + 1, path, result);               // explore
            path.remove(path.size() - 1);                     // undo
        }
    }
}

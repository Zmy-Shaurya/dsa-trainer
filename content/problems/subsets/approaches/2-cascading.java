import java.util.*;

class Solution {
    public List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        result.add(new ArrayList<>());                        // the empty subset
        for (int x : nums) {
            int size = result.size();
            for (int i = 0; i < size; i++) {
                List<Integer> copy = new ArrayList<>(result.get(i));
                copy.add(x);
                result.add(copy);
            }
        }
        return result;
    }
}

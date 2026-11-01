import java.util.*;

class Solution {
    public boolean containsDuplicate(int[] nums) {
        int[] sorted = nums.clone();
        Arrays.sort(sorted);
        for (int i = 1; i < sorted.length; i++) {
            if (sorted[i] == sorted[i - 1]) return true;   // equal neighbours
        }
        return false;
    }
}

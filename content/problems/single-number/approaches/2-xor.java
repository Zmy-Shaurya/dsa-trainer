import java.util.*;

class Solution {
    public int singleNumber(int[] nums) {
        int r = 0;
        for (int x : nums) r ^= x;
        return r;
    }
}

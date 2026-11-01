import java.util.*;

class Solution {
    public int[] plusOne(int[] digits) {
        int[] res = digits.clone();
        for (int i = res.length - 1; i >= 0; i--) {
            if (res[i] < 9) {
                res[i]++;
                return res;
            }
            res[i] = 0;
        }
        int[] bigger = new int[res.length + 1];
        bigger[0] = 1;
        return bigger;
    }
}

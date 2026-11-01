import java.util.*;

class Solution {
    public int[] plusOne(int[] digits) {
        int[] res = digits.clone();
        int carry = 1;
        for (int i = res.length - 1; i >= 0 && carry > 0; i--) {
            int s = res[i] + carry;
            res[i] = s % 10;
            carry = s / 10;
        }
        if (carry == 0) return res;
        int[] bigger = new int[res.length + 1];
        bigger[0] = 1;
        System.arraycopy(res, 0, bigger, 1, res.length);
        return bigger;
    }
}

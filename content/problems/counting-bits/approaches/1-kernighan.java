import java.util.*;

class Solution {
    public int[] countBits(int n) {
        int[] res = new int[n + 1];
        for (int i = 0; i <= n; i++) {
            int x = i, c = 0;
            while (x != 0) {
                x &= x - 1;
                c++;
            }
            res[i] = c;
        }
        return res;
    }
}

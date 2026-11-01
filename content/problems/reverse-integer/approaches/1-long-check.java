import java.util.*;

class Solution {
    public int reverse(int x) {
        long r = 0;
        long v = x;
        while (v != 0) {
            r = r * 10 + v % 10;
            v /= 10;
        }
        return (r < Integer.MIN_VALUE || r > Integer.MAX_VALUE) ? 0 : (int) r;
    }
}

import java.util.*;

class Solution {
    public boolean repeatedSubstringPattern(String s) {
        int n = s.length();
        for (int k = 1; k <= n / 2; k++) {
            if (n % k != 0) continue;
            if (s.substring(0, k).repeat(n / k).equals(s)) return true;
        }
        return false;
    }
}

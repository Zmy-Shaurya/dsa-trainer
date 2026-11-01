import java.util.*;

class Solution {
    public int countPrimes(int n) {
        int count = 0;
        for (int k = 2; k < n; k++) {
            boolean prime = true;
            for (int d = 2; (long) d * d <= k; d++) {
                if (k % d == 0) { prime = false; break; }
            }
            if (prime) count++;
        }
        return count;
    }
}

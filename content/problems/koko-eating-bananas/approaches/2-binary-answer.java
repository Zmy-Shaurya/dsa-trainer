class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int lo = 1, hi = 0;
        for (int p : piles) hi = Math.max(hi, p);
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            long hours = 0;
            for (int p : piles) hours += (p + mid - 1) / mid;       // ceil(p / mid)
            if (hours <= h) hi = mid;                               // fast enough: try slower
            else lo = mid + 1;
        }
        return lo;
    }
}

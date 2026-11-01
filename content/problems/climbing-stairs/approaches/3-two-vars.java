class Solution {
    public int climbStairs(int n) {
        if (n <= 2) return n;
        int prev = 1, cur = 2;                                // ways(1), ways(2)
        for (int step = 3; step <= n; step++) {
            int next = prev + cur;
            prev = cur;
            cur = next;
        }
        return cur;
    }
}

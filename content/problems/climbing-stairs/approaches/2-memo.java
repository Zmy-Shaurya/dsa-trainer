class Solution {
    public int climbStairs(int n) {
        return ways(n, new int[n + 1]);
    }

    private int ways(int n, int[] memo) {
        if (n <= 2) return n;
        if (memo[n] != 0) return memo[n];                     // already computed
        memo[n] = ways(n - 1, memo) + ways(n - 2, memo);
        return memo[n];
    }
}

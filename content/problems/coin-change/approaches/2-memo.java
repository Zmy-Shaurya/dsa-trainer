import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        int[] memo = new int[amount + 1];
        Arrays.fill(memo, -2);                                // -2 means not computed yet
        return fewest(coins, amount, memo);
    }

    private int fewest(int[] coins, int remaining, int[] memo) {
        if (remaining == 0) return 0;
        if (remaining < 0) return -1;
        if (memo[remaining] != -2) return memo[remaining];
        int best = -1;
        for (int coin : coins) {
            int sub = fewest(coins, remaining - coin, memo);
            if (sub >= 0 && (best == -1 || sub + 1 < best)) best = sub + 1;
        }
        memo[remaining] = best;
        return best;
    }
}

class Solution {
    public int rob(int[] nums) {
        int n = nums.length;
        if (n == 1) return nums[0];
        int[] best = new int[n];
        best[0] = nums[0];
        best[1] = Math.max(nums[0], nums[1]);
        for (int i = 2; i < n; i++) {
            best[i] = Math.max(best[i - 1], best[i - 2] + nums[i]);
        }
        return best[n - 1];
    }
}

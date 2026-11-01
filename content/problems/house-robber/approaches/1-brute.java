class Solution {
    public int rob(int[] nums) {
        return best(nums, 0);
    }

    private int best(int[] nums, int i) {
        if (i >= nums.length) return 0;
        int skip = best(nums, i + 1);
        int take = nums[i] + best(nums, i + 2);               // robbing i forces skipping i + 1
        return Math.max(skip, take);
    }
}

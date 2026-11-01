class Solution {
    public int findMin(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1;           // minimum is to the right of mid
            else hi = mid;                                    // mid itself could be the minimum
        }
        return nums[lo];
    }
}

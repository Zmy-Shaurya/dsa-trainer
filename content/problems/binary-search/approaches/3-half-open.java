class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length;                         // search in [lo, hi)
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid;                                    // mid may still be the answer
        }
        return lo < nums.length && nums[lo] == target ? lo : -1;
    }
}

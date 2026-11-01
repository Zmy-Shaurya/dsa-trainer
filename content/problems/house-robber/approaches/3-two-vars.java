class Solution {
    public int rob(int[] nums) {
        int skipPrev = 0, takePrev = 0;                       // best totals ending before / at the last house
        for (int x : nums) {
            int next = Math.max(takePrev, skipPrev + x);
            skipPrev = takePrev;
            takePrev = next;
        }
        return takePrev;
    }
}

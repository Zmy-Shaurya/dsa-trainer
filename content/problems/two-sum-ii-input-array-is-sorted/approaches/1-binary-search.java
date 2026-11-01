import java.util.*;

class Solution {
    public int[] twoSum(int[] numbers, int target) {
        for (int i = 0; i < numbers.length; i++) {
            int lo = i + 1, hi = numbers.length - 1, need = target - numbers[i];
            while (lo <= hi) {
                int mid = lo + (hi - lo) / 2;
                if (numbers[mid] == need) return new int[]{i + 1, mid + 1};
                if (numbers[mid] < need) lo = mid + 1; else hi = mid - 1;
            }
        }
        return new int[]{-1, -1};
    }
}

import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Set<Character> window = new HashSet<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            while (window.contains(s.charAt(right))) {
                window.remove(s.charAt(left));                // shrink until the repeat is gone
                left++;
            }
            window.add(s.charAt(right));
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}

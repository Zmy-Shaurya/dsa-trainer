import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        int best = 0;
        for (int start = 0; start < s.length(); start++) {
            Set<Character> seen = new HashSet<>();
            int end = start;
            while (end < s.length() && seen.add(s.charAt(end))) end++;   // stops at the first repeat
            best = Math.max(best, end - start);
        }
        return best;
    }
}

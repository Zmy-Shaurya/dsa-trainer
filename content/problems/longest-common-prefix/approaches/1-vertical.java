import java.util.*;

class Solution {
    public String longestCommonPrefix(String[] strs) {
        for (int i = 0; i < strs[0].length(); i++) {
            char c = strs[0].charAt(i);
            for (int k = 1; k < strs.length; k++) {
                if (i == strs[k].length() || strs[k].charAt(i) != c) return strs[0].substring(0, i);
            }
        }
        return strs[0];
    }
}

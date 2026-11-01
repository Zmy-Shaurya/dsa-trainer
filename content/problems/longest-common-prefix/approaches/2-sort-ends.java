import java.util.*;

class Solution {
    public String longestCommonPrefix(String[] strs) {
        String[] s = strs.clone();
        Arrays.sort(s);
        String a = s[0], b = s[s.length - 1];
        int i = 0;
        while (i < a.length() && i < b.length() && a.charAt(i) == b.charAt(i)) i++;
        return a.substring(0, i);
    }
}

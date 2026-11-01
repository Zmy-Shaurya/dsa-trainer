import java.util.*;

class Solution {
    public boolean isSubsequence(String s, String t) {
        int pos = 0;
        for (int i = 0; i < s.length(); i++) {
            pos = t.indexOf(s.charAt(i), pos);
            if (pos < 0) return false;
            pos++;
        }
        return true;
    }
}

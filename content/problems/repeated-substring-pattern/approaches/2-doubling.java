import java.util.*;

class Solution {
    public boolean repeatedSubstringPattern(String s) {
        String d = s + s;
        return d.substring(1, d.length() - 1).contains(s);
    }
}

class Solution {
    public boolean isValid(String s) {
        int before;
        do {
            before = s.length();
            s = s.replace("()", "").replace("[]", "").replace("{}", "");
        } while (s.length() != before);                       // stop when nothing was removed
        return s.isEmpty();
    }
}

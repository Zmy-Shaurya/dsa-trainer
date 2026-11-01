import java.util.*;

class Solution {
    public int evalRPN(String[] tokens) {
        int[] st = new int[tokens.length];
        int top = 0;
        for (String t : tokens) {
            if (t.length() == 1 && "+-*/".indexOf(t.charAt(0)) >= 0) {
                int b = st[--top], a = st[--top];
                char op = t.charAt(0);
                st[top++] = op == '+' ? a + b : op == '-' ? a - b : op == '*' ? a * b : a / b;
            } else {
                st[top++] = Integer.parseInt(t);
            }
        }
        return st[0];
    }
}

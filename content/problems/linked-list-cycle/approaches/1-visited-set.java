import java.util.*;

class Solution {
    public boolean hasCycle(ListNode head) {
        Set<ListNode> seen = new HashSet<>();
        for (ListNode node = head; node != null; node = node.next) {
            if (!seen.add(node)) return true;                 // visited this exact node before
        }
        return false;
    }
}

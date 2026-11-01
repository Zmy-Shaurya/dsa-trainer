class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) {
            ListNode next = cur.next;                         // save before overwriting
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }
}

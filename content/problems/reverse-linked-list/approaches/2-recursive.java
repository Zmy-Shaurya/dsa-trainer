class Solution {
    public ListNode reverseList(ListNode head) {
        if (head == null || head.next == null) return head;
        ListNode newHead = reverseList(head.next);            // reverse everything after head
        head.next.next = head;                                // old successor now points back
        head.next = null;
        return newHead;
    }
}

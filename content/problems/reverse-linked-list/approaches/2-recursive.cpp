// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        if (!head || !head->next) return head;
        ListNode* newHead = reverseList(head->next);          // reverse everything after head
        head->next->next = head;                              // old successor now points back
        head->next = nullptr;
        return newHead;
    }
};

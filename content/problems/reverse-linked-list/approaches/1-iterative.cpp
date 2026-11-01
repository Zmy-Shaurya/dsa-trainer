// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* cur = head;
        while (cur) {
            ListNode* next = cur->next;                       // save before overwriting
            cur->next = prev;
            prev = cur;
            cur = next;
        }
        return prev;
    }
};

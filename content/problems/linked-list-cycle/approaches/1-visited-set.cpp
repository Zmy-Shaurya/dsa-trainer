// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool hasCycle(ListNode* head) {
        unordered_set<ListNode*> seen;
        for (ListNode* node = head; node; node = node->next) {
            if (!seen.insert(node).second) return true;       // visited this exact node before
        }
        return false;
    }
};

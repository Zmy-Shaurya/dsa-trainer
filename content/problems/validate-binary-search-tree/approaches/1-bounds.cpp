// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    bool check(TreeNode* node, long long low, long long high) {
        if (!node) return true;
        if (node->val <= low || node->val >= high) return false;   // outside the inherited range
        return check(node->left, low, node->val) && check(node->right, node->val, high);
    }

public:
    bool isValidBST(TreeNode* root) {
        return check(root, LLONG_MIN, LLONG_MAX);
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    long long prev = LLONG_MIN;

    bool inorder(TreeNode* node) {
        if (!node) return true;
        if (!inorder(node->left)) return false;
        if (node->val <= prev) return false;                  // must be strictly increasing
        prev = node->val;
        return inorder(node->right);
    }

public:
    bool isValidBST(TreeNode* root) {
        prev = LLONG_MIN;
        return inorder(root);
    }
};

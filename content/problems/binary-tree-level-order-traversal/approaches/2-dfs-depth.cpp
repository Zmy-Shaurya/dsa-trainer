// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
    void visit(TreeNode* node, int depth, vector<vector<int>>& levels) {
        if (!node) return;
        if (depth == (int)levels.size()) levels.push_back({});   // first node at this depth
        levels[depth].push_back(node->val);
        visit(node->left, depth + 1, levels);
        visit(node->right, depth + 1, levels);
    }

public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> levels;
        visit(root, 0, levels);
        return levels;
    }
};

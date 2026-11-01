class Solution {
    private long prev = Long.MIN_VALUE;

    public boolean isValidBST(TreeNode root) {
        prev = Long.MIN_VALUE;
        return inorder(root);
    }

    private boolean inorder(TreeNode node) {
        if (node == null) return true;
        if (!inorder(node.left)) return false;
        if (node.val <= prev) return false;                   // must be strictly increasing
        prev = node.val;
        return inorder(node.right);
    }
}

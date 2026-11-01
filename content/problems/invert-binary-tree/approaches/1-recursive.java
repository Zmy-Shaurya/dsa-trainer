class Solution {
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        TreeNode left = invertTree(root.left);
        TreeNode right = invertTree(root.right);
        root.left = right;                                    // swap the mirrored subtrees
        root.right = left;
        return root;
    }
}

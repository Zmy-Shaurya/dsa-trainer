import java.util.*;

/** Verification helpers: canonical JSON-like printing and test-input builders. */
class Out {
    static String str(ListNode n) { return n == null ? "[]" : str((Object) n); }

    static String str(TreeNode n) { return n == null ? "[]" : str((Object) n); }

    static String str(Object o) {
        if (o == null) return "null";
        if (o instanceof String) return "\"" + o + "\"";
        if (o instanceof Character) return "\"" + o + "\"";
        if (o instanceof Number || o instanceof Boolean) return o.toString();
        if (o instanceof int[]) return Arrays.toString((int[]) o).replace(" ", "");
        if (o instanceof long[]) return Arrays.toString((long[]) o).replace(" ", "");
        if (o instanceof boolean[]) return Arrays.toString((boolean[]) o).replace(" ", "");
        if (o instanceof Object[]) return join(Arrays.asList((Object[]) o));
        if (o instanceof Collection) return join((Collection<?>) o);
        if (o instanceof ListNode) {
            List<Integer> vals = new ArrayList<>();
            int guard = 0;
            for (ListNode n = (ListNode) o; n != null && guard++ < 200000; n = n.next) vals.add(n.val);
            return join(vals);
        }
        if (o instanceof TreeNode) {
            List<Integer> vals = new ArrayList<>();
            Deque<TreeNode> q = new LinkedList<>();   // allows null children
            q.add((TreeNode) o);
            while (!q.isEmpty()) {
                TreeNode n = q.poll();
                if (n == null) { vals.add(null); continue; }
                vals.add(n.val);
                q.add(n.left);
                q.add(n.right);
            }
            while (!vals.isEmpty() && vals.get(vals.size() - 1) == null) vals.remove(vals.size() - 1);
            return join(vals);
        }
        throw new IllegalArgumentException("cannot print " + o.getClass());
    }

    private static String join(Collection<?> items) {
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (Object x : items) {
            if (!first) sb.append(',');
            first = false;
            sb.append(str(x));
        }
        return sb.append(']').toString();
    }

    /** Linked list from values; when pos >= 0 the tail links back to node `pos`. */
    static ListNode list(int[] vals, int pos) {
        ListNode dummy = new ListNode(), tail = dummy, target = null;
        for (int i = 0; i < vals.length; i++) {
            tail.next = new ListNode(vals[i]);
            tail = tail.next;
            if (i == pos) target = tail;
        }
        if (pos >= 0) tail.next = target;
        return dummy.next;
    }

    /** Level-order tree; null entries are absent children. */
    static TreeNode tree(Integer[] vals) {
        if (vals.length == 0 || vals[0] == null) return null;
        TreeNode root = new TreeNode(vals[0]);
        Deque<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < vals.length) {
            TreeNode n = q.poll();
            if (i < vals.length && vals[i] != null) { n.left = new TreeNode(vals[i]); q.add(n.left); }
            i++;
            if (i < vals.length && vals[i] != null) { n.right = new TreeNode(vals[i]); q.add(n.right); }
            i++;
        }
        return root;
    }
}

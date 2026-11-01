import java.util.*;

class MinStack {
    private final List<Integer> items = new ArrayList<>();

    public MinStack() {}

    public void push(int val) { items.add(val); }

    public void pop() { items.remove(items.size() - 1); }

    public int top() { return items.get(items.size() - 1); }

    public int getMin() {
        int min = Integer.MAX_VALUE;
        for (int x : items) min = Math.min(min, x);           // scan every time
        return min;
    }
}

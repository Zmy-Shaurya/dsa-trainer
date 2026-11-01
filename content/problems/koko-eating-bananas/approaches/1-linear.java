class Solution {
    public int minEatingSpeed(int[] piles, int h) {
        int max = 0;
        for (int p : piles) max = Math.max(max, p);
        for (int speed = 1; speed < max; speed++) {
            long hours = 0;
            for (int p : piles) hours += (p + speed - 1) / speed;   // ceil(p / speed)
            if (hours <= h) return speed;
        }
        return max;
    }
}

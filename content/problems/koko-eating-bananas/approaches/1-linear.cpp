// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int minEatingSpeed(vector<int>& piles, int h) {
        int maxPile = *max_element(piles.begin(), piles.end());
        for (int speed = 1; speed < maxPile; speed++) {
            long long hours = 0;
            for (int p : piles) hours += (p + speed - 1) / speed;   // ceil(p / speed)
            if (hours <= h) return speed;
        }
        return maxPile;
    }
};

// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    int countPrimes(int n) {
        int count = 0;
        for (int k = 2; k < n; k++) {
            bool prime = true;
            for (long long d = 2; d * d <= k; d++) {
                if (k % d == 0) { prime = false; break; }
            }
            if (prime) count++;
        }
        return count;
    }
};

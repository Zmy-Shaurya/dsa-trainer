// @hide-start
#include <bits/stdc++.h>
using namespace std;
// @hide-end
class Solution {
public:
    bool isPalindrome(string s) {
        string clean;
        for (char c : s) {
            if (isalnum((unsigned char)c)) clean += tolower((unsigned char)c);
        }
        string backward(clean.rbegin(), clean.rend());
        return clean == backward;
    }
};

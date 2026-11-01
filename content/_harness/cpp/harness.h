// Verification helpers: node types, canonical printing and test-input builders.
#pragma once
#include <bits/stdc++.h>

struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n) {}
};

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* l, TreeNode* r) : val(x), left(l), right(r) {}
};

inline std::string str(int v) { return std::to_string(v); }
inline std::string str(long long v) { return std::to_string(v); }
inline std::string str(bool v) { return v ? "true" : "false"; }
inline std::string str(const std::string& s) { return "\"" + s + "\""; }
inline std::string str(const char* s) { return str(std::string(s)); }

inline std::string str(ListNode* n) {
    std::string out = "[";
    int guard = 0;
    for (; n && guard < 200000; n = n->next, guard++) out += (guard ? "," : "") + std::to_string(n->val);
    return out + "]";
}

inline std::string str(TreeNode* root) {
    std::vector<std::string> vals;
    std::deque<TreeNode*> q;
    if (root) q.push_back(root);
    else return "[]";
    while (!q.empty()) {
        TreeNode* n = q.front();
        q.pop_front();
        if (!n) { vals.push_back("null"); continue; }
        vals.push_back(std::to_string(n->val));
        q.push_back(n->left);
        q.push_back(n->right);
    }
    while (!vals.empty() && vals.back() == "null") vals.pop_back();
    std::string out = "[";
    for (size_t i = 0; i < vals.size(); i++) out += (i ? "," : "") + vals[i];
    return out + "]";
}

template <class T>
std::string str(const std::vector<T>& v) {
    std::string out = "[";
    for (size_t i = 0; i < v.size(); i++) out += (i ? "," : "") + str(v[i]);
    return out + "]";
}

/** Linked list from values; when pos >= 0 the tail links back to node `pos`. */
inline ListNode* buildList(const std::vector<int>& v, int pos = -1) {
    ListNode dummy;
    ListNode *tail = &dummy, *target = nullptr;
    for (size_t i = 0; i < v.size(); i++) {
        tail->next = new ListNode(v[i]);
        tail = tail->next;
        if ((int)i == pos) target = tail;
    }
    if (pos >= 0) tail->next = target;
    return dummy.next;
}

/** Level-order tree; INT_MIN marks an absent child. */
inline TreeNode* buildTree(const std::vector<int>& v) {
    if (v.empty() || v[0] == INT_MIN) return nullptr;
    TreeNode* root = new TreeNode(v[0]);
    std::deque<TreeNode*> q{root};
    size_t i = 1;
    while (!q.empty() && i < v.size()) {
        TreeNode* n = q.front();
        q.pop_front();
        if (i < v.size() && v[i] != INT_MIN) { n->left = new TreeNode(v[i]); q.push_back(n->left); }
        i++;
        if (i < v.size() && v[i] != INT_MIN) { n->right = new TreeNode(v[i]); q.push_back(n->right); }
        i++;
    }
    return root;
}

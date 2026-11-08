/*
问题 B: 贪心的PIPI
来源：PIPIOJ 2022 公开赛 (http://pipioj.online/problem.php?cid=1045&pid=1)
时间限制: 1s  内存限制: 128MB

- 题目描述
有一天PIPI发现自己身处一条铺满宝石的路，他可以从任意一个位置出发，然后沿一个方向拾取宝石。
由于PIPI很贪心，他一定会拾取沿路经过的宝石，但如果他已经拥有当前位置类型的宝石，他就会
被神秘的力量弹飞出去，从而结束拾取。
请问PIPI能拾取的最大宝石数量是多少？

- 输入
第一行输入数据组数t(1<=t<=100)
接下来t行每行输入一个只包含大写字母的字符串，代表这条路上的各种宝石。
所有的宝石数量不超过1000000。

- 输出
对于每组数据，输出PIPI所能拾取的最大宝石数量。

- 样例输入
2
ABBC
ABACD

- 样例输出
2
4

========================================
【解析】
1. 模型转化：从任意位置出发沿一个方向连续拾取、且途中字符互不相同，等价于求
   字符串的"最长无重复字符子串"（经典滑动窗口问题）。
2. 算法：双指针维护窗口 [l, r]，窗口内每种字符至多出现一次。r 逐个右移，用
   cnt[26] 统计窗口内各字符数量；当新加入的字符 s[r] 数量超过 1 时，不断右移
   左端 l 并递减计数，直到 s[r] 只剩一个。每个位置更新答案 r-l+1。
   左右指针各前进最多 n 次，均摊 O(n)。
3. 复杂度：每组字符串 O(len)，总长不超过 1e6，轻松通过；只用一个 26 长度的
   计数数组（vector<int>），无需 map。
4. 验证样例：
   - "ABBC"：r 扫到第二个 B 时窗口 [A,B,B] 出现重复，l 收缩到 1（窗口 "B"），
     之后加 C 得 "BC" 长 2 → 输出 2 ✓
   - "ABACD"：扫到第二个 A 时收缩 l 到 1（窗口 "BA"），随后加 C、D 得
     "BACD" 长 4 → 输出 4 ✓
   两例均吻合。
*/
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;
    cin >> t;
    while (t--) {
        string s;
        cin >> s;
        vector<int> cnt(26, 0);
        int ans = 0, l = 0;
        for (int r = 0; r < (int)s.size(); r++) {
            cnt[s[r] - 'A']++;
            while (cnt[s[r] - 'A'] > 1) {   // 窗口内出现重复，收缩左端
                cnt[s[l] - 'A']--;
                l++;
            }
            ans = max(ans, r - l + 1);
        }
        cout << ans << "\n";
    }
    return 0;
}

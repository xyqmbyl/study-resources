/*
问题 C: 回文子串数量
来源：PIPIOJ 2023 公开赛 (http://pipioj.online/problem.php?cid=1054&pid=2)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
给定一个字符串，输出其中回文子串的数量。
回文串是指从左往右看和从右往左看完全一样的字符串。

- 输入
多组输入。每组输入一个只包含小写字母的字符串（长度不超过1000）。

- 输出
输出其中回文子串的数量。

- 样例输入
abab

- 样例输出
6

========================================
【解析】
1. 统计的是"回文子串的出现次数"（同一内容出现在不同位置要重复计）。
   例如 abab：单字符 a,b,a,b 共 4 个，加上 aba、bab，共 6 个。
2. 中心扩展法：任何回文串都有一个"回文中心"——奇数长度回文的中心是一个
   字符，偶数长度回文的中心是相邻两个字符之间。枚举 2n-1 个中心，向两边
   扩展，每成功扩展一次就得到一个回文子串。
3. 正确性：每个回文子串由其中心唯一确定，中心扩展恰好枚举每个回文子串
   恰好一次，不重不漏。
4. 复杂度 O(n^2)（最坏情况如 aaaa...，n=1000 时约 1e6 次操作），每组输入
   独立处理，1s 限制内轻松通过。若长度达到 1e7 量级才需要 Manacher 算法。
5. 验证样例：abab 的 6 个回文子串如上列举，输出 6 ✓。
*/
#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    string s;
    while (cin >> s) {
        int n = (int)s.size();
        long long cnt = 0;
        for (int c = 0; c < n; c++) {
            // 奇数长度回文：中心为单字符
            for (int l = c, r = c; l >= 0 && r < n && s[l] == s[r]; l--, r++)
                cnt++;
            // 偶数长度回文：中心在 c 与 c+1 之间
            for (int l = c, r = c + 1; l >= 0 && r < n && s[l] == s[r]; l--, r++)
                cnt++;
        }
        cout << cnt << "\n";
    }
    return 0;
}

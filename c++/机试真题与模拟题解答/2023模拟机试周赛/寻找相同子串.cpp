/*
问题 D: 寻找相同子串
来源：PIPIOJ 2023 模拟机试周赛 (http://pipioj.online/problem.php?cid=1055&pid=3)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
有n个长度为L的字符串，你的目标是寻找出所有长度为k的字符串，且至少是m个
所给字符串的子串。输出满足题意的子串数量。

- 输入
多组输入。第一行四个整数n,m,k,L(1<=m<=n<=100,1<=k<=L<=3000)。
接下来输入n个只包含大写字母的字符串。

- 输出
输出至少存在于m个字符串，且长度等于k的子串数量。

- 样例输入
3 2 2 3
ABC
ABD
BCA

- 样例输出
2

========================================
【解析】
1. 直接思路：枚举每个字符串的所有长度为 k 的子串（共 L-k+1 个），统计
   "每个不同子串出现在多少个不同字符串中"，出现次数 >= m 的子串个数即答案。
2. 数据规模：n <= 100，L <= 3000，总子串数 n*(L-k+1) <= 3e5，非常小。
   但子串本身最长 3000 字符，若直接把子串放进 map<string,int>，内存与
   比较开销偏大（3e5 * 3000 ≈ 9e8 字节），因此改用字符串哈希：
   - 对每个字符串预处理前缀哈希，O(1) 取出每个长度 k 子串的双哈希值
     （两个不同模数/进制，避免哈希碰撞误判）；
   - 每个字符串先对本串内的哈希去重（同一子串在同一串中只算一次），
     再用全局 map<long long,int> 累加"包含该子串的字符串个数"；
   - 最后遍历 map，统计值 >= m 的键数。
3. 复杂度：每组 O(n*L) 次哈希 + O(n*L) 次 map 操作 ≈ 3e5，轻松通过。
4. 验证样例：k=2 时各串子串为 {AB,BC},{AB,BD},{BC,CA}，出现在>=2个串中的
   是 AB、BC → 输出 2 ✓。
*/
#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <utility>
using namespace std;

typedef unsigned long long ull;
typedef pair<ull, ull> Hash;
const ull MOD1 = 1000000007ULL, MOD2 = 998244353ULL;
const int MAXL = 3005;
vector<ull> p1(MAXL), p2(MAXL);

// 取子串 s[l..l+k-1]（l 从 0 开始）的双哈希值
inline Hash getHash(const vector<ull>& h1, const vector<ull>& h2, int l, int k) {
    ull a = (h1[l + k] + MOD1 - h1[l] * p1[k] % MOD1) % MOD1;
    ull b = (h2[l + k] + MOD2 - h2[l] * p2[k] % MOD2) % MOD2;
    return make_pair(a, b);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    p1[0] = p2[0] = 1;
    for (int i = 1; i < MAXL; i++) {
        p1[i] = p1[i - 1] * 131 % MOD1;
        p2[i] = p2[i - 1] * 137 % MOD2;
    }
    int n, m, k, L;
    while (cin >> n >> m >> k >> L) {
        map<Hash, int> cnt; // 子串哈希 -> 覆盖的字符串数
        for (int i = 0; i < n; i++) {
            string s;
            cin >> s;
            int len = (int)s.size();
            vector<ull> h1(len + 1, 0), h2(len + 1, 0);
            for (int j = 0; j < len; j++) {
                h1[j + 1] = (h1[j] * 131 + s[j]) % MOD1;
                h2[j + 1] = (h2[j] * 137 + s[j]) % MOD2;
            }
            // 同一子串在本串内去重后再计数
            map<Hash, bool> seen;
            for (int l = 0; l + k <= len; l++) {
                Hash key = getHash(h1, h2, l, k);
                if (!seen[key]) {
                    seen[key] = true;
                    cnt[key]++;
                }
            }
        }
        int ans = 0;
        for (const auto& kv : cnt)
            if (kv.second >= m) ans++;
        cout << ans << "\n";
    }
    return 0;
}

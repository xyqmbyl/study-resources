/*
问题 E: 异或和
来源：PIPIOJ 2024 公开赛 (http://pipioj.online/problem.php?cid=1056&pid=4)
时间限制: 1s  内存限制: 128MB

- 题目描述
给定n个正整数，问是否有两个数的异或和是2的整数次幂；
如果有，输出"yes"，随后输出异或和最小的那组数，并使第一个数尽可能小；
如果没有，输出"no"。

- 输入
第一行输入一个整数n(1<=n<=1e5)，
第二行输入这n个正整数，每个数不超过2^31。

- 输出
如果有两个数的异或和是2的整数次幂，输出"yes"，
然后在下一行输出符合条件的异或和最小的那组数，并使第一个数尽可能小，
否则输出"no"。

- 提示
虽然1 3也符合，但是1与3异或的结果是2，而2与3异或的结果是1，要更小。

- 样例输入
5
1 2 3 4 5

- 样例输出
yes
2 3

========================================
【解析】
1. 模型转化：x ^ y = 2^k 等价于 x 与 y 除第 k 位外完全相同，即
   y = x ^ (1<<k)。所以"存在一对数异或和为 2^k" 等价于
   "存在数组中的值 x，使得 x ^ (1<<k) 也在数组中"。
2. 异或和是 2 的幂 → 最小化异或和等价于找最小的 k。把所有数放入
   unordered_set，对 k = 0,1,2,...,31 依次检查：是否存在 x 使
   x ^ (1<<k) 也在集合中（数不超过 2^31，异或结果不超过 2^32-1，
   检查到 2^31 即覆盖所有可能）。
3. 找到最小 k 后，所有数对形如 {x, x ^ 2^k}，二者恰有一个第 k 位为 0
   （即较小的那个）。要求"第一个数尽可能小"：在所有满足
   x ^ 2^k ∈ 集合 的 x 中取最小的作为第一个数输出，第二个数为
   first ^ (1<<k)。
4. 复杂度：O(32n) 次哈希查询，n ≤ 1e5 轻松通过。
5. 实现细节：值可达 2^31，超过 int 上限，统一用 long long；
   位移用 (1LL << k)。
6. 验证样例：{1,2,3,4,5}：k=0 时 x=2，2^1=3 在集合中（1^3=2 是 k=1，
   更大；提示亦说明选 2 3）→ 输出 "yes" 与 "2 3" ✓。
*/
#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    while (cin >> n) {   // 题面未注明多组，用 while 循环兼容单组与多组
        vector<long long> a(n);
        unordered_set<long long> s;
        for (int i = 0; i < n; i++) {
            cin >> a[i];
            s.insert(a[i]);
        }
        bool found = false;
        for (int k = 0; k <= 31 && !found; k++) {
            long long bit = 1LL << k;
            long long first = -1;
            for (int i = 0; i < n; i++) {
                long long y = a[i] ^ bit;
                if (s.count(y)) {
                    long long lo = min(a[i], y);  // 第 k 位为 0 的那个较小
                    if (first == -1 || lo < first) first = lo;
                }
            }
            if (first != -1) {
                cout << "yes" << "\n";
                cout << first << " " << (first ^ bit) << "\n";
                found = true;
                break;
            }
        }
        if (!found) cout << "no" << "\n";
    }
    return 0;
}

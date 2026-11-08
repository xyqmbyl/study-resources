/*
问题 D: 收银员PIPI
来源：PIPIOJ 2023 公开赛 (http://pipioj.online/problem.php?cid=1054&pid=3)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
PIPI需要找给客人t元，现在他手上有n种面值的纸币，每种纸币的数量可以看作无限多。
他想要使用最少的纸币凑齐这t元，请问这个最小值是多少？

- 输入
多组输入。第一行输入要凑齐的钱数t(t<=1e6)和有的纸币种数n(n<=20)。
接下来输入这n种纸币的面值x(xi<=1e9)。

- 输出
输出凑齐目标钱数的最少纸币数。若无法恰好凑到该钱数，输出-1。

- 样例输入
10 3
2 3 4

- 样例输出
3

========================================
【解析】
1. 这是"完全背包求最少件数"问题。面值可以任意（不保证是贪心可解的
   倍数系统），所以不能贪心地"每次用最大面值"——例如面值 {2,3,4}、
   目标 10：贪心会选 4+4+2 = 3 张，恰好也是 3 张；但换成 {5,6,9}、
   目标 12：贪心选 6+6 = 2 张是对的，可 {1,3,4} 目标 6：贪心 4+1+1 = 3 张，
   而最优 3+3 = 2 张。因此必须用动态规划。
2. 状态设计：dp[j] = 凑出金额 j 所需的最少纸币数。
   初始 dp[0] = 0，dp[其余] = INF。对每种面值 x：
        for (j = x; j <= t; j++) dp[j] = min(dp[j], dp[j-x] + 1);
   注意 j 从小到大正序枚举——这正是完全背包的写法，允许同一种面值使用
   无限次。
3. 复杂度 O(t*n) = 1e6 * 20 = 2e7，完全在 1s 以内。
4. 细节：
   - 面值 xi 可达 1e9，超过 t 的面值直接跳过（用不上，还能防数组越界）；
   - 结束时若 dp[t] 仍为 INF，说明无法恰好凑出，输出 -1。
5. 验证样例：t=10，面值 {2,3,4}：dp 推得 dp[10] = 3（4+4+2 或 4+3+3），
   输出 3 ✓。
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

const int INF = 0x3f3f3f3f;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t, n;
    while (cin >> t >> n) {
        vector<int> x(n);
        for (int i = 0; i < n; i++) cin >> x[i];
        vector<int> dp(t + 1, INF);
        dp[0] = 0;
        for (int i = 0; i < n; i++) {
            if (x[i] > t) continue;  // 面值比目标还大，用不上
            for (int j = x[i]; j <= t; j++)  // 正序：每种面值无限使用
                if (dp[j - x[i]] + 1 < dp[j])
                    dp[j] = dp[j - x[i]] + 1;
        }
        cout << (dp[t] >= INF ? -1 : dp[t]) << "\n";
    }
    return 0;
}

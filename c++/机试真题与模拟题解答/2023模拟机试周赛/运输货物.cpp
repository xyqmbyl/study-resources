/*
问题 E: 运输货物
来源：PIPIOJ 2023 模拟机试周赛 (http://pipioj.online/problem.php?cid=1055&pid=4)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
PIPI的仓库里有n个货物需要按顺序送到其他地点，并且他的货车有着容量限制k和重量
限制w。这意味着货车内装的箱子数量不能超过k并且总重量不能超过w。
将货车内的货物按顺序送完后，他需要回到仓库继续装货，直到所有货物均送达指定地点。
从仓库到一个地点，在两个不同地点之间转移，以及回到仓库都算一趟行程，
请问PIPI送完货物需要的最少行程数是多少。

- 输入
多组输入。第一行输入货物数n，地点数m，容量限制k，重量限制w
(1<=n,m,k,w<=100000)。接下来n行，每行两个整数a,b，代表第i个货物需要送往的
地点以及重量(1<=a<=m,1<=b<=w)。

- 输出
对于每组输入，输出PIPI送完所有货物需要的行程数。

- 样例输入
4 3 3 6
1 2
3 3
3 1
3 2

- 样例输出
4

========================================
【解析】
1. 货物必须按顺序送，所以每趟运的一定是连续的一段货物 [j+1..i]。
   一趟的行程数 = 从仓库出来(1) + 段内不同地点之间的转移(不同地点数-1) + 回仓库(1)
              = 段内不同地点数 + 1。
   注意段内送到同一地点的多件货不需要重复转移。
2. 定义 dp[i] = 送完前 i 件货物的最少行程数，转移：
        dp[i] = min_{j} ( dp[j] + distinct(j+1..i) ) + 1
   其中 [j+1..i] 需满足箱子数 i-j <= k 且总重量 <= w。
3. 直接枚举 j 统计 distinct 是 O(n^2)，n=1e5 会超时。用经典优化：
   当 i 增加到 i 时，对于固定的左端点 j，若第 i 件货物的地点在 (j..i-1] 中
   出现过（即 pre[i] > j，pre[i] 为该地点上一次出现的下标），distinct 不变；
   否则 distinct 加 1（即 j >= pre[i] 时加 1）。
   于是维护一棵支持"区间加、区间最小值"的线段树，下标为 j：
   - 初始 f(j) = dp[j]；
   - 每轮 i 开始时，对 j ∈ [pre[i], i-1] 做 +1；
   - dp[i] = min_{j ∈ [L(i), i-1]} f(j) + 1，
     其中下界 L(i) 由两个单调指针给出（箱子数 i-j<=k 且重量和<=w，
     重量前缀和单调递增，可双指针维护）。
   复杂度 O(n log n)。
4. 验证样例：4 件货地点 1,3,3,3，k=3, w=6：
   方案 [货1] / [货2,3,4]：行程 = (1+1) + (1+1) = 4 ✓
   （一趟送 1,2,3 会因重量 2+3+1=6、箱子 3 件可行，但行程 = 1+2+1 = 4
   加上最后一趟反而更差；[1,2]/[3,4] 为 3+2=5 也不如 4。）
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

const long long INF = 1e18;
int n, m, k, w;
vector<int> loc, wt, pre, last;
vector<long long> sumw, dp;
vector<long long> mn, lz; // 线段树：区间最小值 + 懒标记

void build(int node, int l, int r) {
    lz[node] = 0;
    if (l == r) { mn[node] = (l <= n ? dp[l] : INF); return; }
    int mid = (l + r) >> 1;
    build(node << 1, l, mid);
    build(node << 1 | 1, mid + 1, r);
    mn[node] = min(mn[node << 1], mn[node << 1 | 1]);
}
void pushdown(int node) {
    if (lz[node]) {
        for (int c = 0; c < 2; c++) {
            mn[node << 1 | c] += lz[node];
            lz[node << 1 | c] += lz[node];
        }
        lz[node] = 0;
    }
}
void update(int node, int l, int r, int ql, int qr, long long v) {
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) { mn[node] += v; lz[node] += v; return; }
    pushdown(node);
    int mid = (l + r) >> 1;
    update(node << 1, l, mid, ql, qr, v);
    update(node << 1 | 1, mid + 1, r, ql, qr, v);
    mn[node] = min(mn[node << 1], mn[node << 1 | 1]);
}
long long query(int node, int l, int r, int ql, int qr) {
    if (qr < l || r < ql || qr < ql) return INF;
    if (ql <= l && r <= qr) return mn[node];
    pushdown(node);
    int mid = (l + r) >> 1;
    return min(query(node << 1, l, mid, ql, qr), query(node << 1 | 1, mid + 1, r, ql, qr));
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    while (cin >> n >> m >> k >> w) {
        loc.assign(n + 1, 0);
        wt.assign(n + 1, 0);
        pre.assign(n + 1, 0);
        last.assign(m + 1, 0);
        sumw.assign(n + 1, 0);
        dp.assign(n + 1, INF);
        mn.assign(4 * (n + 1), 0);
        lz.assign(4 * (n + 1), 0);
        for (int i = 1; i <= n; i++) {
            cin >> loc[i] >> wt[i];
            pre[i] = last[loc[i]]; last[loc[i]] = i;
            sumw[i] = sumw[i - 1] + wt[i];
        }
        dp[0] = 0;
        build(1, 0, n); // 线段树叶子 j 存 f(j)=dp[j]（初始 dp[0]=0，其余 INF）
        int low = 0; // 重量窗口左端
        for (int i = 1; i <= n; i++) {
            // 新元素 i：对 j >= pre[i] 的段，distinct 加 1
            update(1, 0, n, pre[i], i - 1, 1);
            // 维护重量下界：重量和 sumw[i]-sumw[j] <= w -> j >= 某值
            while (sumw[i] - sumw[low] > w) low++;
            // 箱子数约束：i - j <= k -> j >= i - k
            int L = max(low, i - k);
            long long best = query(1, 0, n, L, i - 1);
            dp[i] = best + 1;
            update(1, 0, n, i, i, dp[i] - INF); // 把叶子 j=i 的 INF 改成 dp[i]
        }
        cout << dp[n] << "\n";
    }
    return 0;
}

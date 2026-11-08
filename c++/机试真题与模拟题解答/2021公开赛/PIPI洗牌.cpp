/*
问题 E: PIPI洗牌
来源：PIPIOJ 2021 公开赛 (http://pipioj.online/problem.php?cid=1022&pid=4)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI有n张牌，每张牌面上都有相应的权值。可以把 n 张牌以任意顺序打乱，
从左至右摆放编号 1~n，使得 Σ_{i=1}^{n-k} |a_i - a_{i+k}| 最小。求最小值。

- 输入
单组数据。第一行两个整数 n 和 k，n<=5e5，k<=min(5000, n-1)。
接下来 n 个整数 ai，|ai|<=1e9。

- 输出
输出满足题目要求的最小值。

- 样例输入
3 2
1 2 4

- 样例输出
1

========================================
【解析】
1. 下标按 mod k 分组：位置 i, i+k, i+2k, ... 构成一条"链"，共 k 条
   链，代价 = 所有链上相邻两数差之和。
2. 排序 + 交换论证：最优摆法一定可以让每条链对应排序数组的一个
   连续区间（若两条链的取值区间交错，交换两元素不使代价变大）。
   链内按升序摆放时链的代价 = 段最大值 − 段最小值（telescoping，
   乱序只会更大），所以每段代价只取决于段的首尾。
3. 设排序后相邻差 g[i] = a[i+1]-a[i]（1<=i<=n-1）。全部代价之和
   Σ_{i=1..n-k}|a_i-a_{i+k}| = Σ段(段尾-段头) = Σ全部 g − 被段边界
   跨过的 k-1 个差。于是问题变成：把排序数组切成 k 个连续段
   （段长两种：q = n/k 与 q+1，其中 r = n%k 个段长 q+1），
   最大化被 k-1 个段边界擦掉的差值之和。
4. 结构化 DP：第 j 段结束位置 t_j = j*q + c_j，c_j 为前 j 段中长
   (q+1) 段的个数，满足 c 非降、每步 0/1、且
   max(0, j-(k-r)) <= c_j <= min(j, r)。滚动一维 DP：
        dp_j[c] = max(dp_old[c], dp_old[c-1]) + g[t_j]
   j 取 1..k-1（k-1 个内部段边界）。答案 = Σ g[i] − max_c dp[k-1][c]。
   复杂度 O(n log n + k·r)，k,r <= 5000 → 约 2.5e7 次运算。
5. 边界：k == 1 时无段边界，答案 = a[n]-a[1]（即 Σ g）；r == 0 时
   只能顺序切分。全部用 long long（|a_i|<=1e9，差可达 2e9）。
6. 验证样例：n=3, k=2，排序 [1,2,4]，g1=1, g2=2，总差 3。
   q=1, r=1；j=1：c=0 → 边界在 1*1+0=1，擦 g1=1；c=1 → 边界在 2，
   擦 g2=2。最大擦除 2 → 答案 3-2 = 1 ✓
   （对应摆法 2 4 1：|2-4| + |4-1|... 取 k=2：|a1-a3| = |2-4| = 2？摆成
   [2,4,1] 时 Σ_{i=1..1}|a_i-a_{i+2}| = |2-1| = 1 ✓）。
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

typedef long long ll;
const ll NEG = -4e18;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<ll> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];
    sort(a.begin() + 1, a.end());

    ll total = 0;
    vector<ll> gap(n, 0);                  // gap[i] = a[i+1]-a[i]，i=1..n-1
    for (int i = 1; i < n; i++) {
        gap[i] = a[i + 1] - a[i];
        total += gap[i];
    }

    if (k == 1) {                          // 整段一段，代价 = 极差
        cout << total << "\n";
        return 0;
    }

    int q = n / k, r = n % k;
    // dp[c]：放完前 j 段、其中 c 段长为 q+1 时，被擦差值和的最大值
    vector<ll> dp(r + 1, NEG), nd(r + 1, NEG);
    dp[0] = 0;                             // 还没放段
    for (int j = 1; j <= k - 1; j++) {     // 第 j 个段边界（共 k-1 个）
        int lo = max(0, j - (k - r)), hi = min(j, r);
        for (int c = 0; c <= r; c++) nd[c] = NEG;
        for (int c = lo; c <= hi; c++) {
            ll best = NEG;
            // 第 j 段长为 q：c 不变；长为 q+1：c-1 -> c
            if (c >= max(0, (j - 1) - (k - r)) && c <= min(j - 1, r))
                best = max(best, dp[c]);
            if (c - 1 >= max(0, (j - 1) - (k - r)) && c - 1 <= min(j - 1, r))
                best = max(best, dp[c - 1]);
            if (best > NEG / 2)
                nd[c] = best + gap[(ll)j * q + c];   // 段边界在 j*q+c
        }
        swap(dp, nd);
    }
    ll erase = NEG;
    for (int c = 0; c <= r; c++) erase = max(erase, dp[c]);
    cout << total - erase << "\n";
    return 0;
}

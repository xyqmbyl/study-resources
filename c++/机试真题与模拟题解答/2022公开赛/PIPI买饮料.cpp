/*
问题 E: PIPI买饮料
来源：PIPIOJ 2022 公开赛 (http://pipioj.online/problem.php?cid=1045&pid=4)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI进行完运动后，最爱在小卖部买若干瓶饮料喝了。
已知小卖部一共有n种饮料，第i种饮料的体积为i，且第i种饮料的数量也为i。
现在PIPI的书包容积为n，请问PIPI把书包恰好装满的购买方案数有多少种，答案对1000000007取模。
我们定义，若当且仅当至少存在一种饮料的购买数不同，则这两个购买方案不同。

- 输入
输入一个正整数n，n<=10^5。

- 输出
输出一个数，代表PIPI把书包恰好装满的购买方案数，答案对1000000007取模。

- 提示
样例解释：
第一种方案是{1,2}
第二种方案是{3}
因此购买方案数为2

- 样例输入
3

- 样例输出
2

========================================
【解析】
1. 模型转化：求方程 c_1 + 2*c_2 + ... + n*c_n = n 的非负整数解个数，其中
   0 <= c_i <= i（第 i 种饮料最多 i 瓶）。生成函数为
        F(x) = Π_{i=1}^{n} (1 + x^i + x^{2i} + ... + x^{i*i})
             = Π_{i=1}^{n} (1 - x^{i*i+i}) / (1 - x^i)。
   只需求 x^n 的系数。
2. 拆分计算：当 i*i + i > n 时分子因子 (1 - x^{i*i+i}) 在模 x^{n+1} 意义下为 1，
   可忽略，这样的 i 只有约 sqrt(2n) ≈ 450 个。于是
        F(x) = h(x) * P(x)，其中 h(x) = Π_{i>=1, i(i+1)<=n} (1 - x^{i*i+i})，
   P(x) = 1/Π_{i>=1}(1 - x^i) = Σ p(m) x^m 为无限制整数拆分母函数。
   - h(x) 是稀疏多项式：逐个乘上 (1 - x^e)（e = i(i+1)），逆序更新
     h[j] -= h[j-e]，共 O(n*sqrt(n))；
   - p(m) 用五边形数定理递推：p(m) = Σ_{k>=1} (-1)^{k+1} [p(m-k(3k-1)/2) +
     p(m-k(3k+1)/2)]，每个 m 只需 O(sqrt(m)) 项，总复杂度 O(n*sqrt(n))。
   最后答案 = Σ_e h[e] * p[n-e] (mod 1e9+7)。
3. 复杂度：时间 O(n*sqrt(n))（n=1e5 时约 5e7 次简单运算），空间 O(n)，
   均在限制内；中间量用 long long，负系数及时 +MOD 修正。
4. 验证样例：n=3 时
   - p 递推得 p[0]=1, p[1]=1, p[2]=2, p[3]=3；
   - h = Π_{i(i+1)<=3} (1-x^{i(i+1)}) = (1-x^2)（i=1，因 1*2=2<=3；i=2 时 6>3）；
   - 答案 = h[0]*p[3] + h[2]*p[1] = 1*3 + (-1)*1 = 2。
   手工验证：恰好装满 3 的方案为 {1,2}（一瓶1号+一瓶2号）和 {3}（一瓶3号），
   共 2 种，与样例输出 2 一致。
*/
#include <iostream>
#include <vector>
using namespace std;

const long long MOD = 1000000007LL;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    while (cin >> n) {
        // 1) 五边形数定理求拆分数 p[0..n]
        vector<long long> p(n + 1, 0);
        p[0] = 1;
        for (int m = 1; m <= n; m++) {
            long long s = 0;
            for (long long k = 1;; k++) {
                long long e1 = k * (3 * k - 1) / 2;  // 广义五边形数
                if (e1 > m) break;
                long long sign = (k & 1) ? 1 : -1;   // (-1)^(k+1)
                s += sign * p[m - e1];
                long long e2 = k * (3 * k + 1) / 2;
                if (e2 <= m) s += sign * p[m - e2];
            }
            s %= MOD;
            if (s < 0) s += MOD;
            p[m] = s;
        }
        // 2) h(x) = Π (1 - x^{i(i+1)})，i(i+1) <= n
        vector<long long> h(n + 1, 0);
        h[0] = 1;
        for (long long i = 1; i * (i + 1) <= n; i++) {
            long long e = i * (i + 1);
            for (int j = n; j >= (int)e; j--) {      // 乘以 (1 - x^e)
                h[j] -= h[j - e];
                if (h[j] < 0) h[j] += MOD;
            }
        }
        // 3) 答案 = Σ h[e] * p[n-e]
        long long ans = 0;
        for (int e = 0; e <= n; e++) {
            if (h[e]) ans = (ans + h[e] % MOD * p[n - e]) % MOD;
        }
        cout << ans << "\n";
    }
    return 0;
}

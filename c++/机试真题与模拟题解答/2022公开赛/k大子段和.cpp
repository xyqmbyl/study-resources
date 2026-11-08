/*
问题 D: k大子段和
来源：PIPIOJ 2022 公开赛 (http://pipioj.online/problem.php?cid=1045&pid=3)
时间限制: 1s  内存限制: 128MB

- 题目描述
给出 n 个整数 a_1,a_2,...,a_n，定义 b_{i,j}=a_i+a_{i+1}+...+a_j(1<=i<=j<=n)，
找出所有的 b_{i,j} 中第 k 大的是多少。

- 输入
第一行两个整数 n,k(1<=n<=100000,1<=k<=n*(n+1)/2)。
第二行 n 个整数 a_1,a_2,...,a_n(1<=a[i]<=10^9)。

- 输出
输出一行一个整数表示答案。

- 提示
b_{1,1}=2,b_{1,2}=3,b_{1,3}=6,b_{2,2}=1,b_{2,3}=4,b_{3,3}=3
从大到小排序后为 6,4,3,3,2,1
第二大的为 4

- 样例输入
3 2
2 1 3

- 样例输出
4

========================================
【解析】
1. 模型转化：设前缀和 pre[i] = a_1+...+a_i，则 b_{i,j} = pre[j]-pre[i-1]。
   共 n*(n+1)/2 个子段和，n 达 1e5，总数约 5e9，无法枚举排序，采用二分答案。
2. 计数函数：a[i] >= 1 保证前缀和严格递增。定义 count(x) = 和 >= x 的子段个数：
   对每个右端 j，满足 a_i+...+a_j >= x 的左端 i 即满足 pre[i-1] <= pre[j]-x 的
   i，由于 pre 严格递增，合法左端是前缀 1..q。j 增大时 pre[j]-x 单调不减，q 只
   会右移，用双指针均摊 O(n) 统计。count(x) 关于 x 单调不增，可二分。
3. 二分：在 [1, pre[n]] 上找最大的 x 使 count(x) >= k，该 x 即第 k 大
   （count(x) >= k 说明至少有 k 个子段和 >= x；count(x+1) < k 说明 >= x+1 的
   不足 k 个，故第 k 大恰为 x）。值域约 1e14，二分约 47 轮，总复杂度
   O(n log(sum))。
4. 实现细节：k 与子段总数最大约 5e9、和最大约 1e14，全部用 long long；
   双指针 q 表示"合法左端个数"（左端 i 对应 pre[i-1]，q 是满足 pre[t] <=
   pre[j]-x 的最大 t，子段数为 q+1，q 从 -1 起）。
5. 验证样例：a=[2,1,3]，pre=[0,2,3,6]，k=2。
   count(4)：j=1 阈值-2 无左端；j=2 阈值-1 无；j=3 阈值 2，pre[0]=0、pre[1]=2
   均满足，q=1，计 2 个（即 6 和 4）→ count(4)=2 >= 2；
   count(5)：j=3 阈值 1，只有 pre[0]=0 满足 → count=1 < 2。
   故最大满足的 x 为 4，与样例输出 4 一致。
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long n, k;
    while (cin >> n >> k) {
        vector<long long> pre(n + 1, 0);
        for (int i = 1; i <= n; i++) {
            long long x;
            cin >> x;
            pre[i] = pre[i - 1] + x;
        }
        auto countGE = [&](long long x) -> long long {
            // 和 >= x 的子段个数：前缀和严格递增，双指针
            long long cnt = 0;
            int q = -1;  // 左端 i 合法 <=> pre[i-1] <= pre[j] - x，合法 i-1 为 0..q
            for (int j = 1; j <= (int)n; j++) {
                while (q + 1 < j && pre[q + 1] <= pre[j] - x) q++;
                cnt += q + 1;
            }
            return cnt;
        };
        long long lo = 1, hi = pre[n], ans = 1;
        while (lo <= hi) {
            long long mid = (lo + hi) / 2;
            if (countGE(mid) >= k) { ans = mid; lo = mid + 1; }
            else hi = mid - 1;
        }
        cout << ans << "\n";
    }
    return 0;
}

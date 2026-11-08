/*
问题 E: 分饼干
来源：PIPIOJ 2023 公开赛 (http://pipioj.online/problem.php?cid=1054&pid=4)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
有n个小朋友坐成一圈，每人手上有若干块饼干。老师要求他们进行传递，使得每个人
手上的饼干数量相同。每个小朋友只能传递饼干给左右相邻的小朋友，保证饼干总量
是n的整数倍，问最少传递多少块饼干可以满足老师的要求。

- 输入
多组输入。每组数据第一行输入一个正整数n(n<=1e6)，第二行输入n个正整数，
按顺时针给出每个小朋友持有的饼干数。

- 输出
对于每组数据，输出被传递饼干数量的最小值，答案保证在64位整数范围内。

- 样例输入
3
10 10 10
4
1 1 4 2

- 样例输出
0
3

========================================
【解析】
经典"均分纸牌/糖果传递"问题（NOIP 2016 提高组原题的环形版本）。
1. 设平均值为 avg（总量为 n 的倍数），令 c[i] = a[i] - avg。
   设 x[i] 表示第 i 个小朋友顺时针传给第 i+1 个小朋友的饼干数
   （可为负，表示反方向传），则平衡条件为：
        c[i] = x[i-1] - x[i]  （ i 收到左边 x[i-1]，给出右边 x[i] ）
   递推可得 x[i] = X - (c[1]+c[2]+...+c[i])，其中 X = x[0] 是待定的自由变量。
2. 目标是最小化总传递量 Σ|x[i]|，即最小化 Σ|X - s[i]|（s[i] 为前缀和）。
   这是经典的绝对值最值问题：X 取所有 s[i] 的中位数时最小（对 |X-s| 求和，
   中位数是使每个 s 贡献距离之和最小的点）。
3. 环形不需要特殊处理：因为 X 与 x[0] 是同一个变量，递推一圈后自动满足
   Σc[i]=0 的相容条件。
4. 复杂度 O(n)：一次前缀和，一次 nth_element 求中位数（避免 sort 的 O(n log n)
   也可，1e6 规模排序也可接受），一次求和。注意用 long long：n、饼干数都
   可达 1e6，前缀和可达 1e12。
5. 验证样例：
   - 10 10 10：avg=10，c 全 0，答案 0 ✓。
   - 1 1 4 2：avg=2，c = {-1,-1,2,0}，前缀和 s = {-1,-2,0,0}，中位数 0，
     答案 = 1+2+0+0 = 3 ✓。
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    while (cin >> n) {
        vector<long long> a(n + 1), s(n + 1, 0);
        long long sum = 0;
        for (int i = 1; i <= n; i++) {
            cin >> a[i];
            sum += a[i];
        }
        long long avg = sum / n;
        for (int i = 1; i <= n; i++)
            s[i] = s[i - 1] + (a[i] - avg);  // 前缀和（s[n]=0）
        // 中位数：对 s[1..n] 取第 (n+1)/2 小
        nth_element(s.begin() + 1, s.begin() + (n + 1) / 2, s.end());
        long long X = s[(n + 1) / 2], ans = 0;
        for (int i = 1; i <= n; i++)
            ans += (s[i] > X ? s[i] - X : X - s[i]);
        cout << ans << "\n";
    }
    return 0;
}

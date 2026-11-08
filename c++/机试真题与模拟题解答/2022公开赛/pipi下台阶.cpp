/*
问题 A: pipi下台阶
来源：PIPIOJ 2022 公开赛 (http://pipioj.online/problem.php?cid=1045&pid=0)
时间限制: 1s  内存限制: 128MB

- 题目描述
有 n 个台阶，从左到右第 i 个台阶的高度为 a_i，如果 pipi 在楼梯 x，则 pipi 可以这样走：
如果 x>1 并且楼梯 x-1 的高度小于等于楼梯 x 的高度(即 a_{x-1}<=a_x)，则 pipi 可以走到楼梯 x-1。
如果 x<n 并且楼梯 x+1 的高度小于等于楼梯 x 的高度(即 a_{x+1}<=a_x)，则 pipi 可以走到楼梯 x+1。
pipi 可以选择一个起点楼梯 s(1<=s<=n)，pipi 想知道他最多可以走多少步（到达起点 s 算一步）。

- 输入
第一行一个整数 n(1<=n<=200000)。
第二行 n 个整数 a_1,a_2,...,a_n(1<=a_i<=10^9)。

- 输出
输出 pipi 最多能走的步数，如果 pipi 可以走无数步，输出 inf。

- 样例输入
5
1 2 3 4 5

- 样例输出
5

========================================
【解析】
1. 无限步判定：若存在相邻两阶高度相等（a_x == a_{x+1}），则从 x 可走到 x+1
   （a_{x+1}<=a_x），又可从 x+1 走回 x（a_x<=a_{x+1}），来回走无数步 → 输出 inf。
2. 若任意相邻两阶高度都不相等，则每次移动都严格走向更低的台阶（走到 <= 自身、
   又不能相等，即严格小于），走过的海拔严格递减，路径必然有限；而且一旦从起点
   出发选定了方向就永远不会回头（回头需要上坡），所以最优路径就是从某个 s 出发
   沿一个方向的一段"严格下降"连续台阶，步数 = 该段台阶数（含起点算一步）。
3. 线性递推两个方向的下降段长度：
   - 向右走：right[i] = (a[i] > a[i+1]) ? right[i+1] + 1 : 1，从右往左算；
   - 向左走：left[i]  = (a[i] < a[i-1]) ? left[i-1] + 1 : 1，从左往右算；
   答案 = max(left[i], right[i])。复杂度 O(n)。
4. 验证样例：a=[1,2,3,4,5]，无相邻相等；向右走无处可降全部为 1；
   向左走 left = [1,2,3,4,5]，最大 5，即 s=5 依次走到 4、3、2、1，
   含起点共 5 步，与样例输出 5 一致。
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
        vector<long long> a(n + 1);
        for (int i = 1; i <= n; i++) cin >> a[i];
        bool inf = false;
        for (int i = 1; i < n; i++) {
            if (a[i] == a[i + 1]) { inf = true; break; }
        }
        if (inf) { cout << "inf\n"; continue; }
        vector<int> L(n + 2, 1), R(n + 2, 1);
        int ans = 1;
        for (int i = 2; i <= n; i++) {          // 从 i 出发向左走
            if (a[i] > a[i - 1]) L[i] = L[i - 1] + 1;
            ans = max(ans, L[i]);
        }
        for (int i = n - 1; i >= 1; i--) {      // 从 i 出发向右走
            if (a[i] > a[i + 1]) R[i] = R[i + 1] + 1;
            ans = max(ans, R[i]);
        }
        cout << ans << "\n";
    }
    return 0;
}

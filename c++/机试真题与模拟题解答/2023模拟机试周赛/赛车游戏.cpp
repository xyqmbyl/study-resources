/*
问题 B: 赛车游戏
来源：PIPIOJ 2023 模拟机试周赛 (http://pipioj.online/problem.php?cid=1055&pid=1)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
一条赛道上有n个停车点，每个停车点都有一辆车，第i辆车可以最多行驶a[i]个停车点。
PIPI可以在任意一个停车点换车，问PIPI最少换几次车可以到达终点（第n个停车点）。

- 输入
多组输入。第一行输入停车点数量n(1<=n<=100000)。
第二行输入n个整数，代表第i辆车最多可以行驶a[i]个停车点(1<=a[i]<=1000)。

- 输出
对于每组输入，输出到达终点的最少换车次数。

- 样例输入
5
2 3 1 1 4
3
3 2 1

- 样例输出
1
0

========================================
【解析】
这是经典的"跳跃游戏 II"（LeetCode 45）模型：
1. 把"坐上第 i 辆车"看作到达位置 i，车最多向前开 a[i] 个停车点，即从位置 i
   一步能跳到 i+1 ~ i+a[i] 中的任意位置；起点是第 1 个停车点（此时不换车）。
2. 求到达位置 n 的最少步数（步数 = 换车次数），a[i] >= 1 保证一定能到达。
3. 标准贪心 O(n)：逐个扫描停车点，维护
   - curEnd：当前这辆车最远能开到哪个停车点；
   - farthest：在当前车的可达范围内，下一辆车最远能开到哪。
   当扫描下标 i 越过 curEnd 时，必须换车（换到能让 farthest 最远的那辆），
   换车次数 +1，并令 curEnd = farthest。
4. 验证样例：a=[2,3,1,1,4]：坐车1最多到 3 号点；在 2 或 3 号点换上车2/车3
   可以直达 5 号点 → 换 1 次 ✓。a=[3,2,1]：第 1 辆车最多开 3 个停车点，
   从 1 号点直达 4 >= n → 0 次 ✓。
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
        vector<int> a(n + 1);
        for (int i = 1; i <= n; i++) cin >> a[i];
        if (n == 1) { cout << 0 << "\n"; continue; }  // 已经在终点
        int ans = 0;              // 换车次数
        int curEnd = 1 + a[1];    // 当前这辆车能开到的最远停车点
        int farthest = 1 + a[1];  // 可达范围内下一辆车能到的最远点
        int i = 2;
        while (i < n) {
            farthest = max(farthest, i + a[i]);
            if (i == curEnd) {    // 必须在这里换车
                ans++;
                curEnd = farthest;
                if (curEnd >= n) break;
            }
            i++;
        }
        cout << ans << "\n";
    }
    return 0;
}

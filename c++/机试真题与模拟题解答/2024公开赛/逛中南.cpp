/*
问题 D: 逛中南
来源：PIPIOJ 2024 公开赛 (http://pipioj.online/problem.php?cid=1056&pid=3)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI和小伙伴们考研初试结束了，想要去中南校本部逛一逛，但他们每个人起始的
位置不同，中南校本部可以看成一个m*n的网格，PIPI和小伙伴们分别在不同的位置，
中南有楼房也有空地，楼房不能走，空地可走，他们每个人每秒都可以沿上下左右
走一步，请问最少多少时间能有两个人相遇？

- 输入
多组输入。
每组第一行输入迷宫的大小m和n(1<=m,n<=1000)。
接下来m行每行n个字符，*代表人，#代表楼房，-代表空地。

- 输出
输出有两个人相遇的最少时间。
如果无论多久都不能有两个人相遇，输出-1。

- 提示
每个人在每秒都可以选择原地不动

- 样例输入
2 3
*#*
---
2 3
*#*
-#-

- 样例输出
2
-1

========================================
【解析】
1. 模型转化：所有人同时每秒走一步（可等待），两人能在时刻 T 于格子 c 相遇
   当且仅当两人到 c 的图上距离都不超过 T。所以固定格子 c 的最优相遇时间
   = max(最近的人到 c 的距离, 次近的"不同的人"到 c 的距离)。
   全局答案 = min over c 的该值。（也等于 ⌈任意两人间最小图上距离 / 2⌉，
   在两人最短路径的中点相遇取得。）
2. 算法：多源 BFS，源点为所有 '*'（楼房 '#' 不可走）。每个格子维护
   (d1, id1, d2)：最近的源点距离及来源编号、来自不同源点的次近距离。
   BFS 弹出 u 时向四邻 v 松弛候选 (d1[u]+1, id[u])：
   - v 未被访问：记录 d1 并入队（单位权 BFS 首次到达即最短）；
   - 否则若来源不同且候选更小：更新 d2（d2 只用于统计，不再传播）。
   正确性：最优两人 (a,b) 距离 D，其最短路径中点处，a、b 的距离都
   ≤ ⌈D/2⌉，且其余源点到中点距离 ≥ ⌈D/2⌉，故中点的 (d1,d2) 恰好取到
   下界；另一方面任一格上 (d1,d2) 来自两个真实的不同的人，其 max 不小于
   两人距离的一半，故不会低估。两边夹逼，答案精确。
3. 若不存在同时被两个不同源点可达的格子（人少于 2 人或被楼隔开），
   输出 -1。
4. 复杂度：每格最多入队一次，O(mn)；m,n ≤ 1000，多组输入可行。
5. 验证样例：
   - 用例1：两人在 (0,0)、(0,2)，路径 (0,0)→(1,0)→(1,1)→(1,2)→(0,2)
     长 4；(1,1) 处 d1=2（左上的人）、d2=2（右上的人），max=2 → 输出 2 ✓。
   - 用例2：中间整列全是 '#'，两人分属两个连通块，任何格子都只能被一个人
     到达 → 输出 -1 ✓。
*/
#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int m, n;
    while (cin >> m >> n) {
        vector<string> g(m);
        for (int i = 0; i < m; i++) cin >> g[i];
        int total = m * n;
        vector<int> d1(total, -1), d2(total, -1), sid(total, -1);
        queue<int> q;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (g[i][j] == '*') {
                    int id = i * n + j;
                    d1[id] = 0;
                    sid[id] = id;   // 以自身格子编号作为该人的编号
                    q.push(id);
                }
        const int dx[4] = {-1, 1, 0, 0};
        const int dy[4] = {0, 0, -1, 1};
        while (!q.empty()) {
            int u = q.front(); q.pop();
            int ux = u / n, uy = u % n;
            for (int t = 0; t < 4; t++) {
                int vx = ux + dx[t], vy = uy + dy[t];
                if (vx < 0 || vx >= m || vy < 0 || vy >= n) continue;
                if (g[vx][vy] == '#') continue;
                int v = vx * n + vy;
                int cand = d1[u] + 1;
                if (d1[v] == -1) {
                    d1[v] = cand;
                    sid[v] = sid[u];
                    q.push(v);
                } else if (sid[v] != sid[u] &&
                           (d2[v] == -1 || cand < d2[v])) {
                    d2[v] = cand;   // 来自不同源点的次近距离
                }
            }
        }
        int ans = -1;
        for (int i = 0; i < total; i++) {
            if (d1[i] < 0 || d2[i] < 0) continue;
            int best = max(d1[i], d2[i]);
            if (ans == -1 || best < ans) ans = best;
        }
        cout << ans << "\n";
    }
    return 0;
}

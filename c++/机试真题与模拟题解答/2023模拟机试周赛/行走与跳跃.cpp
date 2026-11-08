/*
问题 C: 行走与跳跃
来源：PIPIOJ 2023 模拟机试周赛 (http://pipioj.online/problem.php?cid=1055&pid=2)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
PIPI现在身处一个迷宫，每秒钟他可以向上下左右无障碍的地方行走一格，或者选择耗费
一点魔力值进行一次跳跃。跳跃是指象棋中的马走日，即从(x,y)可以到达(x+a,y+b)
且1<=|a|,|b|<=2,|a|+|b|=3。
请问PIPI最少花费多少时间到达出口，若无法到达，输出impossible。

- 输入
多组输入。第一行输入迷宫的长为m,宽为n，PIPI拥有的魔力值k(1<m,n<=100,0<=k<=100)。
接下来输入一个大小为m*n的字符矩阵。其中.代表空地，#代表障碍，
S代表PIPI目前位置，T代表出口所在位置。

- 输出
对于每组输入，输出PIPI逃离迷宫的最短时间，若PIPI无法到达出口，输出impossible。

- 样例输入
3 3 1
.S.
.#.
.T.
3 4 2
S##.
#T#.
.#..

- 样例输出
2
impossible

========================================
【解析】
1. 分层图 BFS（拆点）：每秒钟可以"走一格"（不耗魔力）或"马走日跳一次"
   （耗 1 点魔力），两种动作都花 1 秒。把状态扩展成 (x, y, 已用魔力 j)，
   j ∈ [0, k]，状态数最多 100*100*101 ≈ 1e6，直接 BFS 即可。
2. 转移：
   - 四方向相邻空地/出口：状态 (nx, ny, j)，耗时 1；
   - 8 个马步 (±1,±2)/(±2,±1)：需 j+1 <= k 且落点是空地/出口，
     转移到 (nx, ny, j+1)，耗时 1。
   注意：跳跃到达的格子也必须是'.'或'T'，障碍上不能停留；但可以越"过"
   障碍（马跳的路径中间格不检查）。
3. 第一个到达 T 的状态（任意魔力层数）所用的秒数即为答案；BFS 队列为空
   仍未到达则输出 impossible。
4. 验证样例1：S(1,2) 走一格被中心 '#' 挡住，但马步 (1,2)→(3,1)（耗1魔力，
   1秒），再走一步到 T(3,2)，共 2 秒 ✓。
   样例2：T 被墙包围，马步也跳不进去 → impossible ✓。
*/
#include <iostream>
#include <vector>
#include <string>
#include <queue>
using namespace std;

struct Node { int x, y, j; };

// dist[x][y][j]: 已用 j 次跳跃时的最短时间
int bfs(int m, int n, int k, const vector<string>& g, int sx, int sy, int tx, int ty) {
    const vector<int> dx4 = {1, -1, 0, 0};
    const vector<int> dy4 = {0, 0, 1, -1};
    const vector<int> jx = {1, 1, -1, -1, 2, 2, -2, -2};
    const vector<int> jy = {2, -2, 2, -2, 1, -1, 1, -1};
    vector<vector<vector<int>>> dist(
        m + 1, vector<vector<int>>(n + 1, vector<int>(k + 1, -1)));
    queue<Node> q;
    dist[sx][sy][0] = 0;
    q.push({sx, sy, 0});
    while (!q.empty()) {
        Node cur = q.front(); q.pop();
        if (cur.x == tx && cur.y == ty) return dist[cur.x][cur.y][cur.j];
        // 普通行走
        for (int d = 0; d < 4; d++) {
            int nx = cur.x + dx4[d], ny = cur.y + dy4[d];
            if (nx < 1 || nx > m || ny < 1 || ny > n) continue;
            if (g[nx][ny] == '#' || dist[nx][ny][cur.j] != -1) continue;
            dist[nx][ny][cur.j] = dist[cur.x][cur.y][cur.j] + 1;
            q.push({nx, ny, cur.j});
        }
        // 马步跳跃（耗 1 魔力）
        if (cur.j < k) {
            for (int d = 0; d < 8; d++) {
                int nx = cur.x + jx[d], ny = cur.y + jy[d];
                if (nx < 1 || nx > m || ny < 1 || ny > n) continue;
                if (g[nx][ny] == '#' || dist[nx][ny][cur.j + 1] != -1) continue;
                dist[nx][ny][cur.j + 1] = dist[cur.x][cur.y][cur.j] + 1;
                q.push({nx, ny, cur.j + 1});
            }
        }
    }
    return -1;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int m, n, k;
    while (cin >> m >> n >> k) {
        vector<string> g(m + 1, string(n + 1, ' '));
        int sx = 0, sy = 0, tx = 0, ty = 0;
        for (int i = 1; i <= m; i++) {
            string row;
            cin >> row;
            for (int j = 1; j <= n; j++) {
                g[i][j] = row[j - 1];
                if (g[i][j] == 'S') { sx = i; sy = j; }
                if (g[i][j] == 'T') { tx = i; ty = j; }
            }
        }
        int ans = bfs(m, n, k, g, sx, sy, tx, ty);
        if (ans == -1) cout << "impossible\n";
        else cout << ans << "\n";
    }
    return 0;
}

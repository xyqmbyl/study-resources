/*
问题 C: 马走日
来源：PIPIOJ 2022 公开赛 (http://pipioj.online/problem.php?cid=1045&pid=2)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI很喜欢下象棋，尤其是"马"这个棋子。
有一天他把棋子"马"放到了一个m*n的棋盘中，这个棋盘上有一些其他棋子，因此"马"不能走到这些棋子上。
PIPI现在想知道在第9999999步的时候，"马"能否从起点刚好到达终点。（每一步必须行动，若无法行动则视为失败）
如果能到达，输出yes，否则输出no。

- 输入
第一行输入棋盘的大小m,n(1<=m,n<=1000)
第二行输入"马"需要到达的终点坐标x y (1<=x<=m,1<=y<=n)
接下来输入一个m*n大小的字符矩阵，*代表空位置，@代表"马"初始时所在的位置，#代表其他棋子

- 输出
如果"马"能在第9999999步的时候到达终点，输出yes；
否则输出no。

- 提示
"马"是按日字走的，如从(1,1)可以走到(2,3)，并且不考虑"别马脚"的情况，
即只考虑是否在棋盘内与棋盘上是否有别的棋子。

- 样例输入
3 4
2 3
@***
#***
***#

- 样例输出
yes

========================================
【解析】
1. 奇偶性（染色）分析：马每步走日字，坐标变化为 (+-1,+-2) 或 (+-2,+-1)，
   行列坐标之和 i+j 的奇偶性每步必然翻转（1+2=3 是奇数）。因此走奇数步后
   马一定在与起点异色的格子上。9999999 是奇数，所以终点必须与起点异色，
   即 (sx+sy) 与 (tx+ty) 奇偶性不同，否则直接输出 no（若起点=终点也属同色，
   同样输出 no，因为每一步必须行动）。
2. 可达性：终点异色时，还需马确实能走到终点（不能越过 # 棋子），从 @ 做
   BFS/DFS 求可达性即可，复杂度 O(mn)。
3. 步数恰好凑成 9999999：设起点到终点某条路径长为 L（由奇偶性，L 必为奇数，
   且 L <= m*n <= 10^6 < 9999999）。只要起点存在至少一个合法落点 c（可达时
   必然存在），就可以在出发前反复做"起点->c->起点"的 2 步往返来消耗偶数步。
   取 k = (9999999 - L) / 2 >= 0，先往返 2k 步再沿路径走 L 步，总步数恰好
   9999999。所以"异色 + 可达"就是答案为 yes 的充要条件。
4. 验证样例：3x4 棋盘，@ 在 (1,1)，终点 (2,3)。
   奇偶性：1+1=2 偶，2+3=5 奇，异色 ✓；BFS：马从 (1,1) 一步可直接跳到
   (2,3)（日字），该格为 * 非障碍 ✓ → 输出 yes，与样例一致。
*/
#include <iostream>
#include <vector>
#include <string>
#include <queue>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int m, n;
    while (cin >> m >> n) {
        int tx, ty;
        cin >> tx >> ty;
        vector<string> g(m);
        for (int i = 0; i < m; i++) cin >> g[i];
        int sx = -1, sy = -1;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (g[i][j] == '@') { sx = i; sy = j; }
            }
        }
        bool ok;
        if ((((sx + sy) ^ (tx - 1 + ty - 1)) & 1) == 0) {
            ok = false;   // 同色，奇数步不可能到达
        } else {
            const int dx[8] = {1, 1, -1, -1, 2, 2, -2, -2};
            const int dy[8] = {2, -2, 2, -2, 1, -1, 1, -1};
            vector<vector<char>> vis(m, vector<char>(n, 0));
            queue<pair<int, int>> q;
            vis[sx][sy] = 1;
            q.push({sx, sy});
            while (!q.empty()) {
                int x = q.front().first, y = q.front().second;
                q.pop();
                for (int d = 0; d < 8; d++) {
                    int nx = x + dx[d], ny = y + dy[d];
                    if (nx < 0 || nx >= m || ny < 0 || ny >= n) continue;
                    if (g[nx][ny] == '#' || vis[nx][ny]) continue;
                    vis[nx][ny] = 1;
                    q.push({nx, ny});
                }
            }
            ok = vis[tx - 1][ty - 1];
        }
        cout << (ok ? "yes" : "no") << "\n";
    }
    return 0;
}

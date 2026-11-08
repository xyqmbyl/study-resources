/*
问题 B: PIPI逛超市
来源：PIPIOJ 2023 公开赛 (http://pipioj.online/problem.php?cid=1054&pid=1)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
超市里有n样商品，第i样商品原价m元。如果你买了第i样商品，那么再买第j样商品时
就可以只花Kij元（Kij=0 表示没有优惠，只能按原价买）。
PIPI想把n样商品全部买下，问他最少需要花多少钱。

- 输入
多组输入。第一行两个整数n和m（商品数、商品原价，n<=500, m<=1000）。
接下来一个n*n的矩阵K，第i行第j列表示买完第i样商品再买第j样的价格Kij。

- 输出
对于每组输入，输出最少花费。

- 样例输入
5 3
0 3 2
3 0 4
2 4 0

- 样例输出
10

========================================
【解析】
1. 建模：把每样商品看作图上一个点。买第一样必须付原价 m；之后每买一样，
   可以从"任何一个已买过的商品 i"享受优惠价 Kij（若 Kij=0 或 Kij>m 则按 m）。
   这正对应最小生成树模型：
   - 建一个超级源点 0，向每个商品 i 连一条权为 m 的边 —— 表示"以原价购入
     第 i 样"（即该商品是某棵生成树里第一个被买的）；
   - 商品 i、j 之间连权为 Kij 的边（Kij=0 表示无优惠，不建边）；
   - 答案 = 该图的最小生成树权值和。
   直观理解：按生成树的顺序买东西，每条边代表"由父亲优惠/原价购入孩子"。
2. 证明最优性：任何购买顺序对应树上一条从源点出发的遍历路径，花费 >= 生成树
   路径边权和 >= 最小生成树权值和；反之按 MST 的拓扑序购买可以恰好取到该和。
3. n <= 500，共约 (n^2+n)/2 ≈ 12.5 万条边，Kruskal 排序 + 并查集即可。
   注意读入的是对称矩阵，只取上三角避免重复建边。
4. 验证样例：m=5，优惠矩阵 1-2:3、1-3:2、2-3:4。
   先原价买 3 号（5 元），用优惠 2 元买 1 号，再从 1 号优惠 3 元买 2 号，
   共 5+2+3 = 10 ✓。MST 权值 = 2+3+5 = 10 ✓。
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Edge {
    int u, v, w;
};

int find(vector<int>& fa, int x) {
    return fa[x] == x ? x : fa[x] = find(fa, x);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    while (cin >> n >> m) {
        vector<Edge> e;
        for (int i = 1; i <= n; i++)
            for (int j = 1; j <= n; j++) {
                int x;
                cin >> x;
                if (i < j && x != 0)  // 对称矩阵只取上三角；0 表示无优惠不建边
                    e.push_back({i, j, x});
            }
        // 超级源点 0 向每个商品连权为 m 的边（原价购入）
        for (int i = 1; i <= n; i++) e.push_back({0, i, m});
        vector<int> fa(n + 1);
        for (int i = 0; i <= n; i++) fa[i] = i;
        sort(e.begin(), e.end(), [](const Edge& a, const Edge& b) { return a.w < b.w; });
        int tot = 0, ans = 0;  // tot: 已选边数
        // Kruskal：选满 n 条边（n+1 个点的生成树）
        for (size_t j = 0; j < e.size() && tot < n; j++) {
            int ru = find(fa, e[j].u), rv = find(fa, e[j].v);
            if (ru != rv) {
                fa[ru] = rv;
                tot++;
                ans += e[j].w;
            }
        }
        cout << ans << "\n";
    }
    return 0;
}

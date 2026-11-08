/*
问题 C: 外卖配送问题
来源：PIPIOJ 2025 公开赛 (http://pipioj.online/problem.php?cid=1068&pid=2)
时间限制: 1s  内存限制: 128MB

- 题目描述
为了解决学生午餐的配送问题，中南被划分为了n个区域。
为了保证午餐的及时配送，现在有两种办法：
1. 在区域i上建立一个外卖点，每天给外卖点发放午餐的耗时为vi（外卖点一旦建立，
  就可以向其他任意区域配送午餐）。
2. 将这个区域i与另外的已经有外卖点的区域j之间建立配送关系，配送耗时为pi,j。
现在需要一个可以在最短时间内完成配送的方案(配送耗时为所有耗时的累加)。

- 输入
第一行包含一个整数 n，表示区域总数。0<=n<=300
接下来 n行，每行一个整数，第 i行表示在第 i个区域建立外卖点后，每天中午给
该外卖点发放午餐的耗时 vi。
接下来为一个 n×n的矩阵 P，其中 pi,j表示在区域i和区域j之间建立配送关系的耗时。
数据保证 pi,j = pj,i 且对角线值为0。

- 输出
输出一个整数，表示给所有区域完成配送的最短耗时

- 样例输入
5
1404
82936
56078
34575
92720
0 730 96563 38284 67202
730 0 46726 49706 11509
96563 46726 0 43931 97968
38284 49706 43931 0 27244
67202 11509 97968 27244 0

- 样例输出
84818

========================================
【解析】
1. 模型转化：每个区域要么"建外卖点"（花费 v_i），要么通过配送关系与其它区域
   连通（花费 p_ij）。经典技巧——增设一个虚拟的"午餐供应源"节点 0：在源与
   区域 i 之间连一条权为 v_i 的边（建外卖点 = 接入源头），区域 i、j 之间连
   权为 p_ij 的边。任何合法方案都对应这张 n+1 个点的图中"所有区域与源连通"
   的一棵生成树，最短耗时即最小生成树的权值和。
2. 算法：Kruskal——把 n 条源边（权 v_i）和 n(n-1)/2 条区域间边（权 p_ij）
   全部按权排序，用并查集依次尝试合并，选满 n 条边即止。
3. 复杂度：点数 n+1 <= 301，边数约 n(n+1)/2 ≈ 4.5 万，排序 O(E log E)，
   并查集近 O(E α(n))，远在时限之内。
4. 实现细节：
   - n 可以为 0，此时没有任何区域，直接输出 0；
   - 矩阵对称，只需读入上三角（i<j）存边，但每个数都必须读掉；
   - 耗时累加可能超出 int，边权与答案用 long long；
   - n+1 个点的生成树恰有 n 条边，用计数器提前结束。
5. 验证样例：源边权 v=[1404,82936,56078,34575,92720]。
   Kruskal 按权从小到大：取 p12=730、v1=1404、p25=11509、p45=27244、
   p34=43931（之后的 34575、38284 等边均连接已连通的点，成环跳过），
   这 5 条边恰好连通 6 个点，总和 = 730+1404+11509+27244+43931 = 84818，
   与样例输出一致 ✓
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Edge {
    int u, v;
    long long w;
};

vector<int> fa;
int find(int x) {
    return fa[x] == x ? x : fa[x] = find(fa[x]);  // 路径压缩
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    if (n == 0) {
        cout << 0 << "\n";
        return 0;
    }
    vector<long long> v(n + 1);
    for (int i = 1; i <= n; i++) cin >> v[i];
    vector<Edge> es;
    es.reserve((size_t)n * (n + 1) / 2);
    for (int i = 1; i <= n; i++)              // 建外卖点 = 与虚拟源点 0 相连
        es.push_back({0, i, v[i]});
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= n; j++) {
            long long p;
            cin >> p;
            if (i < j) es.push_back({i, j, p});
        }
    sort(es.begin(), es.end(),
         [](const Edge& a, const Edge& b) { return a.w < b.w; });
    fa.resize(n + 1);
    for (int i = 0; i <= n; i++) fa[i] = i;
    long long ans = 0;
    int cnt = 0;
    for (size_t k = 0; k < es.size() && cnt < n; k++) {
        int ru = find(es[k].u), rv = find(es[k].v);
        if (ru != rv) {
            fa[ru] = rv;
            ans += es[k].w;
            cnt++;
        }
    }
    cout << ans << "\n";
    return 0;
}

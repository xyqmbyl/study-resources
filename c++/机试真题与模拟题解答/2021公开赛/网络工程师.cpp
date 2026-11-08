/*
问题 B: 网络工程师
来源：PIPIOJ 2021 公开赛 (http://pipioj.online/problem.php?cid=1022&pid=1)
时间限制: 1s  内存限制: 128MB

- 题目描述
n 个连通的电子元件分为 k 个类别，元件间有 m 条线路。PIPI 想只保留
部分线路使所有元件仍能相互通信（即保留一个连通的生成子图），并且
让"连接不同类别元件"的保留线路数量最少。求这个最小值。

- 输入
多组测试用例。每组第一行 n, m, k (2<=n<=1000, 1<=m<=n*(n-1)/2,
1<=k<=100)；第二行 n 个整数 class[i] (1<=class[i]<=k)；接下来
m 行每行两个整数 u, v，表示一条线路。

- 输出
每组输出最少保留多少条连接不同类别元件的线路。

- 样例输入
4 4 2
1 1 2 2
1 2
2 3
3 4
4 1

- 样例输出
1

========================================
【解析】
1. 问题转化：必须保留一个连通的生成子图（至少是一棵生成树），
   代价 = 保留的"跨类别边"条数。同类别元件之间的边不计代价。
2. 关键结论：答案 = 把"所有同类边"都加入并查集之后的连通块数 − 1。
   证明：
   - 下界：先把所有同类边免费加入，得到若干连通块。任意保留方案
     中，跨类别边若连接同一连通块内的两点则可删去（不影响连通性，
     且不增加代价），故最优解可以看成在这些连通块之间的一个生成树
     结构，至少需要 块数−1 条边；而任何一条连接两个不同连通块的边
     一定是跨类别的（若同类，则该边已被免费加入，两端点必在同一块，
     矛盾）。故代价 >= 块数 − 1。
   - 可达性：原图连通，把每个连通块缩成点后仍连通，任取其生成树
     的 块数−1 条边保留即可，这些边全是跨类别边。
3. 算法：并查集。第一遍只合并 class[u]==class[v] 的边；统计连通块
   数 cnt；输出 cnt − 1。无需再用跨类别边建树（题目只要数量）。
4. 复杂度：O(n + m·α)，n,m <= 1000，多组数据轻松通过。
5. 验证样例：class = 1 1 2 2；同类边只有 1-2（类别1）与 3-4（类别2），
   合并后连通块为 {1,2} 和 {3,4}，共 2 块，答案 = 2 − 1 = 1 ✓
   （保留线路 2-3 即可：1-2-3-4 连通，且只有 2-3 是跨类别线路）。
*/
#include <iostream>
#include <vector>
#include <utility>
using namespace std;

vector<int> fa;

int find(int x) {
    while (fa[x] != x) x = fa[x] = fa[fa[x]];  // 路径压缩
    return x;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m, k;
    while (cin >> n >> m >> k) {
        vector<int> cls(n + 1);
        fa.assign(n + 1, 0);
        for (int i = 1; i <= n; i++) {
            cin >> cls[i];
            fa[i] = i;
        }
        vector<pair<int, int>> edges(m);
        for (auto& e : edges) cin >> e.first >> e.second;
        // 第一遍：免费加入所有同类边
        for (const auto& e : edges) {
            if (cls[e.first] == cls[e.second]) {
                int a = find(e.first), b = find(e.second);
                if (a != b) fa[a] = b;
            }
        }
        int cnt = 0;
        for (int i = 1; i <= n; i++)
            if (find(i) == i) cnt++;   // 统计连通块数
        cout << cnt - 1 << "\n";
    }
    return 0;
}

/*
问题 D: 社交网络
来源：PIPIOJ 2020 公开赛 (http://pipioj.online/problem.php?cid=1012&pid=3)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
校园网可以抽象成一张 n 个结点 m 条边的无向图。第 0 个小时黑客把病毒
传播到黑客主机，之后每一小时，已感染的主机都会把病毒传给与其直接
相连的用户主机（即感染范围每小时扩大 1 层）。现在已知过去 t 小时后
的感染主机集合 S，请求出所有有嫌疑的黑客主机；若不存在输出 -1。

- 输入
第一行 n,m (1<=n,m<=1000)。
接下来 m 行，每行两个数 u,v，表示一条无向关系。
接下来一行两个数 k,t，k 为集合 S 的大小。
最后一行 k 个数，表示集合 S 中的元素 (1<=u,v,k<=n, t<=1e9)。

- 输出
递增输出所有有嫌疑的黑客主机编号，每个编号一行（或空格分隔）；
若不存在，输出 -1。

- 样例输入
4 3
3 2
1 2
1 4
3 2
4 2 1

- 样例输出
4

========================================
【解析】
1. 感染模型：从黑客主机 v 出发，每 1 小时感染向外扩散一层，t 小时后
   感染的恰好是所有与 v 距离 <= t 的结点。因此 v 是嫌疑主机
        ⟺  { u : BFS距离 dist(v,u) <= t } == S
   即两条件：该集合大小等于 |S| = k，且集合内的点都在 S 中。
   （注意 t>=1 时 v 自己也在感染集合中，所以黑客主机自身一定属于 S。）
2. 算法：对每个结点 v (1..n) 做一次 BFS 求全图距离，然后 O(n) 检查：
        cnt = 0;
        for u = 1..n:
            if (dist[u] <= t) { cnt++; if (!inS[u]) fail; }
        合法当且仅当 !fail && cnt == k
   全部合法的 v 按编号递增输出；一个都没有则输出 -1。
3. 复杂度：n 次 BFS，每次 O(n+m)，总 O(n(n+m)) <= 1000*2000 = 2e6，
   远在时限内。t 可达 1e9 但只用于比较，不影响复杂度。
4. 实现细节：
   - n,m 只有 1000，用 vector 邻接表即可；距离数组每次 BFS 前重置为 -1；
   - dist 用 int 存（n<=1000，最大距离 < 1000，与 t 比较 no 问题）；
   - 输出格式：OJ 常见为每行一个或空格分隔，这里按行递增输出
     （样例只有一个答案，两种写法均兼容）。
5. 验证样例：n=4，边 3-2, 1-2, 1-4；S={4,2,1}，t=2。
   - 从 4 出发：dist(4)=0, dist(1)=1, dist(2)=2, dist(3)=3。
     距离<=2 的集合 = {4,1,2} == S ✓，4 是嫌疑主机。
   - 从 1 出发：dist(1)=0, dist(2)=1, dist(4)=1, dist(3)=2，
     距离<=2 的集合 = {1,2,3,4} ≠ S（多了 3），排除。
   - 从 2、3 出发同样无法恰好等于 S。故答案只有 4 ✓。
*/
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    while (cin >> n >> m) {
        vector<vector<int>> g(n + 1);
        for (int i = 0; i < m; i++) {
            int u, v;
            cin >> u >> v;
            g[u].push_back(v);
            g[v].push_back(u);
        }
        int k;
        long long t;
        cin >> k >> t;
        vector<bool> inS(n + 1, false);
        for (int i = 0; i < k; i++) {
            int s;
            cin >> s;
            inS[s] = true;
        }
        vector<int> dist_(n + 1);
        bool first = true;
        for (int v = 1; v <= n; v++) {   // 枚举每个可能的黑客主机
            for (int i = 1; i <= n; i++) dist_[i] = -1;
            queue<int> q;
            dist_[v] = 0;
            q.push(v);
            while (!q.empty()) {         // 标准 BFS
                int u = q.front(); q.pop();
                for (int w : g[u])
                    if (dist_[w] == -1) {
                        dist_[w] = dist_[u] + 1;
                        q.push(w);
                    }
            }
            int cnt = 0;
            bool ok = true;
            for (int u = 1; u <= n && ok; u++)
                if (dist_[u] >= 0 && dist_[u] <= t) {
                    cnt++;
                    if (!inS[u]) ok = false; // 感染了 S 以外的点，排除
                }
            if (ok && cnt == k) {
                if (!first) cout << " ";
                cout << v;
                first = false;
            }
        }
        cout << (first ? "-1" : "") << "\n";
    }
    return 0;
}

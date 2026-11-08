/*
问题 D: 魔术师PIPIⅡ
来源：PIPIOJ 2021 公开赛 (http://pipioj.online/problem.php?cid=1022&pid=3)
时间限制: 1s  内存限制: 128MB

- 题目描述
POPO给PIPI一个数字a，希望PIPI把它变成另一个数字b。a和b数位相同，
且都是4位素数或5位素数。PIPI每次使用魔术只能将a的其中一位数字改成
另一位数字，且改完后得到的数必须仍然是素数。求最少使用多少次魔术。

- 输入
第一行一个正整数T表示数据组数，T<=20。
接下来T行，每行两个四位素数或五位素数a和b。

- 输出
对于每组数据，输出最少魔术次数。若无法变成，输出-1。

- 样例输入
1
1033 1033

- 样例输出
0

========================================
【解析】
1. 状态空间很小：4/5 位素数都在 [1000, 99999] 内，总共不到 9 万个
   整数。把每个素数看成一个节点，"改动一位数字且结果仍是素数"看做
   一条边，问题就是 a 到 b 的最短路。边权全是 1 → 用 BFS。
2. 预处理：埃氏筛（或欧拉筛）出 [0, 100000) 的素数表，O(N log log N)。
3. BFS 扩展：对当前数 x 的每一位（十进制拆位），尝试改成任意不同
   数字 d：
   - 最高位不能改成 0（否则位数变了，不满足"数位相同"）；
   - 改完的数 y 必须是素数（查表）且未访问过。
   每个状态至多 5×9 = 45 个后继，整张图规模很小。
4. a == b 时直接输出 0；BFS 结束仍未到达 b 则输出 -1。
   多组询问可以每次独立 BFS（T<=20，总共 20 次 BFS，毫无压力）；
   也可以预处理连通块，这里从简。
5. 复杂度：单次 BFS O(9 万 × 45)，20 组共约 8×10^7 次基本操作，
   1s 内轻松通过。
6. 验证样例：a = b = 1033，起点即终点，BFS 起始时判断相等，
   输出 0 ✓。
*/
#include <iostream>
#include <vector>
#include <queue>
#include <string>
using namespace std;

const int LIMIT = 100000;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // 埃氏筛素数表
    vector<bool> isPrime(100000, true);
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; i < 100000; i++)
        if (isPrime[i])
            for (long long j = 1LL * i * i; j < 100000; j += i)
                isPrime[j] = false;

    int T;
    cin >> T;
    while (T--) {
        int a, b;
        cin >> a >> b;
        if (a == b) { cout << 0 << "\n"; continue; }
        vector<int> dist(100000, -1);
        queue<int> q;
        dist[a] = 0;
        q.push(a);
        while (!q.empty() && dist[b] == -1) {
            int x = q.front(); q.pop();
            // 十进制拆位：p = 1, 10, 100, 1000, 10000
            for (int p = 1; p <= 10000; p *= 10) {
                int cur = (x / p) % 10;
                bool lead = (p == 10000 && x >= 10000);  // 5位数的最高位
                for (int d = 0; d <= 9; d++) {
                    if (d == cur) continue;
                    if (lead && d == 0) continue;        // 最高位不能变 0
                    int y = x + (d - cur) * p;
                    if (!isPrime[y] || dist[y] != -1) continue;
                    dist[y] = dist[x] + 1;
                    q.push(y);
                }
            }
        }
        cout << dist[b] << "\n";
    }
    return 0;
}

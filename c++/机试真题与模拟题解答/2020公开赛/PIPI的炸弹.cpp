/*
问题 C: PIPI的炸弹
来源：PIPIOJ 2020 公开赛 (http://pipioj.online/problem.php?cid=1012&pid=2)
时间限制: 1 Sec  内存限制: 128 MB

- 题目描述
PIPI和POPO玩炸弹游戏：游戏开始时PIPI拿着一个炸弹，x 秒后爆炸，爆炸时
拿着炸弹的人被炸死，另一方存活。拿着炸弹的人可以将倒计时调快 y 秒
(a<=y<=b)，调快不消耗时间，也可以不调；然后必须把炸弹交给对方，
每次交换消耗 1 秒。假设两人都足够聪明，问谁会存活。

- 输入
一行三个整数 x,a,b（0<=x<=1e6, 1<=a<=b<=10），分别表示初始倒计时
和可调节时间的范围。

- 输出
PIPI 存活输出"PIPI"，POPO 存活输出"POPO"。

- 样例输入
6 3 4

- 样例输出
PIPI

========================================
【解析】
1. 对策博弈 + 记忆化：定义 dp[r] = true 表示"当前拿着炸弹、倒计时还剩
   r 秒的人"有必胜策略（即最终被炸死的是对方）。
   - 边界：dp[0] = false —— 倒计时为 0 炸弹在手上爆炸，持弹者必死。
   - 转移：当前持弹者可以选择调快 y ∈ {0, a, a+1, ..., b}（不调快即 y=0），
     然后花 1 秒交给对方，对方拿到手的剩余时间为 r-y-1：
          dp[r] = OR{ (r-y-1 == 0) || !dp[r-y-1] }  对所有合法 y
     注意 y 必须 < r（把倒计时调到 0 以内等于自杀，不会选择）；
     若交给对方的状态为必败态（dp=false），则自己必胜。
   - y=0 永远可选（r>=1 时），所以每个状态都有后继，不会出现"无棋可走"。
2. 结论：若 dp[x] = true，当前持炸弹的 PIPI 存活，输出 "PIPI"，
   否则 POPO 存活，输出 "POPO"。
3. 复杂度：状态 O(x)，每个状态枚举 b-a+2 种决策，共 O(x*b) <= 1e6*10 = 1e7，
   1s 内轻松完成。
4. 验证样例：x=6, a=3, b=4。
   dp[0]=F; dp[1]=true（交出即炸对方）; dp[2]=!dp[1]=false;
   dp[3]: y=0→!dp[2]=true → true; dp[4]: y=4→剩0 或 y=0→!dp[3]=true → true;
   dp[5]: y=4→!dp[0]=true → true;
   dp[6]: y=3→剩 2 → !dp[2]=true → PIPI 存活 ✓。
   （路径：PIPI 调快 3 秒交给 POPO，POPO 无论怎么调，PIPI 总能应对。）
*/
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    long long x;
    int a, b;
    while (cin >> x >> a >> b) {
        vector<bool> dp(x + 1, false);
        for (long long r = 1; r <= x; r++) {
            // 不调快：把 r-1 交给对方
            if (r - 1 == 0 || !dp[r - 1]) dp[r] = true;
            // 调快 y 秒（a<=y<=b, y<r）
            for (int y = a; y <= b && y < r; y++)
                if (r - y - 1 == 0 || !dp[r - y - 1]) { dp[r] = true; break; }
        }
        cout << (dp[x] ? "PIPI" : "POPO") << "\n";
    }
    return 0;
}

/*
问题 C: 括号匹配Ⅱ
来源：PIPIOJ 2021 公开赛 (http://pipioj.online/problem.php?cid=1022&pid=2)
时间限制: 1s  内存限制: 128MB

- 题目描述
POPO会给出只包含'('、')'、'?'三种字符的字符串，对于每个'?'字符，
POPO会给出把其变成'('字符与')'字符的代价。请问PIPI将所有的'?'
字符替换后，使得最终括号序列合法的最小代价是多少。

- 输入
第一行一个字符串，1<=字符串长度<=10^5。
接下来m行，每行两个正整数ai和bi。m表示字符串中'?'字符的数量，
ai表示把从左到右第i个'?'字符变成'('字符的代价，bi表示变成')'
字符的代价。其中0<=m<=字符串长度，ai<=10^9，bi<=10^9。

- 输出
输出使得最终括号序列合法的最小代价。若无法合法，输出-1。

- 样例输入
(??)
1 2
2 8

- 样例输出
4

========================================
【解析】
1. 经典"括号匹配带代价"贪心（反悔堆模型）。从左到右扫描，维护
   平衡度 bal（'(' 记 +1，')' 记 -1），任何前缀必须 bal >= 0，
   且最终 bal == 0 才合法。
2. 贪心策略：每个 '?' 默认变成 ')'（通常更便宜），代价 ans += b_i；
   同时把"反悔代价"a_i - b_i（把它改成 '(' 需要补的差价）压入小根堆。
   一旦 bal < 0，说明 ')' 多了一个，必须把之前某个 '?' 反悔成 '('：
   弹出堆顶（最小的 a_i-b_i，反悔最便宜的），ans += 该值，bal += 2。
   当前 '?' 也要先入堆再检查，这样它自己也能被反悔。
3. 无解判定：
   - 遇到固定的 ')' 使 bal < 0 且堆为空（没有 '?' 可反悔）→ -1；
   - 扫描结束后 bal != 0（'(' 多了，无法补救）→ -1。
4. 复杂度：每个 '?' 至多入堆、出堆各一次，O(len·log m)，
   len <= 1e5 轻松通过。代价总和最大约 1e5 * 1e9 = 1e14，用 long long。
5. 验证样例：s = "(??)"，?1: 1 2，?2: 2 8。
   '(' → bal=1；'?'1 → ans=2，堆 {1-2=-1}，bal=0；
   '?'2 → ans=2+8=10，bal=-1 < 0，弹堆顶 -6，ans=10-6=4，bal=1；
   ')' → bal=0。最终 bal=0，输出 4 ✓（即 ?1→')' 花 2，?2→'(' 花 2）。
*/
#include <iostream>
#include <string>
#include <queue>
#include <vector>
#include <functional>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    string s;
    cin >> s;
    int m = 0;
    for (char c : s) if (c == '?') m++;
    // 小根堆存每个 '?' 的反悔代价 (a_i - b_i)
    priority_queue<long long, vector<long long>, greater<long long>> pq;
    long long ans = 0;   // 当前总代价
    long long bal = 0;   // 平衡度
    bool ok = true;
    for (char c : s) {
        if (c == '(') {
            bal++;
        } else {                       // ')' 或 '?'
            bal--;
            if (c == '?') {            // 先按变成 ')' 计价并入堆
                long long a, b;
                cin >> a >> b;
                ans += b;
                pq.push(a - b);
            }
            if (bal < 0) {             // 需要把某个 '?' 反悔成 '('
                if (pq.empty()) { ok = false; break; }
                ans += pq.top();
                pq.pop();
                bal += 2;
            }
        }
    }
    if (!ok || bal != 0) cout << -1 << "\n";
    else cout << ans << "\n";
    return 0;
}

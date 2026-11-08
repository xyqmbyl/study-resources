/*
问题 A: PIPI拿奖品
来源：PIPIOJ 2025 公开赛 (http://pipioj.online/problem.php?cid=1068&pid=0)
时间限制: 1s  内存限制: 128MB

- 题目描述
PiPi参加活动中了大奖！！！
现在他可以从一排奖品中拿走一些奖品，但是PiPi只能拿走连续的奖品。
已知每个奖品都有一定的价值，而PiPi在心里也有一个目标 target 。
你能帮PiPi找出这一排奖品中满足其价值总和大于等于 target 的数量最小的奖品个数吗。
如果不存在符合条件的连续奖品，返回 0 。

- 输入
多组输入
对于每组输入，第一行有一个正整数n表示奖品的数量
第二行有一个正整数target，表示PiPi心里的目标值
第三行有n个正整数，表示n个奖品的价值
1<=n<=1e5
1<=target<=1e9
1<=奖品的价值<=1e4

- 输出
每组输入输出一个正整数，表示数量最少的奖品个数
如果不满足要求，则输出0

- 样例输入
6
7
2 3 1 2 4 3

- 样例输出
2

========================================
【解析】
1. 模型转化：在全是正整数的数组中，找"总和 >= target 的最短连续子数组"的
   长度，找不到输出 0。这正是经典的"长度最小的子数组"（LeetCode 209）模型。
2. 算法：因为价值全为正，窗口和 sum 随右端点扩大而单调增加，所以用滑动窗口
   （双指针）：右指针不断右移把元素纳入 sum；一旦 sum >= target，就尽量右移
   左指针收缩窗口，收缩过程中每个可行窗口都用其长度更新答案。每个元素至多
   进窗口一次、出窗口一次，均摊 O(1)。
3. 复杂度：每组数据时间 O(n)，空间 O(n)（存数组），n <= 1e5 轻松通过。
4. 实现细节：
   - 总和最大约 1e5 * 1e4 = 1e9，sum 用 long long 更保险；
   - ans 初始化为 n+1（比任何合法长度都大），结束时若仍 > n 说明不存在，
     按题意输出 0；
   - 多组输入用 while (cin >> n)。
5. 验证样例：a=[2,3,1,2,4,3], target=7：
   - 右端扩张到下标 3 时 sum=2+3+1+2=8>=7，收缩到 [3,1,2] sum=6<7，记长度 4；
   - 继续扩张到下标 4，sum=3+1+2+4=10，收缩到 [1,2,4] sum=7，记长度 3；
   - 扩张到下标 5，sum=1+2+4+3=10，收缩 [2,4,3] sum=9，再收缩 [4,3] sum=7，
     记长度 2；继续收缩 sum=3<7 停止。
   最终答案 2，与样例输出一致 ✓
*/
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    while (cin >> n) {
        long long target;
        cin >> target;
        vector<int> a(n);
        for (int i = 0; i < n; i++) cin >> a[i];
        int ans = n + 1;   // 不存在时保持 > n
        long long sum = 0;
        int left = 0;
        for (int right = 0; right < n; right++) {
            sum += a[right];
            while (sum >= target) {          // 满足条件就尽量收缩
                ans = min(ans, right - left + 1);
                sum -= a[left];
                left++;
            }
        }
        cout << (ans <= n ? ans : 0) << "\n";
    }
    return 0;
}

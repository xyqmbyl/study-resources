/*
问题 A: PIPI的数学题VIII
来源：PIPIOJ 2021 公开赛 (http://pipioj.online/problem.php?cid=1022&pid=0)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI想知道半径为 r 的圆内内接正多边形面积是多少。
tips: 为了保证精度，π = arccos(-1)。

- 输入
多组测试用例。每组输入两个正整数 r, k，代表圆的半径 r 以及
多边形的边数 k。(0 < r <= 10000, 3 <= k <= 100)

- 输出
每组输出内接正多边形面积 S，保留 3 位小数。

- 样例输入
20 3

- 样例输出
519.615

========================================
【解析】
1. 几何拆分：正 k 边形的中心与 k 个顶点相连，把多边形分成 k 个
   全等的等腰三角形。每个三角形两条腰为半径 r（圆心到顶点），
   顶角（圆心角）为 2π/k，故每个三角形面积 = (1/2)·r·r·sin(2π/k)。
2. 总面积：S = k · (1/2) · r² · sin(2π/k) = 0.5 * k * r^2 * sin(2*pi/k)。
3. 精度：题目要求 π = arccos(-1)，即 <cmath> 中的 acos(-1.0)，
   这是双精度下 π 的最准确表示，不要用 3.14159 之类的近似值。
   r,k 均为整数，计算时转成 double（r 最大 1e4，r² 最大 1e8，
   面积最大约 1.57e9，double 精度足够）。
4. 验证样例：r=20, k=3：S = 0.5*3*400*sin(2π/3) = 600*(√3/2)
   = 519.6152...，保留 3 位小数为 519.615 ✓。
5. 输出格式：保留 3 位小数，用 cout << fixed << setprecision(3)；
   多组输入用 while (cin >> r >> k) 循环。
*/
#include <iostream>
#include <iomanip>
#include <cmath>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    double r;
    int k;
    const double PI = acos(-1.0);   // 按题目要求 π = arccos(-1)
    cout << fixed << setprecision(3);
    while (cin >> r >> k) {
        double S = 0.5 * k * r * r * sin(2.0 * PI / k);
        cout << S << "\n";
    }
    return 0;
}

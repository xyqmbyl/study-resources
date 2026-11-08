/*
问题 B: PIPI切蛋糕
来源：PIPIOJ 2024 公开赛 (http://pipioj.online/problem.php?cid=1056&pid=1)
时间限制: 1s  内存限制: 128MB

- 题目描述
PIPI今天过生日，他买了一个圆形的蛋糕，但是他觉得圆形不好看，PIPI喜欢正k边形，
所以他想切一个最大的正k边形蛋糕。经过测量，这个蛋糕的半径为r，
那么PIPI切完后的蛋糕面积有多大呢？
tips: 为了保证精度，π = arccos(-1)。

- 输入
输入包含多组测试用例。
对于每一组测试用例，输入两个正整数 r, k,代表圆的半径r以及多边形的边数 k。
(0<r≤100000，3≤k≤100)

- 输出
对于每组测试用例，请输出切完之后蛋糕的面积 S ， 答案保留 3 位小数。

- 样例输入
20 3

- 样例输出
519.615

========================================
【解析】
1. 模型转化：最大正 k 边形即圆的内接正 k 边形，其 k 个顶点都在圆周上，
   圆半径 r 就是外接圆半径。
2. 面积公式：把正 k 边形分成 k 个等腰三角形，每个三角形两腰为 r、夹角为
   2π/k，单个三角形面积 = 0.5 * r * r * sin(2π/k)，故
        S = 0.5 * k * r^2 * sin(2*PI/k)，其中 PI = acos(-1.0)。
3. 复杂度：每组 O(1)。
4. 实现细节：r、k 虽是整数，计算时转成 double；输出用
   cout << fixed << setprecision(3)（需要 <iomanip>）保留 3 位小数。
5. 验证样例：r=20, k=3：S = 0.5 * 3 * 400 * sin(2π/3)
   = 600 * sin(120°) = 600 * 0.8660254... = 519.61524...，
   保留 3 位小数为 519.615，与样例输出一致 ✓。
*/
#include <iostream>
#include <iomanip>
#include <cmath>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    const double PI = acos(-1.0);
    double r;
    int k;
    while (cin >> r >> k) {
        double s = 0.5 * k * r * r * sin(2.0 * PI / k);
        cout << fixed << setprecision(3) << s << "\n";
    }
    return 0;
}

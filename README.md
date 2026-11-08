# 📚 中南大学资源共享库


[![在线网站](https://img.shields.io/badge/%F0%9F%8C%90-%E5%9C%A8%E7%BA%BF%E6%A3%80%E7%B4%A2%E4%B8%8B%E8%BD%BD-b4552d)](https://xyqmbyl.github.io/study-resources/)
[![科目](https://img.shields.io/badge/%E7%A7%91%E7%9B%AE-21%E4%B8%AA-2d6e5f)](#%E7%9B%AE%E5%BD%95)
[![资料](https://img.shields.io/badge/%E8%B5%84%E6%96%99-1000%2B%20%E4%BB%BD-e0784d)](#%E7%9B%AE%E5%BD%95)

> 只要是前人踩过的坑，后来的人就不必再踩一遍。
**👉 [点此进入在线网站](https://xyqmbyl.github.io/study-resources/)**

本人是26级软件工程学生，在寻找真题与教学资源时发现缺乏一个全面并且易得的整合资源战。
在中南大学2024教学改革后旧有的资料库都有些过时，最新的资源隐藏在QQ群与公众号中不易获取，故尽自己所能开源，希望有资源补充的同学能来一起共建这个学习平台
历年真题、复习笔记、课件 PPT、教材电子书、视频课程，一站式检索与下载。

## 🧭 中南大学资源导航（与本库互补）


GitHub 上还有几位学长收集的优质的中南资料库，与本项目**互补而非替代**，感谢他们的付出，建议搭配食用：

| 仓库 | 定位 | 推荐场景 |
|---|---|---|
| [FeijiangHan/CSU-CS-review-materials](https://github.com/FeijiangHan/CSU-CS-review-materials) ★270 | 按年级学期组织的**计科复习资料 + 学习方法论**，覆盖 web、人机交互、体系结构、分布式、嵌入式等 | 想要**怎么复习、学什么重点**的思路时看它 |
| [zhiyog/CSU\_learn\_class](https://github.com/zhiyog/CSU_learn_class) | 计科核心课（C++、Java、Linux、操作系统、大物等）的**个人笔记与总结** | 需要一份**浓缩笔记**快速过课时看它 |
| [LIJIAXU137/CSU-SE-FinalExamination](https://github.com/LIJIAXU137/CSU-SE-FinalExamination) | **软件工程专业**期末资料（大二上/下） | 软工同学的期末冲刺 |
| [Jinyong-Li/CSU-Courses](https://github.com/Jinyong-Li/CSU-Courses) | **中南大学课程共享计划**，通识课覆盖广（公选、军理、制造训练、健康心理等） | 找**非计科/通识课**资料看它 |

> 本库的优势是**检索体验**：在线网站按目录树浏览、全文搜索、在线预览、多线路下载；上面的仓库则提供更多科目的攻略与笔记。两边都逛逛，资料就齐了。

## 目录

按科目建文件夹，点进即看（网站里同样按此目录树浏览）：

| 科目 | 份数 | 科目 | 份数 | 科目 | 份数 |
|---|---|---|---|---|---|
| [高数](./高数/) | 260 | [电路](./电路/) | 147 | [c++](./c%2B%2B/) | 280 |
| [操作系统](./操作系统/) | 67 | [人工智能](./人工智能/) | 50 | [软件工程(计科)](./软件工程(计科)/) | 39 |
| [数据结构](./数据结构/) | 38 | [线代](./线代/) | 24 | [计算机网络(计科)](./计算机网络(计科)/) | 22 |
| [英语](./英语/) | 22 | [JAVA](./JAVA/) | 21 | [汇编语言](./汇编语言/) | 20 |
| [计算机组成原理](./计算机组成原理/) | 18 | [中南ppt模版](./中南ppt模版/) | 6 | [C语言](./C%E8%AF%AD%E8%A8%80/) | 10 |
| [web程序设计](./web程序设计/) | 10 | [军理](./军理/) | 10 | [思修](./思修/) | 6 |
| [习概](./习概/) | 4 | [计算机体系结构](./计算机体系结构/) | 7 | [编译原理](./编译原理/) | 1 |

另有 **25 门视频课程** 与 **28 本电子书** 链接收录在网站索引中。

## ✨ 特性

- 🔍 **在线检索**：[网站](https://xyqmbyl.github.io/study-resources/) 支持按文件名/科目/关键词搜索（中文自动拆词，「高数」「线代」等别名直达），按目录树浏览，点卡片**在线预览** PDF/PPT
- 🚀 **多线路下载**：jsDelivr CDN → GitHub raw → 加速代理，失败自动降级
- 📦 **大文件通道**：超 100MB 的资料（王道电子书、软工教材、PPT 模板合集）放在 [Releases](https://github.com/xyqmbyl/study-resources/releases)，网站下载按钮已自动指向
- 🤖 **全自动索引**：push 即自动重建索引并部署网站，无需手动维护列表
- 🌙 深浅色主题、自定义壁纸、手机端适配

## 📮 如何贡献

欢迎贡献！

1. **网页端直接上传**（无需会 git）：打开[网站](https://xyqmbyl.github.io/study-resources/) → 页脚「管理台」→ 用 GitHub Token（需仓库写权限）登录 → 上传文件，自动落到对应科目文件夹并触发部署
2. **git push**：把文件放进对应科目文件夹（新建科目就新建文件夹），push 到 `main` 即可，Actions 会自动重建索引
3. **提 Issue**：发现链接失效、文件有误、想要某科资料，直接开 Issue

## ⚠️ 声明

- 本库仅供校内同学学习交流使用，**严禁商用**
- 内容如有侵权，请提 Issue 或联系仓库所有者，核实后立即删除
- 本人QQ号2874724606，有任何问题欢迎与我联系

## 🙏 致谢

感谢 [CSU-CS-review-materials](https://github.com/FeijiangHan/CSU-CS-review-materials)、[CSU\_learn\_class](https://github.com/zhiyog/CSU_learn_class)、[CSU-SE-FinalExamination](https://github.com/LIJIAXU137/CSU-SE-FinalExamination)、[CSU-Courses](https://github.com/Jinyong-Li/CSU-Courses) 等中南同学维护的资料库，以及 [zju-icicles](https://github.com/QSCTech/zju-icicles) 给本项目的启发。

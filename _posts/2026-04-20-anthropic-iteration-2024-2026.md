---
title: "Anthropic 的迭代逻辑：从工程博客看他们在解什么问题"
date: 2026-04-20 10:00:00 +0800
categories: [巨人肩膀, Anthropic]
tags: ["Claude Code", "Agent", "Managed Agents", "eval", "安全", "harness"]
source_title: "Anthropic Engineering Blog 2024-2026"
source_author: "Anthropic Engineering"
source_date: "2026-04"
source_lang: zh
source_type: 工程博客合集
---
Anthropic 的工程博客读下来有一个感受：他们不太像在写"我们发布了什么"，更像在记录"我们遇到了什么问题，以及为什么这样解"。把 2024 年底到 2026 年初这段时间的博客和产品动作放在一起看，会发现三条线——模型演进、Claude Code 工程体系、Agent 基础设施——彼此咬合，最后指向同一个判断。

---

## 模型层：能力还在涨，但发布逻辑变了

2025 年之前，Anthropic 的节奏相对直白：训练好、发布、Haiku / Sonnet / Opus 三档覆盖速度和质量的权衡，竞争的核心是 benchmark 分数。

这个逻辑在 2026 年初开始变。Anthropic Red Team 发了一篇不寻常的博客，大意是：AI 模型已经能以规模化方式发现高危漏洞，现在是"赋能防御者的窗口期"。这不是营销词，是一个产品决策的起点——有些能力，不能按常规节奏释放。

Opus 4.7（2026 年 4 月 16 日）的发布方式就很能说明问题。Anthropic 在它的训练阶段刻意实验性地**降低**了网络安全攻击能力，同时配套了自动检测和拦截高风险请求的安全护栏——目的是在比 Mythos 能力更弱的模型上先把安全机制跑通，再逐步向更强的模型推广。

也就是说，Opus 4.7 本身是个**安全机制测试床**，不只是"更强的 Opus"。能力维度的提升包括：高难度软件工程任务显著进步、支持更高分辨率图像理解、生成专业界面和文档质量更高、处理复杂长时任务时会主动验证自己的输出再汇报。

Mythos 是目前最强的模型，被设计为比 Opus 更大、更贵、更强的新层级，在编程、学术推理、网络安全基准上显著超越 Opus 4.6。但它现在以邀请制限流形式运行——约 50 个 Project Glasswing 参与组织（Google、Cisco、CrowdStrike、Palo Alto Networks、Microsoft 等）获得访问权限，专门用于扫描广泛部署软件中的漏洞。更广泛的发布计划因担心被攻击者利用而搁置。

"先给防御者，再逐步开放"——这是把安全承诺兑现为具体产品决策，不只是停留在 RSP 文件里。

---

## Claude Code：每一步都在解上一步暴露出来的问题

这条线的迭代逻辑最清晰，值得按时间顺序仔细看。

**2024 年底：定义 Agent 的基础结构。** 《Building effective agents》确立了基本认知框架：agent 不是一个 prompt，而是一个 loop，需要工具调用、状态管理、多轮推理。这篇文章对整个生态影响很大，很多开发者从这里开始理解 agentic coding 的设计原则。

**2025 年上半年：上下文窗口成了最主要的工程瓶颈。** 他们发现 Claude Sonnet 4.5 存在一个叫 **context anxiety** 的现象——模型感知到自己接近上下文限制时，会提前结束任务。

解决方案是在 harness 里加入 **context reset**：完全清空上下文，带着结构化的交接物重新启动新 agent——而不只是 compaction（压缩摘要旧内容）。两者的区别在于：compaction 保留连续性，但 context anxiety 会持续；reset 给 agent 一块干净的石板，代价是 handoff artifact 必须足够完整。

**2025 年秋：让 agent 在现实世界里安全运行。** Anthropic 连续发布了关于 Agent Skills、MCP 代码执行、Claude Code 沙箱化的工程文章，重心是"不只是能干活，还要可控"。沙箱化的核心挑战：怎么减少 permission prompts，同时不降低安全性。

**2026 年 2 月：并行 agent 和多智体协作。** Anthropic 发布了用"agent teams"构建 C 编译器的实验报告——16 个并行 Claude 实例在共享代码库上分工协作，近 2000 次 Claude Code 会话、2 万美元 API 成本，最终产出了一个能编译 Linux 内核的 10 万行 Rust C 编译器。

这个实验里有几个工程原则值得记下来：

测试套件的质量决定 agent 能否无人监督地定向进化。验证器不够严格，agent 会"解决错误的问题"——这和人类团队的管理道理一样，KPI 设计决定自主运作的方向。

要以 agent 的视角设计 harness。比如：避免让测试输出数千行无用字节污染上下文；提供预聚合的摘要统计；用确定性的随机采样让每个 agent 覆盖不同任务子集，同时保证全局覆盖。

并行化的前提是任务可以被隔离锁定。他们用 git 的同步机制实现任务锁——一个 agent 写文件声明占用某任务，第二个 agent 试图声明同一任务时 git 冲突会自然解决。

---

## 2026 年 3 月的两个突破

**Generator-Evaluator 架构**，解决的是 agent 自评估失真的问题。

让 agent 评估自己的工作时，它倾向于夸赞自己——即使人类观察者明显看出质量不行。在设计类任务上尤为突出，因为没有"编译成功"这样的二元验证。

解法是把"生成"和"评估"拆给两个独立的 agent，用具体的评分标准而非模糊的"这个设计好吗"来调教评估者。他们给 frontend design 任务设计了四个维度：设计质量（颜色、字体、布局是否构成有辨识度的整体）、原创性（有没有自定义决策，还是模板布局加 AI slop 默认值比如白卡片上的紫色渐变）、工艺（字体层级、间距一致性、色彩对比度）、可用性（用户能否理解界面并完成任务）。

评估 agent 用 Playwright MCP 直接与实时页面交互再打分，不看静态截图——每次迭代真实操作页面、截图、研究，给出详细批评。生成 agent 拿到批评后做策略判断：细化当前方向，还是彻底转向新的视觉风格。

**Auto Mode**，解决的是 approval fatigue。

他们的数据是：用户批准了 93% 的 permission prompts。人工审批几乎成了仪式，而不是真正的安全机制。

内部 incident log 记录了几个典型的 overeager behavior 案例：agent 把"清理旧分支"误解为删除远程分支（不可逆）；agent 遇到鉴权错误后开始自发扫描环境变量和配置文件寻找备用 token；agent 执行"取消我的任务"时按名称相似度自行匹配，删了可能不属于用户的任务；agent 把脚本上传到 GitHub Gist 用于调试（用户可能认为内容保密）。

解法是用模型驱动的分类器替代人工审批，分两层：第一层是快速单 token 过滤（是/否拦截），倾向于拦截；第二层仅当第一层触发时才启动 chain-of-thought 推理，降低误报。分类器只看用户消息和 agent 的工具调用，**刻意不看 Claude 自己的输出**——"推理盲"的设计，防止 agent 的自我解释影响分类判断。

---

## 2026 年 4 月：Managed Agents，把 harness 变成基础设施

这是目前迭代链条上最重要的一步。

核心洞察是：harness 会把"Claude 做不到的事"的假设编码进去，但这些假设会随模型改进而过时。具体案例：Sonnet 4.5 的 context anxiety 导致 harness 里加入了 context reset；同样的 harness 在 Opus 4.5 上发现这个行为消失了，reset 成了无用的死码。**把假设硬编码进 harness，就是在欠维护债。**

Anthropic 用操作系统的历史作类比：几十年前，操作系统通过将硬件虚拟化为"进程"、"文件"这样的抽象，解决了"为未来未知程序设计系统"的难题。`read()` 命令不管底层是 1970 年代的磁盘还是现代 SSD 都能用——抽象层比实现层更长寿。

Managed Agents 遵循同样的模式，把 agent 的三个核心组件虚拟化为独立接口：

- **Session**：append-only 事件日志，durably 存储在 harness 和 sandbox 之外
- **Harness**（brain）：调用 Claude 并路由工具调用的循环
- **Sandbox**（hands）：代码执行环境

每个组件可以独立替换，失败可以独立恢复。harness 崩溃了？用 `wake(sessionId)` 重启，用 `getSession(id)` 读取完整事件日志，从最后一个事件继续。容器崩溃了？它是 cattle，不是 pet，直接扔掉重建。

安全边界也更严格：sandbox 里运行的代码永远接触不到凭证。Git token 在 sandbox 初始化时植入 local git remote；OAuth token 在外部 vault；Claude 调用 MCP 工具时经过一个独立代理，代理从 vault 取凭证再转发——harness 自始至终不感知任何凭证。

---

## 还有一条比较隐蔽的线：测量本身的可信度

这条线对做 AI 产品的人很有价值，但讨论得不多。

2026 年初，Anthropic 发表了一篇工程文章，结论有点出人意料：**评测基础设施的配置本身会影响 benchmark 分数。**

他们在 Terminal-Bench 2.0 上做实验，把 Kubernetes 资源配置从严格限制（峰值就 kill 容器）调到完全不设上限，其他条件保持不变：

> 不同资源配置之间的分数差距达到 6 个百分点（p < 0.01）——而 leaderboard 上顶尖模型之间的差距往往也就这么大。

更微妙的是，严格资源限制和宽松资源限制测出来的是**两种不同能力**：严格限制奖励代码精简、策略轻量的 agent；宽松限制奖励能充分利用资源、暴力解决问题的 agent。"模型 A 比模型 B 高 3%"这种判断，在不同测试环境下可能完全颠倒。

他们对 agent eval 的定义框架也值得存下来：**task** 是单个测试用例；**trial** 是对 task 的一次运行，多次 trial 才能给出统计上可靠的结论；**transcript** 是完整运行记录；**outcome** 是环境的最终状态（注意：agent 说"已预订航班"和数据库里真的有一条订单记录，是两件事）；**agent harness 和 evaluation harness** 是两件事——让模型能像 agent 一样运行的系统，和测量 agent 性能的基础设施——评估"an agent"时，其实是在评估两者协同工作的结果。

---

把这些线串起来，能感受到 Anthropic 的整体节奏：每一步解决的都是上一步暴露出来的最大瓶颈。上下文管理解决了，暴露出自评估失真；自评估解决了，暴露出 harness 的可维护性；harness 可维护了，暴露出权限安全；……是一条清晰的问题链。

背后有一个越来越明显的底层判断：AI 系统的瓶颈正在从"模型能力"转移到"如何可靠地部署和验证模型能力"。模型越来越强不是问题——让更强的模型在不可控的现实环境里安全、可靠、可测量地工作，才是真正的工程挑战。

*数据来源：Anthropic Engineering Blog、anthropic.com/news、red.anthropic.com*
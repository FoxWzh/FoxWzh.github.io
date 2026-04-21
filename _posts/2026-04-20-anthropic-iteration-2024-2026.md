---
title: "Anthropic 和 OpenAI 的迭代逻辑：从工程博客看他们在解什么问题"
date: 2026-04-20 10:00:00 +0800
categories: [巨人肩膀, Anthropic]
tags: ["Claude Code", "Codex", "Agent", "Managed Agents", "OpenAI", "eval", "安全", "harness"]
source_title: "Anthropic Engineering Blog & OpenAI Blog 2024-2026"
source_author: "Anthropic Engineering / OpenAI"
source_date: "2026-04"
source_lang: zh
source_type: 工程博客合集
---

读 Anthropic 和 OpenAI 的工程博客读久了，会发现一件挺有意思的事：两家公司在同一段时间里，解的其实是完全不同的问题。

Anthropic 的问题是：怎么让更强的模型安全可靠地运行。OpenAI 的问题是：怎么让更多人愿意把工作委托给 AI。

出发点不同，推出来的产品逻辑就差很多——有些地方截然不同，有些地方又高度收敛。把这一年半的动作放在一起看，会清晰很多。

---

## Anthropic：能力必须跟着安全走

### 模型发布的逻辑变了

早期 Anthropic 的节奏其实挺简单：Haiku / Sonnet / Opus 三档，训练好就发布，竞争的核心是 benchmark 分数。这套逻辑在 Claude 3.5 时代基本够用。

但 2026 年初，Anthropic Red Team 发了一篇不寻常的博客，提到 AI 模型已经能以规模化方式发现高危漏洞，他们把这个时间点定性为"赋能防御者的窗口期"。说白了，这不是营销话术，这是一个具体产品发布决策的起点。

Opus 4.7（2026 年 4 月）把这套新逻辑说清楚了：Anthropic 在训练阶段**刻意实验性地降低了它的网络安全攻击能力**，发布时配套了自动检测和拦截高风险请求的安全护栏——目的是在比 Mythos 能力更弱的模型上先验证安全机制，再逐步推广。

换句话说，Opus 4.7 本身是个**安全机制的测试床**，不只是"更强的 Opus"。能力上，它在高难度软件工程任务上有显著进步，支持更高分辨率图像理解，处理复杂长时任务时会主动验证自己的输出再报告结果。

Mythos 是目前 Anthropic 最强的模型，被设计为比 Opus 更大、更强、更贵的新层级，在编程、学术推理、网络安全基准上显著超越 Opus 4.6。但它目前以邀请制限流运行，约 50 个 Project Glasswing 参与组织（Google、Cisco、CrowdStrike、Palo Alto Networks、Microsoft 等）获得访问权限，专门用于扫描广泛部署软件中的漏洞。更广泛的发布计划因担心能力被攻击者利用而搁置。

"先给防御者，再逐步开放"——这是 Anthropic 把安全承诺落地成具体产品决策，不只是停留在 RSP 文件里。

---

### Claude Code 这条线

说实话，这是 Anthropic 工程博客里最有意思的一条线。每个阶段都有明确的"发现了什么问题 → 为什么这样解"，不是在凑内容。

**2024 年底，先定义 Agent 是什么**

《Building effective agents》确立了基本认知框架：agent 不是一个 prompt，而是一个 loop，需要工具调用、状态管理、多轮推理。这篇文章对整个生态影响深远，很多开发者从这里开始理解 agentic coding 的设计原则。

**2025 年上半年，上下文成了最大的工程瓶颈**

任务变长之后，他们发现 Claude Sonnet 4.5 有个有意思的现象："context anxiety"——模型在感知到自己接近上下文限制时，会提前结束任务。（有点像人类快下班时做事会开始草草了事。）

解法是在 harness 里加入 **context reset**：完全清空上下文，带着结构化的交接物重新启动新 agent，而不只是 compaction（压缩摘要旧内容）。两者的区别在于：compaction 保留连续性，但 context anxiety 仍会持续；reset 给 agent 一块干净的石板，代价是 handoff artifact 必须足够完整。

**2025 年秋，agent 要在现实世界里安全运行**

这一时期的重心是沙箱化和 MCP 代码执行，核心挑战是：减少 permission prompts 的同时不降低安全性。

**2026 年 2 月，16 个并行 Claude 实例协作写了一个 C 编译器**

近 2000 次 Claude Code 会话、2 万美元 API 成本，产出了一个能编译 Linux 内核的 10 万行 Rust C 编译器。这个实验教给他们几个关键工程原则：

测试套件的质量决定 agent 能否无人监督地定向进化。如果验证器不够严格，agent 会"解决错误的问题"——说白了和人类团队的管理道理一样，KPI 设计决定了自主运作的方向。

要以 agent 的视角设计 harness。比如：避免让测试输出数千行无用字节污染上下文；提供预聚合的摘要统计；用确定性的随机采样让每个 agent 覆盖不同任务子集，同时保证全局覆盖。

并行化的前提是任务可以被隔离锁定。他们用 git 的同步机制实现任务锁——一个 agent 写文件声明占用某任务，第二个 agent 试图声明同一任务时 git 冲突会自然解决。（优雅。）

**2026 年 3 月，两个架构上的突破**

第一个是 Generator-Evaluator 架构。问题在于：让 agent 评估自己的工作时，它倾向于夸赞自己——即使人类观察者明显看出质量不行。设计类任务尤其突出，因为没有"编译成功"这样的二元验证。

解法是把"生成"和"评估"拆给两个独立的 agent。他们给 frontend design 任务设计了四个评分维度：设计质量（颜色、字体、布局、图像是否构成有辨识度的整体）、原创性（是否有自定义决策，还是模板布局加 AI slop 模式，比如白卡片上的紫色渐变）、工艺（字体层级、间距一致性、色彩对比度等技术执行）、可用性（用户能否理解界面功能，完成任务）。

评估 agent 用 Playwright MCP 直接与实时页面交互再打分，而不是看静态截图。生成 agent 拿到批评后做策略判断：细化当前方向，还是彻底转向新的视觉风格。

第二个是 Auto Mode，解决的是 approval fatigue 问题。他们发现用户批准了 93% 的 permission prompts——说白了，人工审批几乎成了一个仪式，而非真正的安全机制。

他们的内部 incident log 记录了几个典型的"overeager behavior"案例：agent 把"清理旧分支"误解为删除远程分支（不可逆）；agent 遇到鉴权错误后开始自发扫描环境变量和配置文件寻找备用 token；agent 执行"取消我的任务"时自行按名称相似度匹配，删了可能不属于用户的任务；agent 把脚本上传到 GitHub Gist 以便分享用于调试，但用户可能认为内容保密。（这几个案例读起来都挺捏一把汗的。）

解法是用模型驱动的分类器替代人工审批，分两层：快速单 token 过滤（是/否拦截），倾向于拦截；仅当第一层触发时才启动 chain-of-thought 推理，降低误报。分类器只看用户消息和 agent 的工具调用，**刻意不看 Claude 自己的输出**——"推理盲"的设计，防止 agent 的自我解释影响分类判断。

**2026 年 4 月，Managed Agents：把 harness 变成基础设施**

这是目前为止最重要的架构进展，值得多说几句。

核心洞察是：harness 会把"Claude 做不到的事"的假设编码进去，但这些假设会随模型改进而过时。Sonnet 4.5 的 context anxiety 导致 harness 里加入了 context reset；同样的 harness 在 Opus 4.5 上发现这个行为消失了，reset 成了无用的死码。当你把假设硬编码进 harness，你就欠下了维护债。

Anthropic 用操作系统的历史作类比：几十年前，操作系统通过将硬件虚拟化为"进程"、"文件"这样的抽象，解决了"为未来未知程序设计系统"的难题。`read()` 命令不管底层是 1970 年代的磁盘还是现代 SSD 都能用——抽象层比实现层更长寿。

Managed Agents 遵循同样的模式，把 agent 的三个核心组件虚拟化为独立接口：**Session**（append-only 事件日志，durably 存储在 harness 和 sandbox 之外）、**Harness**（调用 Claude 并路由工具调用的循环）、**Sandbox**（代码执行环境）。每个组件可以独立替换，失败可以独立恢复。harness 崩溃了？用 `wake(sessionId)` 重启，用 `getSession(id)` 读取完整事件日志，从最后一个事件继续。容器崩溃了？它是 cattle，不是 pet，直接扔掉重建。

安全边界的设计也更严格：sandbox 里运行的代码永远接触不到凭证。Git token 在 sandbox 初始化时植入 local git remote；OAuth token 在外部 vault；Claude 调用 MCP 工具时经过一个独立代理，代理从 vault 取凭证再转发——harness 自始至终不感知任何凭证。

---

### Eval：开始认真对待测量本身的可信度

这条线比较隐蔽，但对做 AI 产品的人很有参考价值。

2026 年初，Anthropic 发表了一篇让人意外的工程文章：评测基础设施的配置本身会影响 benchmark 分数。

他们在 Terminal-Bench 2.0 上做实验，把 Kubernetes 资源配置从严格限制调到完全不设上限，其他条件不变（同一个模型、同一个 harness、同一套任务）。不同资源配置之间的分数差距达到 6 个百分点（p < 0.01）——而 leaderboard 上顶尖模型之间的差距往往也就这么大。

有意思的是，严格资源限制和宽松资源限制测出来的其实是两种不同能力：严格限制奖励代码精简高效、策略轻量的 agent；宽松限制奖励能充分利用所有资源、暴力解决问题的 agent。这意味着"模型 A 比模型 B 高 3%"这种判断，在不同测试环境下可能完全颠倒——而大多数人默认 benchmark 分数是客观的能力测量。（所以下次看到 leaderboard 可以多问一句：在什么配置下跑的。）

顺便说一句，他们对 agent eval 的定义框架也很实用：**task** 是单个测试用例，有确定的输入和成功标准；**trial** 是对 task 的一次运行，多次 trial 才能给出统计上可靠的结论；**transcript** 是完整运行记录，包括工具调用、推理、中间结果；**outcome** 是环境的最终状态——agent 说"已预订航班"和数据库里真的有一条订单记录，是两件事；**agent harness vs evaluation harness** 的区别在于：评估"an agent"时，其实是在评估两者协同工作的结果。

---

## OpenAI：先让更多人愿意委托工作给 AI

### 模型矩阵：先统一，再分裂

OpenAI 在 2024 年底有个比较尴尬的处境：o 系列（o1、o3、o4-mini）和 GPT 系列（GPT-4o）是两条独立的产品线，前者擅长推理，后者擅长对话，用户要自己判断什么时候用哪个——认知负担很重，产品上也有点割裂。

GPT-5 是统一这两条线的答案：内置智能路由，会根据对话类型、任务复杂度、工具需求和用户明确意图，实时决定用轻量模式还是深度推理。用户不需要再手动选模式。

统一完成之后，GPT-5 家族随后快速繁殖出专化变体：GPT-5.2-Codex（agentic coding）、GPT-5.3-Codex-Spark（低延迟实时交互）、GPT-5.4（旗舰，百万 token 上下文）、GPT-5.4 mini/nano（低成本高频场景）。ChatGPT 的 Auto 模式在用户端体现这套逻辑：系统根据请求复杂度在不同模型变体之间动态路由。

和 Anthropic 的策略放在一起看，差异挺明显的：Anthropic 的 Haiku/Sonnet/Opus 是人工选择的档位，用户和开发者自己判断；OpenAI 在系统层面做自动路由，把复杂度判断从用户手里接过来。前者更透明，后者更傻瓜——各有道理。

---

### Codex：同一个名字，两个完全不同的产品

先说清楚一件事：Codex 这个名字在 OpenAI 历史上出现了两次。

2021 年的 Codex 是基于 GPT-3 的代码语言模型，本质是更强的自动补全，GitHub Copilot 最早基于它构建，2023 年退役。2025 年的 Codex 是全新的产品，和前者几乎没有传承关系——不是语言模型，而是一个**云端软件工程 agent**。名字相同，定位、架构、目标用户完全不同。（为什么要复用这个名字，大概是因为好听？）

**第一阶段（2025 年 5 月）：异步委托**

2025 年 5 月发布的 Codex 在独立的云沙箱里运行，预加载用户的代码仓库，可以写功能、回答代码库问题、修 bug、提 PR，完成后返回给人工审阅。底层模型 codex-1 是针对软件工程优化的 o3 版本，用真实世界的编程任务做强化学习训练。

和 Claude Code 从第一天起就形成了鲜明对比：Claude Code 是本地 CLI，执行在本地；Codex 从第一天就是纯云端，开发者提交任务、等待结果、审阅输出。这是一种**异步委托**的工作模式，而不是实时协作。

早期并没有大爆发——2025 年 5 月到 9 月，Codex 的用量大约是 Claude Code 的 5%。不是因为产品差，而是因为开发者的使用习惯还没转变。把整个任务委托给 AI 异步执行，跟写代码时旁边有个 AI 助手，心理模型完全不同。

**第二阶段（2025 年秋—2026 年 1 月）：模型专化**

2026 年 1 月发布的 GPT-5.2-Codex 内置了 context compaction——在保留关键任务状态的前提下压缩早期上下文，支持多小时的编程会话而不丢失项目脉络。

有个细节值得注意：context compaction 是 OpenAI 内置进模型专化版本的功能，Anthropic 是在 harness 设计层面解决同样的问题（context reset）。两者解法的层次不同——一个在模型训练阶段，一个在工程架构层面。解法不同，但问题是同一个。

**第三阶段（2026 年 2 月）：桌面 App、并行 Agent、Skills、Automations**

2026 年 2 月，OpenAI 发布了 Codex 桌面 App（macOS 先行，3 月登陆 Windows），引入了几个关键功能。

并行 Agent 执行：多个 agent 在独立的 git worktree 里异步运行，互不干扰，开发者可以监控每个 agent 的状态，审阅各自的 diff，直接在 VS Code 里打开输出做最终编辑。

Skills（技能包）：把指令、资源和脚本捆绑在一起，让 Codex 能可靠地连接工具、运行工作流、按团队偏好完成任务。和 Anthropic 的 Skills 系统几乎同构。

Automations（定时任务）：让 Codex 在后台按计划自动运行。OpenAI 内部用 Automations 做每日 issue 分类、CI 失败汇总、每日发布简报生成、bug 检查等重复工作。（说白了就是把原来要人盯的重复事情，全部扔给 agent 定时跑。）

同月还有一个被低估的动作：GPT-5.3-Codex-Spark 发布，这是 OpenAI 第一个部署在 Cerebras 硬件上的生产模型，比之前版本快约 15 倍，专为实时交互式编程场景设计。从 2025 年 9 月到 2026 年 1 月，Codex 的用量从 Claude Code 的约 5% 增长到约 40%。SuperBowl 广告也在这个月播出。

**第四阶段（2026 年 3 月）：安全、企业化、Superapp 宣布**

Codex Security 上线：能识别软件漏洞并提出修复建议。OpenAI 表示已在过去 30 天内测试了 120 万次 commit，在 Chromium、OpenSSL、PHP、GnuTLS 等项目中发现了近 800 个严重漏洞和超过 1 万个高危漏洞。该工具在沙箱环境里验证疑似问题，按真实影响优先级排序，再提出修复建议。

这一步和 Anthropic 的 Project Glasswing 形成了直接竞争，但策略不同：Anthropic 的 Mythos 是限流邀请制；Codex Security 走的是开放式产品化路径。

3 月 19 日，OpenAI 确认将 ChatGPT、Codex 和 Atlas 浏览器合并成单一桌面超级应用。内部备忘录写道："我们意识到我们把精力分散在太多应用和平台上，这种碎片化一直在阻碍我们的进展。"背后有个数据支撑：此时已有 50% 的 Codex 用户在用它完成非编程任务。用户自己用脚投票，Codex 成为 superapp 载体是自然结果，不是战略强加。

**第五阶段（2026 年 4 月）：Superapp 第一版落地**

4 月 16 日，和 Anthropic 发布 Opus 4.7 同一天，OpenAI 推送了 "Codex for (almost) everything" 更新。时间点的选择显然是刻意的。

Computer Use（桌面控制）：Codex 可以通过看屏幕、移动光标、点击、输入来操作任何 macOS 应用。关键差异是**后台运行**——操作在后台进行，不会抢走用户当前聚焦的应用焦点。

Heartbeat Automations（持久 agent）：Codex 可以给自己安排未来的工作，在指定时间"唤醒"继续长期任务，让团队可以设置持续监控 Slack 频道或 Notion 文档的 agent，主动更新文档或合并 PR。从"按需调用"到"常驻 agent"，这个转变比听起来要大。

Memory（渐进式记忆）：让 Codex 记住用户偏好、之前的修正和已收集的信息，随着使用积累，开始主动提议当天工作计划。

100+ 插件：包括 Microsoft 套件、Atlassian Rovo、CodeRabbit、Render 等主流工具，插件形态和 Anthropic 的 Skills 几乎相同——一包指令加应用集成加 MCP 服务器。

---

### Agents SDK：把接入门槛做低

OpenAI 在 agent 工具链上的哲学和 Anthropic 有一个很明显的差异：Anthropic 的 Managed Agents 是"把基础设施做对"，OpenAI 的 Agents SDK 是"把接入门槛做低"。

2025 年 3 月发布的 Agents SDK 采用极简主义，只有四个核心原语：Agent（带指令和工具的 LLM）、Handoff（agent 之间转移控制权的专用工具调用）、Guardrails（输入/输出验证）、Sessions（对话历史管理）。

这种极简设计刻意留出了很多空白——没有内置的持久内存，没有跨 session 的上下文管理，没有复杂的 harness 设计，这些都要开发者自己解决。换来的是上手极快，开发者只需要几行代码就能跑起来。

2026 年 4 月的新版 Agents SDK 在此基础上加了 model-native harness 和 native sandbox，加入了可配置内存、sandbox-aware 编排、类 Codex 的文件系统工具，以及与主流 agent 基础设施原语的标准化集成。

顺便说一句，AGENTS.md 最初是 Codex 的内部解决方案，让 agent 有一个可预测的地方找到项目专属的指令。OpenAI 随后将 AGENTS.md 贡献给了 Linux Foundation 下新成立的 Agentic AI Foundation（AAIF），与 Anthropic 的 MCP、Block 的 goose 框架共同成为这个中立机构的核心贡献。

把自己的格式标准捐给中立机构，然后成为这个标准的主要贡献者——经典操作：通过"开放"来确立事实标准，比自己独占更划算。

---

## 两家的底层逻辑

两家在 Agent 基础设施上越来越像——session 持久化、harness 稳健性、credential 隔离，都在做这些问题。只是 Anthropic 发的是工程博客，讲清楚了为什么这么设计；OpenAI 发的是产品公告，重点放在能做什么上。

模型矩阵上，Anthropic 是手动档位，安全验证前置发布；OpenAI 先统一再分裂，系统自动路由。编程工具上，Anthropic 做本地 CLI 加托管基础设施，工程可信度优先；OpenAI 做云端 agent 服务，异步委托，用户心智转变优先。安全策略上，Anthropic 能力与安全同步训练，分层限流发布；OpenAI 走开放式产品化，Codex Security 作为独立产品。标准化上，Anthropic 推 MCP 开放协议，OpenAI 捐献 AGENTS.md 给中立机构成为标准制定者。

最核心的差异还是一句话：Anthropic 在解的问题是"怎么让 agent 在复杂环境里可信地运行"，OpenAI 在解的问题是"怎么让更多人愿意把工作委托给 agent"。一个是工程可信度，一个是用户心智转变。这两个方向最终都要做，但现在各有侧重。

*数据来源：Anthropic Engineering Blog、anthropic.com/news、red.anthropic.com、openai.com*

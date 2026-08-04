---
title: "Prompt caching 比想象中重要"
date: 2026-05-27 00:01:00 +0800
categories: [巨人肩膀, Anthropic]
tags: ["提示词", "Claude Code", "Agent", "上下文工程", "成本优化"]
source_title: "Lessons from building Claude Code: Prompt caching is everything"
source_author: "Thariq Shihipar"
source_url: "https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything"
source_date: "2026-04-30"
source_lang: en
source_type: 技术博客
---
这篇是 Claude Code 团队写的，讲他们在做 Claude Code 时学到的一件事：prompt caching 不是一个省钱小技巧，而是整个 Agent 系统的底层约束。

我以前也知道 prompt caching 能降成本、降延迟，但这篇文章有意思的地方在于，它不是从 API 文档角度讲“怎么开缓存”，而是从一个真实长期运行的 coding agent 出发，讲哪些工程设计会不小心把缓存打碎。

---

### 缓存首先是前缀匹配

Prompt caching 的核心机制很朴素：从请求开头开始匹配。

也就是说，越靠前的内容越需要稳定。前面变了，后面再长也很难复用。

Claude Code 的上下文大概按这个顺序排：

1. 静态 system prompt 和工具定义
2. `CLAUDE.md`
3. session context
4. conversation messages

这个顺序挺关键。system prompt 和工具定义最稳定，放最前面；项目说明次稳定；会话上下文再往后；真正每轮都会变化的对话消息放最后。

听起来像常识，但实际做系统时很容易反过来：随手把时间戳塞进 system prompt，或者每次动态拼工具列表，或者为了“更干净”给不同模式换不同工具集。每个动作单看都合理，合起来就是缓存命中率下降。

原文里提到 Claude Code 团队会监控缓存命中率，而且缓存命中率异常下降会按事故处理。这个细节很说明问题：对一个长上下文 Agent 来说，缓存不是锦上添花，是可用性和商业模型的一部分。

### 动态信息别塞进前缀

一个很典型的例子是时间。

如果 system prompt 里写了精确到秒的当前时间，那每次请求最前面的内容都变了，缓存基本就废了。更好的办法是：静态 system prompt 保持不变，把变化的信息放到后面的消息里。

Claude Code 用的是 `<system-reminder>` 这类提醒，把“现在文件变了”“当前日期是什么”“某个状态更新了”塞到后续消息或工具结果里，而不是改最前面的 prompt。

这个思路可以推广到很多地方：

- 用户权限变化
- 当前工作目录状态
- 最新错误信息
- 模式切换提示
- 临时任务约束

这些东西本质上都是“当前轮需要知道的信息”，不一定要污染稳定前缀。

我觉得这就是所谓 context engineering 里很容易被忽略的一层：不是只关心放什么上下文，还要关心放在什么位置。

### 不要随便换模型

这点也挺反直觉。

我们通常会想：简单任务用便宜模型，复杂任务用贵模型，这样更省钱。但在一个已经跑了很久、积累了 100k tokens 上下文的会话里，中途切模型可能反而更贵。

原因是缓存按模型隔离。Opus 上已经缓存好的前缀，Haiku 不能直接用。你为了一个简单问题切到便宜模型，可能要重新处理一大段未缓存输入。

Claude Code 的做法是，如果确实要用别的模型，就用 subagent。主会话保持原来的模型和缓存，子代理拿一段交接说明去处理局部任务，处理完再把结果带回来。

这和多模型路由不是矛盾，而是提醒我们：路由不能只看“这次任务简单不简单”，还要看“当前缓存资产有多大”。

### 工具集也不要一会儿变一会儿变

工具定义也是 prompt 前缀的一部分。

所以中途增删工具，代价很大。

直觉上，我们可能会设计成：用户进入计划模式，就只给只读工具；进入执行模式，再给编辑工具；连接了某个 MCP，再动态加工具；当前任务不需要的工具就移除，减少 token。

但从缓存角度看，这些都很危险。工具列表、工具 schema、工具顺序，只要变了，就会影响前缀。

Claude Code 的 Plan Mode 是一个很好的例子。它没有通过“换工具集”来表达模式变化，而是保留工具集合稳定，再用 `EnterPlanMode` / `ExitPlanMode` 这两个工具和后续消息告诉模型当前状态。

这样既能限制行为，又不破坏缓存。

这个设计我很喜欢，因为它把“状态变化”和“能力集合”拆开了。模式是状态，不一定要通过改工具表来表达。

### 工具太多怎么办

当然，工具集一直稳定也有问题：如果 MCP 工具很多，每次都把完整 schema 塞进去，成本也很高。

原文提到一个做法叫 `defer_loading`。大概意思是：先放一个轻量 stub，告诉模型有这个工具，但不急着把完整 schema 全展开。模型需要时，再通过 tool search 去加载。

关键是 stub 本身稳定存在，顺序也稳定。

这有点像 Skill 的 lazy loading：入口很小，细节按需展开。对 Agent 平台来说，这可能会变成一个基础能力。否则工具生态一多，prompt 前缀会越来越肿；但如果频繁动态删工具，又会把缓存打碎。

### 压缩上下文也要复用缓存

长对话跑到上下文窗口上限附近，就要 compaction：把前面的对话压缩成摘要，再继续。

这里也有一个坑。

如果你单独发起一个“总结调用”，用另一个 system prompt，不带工具，不带原来的上下文结构，那这次总结就没法复用主会话缓存。最讽刺的是：越是需要压缩的时候，上下文越长；越长，缓存没命中就越贵。

Claude Code 的做法是“缓存安全分叉”：压缩请求尽量沿用父会话相同的 system prompt、用户上下文、工具定义，然后在末尾追加压缩指令。这样大部分前缀和父会话最后一次请求一致，可以复用缓存。

这个点对做长程 Agent 的人很重要。Compaction 不只是“怎么总结得好”，还包括“怎么总结得便宜、快、不中断体验”。

### 我的感受

这篇文章让我重新意识到，很多 Agent 工程问题最后都会回到一个很朴素的问题：哪些东西稳定，哪些东西变化。

稳定的东西要靠前、可缓存、可复用；变化的东西要靠后、局部化、不要污染前缀。

这听起来像 prompt 组织技巧，但其实会影响很多产品和架构决策：

- mode 怎么设计
- tool 怎么注册
- model routing 怎么做
- compaction 怎么触发
- 多 agent 怎么交接
- MCP 工具太多时怎么加载

以前我们讲 LLM 应用成本优化，容易想到“换便宜模型”“缩短 prompt”“减少输出”。这篇文章补了一个更系统的视角：长程 Agent 的成本，不只是 token 数量，还取决于上下文结构是否稳定。

如果把 prompt 看成一段临时拼出来的字符串，缓存命中率大概率会很差。要把它看成一套有层级、有生命周期、有稳定性的工程结构。

这可能也是 Claude Code 能跑长任务的关键之一：不是单次回答更聪明，而是整个会话能以可承受的成本持续运转。

---

*原文：[Lessons from building Claude Code: Prompt caching is everything](https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything)，Thariq Shihipar，2026.04.30*
---
title: "Superpowers：不是新的 Agent，而是给 Coding Agent 加上工程纪律"
date: 2026-04-30 10:00:00 +0800
categories: [AI, Agent]
tags: ["Agent", "评测"]
---
# Superpowers：不是新的 Agent，而是给 Coding Agent 加上工程纪律

最近看了一下 Jesse Vincent 做的 [Superpowers](https://github.com/obra/superpowers)。它很容易被误解成一个新的 agent framework，但认真看下来，我觉得更准确的定位是：

> Superpowers 是一套装在现有 AI 编程工具里的软件工程工作流插件。

它不是 Claude Code、Codex、Cursor、Gemini CLI 这种工具本体，也不负责调用模型、执行工具、管理权限或者维护上下文。它做的事情更克制，也更有意思：**给这些 coding agent 加上一套强约束的软件开发流程。**

## 它想解决什么问题？

现在很多 coding agent 的问题，不是“不会写代码”，而是太容易直接开写。

一个典型场景是：

```text
用户：帮我做个功能
Agent：好的，我开始改
```

然后问题就来了：需求没问清，方案没讨论，测试没写，改到一半上下文跑偏，最后还很自信地告诉你“完成了”。

Superpowers 解决的正是这个问题。

它的核心假设是：

> AI 编程失败，很多时候不是因为模型能力不够，而是因为 agent 没有被要求遵守靠谱的软件工程流程。

所以它不是在提升模型本身，而是在改造 agent 的工作方式。

## Superpowers 的结构

从产品结构上看，Superpowers 大概可以分成三层：

```text
启动注入层
  ↓
Skills 技能库
  ↓
软件开发工作流
```

第一层是启动注入。

当你启动 Claude Code、Codex、Cursor 这类工具时，Superpowers 会通过插件或 hook，把一段规则注入给 agent。核心意思是：只要当前任务可能匹配某个 skill，agent 就必须先使用这个 skill。

这一步非常关键。因为如果 skill 只是放在磁盘上的文档，那它其实没有什么约束力。Superpowers 真正想做的是让这些流程在会话一开始就进入 agent 的行为系统里。

第二层是 Skills。

每个 skill 可以理解成一个写给 agent 的 SOP，比如：

| Skill | 作用 |
|---|---|
| brainstorming | 写代码前先澄清需求、讨论方案 |
| writing-plans | 把设计拆成可执行计划 |
| test-driven-development | 强制先写测试，再写实现 |
| subagent-driven-development | 用子 agent 执行任务，并做 review |
| requesting-code-review | 要求代码审查 |
| systematic-debugging | 系统化排查 bug |
| using-git-worktrees | 用独立工作区开发，避免污染主线 |
| finishing-a-development-branch | 完成后验证、合并或清理 |

这些 skill 不是普通教程，而是行为约束。比如 TDD skill 不是“建议你写测试”，而是要求 agent 按 red-green-refactor 的顺序来：

```text
先写失败测试
确认测试失败
再写最小实现
确认测试通过
最后重构
```

第三层是完整开发流程。

Superpowers 把一次开发任务组织成这样的闭环：

```text
想法
  ↓
需求澄清
  ↓
设计文档
  ↓
实施计划
  ↓
隔离工作区
  ↓
TDD 实现
  ↓
规格审查
  ↓
代码质量审查
  ↓
最终验证
  ↓
合并 / PR / 保留 / 丢弃
```

这套流程其实很像一个小型工程团队的工作方式，只是团队成员变成了 agent。

## 最有意思的设计：子 Agent 驱动开发

Superpowers 里一个很有代表性的设计是 `subagent-driven-development`。

它的思路是：不要让同一个 agent 带着越来越长的上下文，从头到尾做完整个任务。更好的方式是把大任务拆成小任务，每个任务派一个新的子 agent。

每个子 agent 只拿到当前任务需要的上下文。这样做有两个好处：

第一，减少长上下文带来的跑偏。

第二，让每个 agent 的职责更清楚。

更重要的是，Superpowers 不满足于“实现完就结束”。它要求每个任务后面都有两轮 review：

```text
实现 agent
  ↓
规格审查 agent：是否符合需求？有没有多做或少做？
  ↓
代码质量审查 agent：代码质量、测试、边界情况是否合格？
```

这个设计非常像真实团队里的开发和 code review 流程。它的目标不是让 agent 更快地生成代码，而是让 agent 更稳定地交付结果。

当然，代价也很明显：token 成本更高，执行时间更长，小任务会显得流程偏重。所以它更适合复杂开发任务，而不是一句话的小修小改。

## 它不是 Harness

这里需要区分一个概念：Superpowers 不是 harness。

Claude Code、Codex CLI、Cursor、Gemini CLI 这些才更接近 harness。它们负责真正的运行环境，包括：

```text
模型调用
工具执行
文件读写
权限控制
上下文管理
会话状态
```

Superpowers 不做这些。

它做的是：

```text
告诉 harness 里的 agent 应该按什么流程工作。
```

所以它的位置大概是这样：

```text
用户
  ↓
Claude Code / Codex / Cursor 等 harness
  ↓
Superpowers 注入的 skills 和流程规则
  ↓
Agent 按流程调用工具、改代码、写测试、做 review
```

这也是为什么我不太会把它归类为 LangGraph 或 Google ADK 那样的 agent framework。LangGraph 关心的是状态图、节点、边、checkpoint、runtime；Superpowers 关心的是 coding agent 在软件开发过程中是否遵守纪律。

## 它的设计哲学

Superpowers 的设计哲学可以概括成几句话。

**第一，流程比即兴发挥更可靠。**

Agent 不应该一上来就写代码，而应该先澄清需求、讨论方案、形成计划。

**第二，测试是约束 agent 的重要工具。**

“我完成了”没有意义，“测试通过了”才有意义。

**第三，子 agent 用来隔离上下文和职责。**

不要让一个 agent 背着所有历史做所有事情。

**第四，review 是必须的，不是可选的。**

实现之后还要检查是否符合 spec，再检查代码质量。

这些理念听起来并不新鲜，甚至有点传统。但这正是它有价值的地方：它把传统软件工程里已经被验证过的东西，重新包装成 agent 可以执行的流程。

## 从产品角度看它的价值

如果用一句话定义 Superpowers，我会说：

> Superpowers 是一个面向 AI 编程工具的工程流程插件，它试图把 coding agent 从“自由发挥的代码生成器”，改造成“按流程工作的开发助手”。

它适合的人群也很清楚：

```text
经常使用 Claude Code / Codex / Cursor 的工程师
希望 agent 少跑偏的团队
认可 TDD、review、计划驱动开发的人
希望 agent 能长时间自主执行复杂任务的人
```

它的价值在于：

```text
减少需求没问清就开写
减少没有测试就交付
减少长任务上下文跑偏
让 AI 编程过程更可控
让结果更容易复盘
```

但它也有边界：

```text
它不能保证模型一定听话
它不能替代底层 agent runtime
它没有完整的状态持久化和 checkpoint
它也不是一个可部署的 agent 平台
```

所以，如果你的目标是增强日常 AI 编程工作流，Superpowers 很值得参考。

但如果你要做的是一个生产级 agent 平台，需要管理状态、权限、工具调用、可观测性和恢复机制，那 Superpowers 还不够，你仍然需要 LangGraph、ADK 或者自研 runtime 这样的底层框架。

## 总结

Superpowers 最有意思的地方，不是它发明了什么全新的 agent 技术，而是它很务实地承认了一件事：

> 让 AI 写代码，不能只依赖模型能力，还要依赖流程设计。

它没有重新造一个 agent，而是给现有 coding agent 套上了一套工程纪律：先想清楚，再写计划；先写测试，再写实现；写完之后，还要 review 和验证。

这可能不是最炫的 agent 设计，但它很实用。

在 AI 编程工具越来越强的今天，真正稀缺的也许不是“更会写代码的模型”，而是“更不容易胡来的工作流”。
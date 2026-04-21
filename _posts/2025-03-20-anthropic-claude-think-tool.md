---
title: "给 Claude 加一个「暂停思考」的工具"
date: 2025-03-20 10:00:00 +0800
categories: [巨人肩膀, Anthropic]
tags: ["think tool", "Agent", "工具调用", "τ-bench", "SWE-bench", "推理"]
source_title: "The \"think\" tool: Enabling Claude to stop and think in complex tool use situations"
source_author: "Anthropic Engineering"
source_url: "https://www.anthropic.com/engineering/claude-think-tool"
source_date: "2025-03-20"
source_lang: en
source_type: 技术博客
---
这篇是 Anthropic 工程团队写的，介绍一个叫 `think` 的工具。思路很简单，但看完数据之后觉得挺有意思。

---

### think tool 是什么

就是一个什么都不做的工具。

注册给 Claude，它调用的时候把一段文字塞进 `thought` 字段，然后……就没了，不会触发任何实际操作，也不返回任何东西。唯一的效果是这段"思考"会被记录在上下文里。

```json
{
  "name": "think",
  "description": "Use it when complex reasoning or some cache memory is needed.",
  "input_schema": {
    "type": "object",
    "properties": {
      "thought": {
        "type": "string",
        "description": "A thought to think about."
      }
    },
    "required": ["thought"]
  }
}
```

本质是给模型一块草稿纸，让它在工具调用链中间能停下来整理一下思路，而不是拿到工具返回结果之后直接往下冲。

和 extended thinking 的区别：extended thinking 是模型开始生成之前的预先规划；think tool 是生成过程中、处理工具返回信息时的实时推理。一个是出发前看地图，一个是走着走着掏出来看一眼。

### 数据

在 τ-bench（一个测 Agent 完成服务类任务的基准，航空、零售场景）上：

- 航空场景：baseline 0.370，加了 think tool + 优化提示词之后 **0.570**，提升 54%
- 零售场景：0.783 → **0.812**

航空场景提升特别大，因为订票/改签的规则又多又碎，每一步都要对照策略判断——这正好是 think tool 能发挥的地方。

SWE-bench 上，加入 think tool 让 Claude 3.7 Sonnet 平均提升 1.6%，最终达到 **62.3%**，是当时的 SOTA。

### 怎么用

光把 think 工具注册进去不够，要在 system prompt 里告诉模型什么时候该用、该想什么。Anthropic 的建议是给 domain-specific 的示例，比如在航空场景里明确说：

> 收到查询结果后，先用 think 梳理当前状态、适用的策略、用户诉求是否在范围内，然后再决定下一步。

两个结合——think tool + 好的提示词——才能打出那 54% 的提升，单独靠其中一个效果有限。

适合用的场景：规则复杂、顺序决策、工具返回的内容需要解读之后才能行动。不适合：工具调用相互独立、或者模型本来就表现得不错的简单任务。

### 我的感受

think tool 这个设计的妙处在于——它几乎没有工程成本，5 行 JSON，今天就能用。但收益在某些场景下相当可观。

另一个价值是可观测性。模型原本也在"想"，但那些中间推理散在上下文里不透明。有了 think tool，每个决策点的推理都变成了可追踪的日志，调试 Agent 行为的时候会方便很多。

不过原文结尾有一条 2025 年 12 月更新的注记：**大多数任务现在推荐直接用 extended thinking**。think tool 的定位更像是一个轻量级补丁，在 extended thinking 不适用或者成本考虑的场景下用。

顺便：think tool（执行中的实时推理）+ Reflexion（执行后的跨次复盘）如果组合起来用，理论上能覆盖 Agent 推理的完整生命周期——一个管当下，一个管下次。有空可以试试。

---

*原文：[The "think" tool](https://www.anthropic.com/engineering/claude-think-tool)，Anthropic Engineering，2025.03.20*
---
title: "【转载+解读】Anthropic：给 Claude 加一个「暂停思考」的工具"
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
**一句话摘要：** Anthropic 工程团队介绍了一个极简但高效的设计——给 Claude 注册一个叫 `think` 的工具，让它在复杂工具调用链中能主动暂停、整理思路，实测在 τ-bench 航空场景提升 54%，在 SWE-bench 上帮助 Claude 3.7 Sonnet 达到当时 SOTA 的 62.3%。

---

## 原文核心内容

### 什么是 think tool？

`think` 是一个字面意义上什么都不做的工具——它没有外部调用，没有副作用，唯一的功能是给 Claude 提供一块"草稿纸"，让它在生成过程中写下中间推理。

这个工具的定义极其简单：

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

调用时，`thought` 字段里的内容会被追加到上下文日志里，但不会触发任何实际操作。**模型在"想"，但系统什么都没做。**

### think tool 和 extended thinking 的区别

这是很多人容易混淆的地方。Anthropic 在原文里给了清晰的区分：

| | think tool | extended thinking |
|--|--|--|
| **触发时机** | 模型开始生成之后，遇到新信息时主动调用 | 模型开始生成之前，提前规划 |
| **适用场景** | 长工具调用链中间的推理整合 | 复杂推理任务的前置分析 |
| **实现方式** | 注册为普通工具，模型自行决定是否调用 | API 层面的能力，需要单独开启 |
| **推荐时机** | 需要处理工具返回结果、策略判断、多步决策 | 大多数需要推理的任务（2025.12 之后推荐） |

原文写于 2025 年 3 月，彼时 extended thinking 还未成熟推广。文章末尾有一条 2025 年 12 月更新的注记：**大多数任务现在推荐直接用 extended thinking**，但在复杂工具调用场景下，think tool 依然有其价值。

### 实测数据

**τ-bench（服务类 Agent 基准）**

τ-bench 测的是 Agent 在真实服务场景（航空、零售）里按策略完成任务的能力，指标是 `pass^1`（单次通过率）。

| 场景 | baseline | think tool + 优化提示词 | 提升 |
|--|--|--|--|
| 航空 | 0.370 | **0.570** | +54% |
| 零售 | 0.783 | **0.812** | +3.7% |

航空场景的提升幅度尤其大，原因是航空订票/改签涉及复杂的策略判断（行李规则、舱位限制、联程计算），每一步都要对工具返回的信息进行精确分析——正是 think tool 发挥作用的地方。

**SWE-bench（代码工程基准）**

在代码 Agent 任务上，加入 think tool 让 Claude 3.7 Sonnet 的平均通过率提升了 **1.6%**，最终达到当时的 SOTA **62.3%**。SWE-bench 里 think tool 的提示词更具体：

> "使用 think 工具头脑风暴几种不同的 bug 修复方案，然后用 think 分析哪种最合适。"

### 什么时候用 think tool

**适合用的场景：**

- **策略密集型环境**：任务规则复杂，每次行动前都要对照策略检查（比如客服 Agent、合规 Agent）
- **顺序决策链**：下一步依赖上一步工具返回的结果，需要整合信息后再决策
- **工具输出分析**：API 返回的数据需要解读和推理，不是直接用

**不适合用的场景：**

- 工具调用之间相互独立、顺序无关的任务
- 模型本身表现已经够好、不需要额外推理空间的场景
- 简单的指令执行类任务

### 实现建议

**1. 在 system prompt 里放复杂指引**

不要把复杂的策略规则放在 `think` 工具的 `description` 里，要放在 system prompt 里。工具 description 只说"当需要复杂推理时使用"即可，具体的推理内容和决策框架放到 system prompt 的 guidance 部分。

**2. 给 domain-specific 的示例**

仅仅告诉模型"你可以用 think"是不够的。要在提示词里给出具体的示例，说明在什么情况下应该 think、应该 think 什么内容。例如：

> "当你收到订单查询结果后，在决定下一步操作前，先用 think 工具梳理：当前订单状态是什么、适用哪条退换货策略、用户的诉求是否在政策范围内。"

**3. τ-bench 里的实际提示词结构**

原文提到，τ-bench 测试中表现最好的配置是 think tool + **优化过的 system prompt**，这两个缺一不可。光加 think tool 不优化提示词，提升有限；光优化提示词不加 think tool，提升也有限。两者组合才能打出 54% 的提升。

---

## 我的解读

### think tool 本质是什么

从工程角度看，think tool 解决了一个具体问题：**LLM 的输出是流式的，一旦开始生成就很难"停下来重新想"。** 通过把"思考"包装成一个工具调用，模型在处理复杂信息时有了合法的暂停点——调用 think 就是在告诉自己"等一下，我要先整理一下"。

这个设计有几个值得注意的地方：

**极简实现，零成本落地。** 不需要改模型，不需要新的 API，就是注册一个普通工具，5 行 JSON 搞定。任何能调用 Claude API 的团队今天就能用。

**把隐性推理变成显性记录。** 模型本来也在"想"，但那些中间推理散落在上下文里，不透明也不可追踪。think tool 的调用记录在日志里，你可以看到模型在每个决策点想了什么，这对调试 Agent 行为非常有用。

**是给模型的，不是给用户的。** think tool 的输出不应该展示给用户，它是 Agent 的内部草稿纸。这一点和 CoT prompting 的显示逻辑不同。

### 为什么航空场景提升这么大

54% 的提升幅度在 Agent 基准里算是非常显著的。原因在于航空任务的特殊性：

- 规则多且有冲突（不同舱位、不同票价、不同会员等级适用不同策略）
- 工具返回的数据需要解读（查询到的航班信息要和用户诉求对比）
- 错误代价高（改错了订单很难撤回）

这三点恰好是 think tool 最能发挥的场景。零售场景规则相对简单，所以提升幅度（3.7%）小很多。

### 对 Agent 产品的启发

think tool 给做 Agent 产品的团队提供了一个可以直接复用的工程模式：

**给每个关键决策点加一个 think 检查站。** 不要只注册 think 工具然后期待模型自己会用——要在提示词里明确指出哪些场景必须先 think，think 什么内容，然后再执行下一步工具调用。

**把 think 日志纳入监控。** 生产环境里，think 的调用记录是判断 Agent 是否"走歪"的早期信号。如果一个 Agent 在某个步骤的 think 里出现了明显的推理偏差，这比等到最终结果出错再回头调查要早很多。

**它不能替代更好的模型能力。** think tool 是一个补丁，填补的是"模型在工具调用链中整合信息能力不足"的缺口。随着 extended thinking 和模型自身推理能力的提升，这个工具的边际价值会下降，但在当下的工程实践里它是一个高性价比的工具。

---

## 延伸思考

**隐性推理 vs. 显性工具调用**

think tool 本质上是把"隐性推理"变成了"显性工具调用"。这个转变有一个微妙的副作用：**模型知道它的"思考"会被记录**，这可能影响推理质量。

有研究表明，当 CoT 是"可见"的时候，模型的推理链更"表演化"，而非真正在反思。think tool 是否也有类似问题，目前没有公开数据，但值得留意。

**从 think tool 到 Reflexion 的距离**

Lilian Weng 在 [LLM Powered Autonomous Agents](https://foxwzh.github.io/posts/lilian-weng-llm-powered-agents/) 里介绍的 Reflexion 机制——Agent 在完成一次尝试后进行事后反思，把反思存入记忆用于下次改进——和 think tool 的逻辑是互补的：

- think tool：**执行前/中** 的内部推理（单次任务内）
- Reflexion：**执行后** 的跨尝试复盘（跨次任务间）

两者组合，理论上能覆盖 Agent 推理的完整生命周期。

---

## 原文信息

- **来源**：Anthropic Engineering Blog
- **发布时间**：2025 年 3 月 20 日
- **原文链接**：[https://www.anthropic.com/engineering/claude-think-tool](https://www.anthropic.com/engineering/claude-think-tool)
- **为什么值得读**：think tool 是当下最易落地的 Agent 推理增强方案之一，5 行 JSON 即可实现，且 Anthropic 提供了真实基准数据，适合直接用于生产环境
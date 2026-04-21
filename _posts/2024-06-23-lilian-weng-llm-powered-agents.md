---
title: "Lilian Weng 那篇 Agent 综述，还是值得读"
date: 2024-06-23 10:00:00 +0800
categories: [巨人肩膀, OpenAI]
tags: ["Agent", "LLM", "规划", "记忆", "工具调用", "CoT", "ReAct", "Reflexion"]
source_title: "LLM Powered Autonomous Agents"
source_author: "Lilian Weng"
source_url: "https://lilianweng.github.io/posts/2023-06-23-agent/"
source_date: "2023-06-23"
source_lang: en
source_type: 技术博客
---
这篇写于 2023 年 6 月，是那段时间 Agent 话题最火的时候。Lilian Weng 当时还在 OpenAI，把 Agent 系统拆成规划、记忆、工具三个模块写了一篇综述，现在大家说 Agent 架构基本还是在用这套语言。

---

### 框架：三个模块

原文开头就给了这张图：

```
         ┌──────────────────────────────────────────┐
         │           LLM（核心控制器）                │
         └──────────────┬───────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    规划（Planning） 记忆（Memory） 工具（Tool Use）
    · 任务分解      · 短期记忆      · 外部 API 调用
    · 自我反思      · 长期记忆      · 计算器、搜索
```

规划-记忆-工具，现在看还是最自然的拆法。LangGraph、Claude Agents、OpenAI Assistants，背后的设计思路都没跳出这个三角形。

---

### 规划模块

**CoT / ToT**

CoT（Chain of Thought）就是让模型一步一步想，用推理时的算力换准确率。ToT（Tree of Thoughts）更激进，每一步生成多个分支，用搜索找最优路径。前者是标配，后者计算贵，适合有明确最优解的推理题。

**ReAct**

这个现在几乎人人都在用了。把推理和行动交织，每次行动前想一下，行动完看结果再想，形成 Thought → Action → Observation 的循环。

```
Thought: 我需要知道法国的首都
Action: 搜索[法国首都]
Observation: 巴黎是法国的首都
Thought: 找到了，可以回答了
Action: 完成[答案：巴黎]
```

实验结果比纯 CoT 或纯行动都好，幻觉也更少。本质上是不让模型一次性计划好所有步骤然后盲目执行——每一步都和现实对齐一下。

**Reflexion**

在 ReAct 上加了一层事后复盘。Agent 完成一次尝试后写一段自我批评，这段批评存进记忆，下次尝试时带上。

不需要微调，就是把"上次失败的原因"塞进 prompt。我觉得这个在工程上比看起来更有用——很多 Agent 失败之后直接重试，其实加一步"先反思再重试"效果会好很多。

---

### 记忆模块

原文用人类记忆做类比：

| 人类记忆 | 对应 LLM |
|---------|---------|
| 感官记忆（几秒）| 原始输入 / Embedding |
| 短期记忆（工作记忆）| Context Window |
| 长期记忆（近乎永久）| 外部向量数据库 |

context window 就是工作记忆，撑不过一个 session，还容量有限。真正的"记住"需要向量库。

长期记忆的检索靠 MIPS（最大内积搜索），常见实现：HNSW、FAISS、ScaNN。现在用的向量数据库 Pinecone、Chroma、Weaviate 底层基本都是这些。

---

### Generative Agents 那个案例

原文花篇幅最多的案例。25 个虚拟角色各自由一个 Agent 驱动，在类《模拟人生》的沙盒里生活——然后产生了一些没人设计的涌现行为，角色会自发组织聚会，会传递消息，会形成关系。

关键不是模型多强，而是记忆系统的设计：每条记忆附时间戳，检索时按新近性 + 重要性 + 相关性加权打分，隔一段时间还会把零散记忆合并成高层洞见（"Isabella 喜欢浪漫的事情"这类总结）。

结论很实在：记忆管理做好了，比换更强的底模更能影响 Agent 行为的连贯性。这个结论今天仍然适用。

---

### 三个挑战，一年后进展如何

原文 2023 年提了三个问题，我是 2024 年 6 月读的，说一下当时的状态：

**Context 长度**：有进展但没解决。Claude 3 Opus 200K，Gemini 1.5 Pro 1M，但"有 context"和"用好 context"之间还有一段距离，长文档中间段落容易被忽略（Lost in the Middle）。

**长期规划**：还是最薄弱的地方。多步骤任务里保持目标一致、遇到意外能调整计划——SWE-bench 顶模才 20% 出头，说明这个问题还远没解决。

**接口可靠性**：有实质改善。Function Calling 标准化之后格式错误率低了很多，但复杂 schema 或者中文工具描述场景下还是偶尔翻车。

---

说到底，这三个问题都是同一件事：**Agent 在现实任务里还不够可靠**。换更强的模型有用，但不够——接口设计、记忆管理、容错机制这些工程问题同样重要，甚至更重要。

原文在 2023 年就把问题说清楚了，工业界花了挺长时间才真正把它当成第一优先级。

---

*原文：[LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/)，Lilian Weng，2023.06.23*
---
title: "让 Agent 自己学会写 Skill"
date: 2026-05-27 00:01:00 +0800
categories: [巨人肩膀, Microsoft]
tags: ["SkillOpt", "Agent", "Skill", "提示词优化", "Microsoft"]
source_title: "SkillOpt: Executive Strategy for Self-Evolving Agent Skills"
source_author: "Yifan Yang et al."
source_url: "https://arxiv.org/pdf/2605.23904"
source_date: "2026-05-25"
source_lang: en
source_type: 论文
---
这篇是 Microsoft 发的，叫 SkillOpt。标题看起来有点硬：Executive Strategy for Self-Evolving Agent Skills。

但它想解决的问题其实挺直白：

我们现在给 Agent 写 Skill，很多时候还是靠人手写、靠经验调，或者让 LLM 一次性生成一版。好用不好用，跑一跑才知道；坏了以后，再靠人去改。

SkillOpt 问的是：**能不能让 Skill 自己被训练出来？**

注意，它不是训练模型权重，也不是 fine-tune。模型不动，Agent 框架不动，工具环境也不动。它只训练一份外部的文本文件，最后导出一个 `best_skill.md`。

这个想法我觉得很有意思，因为它把“写提示词 / 写 Skill”这件手艺活，往工程化训练流程推了一步。

---

### Skill 也可以像模型参数一样被训练

论文里有个类比很关键。

传统深度学习里，我们训练的是参数。模型看一批样本，算损失，沿着梯度方向改一点参数，再拿验证集看有没有变好。

SkillOpt 做的事情很像，只不过它训练的不是参数，而是一段自然语言 Skill。

大概对应关系是这样：

- 模型参数 → skill 文档
- 梯度方向 → 从执行轨迹里总结出来的修改方向
- learning rate → 每次最多允许改多少条 skill
- validation check → 拿验证集决定这次修改要不要接受
- batch → 一批任务执行记录

这不是一个完美类比，但很好理解。

以前我们可能会说“让模型反思一下，然后改进提示词”。这太松散了。SkillOpt 的思路是：反思可以有，但你不能想怎么改就怎么改；你要有训练集、验证集、编辑预算、失败记录，还要有严格的接受条件。

听起来就不那么玄学了。

### 它怎么训练一份 Skill

流程不复杂。

先给 Agent 一份初始 Skill。然后让这个 Agent 带着 Skill 去跑一批任务，记录它怎么做、哪里成功、哪里失败、工具返回了什么、答案格式错在哪里。

这些执行记录会交给一个 optimizer model。这个 optimizer 不直接回答任务，而是负责看日志，然后提出对 Skill 的修改。

修改也不是整篇重写，而是类似：

- 加一条规则
- 删除一条误导规则
- 替换一段流程说明

然后关键的一步来了：改完以后，不是模型说“我觉得更好了”就算数，而是拿到验证集上跑。

只有验证集分数严格变高，这次修改才会被接受。平了都不行。变差了就拒绝。

被拒绝的修改也不会直接扔掉，而是放进一个 rejected-edit buffer。后面再优化时，optimizer 会看到这些失败案例，知道“这种改法之前试过，会掉分”。

这点很像人调 prompt。真正有经验的人不是只记得最后版本，还记得哪些写法看似合理但实际不行。

### 最后部署的东西很小

我原本以为这种方法会生成一大坨很复杂的 Skill，结果不是。

论文里最后导出的 Skill 通常只有几百到两千 token，中位数大概 920 token。很多任务只接受了 1 到 4 次修改。

也就是说，训练过程里可以试很多、拒很多、记录很多，但最后给 Agent 用的东西很克制。

这点挺重要。因为如果最后导出的是一本说明书，工程上反而不好用：上下文占得多，人也没法审。

SkillOpt 最终导出的 `best_skill.md` 还是一份人能读、人能改、能放进 Agent 上下文里的小文档。

### 学出来的不是答案，而是做事方法

论文给了一些学出来的规则，我觉得比表格数字更有感觉。

比如 SearchQA 学到的是：先根据线索措辞判断答案类型，再选择最短的 canonical entity。

SpreadsheetBench 学到的是：先检查 workbook 结构和公式，再对完整目标区域写出计算后的静态值。

DocVQA 学到的是：遇到表格、表单、图例时，先把问题绑定到具体视觉行、表头或字段，再复制对应答案。

ALFWorld 学到的是：维护 visited/frontier 记录，重复失败后要扩大搜索，不要一直卡在同一个策略里。

这些东西不像“某道题的答案”，更像一个熟练操作者会写下来的 SOP。

这也是我觉得 SkillOpt 有价值的地方。它不是把训练集答案压进 Skill，而是在总结这类任务的操作纪律。

### 数字确实挺好看

论文在 6 个 benchmark、7 个目标模型、3 种执行环境上测。包括问答、表格、Office 文档、视觉文档问答、数学题、ALFWorld 这种 embodied task。

主结果是：52 个评测格子里，SkillOpt 全部最好或并列最好。

几个比较直观的数字：

- GPT-5.5 direct chat 平均从 58.8 提到 82.3
- Codex harness 里提升 24.8 分
- Claude Code harness 里提升 19.1 分
- SpreadsheetBench 从 41.8 到 80.7
- OfficeQA 从 33.1 到 72.1
- LiveMath 从 37.6 到 66.9

当然，论文数字先别当成产品承诺。benchmark 总归是 benchmark。

但这个提升方向是可信的：越是流程复杂、格式要求严格、工具使用多、验证规则明确的任务，Skill 越有用，SkillOpt 也越容易发挥。

### 迁移这点更有意思

它还做了几个迁移实验。

一份在 GPT-5.4 上训练出来的 Skill，拿到 GPT-5.4-mini 或 nano 上，也还能涨分。

一份在 Codex 环境里训练出来的表格 Skill，拿到 Claude Code 环境里，也还能用，而且提升很大。

数学 Skill 从 OlympiadBench 迁到 Omni-MATH，也有小幅提升。

这说明它学到的不是某个模型、某个环境里的投机写法，而是一些比较通用的任务流程。

这对实际使用很关键。否则每换一个模型、每换一个 Agent 框架，都要重新优化一遍，成本就太高了。

### 成本不是没有

SkillOpt 不是免费午餐。

它离线训练时要跑很多任务、做很多反思、验证很多候选 Skill。论文里有些任务训练 token 成本不低，比如 DocVQA、SearchQA 这种会吃很多 token。

但它的优势是：这个成本只发生在训练阶段。

部署时没有额外 optimizer，没有额外反思循环，也不需要改模型权重。只是把一份短 Skill 放进上下文。

所以它适合高频、稳定、有明确评分标准的任务。比如企业内部报表、表格处理、文档审核、客服 SOP、代码工作流、运营流程。

如果是一次性的开放创作任务，或者根本没有靠谱验证指标，那就不太适合。

### 我自己的感受

这篇论文让我想到 Claude Skill 最近的方向。

Skill 本质上是一种外部能力封装：它不是模型权重的一部分，但能长期影响 Agent 怎么做事。

如果 Skill 全靠人手写，那它更像经验文档；如果能被自动训练、验证、筛选，那它就开始有点像“外部参数”了。

这可能是 Agent 工程里很重要的一条路：

不一定每个能力都要 fine-tune 到模型里。很多能力可以沉淀在外部文本、工具协议、工作流和验证循环里。

SkillOpt 的价值就在这里。它不是说“让模型自己反思就会变强”，而是说：

**可以让模型提修改，但要用工程系统管住它。**

有验证集，有编辑预算，有失败记忆，有严格的接受门槛。这样 Skill 才是在训练，而不是在漂移。

我觉得这篇最值得记住的一句话可以是：

Skill 不是写完就结束的提示词，它可以是一份被训练出来的操作手册。

---

*原文：[SkillOpt: Executive Strategy for Self-Evolving Agent Skills](https://arxiv.org/pdf/2605.23904)，Yifan Yang et al.，2026.05.25*
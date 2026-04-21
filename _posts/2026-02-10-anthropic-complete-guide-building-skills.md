---
title: "Anthropic 官方出了一份 33 页的 Skill 构建手册"
date: 2026-02-10 10:00:00 +0800
categories: [巨人肩膀, Anthropic]
tags: ["Skill", "Claude", "AI工具链", "Agent", "MCP", "工作流自动化"]
source_title: "The Complete Guide to Building Skills for Claude"
source_author: "Anthropic"
source_date: "2026-01"
source_lang: en
source_type: 官方文档
---

Anthropic 出了一份关于怎么构建 Claude Skill 的官方文档，33 页，从架构到排错都有。这里记一些我觉得值得记的东西。

---

### Skill 是什么

一个文件夹。里面最重要的是 `SKILL.md`，用 Markdown 写的指令，加 YAML frontmatter。不是代码，是"给 Claude 的知识"。

```
your-skill-name/
├── SKILL.md          # 必须，主指令文件
├── scripts/          # 可选，可执行脚本
├── references/       # 可选，参考文档，按需加载
└── assets/           # 可选，模板等
```

几个容易踩的坑：
- 文件名必须是 `SKILL.md`，大小写严格，`skill.md` 不行
- 文件夹名必须 kebab-case，`notion-project-setup` 对，`NotionProject` 错
- 文件夹里**不能放** `README.md`，那是给人看的，不是给 Claude 看的

**三层加载结构**

这个设计我觉得挺聪明的：

| 层 | 内容 | 何时加载 |
|--|--|--|
| frontmatter | 名称 + 描述 | 始终在系统提示里 |
| SKILL.md 正文 | 完整指令 | Claude 判断相关时加载 |
| references/ | 补充文档 | 按需读取 |

frontmatter 一直在但很小，正文按需加载，细节文档再按需读。本质是 lazy loading 的思路，在 context window 有限的情况下减少不必要的消耗。

### description 是最关键的一个字段

原文用了很多篇幅在说这个，我觉得值得重点记一下。

Claude 决定要不要激活某个 Skill，看的就是 description。写不好，Skill 就等于不存在。

好的写法：
```yaml
description: 分析 Figma 设计文件并生成开发交接文档。当用户上传
.fig 文件、要求"设计规范"、"组件文档"或"设计到代码的交接"时使用。
```

差的写法：
```yaml
description: 帮助处理项目。  # 太模糊
description: 创建复杂的多页面文档系统。  # 有功能描述，但没触发条件
description: 实现带层级关系的 Project 实体模型。  # 太技术，用户不会这么说
```

要同时包含 **What（做什么）** 和 **When（什么时候用）**，而且要用户实际会说的话，不是工程术语。

另外：frontmatter 里不能用 XML 尖括号，Skill 名不能包含"claude"或"anthropic"——因为 frontmatter 会注入系统提示，安全起见有这些限制。

### 一句话印象深

> 代码是确定性的；语言解释不是。

原文在讲验证步骤时说的。意思是，如果你需要"在创建项目前验证字段非空"，与其在 SKILL.md 里写"请确保验证这些字段"，不如写一个 `validate.py` 来做这个检查。语言指令的执行是概率性的，代码不是。

我觉得这是构建 AI 工作流时一个很实在的判断原则：有明确对错的判断用代码，需要理解和推理的判断交给模型。很多团队在这两类上没分清楚，导致该确定的地方出错，该灵活的地方又用了死板的规则。

### 测试

原文说先在单个挑战性任务上迭代到成功，再把成功路径提炼成 Skill。这个顺序很重要——先在对话里跑通，知道什么关键步骤让 Claude 成功了，再结构化到 Skill 里。

测试要覆盖三块：
1. **触发测试**：该激活的时候有没有激活，不该激活的时候有没有乱跑
2. **功能测试**：输出是否正确
3. **性能对比**：有没有 Skill 的差距（token 消耗、工具调用次数、失败率）

**调试 Skill 不触发**，有个好用的技巧：问 Claude "你什么时候会用 [skill 名] 这个 Skill？"——Claude 会把 description 复述出来，你就知道哪里没写清楚。

### 当前的局限

分发体验比较原始，现在还是下载→压缩→手动上传。GPT Store 那种一键分享的体验还没有。

评测方法也承认在摸索，原文说"这些是估算目标，不是精确阈值，我们还在开发更严格的测量指南"——意思是现在判断 Skill 好不好主要还靠感觉，没有成熟的量化体系。

同时启用的 Skill 超过 20-50 个会有性能问题，说明不能无限堆叠，需要按场景管理。

---

东西比较多，不过核心就几个：文件夹结构、description 要好好写、关键验证用代码不用语言、先跑通再沉淀。剩下的排错和模式可以用到的时候再翻。

*原文：Anthropic 官方 PDF，The Complete Guide to Building Skills for Claude，2026.01*

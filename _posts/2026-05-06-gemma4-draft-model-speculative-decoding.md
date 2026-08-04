---
title: 为什么 Google 给 Gemma 4 单独做了个「草稿模型」
date: 2026-05-06 09:00:00 +0800
categories: [AI]
tags: ["推理优化", "推理模型", "模型对比"]
---
今天看到 Google 给 Gemma 4 发布了一个专门用于 Speculative Decoding 的 Draft Model。

一开始我其实有点疑惑。

"草稿模型"这个名字，听起来很像一种临时优化方案，甚至有点像推理阶段的 patch。但稍微深入看了一下后发现，它背后其实是在解决 LLM 一个非常核心的问题：

不是模型不够聪明，而是模型生成内容的方式，本身就太慢了。

---

我们现在讨论大模型时，经常会默认一个观点：

模型慢，是因为参数量太大。

但实际上，真正拖慢 LLM 的，并不是参数本身，而是 autoregressive generation（自回归生成）。

也就是：

模型必须一个 token 一个 token 地往外生成。

比如一句：

```
今天天气不错
```

模型并不是一次性输出完整句子的。

而是：

```
今 -> 天 -> 天 -> 气 -> 不 -> 错
```

每生成一个 token，都需要整个模型完整 forward 一次。

问题在于，这个过程天然是串行的。

而 GPU 最擅长的，其实是并行计算。

于是就出现了一个很有意思的现象：

现代最先进的大模型，反而在以一种并不适合现代硬件的方式运行。

---

而 Draft Model，本质上是在试图解决这个问题。

它背后的核心思路叫做：

Speculative Decoding（投机解码）。

这个思路很像：

小模型先打草稿，大模型负责审核。

例如：

* 一个小模型先快速预测后面的多个 token
* 大模型不再一个 token 一个 token 地生成
* 而是一次性检查：

```
这个对不对？
这个对不对？
这里错了。
```

如果都对：

直接整段接受。

如果中间有错误：

从错误的位置重新生成。

这里最有意思的一点在于：

"验证"其实比"生成"便宜很多。

因为 Transformer 在训练阶段，本来就是并行预测整段 token 的。Speculative Decoding 本质上是在想办法：

把 decode 阶段，重新变回一种"接近训练"的状态。

于是，原本最慢的串行过程，就被部分并行化了。

---

Google 这次给 Gemma 4 单独做 Draft Model，其实也说明了一件事：

大模型推理优化，已经开始进入系统工程阶段了。

过去大家主要在卷：

* 参数量
* 数据规模
* benchmark

但现在越来越多优化开始集中在：

* KV Cache
* 推理调度
* memory bandwidth
* speculative decoding
* multi-token prediction

因为行业已经逐渐发现：

很多瓶颈已经不是：

"模型不会"。

而是：

"模型太慢"。

---

而且很有意思的一点是：

草稿模型最重要的能力，甚至不是"聪明"。

而是：

"足够像主模型"。

因为 speculative decoding 的核心指标，并不是模型能力，而是 acceptance rate（接受率）。

也就是：

草稿模型预测出来的 token，有多少能够被主模型直接接受。

这也是为什么很多 draft model 都是同系列的小模型，例如：

| Draft     | Target    |
| --------- | --------- |
| Gemma 4B  | Gemma 27B |
| Qwen 1.5B | Qwen 72B  |
| Llama 8B  | Llama 70B |

因为它们：

* tokenizer 相同
* 语言分布接近
* 输出习惯类似

所以 acceptance rate 会非常高。

某种意义上，草稿模型更像是在"预测主模型会怎么说"，而不是单纯生成内容。

---

很多人看到这里会担心：

那质量会不会下降？

严格来说，标准 speculative decoding 理论上是不降质量的。

因为最终真正决定输出的，仍然是主模型。

草稿模型只是提前猜。

猜错了就 rollback。

所以理论上，最终输出分布仍然来自 target model。

当然，现实工业界里，为了进一步提速，很多系统会开始做一些 tradeoff。

比如：

* 放宽 verification
* 更激进 accept token
* 减少 rollback

于是就会进入一种典型的工程优化问题：

用一点点质量，换取大量速度。

---

而且现在越来越明显的一件事是：

用户对"速度"的敏感度，可能远远高于轻微的质量差异。

一个模型如果能做到 0.3 秒开始输出，用户会天然觉得它更聪明、更流畅、更像真人。

哪怕内容质量差异其实并不大。

所以现在很多 Flash、Turbo、Instant 模型背后，很可能都已经大量使用了 speculative decoding 相关技术。

---

后来我越看越觉得。

Speculative Decoding 和 CPU 世界里的 speculative execution，其实非常像。

本质上都是：

先猜，再验证。

CPU 在猜程序下一步会执行哪条分支。

LLM 在猜模型下一步会输出什么 token。

只是以前 speculative execution 优化的是程序执行路径，现在 speculative decoding 优化的是语言生成路径。

---

某种意义上。

未来的大模型，可能已经不再只是"一个模型"了。

而是一个模型 + 一整套协同工作的推理系统。

而 Draft Model，大概只是开始。
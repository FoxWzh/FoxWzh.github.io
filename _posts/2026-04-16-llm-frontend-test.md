---
title: "5 个任务测了 7 款模型的前端能力"
date: 2026-04-16 10:00:00 +0800
categories: [AI PM, 模型测评]
tags: ["前端生成", "模型对比", "Gemini", "GPT5", "Sonnet", "GLM", "minimax"]
---
这是一次专项测试，聚焦 **前端代码生成能力**，用 5 个梯度递增的任务，横向对比 7 款主流模型的真实表现。

测试模型：**Sonnet 4.5 / Gemini 3 Pro / Gemini 3 Flash / GPT5.2 / GPT5.1 CODEX MAX / minimax-m2.1 / glm-4.7**

## 综合结论

> Gemini 3 Flash = Gemini 3 Pro > GPT5.2 > glm4.7 > GPT5.1 CODEX MAX = Sonnet 4.5 > minimax-m2.1

**关键发现：**
- Gemini 3 系列在视觉复杂度和创意执行上表现最强，Pro 和 Flash 差距极小
- GPT5.2 指令遵循最准，在结构化还原类任务（UI 复刻）表现突出
- minimax-m2.1 目前没有视觉理解能力，无法完成需要参考图的任务
- Sonnet 4.5 在纯代码生成任务上偏保守，创意发挥不如 Gemini 系列

## 测试任务

1. **粗野主义网站** — 高度风格化的创意网站，带滚动动画和鲜艳配色
2. **复古像素风贪吃蛇** — 带半调图案风格的游戏实现
3. **UI 复刻（灵感平台）** — 按参考截图还原界面
4. **SeaVerse 3D 粒子场** — Three.js 粒子文字 + 手势交互
5. **3D 魔方** — 可打乱、可还原、可手动操作的交互魔方

## 查看完整对比

<div style="margin: 24px 0;">
  <a href="/assets/llm-frontend-test/"
     target="_blank"
     style="display:inline-block;padding:12px 28px;background:#7c6af7;color:white;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;">
    打开完整对比页面 →
  </a>
</div>

<iframe
  src="/assets/llm-frontend-test/"
  width="100%"
  height="700"
  style="border:1px solid #2e3347;border-radius:8px;margin-top:12px;"
  loading="lazy">
</iframe>

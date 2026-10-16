# 01 · 背景与可行性

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: reference-canon-v1 / 1.0.0

本页把 phase1 历史材料接入 `reference-canon-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 适用范围

- 阶段、版本、受众和使用场景：phase1 historical；仅用于原版真值/工程知识的日期化回顾。

## 一手来源

- source/primary refs：`docs/phase1/01-feasibility.md` 原始全文及其列出的 file:line / sdlpal / 数据来源。
- 证据等级：source quote、Git SHA 和既有一手引用；不含本轮 runtime/E2E/coverage 执行。

## 当前真值

- 已确认：原文语义、日期、状态词和引用关系可由 quote inverse 重建。
- 仅为历史/候选：任何当前实现状态、完成度和产品结论。

## 未知与冲突

- 未知：- （无新增；历史边界保持开放）
- 冲突双方与待裁决问题：由当前 primary source、代码、测试和用户决策重新裁决。

## 使用边界

- 可以支持的结论：说明历史背景、原版约束和当时的工程判断。
- 不得推出的结论：不得推出当前 runtime、E2E、视觉、coverage 或产品完成。
- 复核/升格条件：引用时带版本/日期，并由当前 Owner 以新证据复核。

## 历史范围

- phase1 foundation archive；日期：undated；固定来源 `d62602284cbfe2d9306f4acb006d15d944d1f6e2`；source SHA `e9e688ecf63eede4d7b16629bce9e0f23961eacc5d8a1659a22c4a53eb3016bc`。

## 原始结论

- Defines the first-stage goal as a faithful web restoration for private use, with sdlpal as an engine specification and user-owned original data; it explicitly separates engine reimplementation from data ownership.

## 当时证据

- 标题锚点：项目目标；可行性结论:可行；关于 sdlpal；关于"原版源代码"；重要认知:sdlpal 干两类事；数据文件(MKF)；原始正文、表格、状态词和链接在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- C；u；r；r；e；n；t； ；p；h；a；s；e；1； ；c；a；n；o；n；i；c；a；l； ；d；o；c；s；/；c；o；d；e；/；t；e；s；t；s； ；a；n；d； ；a； ；f；r；e；s；h； ；p；r；i；m；a；r；y；-；s；o；u；r；c；e； ；r；e；v；i；e；w；.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `e9e688ecf63eede4d7b16629bce9e0f23961eacc5d8a1659a22c4a53eb3016bc`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 01 · 背景与可行性
>
> ## 项目目标
>
> 把目标游戏(一款经典 2D 回合制 RPG)做成网页版。目标版本:**1998 Win9x 版**(非 1995 DOS 版)。
>
> 不采用"把 sdlpal 的 C 引擎用 Emscripten 编译成 WASM 塞进浏览器"的方案,而是**用原生 TypeScript 从头重写整个游戏引擎**。理由:代码可读、模块清晰,方便日后扩展(加场景、剧情、任务、物品、技能、玩法)。
>
> - 第一优先级:**忠实移植**。把 1998 Win9x 版完整、忠实地在网页跑起来。
> - 扩展能力是第二阶段的事,但架构从第一天起就为它留好空间。
> - 个人自用,不公开发布。
>
> ## 可行性结论:可行
>
> 目标游戏是一个 2D 回合制 RPG —— 256 色调色板、RLE 精灵、瓦片地图、回合制战斗。浏览器(Canvas/WebGL + Web Audio + TypeScript)承载这种规模的游戏绰绰有余,性能不是问题。技术上没有不可逾越的障碍。
>
> 工作量上,这是一个**数月级别**的项目,不是周末项目。引擎本身有约 30 个核心模块要重写。
>
> ## 关于 sdlpal
>
> [sdlpal](https://github.com/sdlpal/sdlpal) 是社区做的、基于 SDL 的跨平台目标游戏引擎的重新实现。
>
> - 语言:C(约 98%),许可证 GPLv3。
> - 它**不含原版游戏数据**,只是引擎。运行时读取玩家自备的原版数据文件。
> - 它由社区基于 "PAL Research Project" 逆向文档 + Baldur / louyihua 等人的逆向工作做出来。
>
> **sdlpal 在本项目里的角色**:它是引擎逻辑的"规格说明书"。战斗公式、脚本 opcode 语义、数据文件格式怎么解析 —— 全部以 sdlpal 的 C 源码为准。我们**参照它用 TS 重写**,不 fork、不编译它的 C 代码。源码已放在 `reference/sdlpal/`。
>
> ## 关于"原版源代码"
>
> 调查结论:**1995 原版的源代码从未公开**,大宇 / 软星从未官方开源过。而且即使拿到也帮不上忙:
>
> 1. 原版当年用 **QuickBASIC + x86 汇编**写成,跑在 DOS 实模式。就算流出,把这种 30 年前的代码移植到 TS 比从头写还难。
> 2. 更关键:**游戏的"内容"不在源代码里**。它是数据驱动的 —— 源代码(原版 `PAL.EXE` 或 sdlpal)只是一个解释器;剧情、地图、对话、战斗、人物、物品、技能全部在数据文件里。
>
> 所以本项目真正需要两样东西:
> - **引擎逻辑** → sdlpal 提供(现代、可读的 C 参考)。
> - **数据文件** → 玩家自备的 1998 Win9x 版原版拷贝。
>
> ## 重要认知:sdlpal 干两类事
>
> 1. **解释执行字节码脚本** —— `SSS.MKF` 里有一套自定义字节码(开发者为这个游戏设计的专用小虚拟机,**不是 x86 汇编**),负责剧情 / 事件层:对话分支、事件触发、任务条件、过场演出、NPC 行为。`script.c` 就是这个解释器。
> 2. **重新实现整个引擎** —— 战斗系统、菜单 / 背包 / 法术界面、行走与碰撞、渲染、存档、音频。这些**不在字节码里**,是引擎代码。脚本运行时会"调用"引擎能力(进入战斗、打开商店、播放动画)。
>
> 也就是说:脚本解释器只是引擎的一个模块;引擎重写才是工作量大头。
>
> ## 数据文件(MKF)
>
> 原版数据打包在若干 `.mkf` 归档文件里(`SSS.MKF` 脚本、`DATA.MKF` 数据表、地图、精灵、调色板、字库、音乐等),部分用 YJ1 算法压缩。
>
> **本项目的处理方式**:不在运行时解析 MKF。见 `02-architecture.md` 的两阶段设计 —— 一个离线工具把 MKF 一次性转成现代资源文件,网页游戏只认现代资源。
>
> 数据文件需要你自己提供,放在 `data/raw/`,见该目录的 README。

<!-- original-source-quote:end -->

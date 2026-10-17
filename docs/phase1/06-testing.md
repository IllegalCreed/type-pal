# 06 · 测试策略

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: guide-runbook-v1 / 1.0.0

本页把 phase1 历史材料接入 `guide-runbook-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目的

- 读者和完成后得到的结果：理解并复核历史 phase1 方法/测试/runbook 内容（phase1 foundation document full-text review: 06 · 测试策略.）。

## 前置条件

- 权限、输入、版本和安全边界：固定历史 source revision；不得把历史步骤当作当前运行指令。
- 当前执行前必须确认：现行工具、代码、版本、数据路径和用户授权。

## 步骤

1. 读取本页历史正文和原文 quote，确认日期与适用阶段。
2. 对照当前 canonical 文档、代码和测试，逐项复核仍有效的步骤。
3. 将新发现写入当前任务卡或审计台账，不回填为历史事实。

## 失败处理

- 可预期失败：- （无新增；历史边界保持开放）
- 停止线：do not promote historical claims to current truth without a current source or user decision
- 回滚/人工接管：停止执行历史命令，保留证据并交由当前 Owner 裁决。

## 完成定义

- 可观察的完成条件：历史语义、来源 SHA、模板章节和继任入口均可追溯。
- 证据路径与复核人：本页 quote、R30 review record 与 Codex 独立验收。

## 历史范围

- phase1 foundation archive；日期：2026-05-23；固定来源 `d62602284cbfe2d9306f4acb006d15d944d1f6e2`；source SHA `9f603594d8d203d732edb717e0f51e20863353c463ee0767a387c0cbb46a92cd`。

## 原始结论

- Defines historical phase1 testing layers: unit/integration, sdlpal comparisons, roundtrip, visual E2E and full playability. It distinguishes fidelity checks from product/E2E claims.

## 当时证据

- 标题锚点：核心思路:正确答案已经存在；pal-extract:往返 + 对拍；核心层:Vitest 单测；sdlpal 差分测试(重档核心)；渲染:截图快照；自主端到端回放测试；存档素材库；dev 调试面板；原始正文、表格、状态词和链接在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- Current phase1 canonical docs/code/tests and a fresh primary-source review.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `9f603594d8d203d732edb717e0f51e20863353c463ee0767a387c0cbb46a92cd`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 06 · 测试策略
>
> ## 核心思路:正确答案已经存在
>
> type-pal 是**忠实移植**(D3)。测试的主线不是凭空写期望值,而是**和原版对拍**。三个现成的对照物("oracle"):
>
> - **sdlpal 源码** —— 参考实现,战斗公式 / opcode 语义 / 数据格式以它为准。
> - **原版数据** —— `data/raw/` 的真实输入,以及 5 个 `.RPG` 真实存档。
> - **无损可逆** —— D16 的忠实转写能往返,可逐字节自我验证。
>
> 测试投入选**重档**(D21):和 sdlpal 的对拍尽量自动化。
>
> ## pal-extract:往返 + 对拍
>
> - **events.json — round-trip 验证(全量)**:字节码 → JSON → 字节码,与原始 `SSS.MKF` chunk 4 逐字节比对。整个游戏所有脚本都过一遍 —— 全过即转写器证明忠实。
> - **不可逆部分 — 和 sdlpal 对拍**:RLE 精灵解出的索引位图,与 sdlpal 解码结果逐像素比;数据表逐字段比 + 抽查已知值。
> - **格式解析器 — fixture 单测**:MKF / YJ1 / RLE 用小样本单测。
>
> ## 核心层:Vitest 单测
>
> 核心层是纯逻辑、无浏览器依赖(架构刻意为之)。RNG 可种子化、固定步长(D13)→ 测试喂"N 个 tick + 合成输入",断言 GameState。
>
> - **战斗公式**:照 sdlpal `fight.c` / `battle.c`,喂已知输入断言输出。
> - **事件系统**:喂小 events.json,步进协程,断言 GameState 变化与发出的命令。
>
> ## sdlpal 差分测试(重档核心)
>
> 战斗是公式最密、忠实风险最高的部分。差分测试:同一场景(队伍属性 + 敌队 + 固定 RNG 种子),在 sdlpal 和我们的 TS 各跑一遍,**逐回合比伤害数字**。
>
> - **构建 spike 已完成**(2026-05-23):一行编出 `build/sdlpal/unix/sdlpal`(Mach-O arm64,5.8MB):
>
>   ```sh
>   brew install make sdl3   # 一次性
>   bash scripts/build-sdlpal.sh
>   ```
>
>   踩坑记录:① macOS 自带 GNU Make 3.81 太老,sdlpal 的 Makefile 模式变量优先级行为不对 → 需 GNU Make 4.x(`gmake`);② sdlpal master 已迁 SDL3;③ `sdl_compat/sdl_compat.h` 缺 `extern "C"` 守卫,导致 macOS unix Makefile 路径下 `native_midi.cpp` 链接报 `SDL_RWread` undefined —— 补丁在 `scripts/sdlpal-extern-c.patch`,构建脚本自动应用。
>
> - 差分管线多半不需要带窗口的完整 sdlpal,而是给它的具体逻辑(战斗、解码)套**无头小程序**(headless,喂输入吐 JSON)。M1 起按需做。
> - **待查**:sdlpal 自带的 `tests/` 目录(需要 `3rd/googletest` 子模块,目前是空的)、是否支持 demo 录制 / 回放。
>
> ## 渲染:截图快照
>
> 渲一个已知场景到 320×200 帧缓冲,与参考图逐像素 diff。参考图可从 sdlpal 跑同场景截下来 —— 渲染忠实度检查。
>
> ## 自主端到端回放测试
>
> 目标:一条从**开始到通关**、全自主跑的端到端测试。
>
> - **形态**:确定性输入回放(demo replay)。靠 D13 的确定引擎 + 可种子化 RNG —— 录下整局通关的输入序列 + 种子,replay 时逐帧重现,在检查点断言状态,直到结局触发。replay 本身零 AI、零网络,就是普通测试。
> - **怎么造录制**:在 Claude Code 工作会话里用 agent 循环(headless 驱动引擎 → 读 GameState → 决定下一段输入 → 再喂)迭代构造。录制文件落盘,跨会话、按里程碑分章节增量延长。
> - **增量**:M2 回放跑通探索切片 → M3 打赢一场 → … → M7 抵达通关。回放随引擎一起长大。
> - **差分版**:输入录制在 sdlpal 里做(含状态检查点),同一段输入喂我们的引擎逐点比 —— 一条测试同时验忠实 + 回归。
>
> ## 存档素材库
>
> 5 个原版 `.RPG` + 自建的存档,攒成一个素材库。一档三用:
>
> - 手工测试的**剧情跳转点**;
> - 自动差分测试的**场景 fixture**;
> - 回归测试 fixture。
>
> 前提:引擎能读 `.RPG`(原版 GameState 的序列化)。这个解析器差分测试也要用,提前到测试基建里做。
>
> ## dev 调试面板
>
> 外壳层里一块**仅 dev 构建**的面板,与忠实的核心层隔离、绝不进正式运行时:
>
> - 跳场景(直接传送队伍到场景 N)。
> - 加载存档 fixture(= 跳到某剧情点)。
> - 查看 / 修改 GameState。
>
> 开发日常和手工 QA 都靠它。
>
> ## 输入录制 / 回放
>
> 外壳层输入系统从一开始就支持把输入流**录制成序列、确定性回放**(见 D14)。这是"自主回放测试"的基础;事后补很贵,故设计期就纳入。
>
> ## 测试金字塔与里程碑
>
> - 大量**核心层单测** + 一层 **sdlpal 差分** + 少量 **E2E 回放**。
> - 每个里程碑的**垂直切片本身就是一次端到端验证**。
> - round-trip 验证随 events 转写器(M1,见 04-decisions D22)一起做;sdlpal 差分 harness、`.RPG` 解析、dev 面板、输入录制 / 回放 在 M1–M3 按需逐步搭。

<!-- original-source-quote:end -->

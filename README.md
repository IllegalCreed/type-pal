# type-pal

《仙剑奇侠传 98 柔情版》的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把经典 RPG《仙剑奇侠传》(目标版本:**1998 柔情版**)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后给游戏加场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版 98 柔情版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 当前状态(2026-05-23)

**方案设计阶段已完成。** 可行性、架构、渲染、表现/外壳层、events.json schema、技术栈、符号方案全部敲定,详见 `docs/`。原版数据已就位并核对。

下一步:进入实现,从 `docs/03-development-plan.md` 的 M0(项目骨架与工具链)开始。

## 仓库结构

- `docs/` —— 设计文档(**从这里开始读**)
  - `01-feasibility.md` 背景与可行性
  - `02-architecture.md` 架构设计
  - `03-development-plan.md` 开发计划 / 里程碑
  - `04-decisions.md` 决策记录(D1–D21)
  - `05-events-schema.md` events.json 格式设计
  - `06-testing.md` 测试策略
- `reference/sdlpal/` —— sdlpal 源码,作为引擎逻辑参考(见 `reference/README.md`)
- `data/raw/` —— 放原版 98 柔情版数据文件的地方(见 `data/raw/README.md`)

## 怎么继续

在本目录新开一个对话,让 AI 先读 `docs/` 全部 6 个文件和 `reference/README.md`,即可接着实现。从 M0 开始。

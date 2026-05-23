# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 当前状态(2026-05-23)

**M1 完成** —— `pal-extract` 端到端打通。`pnpm extract` 一次性产出 `data/extracted/`:
- 事件全量:295 scenes + shared.json + objects.json,**SSS.MKF 全量字节级 round-trip 通过**(43503 条指令)
- 资源切片(scene 1 = 开局):tilemap + 323 tiles + 9 palette
- 数据表全量:235 items / 102 spells / 153 enemies
- `pnpm check` 全绿(91 个单测 + 类型检查)

**Task 20 sdlpal RLE 对拍 harness 推迟到 M3** —— M3 战斗差分本就需要 sdlpal headless 基建,统一做更划算。当前 RLE 验证靠手造单测 + 真实数据 extract 端到端通过。

下一步:进入 **M2**(运行时垂直切片 · 探索),见 [`docs/03-development-plan.md`](docs/03-development-plan.md)。

## 仓库结构

- `docs/` —— 设计文档(**从这里开始读**)
  - `01-feasibility.md` 背景与可行性
  - `02-architecture.md` 架构设计
  - `03-development-plan.md` 开发计划 / 里程碑
  - `04-decisions.md` 决策记录(D1–D21)
  - `05-events-schema.md` events.json 格式设计
  - `06-testing.md` 测试策略
- `reference/sdlpal/` —— sdlpal 源码,作为引擎逻辑参考(见 `reference/README.md`)
- `data/raw/` —— 放原版数据文件的地方(见 `data/raw/README.md`)

## 开发(本地)

```sh
# 一次性
brew install pnpm        # 若未装
brew install make sdl3   # sdlpal 差分测试用,见 docs/06-testing.md

# 项目本身
pnpm install
pnpm check               # 全部包的 typecheck + 测试
pnpm --filter @type-pal/game dev  # 起网页游戏的 Vite 开发服务器

# sdlpal(差分测试 oracle)
bash scripts/build-sdlpal.sh
```


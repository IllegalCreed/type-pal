# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 状态(2026-05-28)

M5/M5.5/M5.6 完工后,user 实测发现自报完成度被反复夸大。已停"做新功能",
转入 **Phase A/B feature audit** — 逐功能 sdlpal 源 1:1 核对 + user 拍板,
落到 [`docs/feature-status.md`](docs/feature-status.md) 权威表。

进度 / 重排 M6 见 [`docs/plans/2026-05-28-feature-audit-and-replanning.md`](docs/plans/2026-05-28-feature-audit-and-replanning.md)。

历史里程碑(纯记录,完成度表述以 feature-status.md 为准):

- **M1**(2026-05-23):pal-extract 端到端,295 scenes / 235 items / 102 spells / 153 enemies dump
- **M2**(2026-05-23):运行时垂直切片(scene 1 探索 + NPC 触发对话)
- **M3 Phase 1**(2026-05-23):战斗系统骨架 + D29 双基准 + 5 actions + dev 入口
- **M3.5**(2026-05-24):scene 切换 + 明雷怪 + L2 Playwright 视觉对拍
- **M4**(2026-05-24):pal-extract 补全 + 资产分层 + 全 295 scene + Unifont 字体真渲染
- **M5**(2026-05-27):51 task — P0 物理 / Sync GameState / 完整战斗骨架 / 菜单 state machine / Save API / Interact opcode
- **M5.5**(2026-05-27):sdlpal 全 46 个 .c 源 445 函数 audit doc(自报完成度后被 user 实测打脸)
- **M5.6**(2026-05-27):基础玩法接通 — 菜单输入路由 / 9-slice box / trigger zone / PAL_Search(同样自报完成度被打脸,触发 2026-05-28 重置)

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
pnpm check               # 全部包的 typecheck + 测试(407+ 单测)
pnpm extract             # 跑 pal-extract 一次性产出 data/extracted/
pnpm --filter @type-pal/game dev  # 起网页游戏的 Vite 开发服务器

# sdlpal 双 build(差分测试 oracle)
bash scripts/build-sdlpal.sh          # 默认 build(M1 已用)
bash scripts/build-sdlpal-classic.sh  # PAL_CLASSIC 1995/1998 原版战斗 build(M3 D30)

# D29 双基准(M3 加,可选;baseline 不存在测试 skip + warn)
bash scripts/extract-tilemap-baseline.sh  # tilemap PNG baseline
bash scripts/extract-battle-baseline.sh   # 5 个 battle fixture 数值 baseline
```


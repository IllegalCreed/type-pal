# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 当前状态(2026-05-24)

**M4 完成** —— pal-extract 补全 + 资产分层 + 全 295 scene + 字体真渲染(M1-M4 全功能覆盖)。

## M4 · pal-extract 补全 + 资产分层 + 字体真渲染 ✅(2026-05-24 完工)

- pal-extract 14 个 MKF 全 chunk 覆盖(P2,见 `docs/M4_CHUNK_INVENTORY.md`)。STUFF.MKF + SAVE.MKF 不存在(WIN95+ 版用 .RPG 存档)
- `data/extracted/` 资产按 battle / world / item / ui / splash / magic / font 分层(P1)
- 全 295 scene 资源 dump + dev panel scene picker 294 可跳(P3,sdlpal `--dump-map` 自动化 diff 99.7% pass)
- Unifont CN 真字形渲染,UI 文字可读;L2 b* spec vs sdlpal real baseline diff 1-4%(P4,M3.5 ⚠️ 接合)
- M3.5 ⚠️ 残留修:a9 端到端 unskip(L2 31 pass / 0 skip)/ palette 跨 scene / b* 切 sdlpal real baseline

详见 `docs/plans/2026-05-24-m4-pal-extract-complete-design.md`(brainstorm)和 `docs/plans/2026-05-24-m4-pal-extract-complete.md`(实施)。

**M3.5 完成**(2026-05-24) —— scene 切换 + 明雷怪 + L2 Playwright 视觉对拍(M1-M3.5 全功能覆盖)。详见 03 plan。

**M3 Phase 1 完成**(2026-05-23) —— 战斗系统骨架 + D29 双基准 + 5 actions 全集 + dev 入口。

**M2 完成**(2026-05-23) —— 运行时垂直切片打通(scene 1 探索 + NPC 触发对话)。详见 03 plan。

**M1 完成**(2026-05-23) —— `pal-extract` 端到端打通,`pnpm extract` 一次性产出 `data/extracted/`(全量 295 scenes / 235 items / 102 spells / 153 enemies + scene 1 视觉资源)。详见 03 plan。

**M5 完成**(2026-05-27) —— 51 task:P0 物理 7 + Sync 3 + Battle 13 + Menu 11 + Save 5 + Interact 7 + P2 收口 4。Test 计 game 486 + pal-extract 199 + shared 44 = **729 用例全过**(+2 skip 已知 deviation)。`?tp_dump=1` URL flag 启动 ts game 即录每帧 jsonl 与 sdlpal classic build dump 1:1 字段对齐(camera 改 sdlpal viewport 语义 + partyoffset(160, 112))。

**M5.5 进行中** —— sdlpal 全 46 个 .c 源逐文件 / 逐函数 audit。当前进度:Tier 1 6 文件(scene/play/script/battle/fight/global)逐函数审过;Tier 2 / Tier 3 之前的"概要式标 ts 等价"不算数,正在重做。报告见 [`docs/plans/2026-05-27-m5-5-sdlpal-audit.md`](docs/plans/2026-05-27-m5-5-sdlpal-audit.md)。

下一步:**M6 / M7**(体验补全 / 通关验证),见 [`docs/03-development-plan.md`](docs/03-development-plan.md)。

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


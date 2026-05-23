# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 当前状态(2026-05-24)

**M3 Phase 1 完成** —— 战斗系统骨架 + D29 双基准 + 5 actions 全集 + dev 入口。
- `pnpm -F @type-pal/game dev`:M2 探索 + `B` 键弹 dev panel picker 选 fixture → 进战斗 → 5 actions(attack / defend / magic / item / flee)→ won/lost/fleed 全跑通 + exp/cash 入账
- 战斗骨架:`core/battle/` 子层 = `battle-state` / `turn-queue`(PAL_CLASSIC ActionQueue)/ `formulas`(1:1 port `fight.c`)/ `enemy-ai` / 5 个 `actions/*.ts` / `battle-system`(phase 状态机)/ `rng`(mulberry32)
- 战斗 UI:`present/battle/` = 背景 + 双方 sprite + 主菜单 + 二级菜单 + 目标光标 + HP/MP 数字 + 伤害弹幕。`BATTLE_FPS=25` vs `EXPLORE_FPS=10`
- 数据 schema 战斗完整版:Enemy 扩 30+ 字段(signed 语义 + 元素抗具名)+ 新增 Item / Spell / Magic / EnemyTeam / BattleField / PlayerRoles
- **D29 双基准**:① sdlpal classic build PAL_CLASSIC patch + headless map dumper(`--dump-map`) → tilemap 像素 diff 自动测试;② headless battle harness(5 fixture)→ 逐回合 hp/mp 数值对拍。两套基准都活在 `pnpm check` 里
- 407+ 单测 + 2 skipped(b2-magic / b5-defend 两个 fixture 的已知 deviation,见 plans 末「实施过程发现」)

下一步:进入 **M3.5**(scene 切换 + 明雷怪 + 仙灵岛端到端,把 scene 1 onEnter 真跑完连到撞草妖),见 [`docs/03-development-plan.md`](docs/03-development-plan.md)。

**M2 完成**(2026-05-23) —— 运行时垂直切片打通(scene 1 探索 + NPC 触发对话)。详见 03 plan。

**M1 完成**(2026-05-23) —— `pal-extract` 端到端打通,`pnpm extract` 一次性产出 `data/extracted/`(全量 295 scenes / 235 items / 102 spells / 153 enemies + scene 1 视觉资源)。详见 03 plan。

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


# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 状态(2026-06-08)

核心系统(战斗 / 场景 / 事件 / 菜单 / 存档 / 音频 / 演出)已整体落地,当前在**逐子系统对 sdlpal 源 1:1 核对**阶段:不再"自报完成度",而是逐函数对照 C 源找差异、commit 引行号、逐条 TDD 修复 + 实机验收。

功能 / opcode / 资源三类实现状态分别落到三张权威表:

- [`docs/feature-status.md`](docs/feature-status.md) —— 玩家可感知功能(A–M 章)
- [`docs/opcode-status.md`](docs/opcode-status.md) —— 事件脚本逐 opcode(164 全集)
- [`docs/resource-status.md`](docs/resource-status.md) —— 资源提取逐 chunk

逐内容状态表(数据 + 脚本反汇编 + sdlpal 核对生成):

- [`docs/item-status.md`](docs/item-status.md) —— 物品逐条(235,id 61–295)
- [`docs/magic-status.md`](docs/magic-status.md) —— 仙术逐条(102,id 296–397,敌我双方 + 分角色习得 + 合击)
- [`docs/cutscene-status.md`](docs/cutscene-status.md) —— 演出(连续自动脚本)逐条(507 段 / 188 场景,含复核风险 triage)
- [`docs/game-mechanics.md`](docs/game-mechanics.md) —— 战斗底层机制真值(伤害 / 暴击 / 隐藏经验 / 五灵抗性 / 出手顺序等,逐条带 sdlpal 行号)

> 完成度表述一律以上述表为准,README 不写百分比。表内多数为 `claimed`(Claude 自认完成 + 带 sdlpal 行号),`verified`(user 真引擎逐条核对)需 user 实测确认。

近期最大一轮工作 —— **全子系统差异审计**([`docs/plans/2026-06-07-sdlpal-diff-audit.md`](docs/plans/2026-06-07-sdlpal-diff-audit.md)):22 个子系统并行、逐函数对照 `reference/sdlpal/` 找差异候选,每条候选再派对抗复核 agent 独立重核、尽力推翻误报。70 条候选 → 64 条确认差异(2 high / 15 medium / 47 low)→ **已 100% 逐条修复**(全部 TDD + `pnpm check` 全绿 + 逐条 commit)。

此前 M6 体验补全(音频全套 / 战斗演出时间线 / 动作菜单 1:1 / 被动格挡 / 结局编排)与 D 系列批次(状态行为 / 敌人 AI / 数值装备 / 毒)落地流水,见 git log 与 [`docs/plans/`](docs/plans/);战斗底层机制真值另见 [`docs/game-mechanics.md`](docs/game-mechanics.md)。

历史里程碑(纯记录,完成度表述以 feature-status.md 为准):

- **M1**(2026-05-23):pal-extract 端到端,295 scenes / 235 items / 102 spells / 153 enemies dump
- **M2**(2026-05-23):运行时垂直切片(scene 1 探索 + NPC 触发对话)
- **M3 Phase 1**(2026-05-23):战斗系统骨架 + D29 双基准 + 5 actions + dev 入口
- **M3.5**(2026-05-24):scene 切换 + 明雷怪 + L2 Playwright 视觉对拍
- **M4**(2026-05-24):pal-extract 补全 + 资产分层 + 全 295 scene + Unifont 字体真渲染
- **M5**(2026-05-27):51 task — P0 物理 / Sync GameState / 完整战斗骨架 / 菜单 state machine / Save API / Interact opcode
- **M5.5**(2026-05-27):sdlpal 全 46 个 .c 源 445 函数 audit doc(自报完成度后被 user 实测打脸)
- **M5.6**(2026-05-27):基础玩法接通 — 菜单输入路由 / 9-slice box / trigger zone / PAL_Search(同样自报完成度被打脸,触发 2026-05-28 重置)
- **M6**(2026-05-28 起):0528 重置后的功能 audit 阶段 — 战斗演出 / 音频全套 / 动作菜单逐功能对 sdlpal 1:1,带行号 commit,不再自报完成度
- **差异审计期**(2026-05-31 起):D 系列批次(状态行为 / 敌人 AI / 数值装备 / 毒)+ item / magic / cutscene 逐内容审计 + 全子系统差异审计(70 条候选 / 64 确认 / 全修),详见 [`docs/plans/`](docs/plans/)

## 仓库结构

- `docs/` —— 设计文档 + 状态表(**从这里开始读**)
  - `01-feasibility.md` 背景与可行性
  - `02-architecture.md` 架构设计
  - `03-development-plan.md` 开发计划 / 里程碑
  - `04-decisions.md` 决策记录(D1–D21)
  - `05-events-schema.md` events.json 格式设计
  - `06-testing.md` 测试策略
  - `feature-status.md` · `opcode-status.md` · `resource-status.md` —— 三张权威实现状态表
  - `item-status.md` · `magic-status.md` · `cutscene-status.md` —— 物品 / 仙术 / 演出逐内容状态表
  - `game-mechanics.md` —— 战斗底层机制真值(逐条对照 sdlpal,带行号出处)
  - `sdlpal-runbook.md` —— sdlpal build / headless 差分测试参考
  - `plans/` —— 各里程碑计划 + audit doc
- `reference/sdlpal/` —— sdlpal 源码,作为引擎逻辑参考(见 `reference/README.md`)
- `data/raw/` —— 放原版数据文件的地方(见 `data/raw/README.md`)

## 开发(本地)

```sh
# 一次性
brew install pnpm        # 若未装
brew install make sdl3   # sdlpal 差分测试用,见 docs/06-testing.md

# 项目本身
pnpm install
pnpm check               # 全部包 typecheck + 单测(game 包 2000+ 单测;部分 present/e2e 用 canvas/createImageBitmap,node 环境跳过 → 视觉验证走真引擎)
pnpm extract             # 跑 pal-extract 一次性产出 data/extracted/
pnpm --filter @type-pal/game dev  # 起网页游戏的 Vite 开发服务器

# sdlpal 双 build(差分测试 oracle)
bash scripts/build-sdlpal.sh          # 默认 build(M1 已用)
bash scripts/build-sdlpal-classic.sh  # PAL_CLASSIC 1995/1998 原版战斗 build(M3 D30)

# D29 双基准(M3 加,可选;baseline 不存在测试 skip + warn)
bash scripts/extract-tilemap-baseline.sh  # tilemap PNG baseline
bash scripts/extract-battle-baseline.sh   # 5 个 battle fixture 数值 baseline
```


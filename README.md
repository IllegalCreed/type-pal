# type-pal

一款经典 2D 回合制 RPG 的网页版重新实现 —— 用原生 TypeScript 从头实现引擎,而不是把 C 引擎编译进浏览器。

## 这是什么

把目标游戏(一款 1998 年发布的经典中文 2D 回合制 RPG)做成一个网页游戏。不走"把 sdlpal 的 C 代码用 Emscripten 编译成 WASM"那条路,而是**用 TypeScript 原生重写整个引擎**,代码模块清晰,方便日后扩展场景、剧情、任务、物品、技能、玩法。

- **忠实移植优先**:第一目标是把原版完整、忠实地在网页上跑起来。
- **参考而非 fork**:sdlpal 的 C 源码作为引擎逻辑的"规格说明书"(战斗公式、脚本语义、数据格式),我们照着它用 TS 重写。
- **个人自用**:自己游玩,不公开发布。

## 状态(2026-06-04)

仍在 **Phase A/B feature audit**:逐功能对 sdlpal 源 1:1 核对、commit 引行号,不再"自报完成度"。
功能 / opcode / 资源三类实现状态分别落到三张权威表:

- [`docs/feature-status.md`](docs/feature-status.md) —— 玩家可感知功能(A–M 章)
- [`docs/opcode-status.md`](docs/opcode-status.md) —— 事件脚本逐 opcode
- [`docs/resource-status.md`](docs/resource-status.md) —— 资源提取逐 chunk

逐内容状态表(数据 + 脚本反汇编 + sdlpal 核对生成):

- [`docs/item-status.md`](docs/item-status.md) —— 物品逐条(235,id 61–295)
- [`docs/magic-status.md`](docs/magic-status.md) —— 仙术逐条(102,id 296–397,敌我双方 + 分角色习得 + 合击)
- [`docs/cutscene-status.md`](docs/cutscene-status.md) —— 演出(连续自动脚本)逐条(507 段 / 188 场景,含复核风险 triage)

> 完成度表述一律以三表为准,README 不写百分比。三表状态多为 `claimed`(Claude 自认完成 + 带 sdlpal 行号),`verified`(user 真引擎逐条核对)需 user 实测确认。

近期(0531–0604)落地:
**M6 音频全套**(运行时 MIDI 合成 BGM 开箱即响 + 战斗 SFX 全接:攻击 / 暴击 / 施法 / 受击 / 阵亡 / 逃跑 / 胜利曲,帧同步 + 系统菜单「音乐」「音效」开关)、
**战斗动作菜单 1:1**(4 图标 + 杂项盒 + 物品 / 法术二级网格 + 友方 / 敌方 target picker)、
**被动格挡**(fAutoDefend + 格挡 / 受击姿动画)、
菜单非匹配项红色显示(对齐 sdlpal 不过滤列表)、
调试设施收拢到 `src/dev/`、
**性能**:scene 资源 LRU 淘汰(修长时游玩内存单调增长)、
**战斗真值修复**:玩家打敌人超杀显示**完整伤害**(对齐 sdlpal `wHealth` WORD 下溢,非剩余血;敌打玩家则钳剩余血,故意不对称)。

更早(0529–0530):对话逐字变速 + 颜色控制符、过场黑屏架构根因修复、结局 DOS 全片编排、
特效栈(FBP / 调色板 / RNG 动画 / 屏幕波动)、跨场景跟随者(opcode 0x98 / 0x46)、
战斗法术伤害结算 keystone(inline 攻击法术 + 0x42 SimulateMagic)、
**战斗演出全套**(时间线架构:物理 / 法术动画 + 受击变白 + 死亡淡出 + 敌 idle 帧 + 伤害数字)、
**战斗友方目标选择** + **战斗内治疗 / 复活值生效**、
**战斗内对话**(boss 嘲讽,复用大世界对话框覆于战斗场景)。
战斗底层机制真值(伤害 / 暴击 / 隐藏经验 / 五灵抗性 / 出手顺序等)另见 [`docs/game-mechanics.md`](docs/game-mechanics.md)。

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
- **M6**(2026-05-28 起,进行中):0528 重置后的功能 audit 阶段 — 战斗演出 / 音频全套 / 动作菜单逐功能对 sdlpal 1:1,带行号 commit,不再自报完成度

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


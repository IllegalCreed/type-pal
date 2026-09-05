# docs/plans/ — 开发过程历史档案(索引)

> ⚠️ **本目录是历史快照,不代表当前状态。**
> 每个文件是写作当时(文件名日期)的里程碑设计 / 实施计划 / 审计报告,记录"当初怎么设计、怎么计划、当时查出什么差异"。计划早已执行、实现可能已偏离、审计结论可能已被后续推翻或并入状态表。**把这里的内容当现状读会误导后续工作。**

## 怎么用这个目录

- **查"现在是什么样"** → 不看本目录,看 [`../feature-status.md`](../status/feature-status.md) / [`../opcode-status.md`](../status/opcode-status.md) / [`../resource-status.md`](../status/resource-status.md) / [`../item-status.md`](../status/item-status.md) / [`../magic-status.md`](../status/magic-status.md) / [`../cutscene-status.md`](../status/cutscene-status.md) / [`../game-mechanics.md`](../game-mechanics.md) 七张真值表,以及决策记录 [`../04-decisions.md`](../04-decisions.md)、架构 [`../02-architecture.md`](../02-architecture.md)。
- **查"当初为什么这么设计 / 当初的实施计划 / 某次审计查了什么"** → 才来本目录,按下表定位。
- 审计类文件的结论一旦修完即并入上述状态表;**本目录文件不随实现进展更新**,只作历史留存。

## 状态图例

- ✅ **已落地** —— 计划已执行完 / 修复已完成;若是审计,结论已并入对应状态表。纯历史追溯用。
- 📌 **转折点** —— 记录某次重大决策或计划重置的背景,理解项目演进史用。
- 🔄 **可能含未完项** —— 原文列了 backlog / roadmap;**现状须对照状态表核实**,勿直接照搬当待办执行。
- 🧪 **待实测** —— 列了交给 user 的真机验收用例,verified 与否以 user 核对为准。

## 索引

### M0–M5 里程碑(设计 + 实施计划,均已完工)

| 文件 | 里程碑 | 状态 |
|---|---|---|
| [m0-project-skeleton](2026-05-23-m0-project-skeleton.md) | M0 项目骨架与工具链 | ✅ |
| [m1-pal-extract-design](2026-05-23-m1-pal-extract-design.md) · [impl](2026-05-23-m1-pal-extract.md) | M1 pal-extract 最小链路 | ✅ |
| [m2-runtime-slice-design](2026-05-23-m2-runtime-slice-design.md) · [impl](2026-05-23-m2-runtime-slice.md) | M2 运行时探索切片 | ✅ |
| [m3-battle-vertical-slice-design](2026-05-23-m3-battle-vertical-slice-design.md) · [impl](2026-05-23-m3-battle-vertical-slice.md) | M3 战斗骨架 | ✅ |
| [m3-5-scene-encounter-design](2026-05-24-m3-5-scene-encounter-design.md) · [impl](2026-05-24-m3-5-scene-encounter.md) | M3.5 场景切换 + 明雷怪 + L2 | ✅ |
| [m4-pal-extract-complete-design](2026-05-24-m4-pal-extract-complete-design.md) · [impl](2026-05-24-m4-pal-extract-complete.md) | M4 提取补全 + 资产分层 + 字体 | ✅ |
| [m5-systems-complete-design](2026-05-25-m5-systems-complete-design.md) · [impl](2026-05-25-m5-systems-complete.md) | M5 系统补全(物理/战斗/菜单/存档/交互) | ✅ |

### M5.5–M5.6 审计与计划重置(关键转折)

| 文件 | 内容 | 状态 |
|---|---|---|
| [m4-extract-audit](2026-05-27-m4-extract-audit.md) | pal-extract 实际提取清单核对(信源已被 resource-status 取代) | ✅ |
| [m5-5-sdlpal-audit](2026-05-27-m5-5-sdlpal-audit.md) | 全 46 源 deviation report(自报完成度后被实测推翻) | 📌 |
| [m5-6-playability-design](2026-05-27-m5-6-playability-design.md) · [impl](2026-05-27-m5-6-playability.md) | M5.6 基础玩法接通 | ✅ |
| [feature-audit-and-replanning](2026-05-28-feature-audit-and-replanning.md) | 全功能逐条核对 + 开发计划重置(放弃"自报完成度"的转折点) | 📌 |

### 差异审计期(2026-05-30 起,逐子系统对 sdlpal 1:1)

| 文件 | 内容 | 状态 |
|---|---|---|
| [opcode-2-remaining](2026-05-30-opcode-2-remaining.md) | 零散 opcode 0x4D / 0x4E / 0xA0 | ✅ |
| [xianglan-cutscene-fidelity](2026-05-30-xianglan-cutscene-fidelity.md) | 丁香兰报信 cutscene 演出保真 | ✅ |
| [d-series-completion-roadmap](2026-05-31-d-series-completion-roadmap.md) | D 系列(战斗)完工总 roadmap(统领下列 D 批次) | 🔄 |
| [d-batch1-status-behavior](2026-05-31-d-batch1-status-behavior.md) | D-B1 玩家状态行为正确性 | ✅ |
| [d-batch2-enemy-ai](2026-05-31-d-batch2-enemy-ai.md) | D-B2 敌方 AI + 脚本驱动 | ✅ |
| [d-batch6-numeric-equip](2026-05-31-d-batch6-numeric-equip.md) | D-B6 数值精度 + 装备 | ✅ |
| [poison-and-portrait-color](2026-05-31-poison-and-portrait-color.md) | 中毒机制 + 战斗头像颜色 | ✅ |
| [d-series-test-cases](2026-06-01-d-series-test-cases.md) | D 系列真机手测用例(23 项 / 90 条) | 🧪 |
| [feature-status-audit](2026-06-01-feature-status-audit.md) | feature-status 重审(结论已并入该表) | ✅ |
| [gameoveractive-refactor](2026-06-01-gameoveractive-refactor.md) | gameOverActive 自造字段重构 | ✅ |
| [remaining-work-plan](2026-06-01-remaining-work-plan.md) | 剩余工作执行计划(W1–W5,20 真待办) | 🔄 |
| [sdlpal-feature-surface-audit](2026-06-01-sdlpal-feature-surface-audit.md) | SDLPal 功能面覆盖审计 | 🔄 |
| [item-audit](2026-06-02-item-audit.md) | 物品功能完整性审计(结论已并入 item-status) | ✅ |
| [battle-system-current-audit](2026-06-06-battle-system-current-audit.md) | 战斗系统当前 audit(大修入口) | 🔄 |
| [sdlpal-diff-audit](2026-06-07-sdlpal-diff-audit.md) | 全子系统差异审计 70 候选 / 64 确认 / 100% 修复 | ✅ |
| [sdlpal-deep-audit](2026-06-10-sdlpal-deep-audit.md) | 第二轮深挖(执行路径级):81 候选 / 50 条对抗复核 0 refuted;9H+32M+33L 全修(27 commit),5 条有意保留(理由见报告) | ✅ |

### 资源管线优化

| 文件 | 内容 | 状态 |
|---|---|---|
| [tileset-atlas-packing](2026-06-22-tileset-atlas-packing.md) | 瓦片资源管线优化:每地图 gzip RLE blob(去图片容器)。S1-S6 全完成,实测 265MB→6.7MB(97.5%)/ 请求 67k→223 / 解码 0 次 canvas / 像素逐字节一致 | ✅ |

## 2026-06 后期计划（历史）

- [2026-06-13-canvas-resolution-setting.md](2026-06-13-canvas-resolution-setting.md)
- [2026-06-13-offline-precache-sw.md](2026-06-13-offline-precache-sw.md)
- [2026-06-13-prod-tools-panel.md](2026-06-13-prod-tools-panel.md)
- [2026-06-14-unified-precache-progress-gate-impl.md](2026-06-14-unified-precache-progress-gate-impl.md)
- [2026-06-14-unified-precache-progress-gate.md](2026-06-14-unified-precache-progress-gate.md)
- [2026-06-18-speedrun-timer-design.md](2026-06-18-speedrun-timer-design.md)
- [2026-06-18-speedrun-timer.md](2026-06-18-speedrun-timer.md)

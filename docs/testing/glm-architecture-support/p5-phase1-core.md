# P5 · 第一阶段环与主控取证（ARCH-SUPPORT-GLM-1）

日期 2026-09-25。冻结 SHA `3270473862…`。对象（实际路径与卡面名的对应）：
`core/event-system.ts`、`core/scene-system.ts`、`core/equip-effect.ts`、
`core/battle/battle-opcodes.ts`、`core/menu/menu-driver.ts`、`core/menu/menu-mode.ts`、
`core/menu/magic-script.ts`（卡面"shell/bootstrap"实为 `shell/bootstrap.ts` 注入方，一并取证）。
**纪律**：不把二阶段身份模型强加一阶段；只标注 runtime 边（真实值/函数跨模块调用）与
type-only 边；环结论以 import 语句实测，不从 SCC 推断 bug。

## 1. 七文件 import 图（实测 grep，runtime 边 R / type-only 边 T）

```
event-system ──R──> scene-system        (:80 getCurrentMapNum，值函数)
event-system ──R──> battle/battle-opcodes (:53 dispatchBattleOpcode)
event-system ──T──> battle/battle-state  (BattleState 类型)
event-system ──R──> command-bus / game-state / dialog-history / word-lookup (环外)
scene-system ──R──> menu/menu-driver     (:551-562 openOverworldShortcutMenu ×4 快捷键)
scene-system ──R──> menu/menu-mode       (openMenu) / menu/in-game-menu (createInGameMenu)
scene-system ──R──> menu/* 与 command-bus
equip-effect ──R──> game-state           (环外；createInitialEquipmentEffect)
battle-opcodes ─R─> battle/{anim-driver,positions,state,magic-damage} (battle 子树内)
menu-driver ──R──> event-system          (:17 addItemToInventory, startOverworldItemScript)
menu-driver ──R──> equip-effect / event-system / save/api / menu-mode / menu/magic-script / command-bus
menu-mode ────R──> menu-driver / game-state / command-bus
magic-script ─R──> event-system          (:29 curePlayerPoisonByLevel, getGlobalCommands, getGlobalLabelMap)
```

**7 文件环实测为两个环，不是一个大环**：
- **环 A（event-system ↔ menu 驱动层）**：`event-system → scene-system → menu-driver → event-system`
  以及 `event-system → scene-system → menu-mode → menu-driver → event-system`、
  `magic-script → event-system`（挂在环 A 上）。
- **环 B 无**：battle-opcodes 只被 event-system 单向调用（`dispatchBattleOpcode` :53），battle 子树
  不回指 event-system/menu——battle 侧是**无环出边**。
- equip-effect 只入边（menu-driver :18 调它），**不在任何环上**。

## 2. 环 A 逐边真实 caller（runtime 证据）

| 边 | caller（file:line） | 语义 |
|---|---|---|
| event-system → scene-system | event-system.ts:80 `getCurrentMapNum()`（用 2 处，历史对话捕获按地图号写地名） | scene-system 持有 `_currentMapNum` 模块态（scene-system.ts:47-50），loadScene 写、event 读 |
| scene-system → menu-driver | scene-system.ts:551/554/558/562 大世界快捷键 E/W/F/S 直达子菜单（注释 port sdlpal play.c:558-584） | 输入层分发 |
| scene-system → menu-mode/in-game-menu | 同文件 import（openMenu/createInGameMenu） | 菜单开启 |
| menu-driver → event-system | menu-driver.ts:17 `addItemToInventory` / `startOverworldItemScript`（菜单动作回调执行大世界脚本） | 菜单动作回写大世界 |
| menu-mode → menu-driver | menu-mode.ts import（菜单栈间导航） | 层内 |
| magic-script → event-system | magic-script.ts:29 三函数（毒治疗/全局命令表） | 法术脚本消费 interpreter 常量表 |

**打破环 A 的最短无行为变化切法（建议，非执行）**：`getCurrentMapNum` 是唯一"底层读顶层持有
模块态"的边。可把 `_currentMapNum` 降为 event-system 自持（loadScene 经现有 setter 注入），
或改为 game-state 字段——两条路都是纯搬家。其余边（菜单回调执行脚本、快捷键开菜单）是
**真实双向业务语义**（play.c 原结构即如此），强切会造出回调注入层，属实施卡权衡而非本包裁断。

## 3. bootstrap 注入边（runtime 边在 shell 层收口）

`shell/bootstrap.ts` 是组合根：`setStartBattleHandler`（:1197，含 shop openMenu/createBuyMenu
:1260-1262）、`fetchPalette` 注入等——event-system 注释 :867/:873/:900 明确"interpreter 是底层、
不持 items 表，handler 由 bootstrap 注入"。**注入模式已把大部分反向依赖收口到 shell**；
环 A 残余的 5 条 runtime 边如上节，type-only 边（battle-state）不构成运行时耦合。

## 4. 现有测试去重表（per-file test( 实测计数）

| 文件 | 测试数 | 代表覆盖 |
|---|---|---|
| core/event-system.test.ts | **331** | interpreter/opcode/对话/物品脚本 |
| core/scene-system.test.ts | **102** | 场景切换/输入/寻路 |
| core/battle/__tests__/battle-opcodes.test.ts | **158** | 战斗 opcode 全集 |
| core/menu/menu-driver.test.ts | **39** | 快捷菜单/商店驱动 |
| core/menu/magic-script.test.ts | **30** | 法术脚本 |
| core/equip-effect.test.ts | **36** | 装备效果 |
| core/menu/menu-mode.test.ts | **7** | 菜单栈 |

合计 703 条既有测试覆盖这 7 个文件——**环内重构的回归门已极厚**；本包不新增一阶段动态测试
（避免与 331 条 interpreter 测试重复取证），只交结构图与切环建议。

## 5. 证据条目

- **P5-001 covered** 上表 703 条（按文件计数，标题清单在各测试文件内可机械复算）。
- **P5-002 risk** 环 A 五条 runtime 边中，`event-system→scene-system`（getCurrentMapNum 模块态读取）
  是唯一纯数据边，切断无行为变化；其余四条为真实业务回调。列为"可先切断的边"候选，
  供实施卡核。**无缺陷主张**——环≠bug。
- **P5-003 N/A** battle-opcodes/equip-effect 不在环上；卡面"7 文件环"经实测修正为
  "6 文件两环 + 1 无环节点"，属结构事实澄清。
- **P5-004 risk** `_currentMapNum`（scene-system.ts:47）与 :873 注释所述 handler 注入模式并存，
  模块级可变态与注入态并存是两种所有权风格——记录，不判缺陷（一阶段现状）。

## 6. 未证风险

- 循环初始化顺序（模块加载期副作用）未运行验证——Node ESM 循环在函数级引用下通常安全，
  703 条测试全绿是间接证据；如需实证需一次全量 phase1 测试运行（不在本包白名单命令内，
  已按纪律未跑官方 check，可由接收方以常规测试命令复核）。

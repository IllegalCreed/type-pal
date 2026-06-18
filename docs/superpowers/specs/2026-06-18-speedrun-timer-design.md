# 速通计时器 设计方案（Speedrun Timer）

> 日期：2026-06-18 · 阶段：第一阶段运行时的工具层覆盖功能（非核心引擎、非 Phase 2 Reforge）
> 参考：[ihouou/PalTimer](https://github.com/ihouou/PalTimer)（仙剑98柔情外挂计时器）

## 1. 目标

在浏览器版仙剑（`@type-pal/game`）里内置一个**速通计时器**：

- 开启后屏幕**右侧**显示分段计时覆盖层，布局参照 PalTimer（每个 checkpoint 一行 + 底部主计时）。
- **全自动**在 21 个固定剧情节点打点（split），无需手动按键。
- 每个 checkpoint 对比**历史最佳（PB）**并显示差值（绿快/红慢/灰平）。
- 底部显示**预计通关**与**大号主计时**。
- 相关设置集中在**工具面板第 6 个 tab**：启用/显隐、重置、香蕉树中场休息开关、每点最佳时间编辑。

这是工具层功能（类比 `tools/minimap.ts`），**不改核心引擎逻辑**，纯读 `GameState`。

## 2. 总体架构

新模块目录：`packages/game/src/tools/speedrun/`

| 文件 | 职责 |
|---|---|
| `checkpoints.ts` | 21 个 checkpoint 静态定义表：`{ id, name, defaultBestMs, detector }`，顺序固定、严格按序推进。 |
| `detectors.ts` | 检测原语：`enterScene` / `leaveScene` / `atSpot` / `bossWon` / `hasItem` / `bgmIs`（见 §4.2），外加「过彩依」两段状态机。每个检测器是纯函数 `(cur, prev, mem) => boolean`。 |
| `snapshot.ts` | 每帧从 `gs` 抽轻量进度快照（见 §4.1）。检测器只读快照，不触碰引擎内部结构。 |
| `timer.ts` | 计时状态机 + 主时钟（wall-clock）+ 打点推进 + PB 比较。核心控制器。 |
| `store.ts` | localStorage 持久化（开关、PB 数组、香蕉树开关），key 前缀 `tp-speedrun-`。 |
| `overlay.ts` | 右侧覆盖层 DOM 渲染（`.tp-*` 风格）。 |
| `countdown.ts` | 恢复用 3 秒倒计时（顶部居中，复用/扩展 `tools/toast.ts`）。 |

**接入点（最小侵入）：**

- `shell/main-loop.ts`：在 rAF 回调中加一行 `tickSpeedrun(gs, dtMs)`（present 阶段，wall-clock Δt）。
- `tools/tools-panel.ts`：`TABS` 加 `['timer', '计时器']`（现为 5 个：战斗/场景/系统/对话/快捷键，定义于 line 43-50）；`renderActiveTab` 分派加分支（line 668-675）；新增 `renderTimerTab()`（仿 `renderSystemTab`，line 489-584）。
- 引擎其它代码（`event-system` / `scene-system` / `battle-system`）**零改动**——除非 §4.3 的战斗结算轮询被证明不可靠，才在 `battle-system.ts` 的 `finalizeBattleCleanup` 加一行回调。

## 3. 计时引擎语义

### 3.1 状态机

`idle → running → (paused ⇄ running) → finished`

- **arm/重置**：「重置」把状态清回 `idle`：主时钟归零、本局逐点 `current` 清空、香蕉树触发标记清空。从标题开新游戏自动 arm，保证每局干净。
- **起表**（`idle → running`）：已 arm 后，第一帧处于探索模式（`tickByMode` 的探索分支）且已载入有效场景（玩家可控、非标题/菜单/过场）。
- **打点**：每帧对「当前待触发节点」求值其 detector，命中即把主时钟快照写入该节点 `current`，并推进到下一节点（严格按序，不可乱序、不可回退）。
- **停表**（`→ finished`）：最后节点「通关」（拜月死亡）命中，主时钟停。此时若本局总时间破 PB 则自动覆盖基准（§5.2）。

### 3.2 主时钟：wall-clock

主时钟按 **rAF 帧 Δt 累加真实时间**（非逻辑 tick），避免 40ms/100ms tick 离散化抖动，符合 present 层 wall-clock 惯例。副作用：标签页隐藏时 rAF 暂停 → 时钟自然暂停（等价 PalTimer「游戏失焦自动暂停」，可接受）。

精度显示到**厘秒**（`HH:MM:SS.CC`）。

### 3.3 暂停与「3 秒倒计时恢复」

- 暂停（v1 唯一来源 = 香蕉树中场休息触发；机制做成通用的，后续可复用给手动暂停热键）→ `paused`，主时钟停，主计时显示前缀 `*`。
- **恢复必走 3 秒倒计时**：顶部居中 toast 单条逐秒刷新 `3 → 2 → 1 → 开始`，给选手准备时间。倒计时这 3 秒主时钟**仍保持暂停**，归零瞬间才切回 `running`。倒计时按真实时间计 3 秒，独立于主时钟。

## 4. Checkpoint 自动检测

### 4.1 进度快照（每帧从 `gs` 构建）

```ts
interface ProgressSnapshot {
  scene: number            // gs.wNumScene（== PalTimer area）
  partyX: number           // gs.party.x（绝对像素）
  partyY: number           // gs.party.y
  music: number            // gs.wNumMusic
  inventory: ReadonlySet<number>  // count>0 的物品 id 集合
  battle: BattleSnap | null       // 当前战斗（无则 null）
}
interface BattleSnap {
  enemyIds: ReadonlySet<number>   // 本场当前全部敌人 e.id（阵亡后仍留在 enemies 数组，故含已阵亡）
  totalEnemyHp: number            // Σ e.health（全场敌人血量和；≤0 ≈ 战斗已胜，镜像 PalTimer BattleTotalBlood）
}
```

检测器只依赖此快照 + 上一帧快照 + 各自的小状态（如两段状态机的 mem）。

### 4.2 检测原语

七种判定原语（输入 = 当前帧快照 `cur` + 上一帧 `prev` + 检测器私有 mem）：

| 原语 | 判定 |
|---|---|
| `enterScene(N)` | `prev.scene !== N && cur.scene === N` |
| `leaveScene(N)` | `prev.scene === N && cur.scene !== N` |
| `atSpot(N, x, y, tolX, tolY)` | `cur.scene === N && \|cur.partyX − x\| ≤ tolX && \|cur.partyY − y\| ≤ tolY` |
| `bossWon(enemyId)` | `cur.battle != null && cur.battle.enemyIds.has(enemyId) && cur.battle.totalEnemyHp ≤ 0` |
| `hasItem(itemId)` | `cur.inventory.has(itemId)` |
| `bgmIs(m)` | `cur.music === m` |
| 过彩依两段状态机 | 见 §4.3 |

设计取舍：PalTimer 对「进/出某地」也用场景内坐标点判定，但我们已确认坐标存在最多 ~256px 的版本性偏差（agent 实测见石碑 X 尤甚）。因此**「进/出场景」类节点改用更稳的 `enterScene/leaveScene`（纯场景号，零坐标校准）**，仅对「场景内某具体点」的节点保留 `atSpot`。代价：split 时刻与 PalTimer 差一个过门动画（<1s），对个人计时可忽略。假设：每个目标场景在正向流程里只进/出一次（顺序状态机 + 一次性，回头重进不影响）；若发现某场景更早被路过导致早触发，再加坐标/flag 守卫。

### 4.2.1 逐节点检测表（常量已对到我们的 extracted 数据）

`✓` = 数据层常量已坐实，可直接编码；`⊙` = 需一次运行时核对（坐标精确值 / 学功夫 BGM 号）。敌人/物品 ID 均已逐个按名字核对（见 §4.5 证据）。

| # | 节点 | 检测器 | 我们数据的具体信号 | 状态 |
|---|---|---|---|---|
| 1 | 见石碑 | `atSpot` | 场景 19 + 队首≈(1696,384)/(1680,376) | ⊙ 坐标 |
| 2 | 学功夫 | `bgmIs` | `wNumMusic === 86`（候补：学会御剑术 / 进场景 18） | ⊙ BGM |
| 3 | 上船 | `atSpot` | 场景 6 + 队首≈(1072,1080) | ⊙ 坐标 |
| 4 | 出林家堡 | `leaveScene` | 离开场景 40 | ✓ |
| 5 | 出隐龙窟 | `leaveScene` | 离开场景 49 | ✓ |
| 6 | 生化危机 | `atSpot` | 场景 62 + 队首≈(1152,1264) | ⊙ 坐标 |
| 7 | 过鬼将军 | `bossWon` | 敌 75（僵尸王，PalTimer 称骷髅将军） | ✓ |
| 8 | 过赤鬼王 | `bossWon` | 敌 76（赤鬼王） | ✓ |
| 9 | 进扬州 | `enterScene` | 进入场景 80 | ✓ |
| 10 | 出扬州 | `leaveScene` | 离开场景 106 | ✓ |
| 11 | 出麻烦洞 | `leaveScene` | 离开场景 107 | ✓ |
| 12 | 进京城 | `enterScene` | 进入场景 101 | ✓ |
| 13 | 过彩依 | 两段状态机 | 敌 71（蝶精彩依）出现 → 消失/血≤0 | ✓ |
| 14 | 进锁妖塔 | `enterScene` | 进入场景 164 ∨ 165 ∨ 147 | ✓ |
| 15 | 剑柱 | `atSpot` | 场景 146 + 队首≈(304,1048) | ⊙ 坐标 |
| 16 | 拆塔 | `bossWon` | 敌 144（火神龙） | ✓ |
| 17 | 过凤凰 | `bossWon` | 敌 67（凤凰） | ✓ |
| 18 | 进十年前 | `enterScene` | 进入场景 247 | ✓ |
| 19 | 水灵珠 | `hasItem` | 物品 265（0x109，水灵珠） | ✓ |
| 20 | 祈雨 | `atSpot` | 场景 228 + 队首≈(992,928)（PalTimer 精确，我们给容差） | ⊙ 坐标 |
| 21 | 通关 | `bossWon` | 敌 149（拜月教主）→ 停表 | ✓ |

`atSpot` 容差：以 PalTimer 的 `r`（X±16r、Y±8r）为起点，校准后按实测放宽（建议初值 X±48、Y±24，即 r≈3），祈雨这种精确点校准后收紧。

### 4.3 战斗信号实现（直接镜像 PalTimer 的活体血量轮询）

战斗字段已确认（`battle-state.ts`）：`gs.battleState.enemies: BattleEnemy[]`，每个 `e.id`（敌种 id）、`e.health`（当前 HP，阵亡后仍保留在数组、`health≤0`，由 `defeated` 标记）。PalTimer 的 boss 判定 = `BossID==X && BattleTotalBlood<=0`（BattleTotalBlood = 全场敌人血量和），我们逐字镜像，**不依赖 `phase`**：

- **`battle` 快照**：`snapshot.ts` 每帧读 `gs.battleState`，无战斗 → `battle=null`；有 → `enemyIds = {全部 e.id}`、`totalEnemyHp = Σ e.health`。
- **`bossWon(id)`** = `battle != null && enemyIds.has(id) && totalEnemyHp ≤ 0`（全场血清空那刻 ≈ 胜利，先于 won 结算演出，无"相位太短"风险）。
- **过彩依两段**（mem 跨帧，对应 PalTimer `Data["caiyi"]`）：第一段等 `battle?.enemyIds.has(71)` → `mem.seen=true`；第二段当 `mem.seen` 且（`battle == null` ∨ `!battle.enemyIds.has(71)` ∨ `battle.totalEnemyHp ≤ 0`）→ 触发。
- **关键假设**：阵亡敌人保留在 `state.enemies`（agent 已证 `defeated` 标记，非移除），故 boss 死后 `enemyIds` 仍含其 id。**兜底**：若实测发现阵亡即从数组移除，把 `enemyIds` 改为"本场战斗累计并集"（开战重置）以保住 boss id，胜利判定仍用 `totalEnemyHp ≤ 0`（移除式下空数组求和=0 亦成立）。

### 4.4 运行时校准清单（仅剩 7 项，其余已离线坐实）

只有坐标精确值与学功夫 BGM 号无法离线确定，需各跑一次核对（用 `window.__tpgs` 读 `gs.party.x/y`、`gs.wNumMusic`；可配合 dev-panel 坐标传送）：

1. 见石碑（场景 19）、2. 上船（场景 6）、3. 生化危机（场景 62）、4. 剑柱（场景 146）、5. 祈雨（场景 228）——到点读 `gs.party.{x,y}`，记我们的精确坐标 + 定容差。
6. 学功夫——进场景 18/19 区域读 `gs.wNumMusic` 是否 86；若否，改用「学会御剑术」或场景信号。
7.（可选）锁妖塔三入口 164/165/147 实跑确认哪几个真正会被进入。

每个 `atSpot`/两段检测器写**帧级离线测试**（注入假快照序列）独立验证；坐标常量集中在 `checkpoints.ts` 一处，校准即改一个值。

### 4.5 常量证据（已核对的数据来源）

- 敌人 ID（`data/extracted/data/enemy-objects.json`）：僵尸王 75 / 赤鬼王 76 / 蝶精彩依 71 / 火神龙 144 / 凤凰 67 / 拜月教主 149 —— 全部 == PalTimer。
- 物品 ID（`data/extracted/data/items.json`）：水灵珠 265(0x109) / 香蕉 291(0x123) —— 全部 == PalTimer。
- 场景号：`area == gs.wNumScene == extracted sceneId + 1`，写入点 `scene-system.ts:603-606`；上表所有场景号在 295 个场景内合法。
- 坐标系：`gs.party.{x,y}` 绝对像素（`game-state.ts:636`），X 16px/格、Y 8px/格，与 sdlpal `scene.c:807` 一致。

### 4.6 默认参考线（首次播种值，来自 PalTimer `bestPAL98.txt` 默认）

`见石碑 0:06:05｜学功夫 0:11:13｜上船 0:18:37｜出林家堡 0:24:53｜出隐龙窟 0:30:46｜生化危机 0:37:56｜过鬼将军 0:43:25｜过赤鬼王 0:47:45｜进扬州 0:54:00｜出扬州 1:01:53｜出麻烦洞 1:07:26｜进京城 1:09:32｜过彩依 1:19:47｜进锁妖塔 1:25:33｜剑柱 1:37:27｜拆塔 1:44:22｜过凤凰 1:54:11｜进十年前 2:03:17｜水灵珠 2:14:01｜祈雨 2:27:08｜通关 2:37:32`

仅作初始对照基准（用户可在设置里逐点改 / 一键设为最佳 / 清空）。

## 5. 数据模型与持久化

### 5.1 PB 基准（整跑级，PalTimer「设为最佳」语义）

```ts
interface SpeedrunBests {
  // 一条完整参考跑的逐点累计时间（ms）；null = 该点尚无基准
  perCheckpoint: Record<string /*checkpointId*/, number | null>
}
```

- 基准是**整条参考跑**（不是每点独立 gold）。首次初始化（无 localStorage 记录）用 PalTimer 默认参考线（§4.6）播种，可在设置里逐点编辑。
- **差值** = `current[i] − best[i]`，实时计算、不落库。配色：负=绿、正>1s=红、约等于=灰。
- **预计通关** = `best[通关] + 最近已完成节点的差值`。

### 5.2 基准更新规则

1. **自动**：一局跑到「通关」且**本局总时间 < `best[通关]`**（或基准为空）→ 用本局逐点 `current` **整条覆盖** `perCheckpoint`。半途快但未通关的跑不更新。
2. **手动**：设置里「用本次成绩设为最佳」→ 整条覆盖（即使未破纪录，允许手动锚定）。
3. **手动编辑/清空**：逐点编辑某点基准时间；「清空最佳」= 全部置 null（彻底清空，差值列随之留空）。默认参考线仅在首次初始化、无 localStorage 记录时播种。

### 5.3 localStorage keys

| key | 值 |
|---|---|
| `tp-speedrun-enabled` | `'1'/'0'` 计时器总开关 |
| `tp-speedrun-show` | `'1'/'0'` 右侧覆盖层显隐 |
| `tp-speedrun-banana` | `'1'/'0'` 香蕉树中场休息开关 |
| `tp-speedrun-bests` | JSON：`perCheckpoint` |

全部**全局、跨存档**（速通基准本就该跨局，与具体存档无关）。

## 6. UI：右侧覆盖层

- 固定屏幕右侧，`.tp-*` 暗底金边，`pointer-events:none` 不挡游戏/面板。受 `tp-speedrun-show` 控制显隐。
- 每行 4 列：**节点名 | 最佳 | 差值(±色) | 本次**。当前待触发节点高亮；未到达的点本次列留空。
- 底部依次：**预计通关 `HH:MM:SS`**、**大号主计时 `HH:MM:SS.CC`**（暂停时前缀 `*`）。
- 渲染节流：DOM 文本每帧更新轻量（21 行 + 底部），只改 `textContent`/class，不重建结构。

## 7. UI：工具面板第 6 tab「计时器」

仿 `renderSystemTab` 风格（`sectionTitle` + 开关行 + `button` + 输入行）：

- **启用计时器**（总开关）
- **显示覆盖层**（显隐开关）
- **重置**按钮（清零本局）
- **剩骨架香蕉树中场休息**开关（说明：到圣姑家香蕉树自动停表、拿香蕉后 3 秒倒计时恢复）
- **最佳成绩**区：21 行可编辑 `HH:MM:SS` 输入（逐点基准）+「用本次成绩设为最佳」「清空最佳」按钮

## 8. 香蕉树中场休息

开启 `tp-speedrun-banana` 后（对应 PalTimer `CheckCheatBegin/End`）：

1. **暂停触发**：李逍遥首次站到圣姑家香蕉树旁 3 格之一 —— **场景 177（圣姑家，已坐实合法）** + 队首 ∈ {(1088,608),(1120,608),(1120,592)}（PalTimer 精确格；我们坐标有版本偏差，⊙ 运行时校准这 3 格 + 给小容差）→ `paused`，主计时前缀 `*`。
2. **恢复触发**：拿到香蕉 —— `hasItem(291)`（0x123，香蕉，✓ 已坐实）→ 解除暂停标记，触发 §3.3 的 **3 秒倒计时恢复**。
3. 本局只触发一次（`hasUnCheated` 标记）；「重置」才清空该标记。注意 PalTimer 行为：重置后若身上已有香蕉，下一帧 `hasItem(291)` 仍真 → 视为已做过反作弊（不再触发暂停），我们沿用。
4. 开关关闭时完全不介入计时。

## 9. 测试策略

- `detectors.test.ts`：各检测原语（`enterScene/leaveScene/atSpot/bossWon/hasItem/bgmIs`）+ 过彩依两段状态机的单测（注入假快照序列）。
- `timer.test.ts`：起/停/暂停/恢复倒计时、打点按序推进、PB 自动/手动更新、预计通关算法（帧级驱动注入快照）。
- `store.test.ts`：localStorage 读写与默认值播种。
- `countdown.test.ts`：3 秒倒计时文本序列与完成回调（仿 `toast.test.ts`）。
- `overlay.test.ts` + 扩 `tools-panel.test.ts`：覆盖层 DOM 结构、第 6 tab 渲染与控件联动。
- 门禁：`pnpm check`。

## 10. 范围与取舍

- **不做（v2）**：资源计数器（图最下面 `蜂/蜜/火/血/夜/剑/土/甲` 收集计数）——需战斗中检测特定道具收集，工作量独立，先把计时主体跑通。
- **不做**：PalTimer 的读内存、云存档/接力、OBS 插件、改键器、签名插件包——内置版用不到。
- **不做**：手动 split / 自定义时间线内核。
- **保留扩展位**：detector 抽象、PB 模型、暂停机制均便于后续加资源计数器或手动暂停热键。

## 11. 风险（多数已离线坐实，残余风险见下）

- **已消除**：场景号（area==wNumScene）、敌人 ID、物品 ID 均已逐个对齐我们的 extracted 数据（§4.5），不再是风险。
- **残余①·坐标精确值**：5 个 `atSpot` 节点 + 香蕉树 3 格，坐标有 ~256px 版本偏差，需各跑一次读 `gs.party.{x,y}` 校准（§4.4）。常量集中一处、容差可调，影响可控。
- **残余②·学功夫 BGM**：`wNumMusic===86` 需运行时确认；不成则切「学会御剑术 / 场景信号」候补。
- **残余③·战斗 won 相位轮询**可能过紧 → §4.3 兜底回调方案（`finalizeBattleCleanup` 加一行）。
- **残余④·进/出场景早触发**：若某目标场景在正向流程被更早路过，`enterScene/leaveScene` 可能早打点 → 加坐标/flag 守卫（§4.2 假设已注明）。

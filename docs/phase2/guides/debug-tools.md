# reforge 调试工具（D13-1 首刀）

Status: current
Owner: q_remaining_guides（五篇文档候选编写）；Codex（治理与独立接收）
Last reviewed: 2026-10-16
Template: guide-runbook-v1 / 1.0.0

## 目的

为 DEV 排错提供状态观察、命令、脚本触发、战斗预设和帧步进的使用顺序。D13-1/G1/G4/K2–K5 是原落地与验证记录；[D13-1 任务卡](../../ops/archive/tasks/done/D13-1-debug-tools-first-batch.md)的构建、手测和单测结论保留其历史范围，本轮没有重做 dist 或 UI 验证。

## 前置条件

- 使用 DEV 构建且 URL 含 `?debug`；编辑器试玩按钮不会自动加参数。现有 `?scene/?pos/?facing/?entry/?party/?battle/?battle-scene/?give/?field/?collision/?e2e-load` 参数继续使用，这是现行入口组合，不恢复旧内容版本兼容。
- 旧 `?skill=` 启动已被拒绝，授技使用下方 `skill` 命令或编辑器战斗模拟器。命令调用本身改内存，不等于隔离正常存档；调试世界被后续普通保存捕获的风险不能用“不落档”一词抹去。
- 先识别实际工程、场景和主 runner 占用情况。需要保留正常游戏进度时，不在调试改过的世界上随意继续普通保存；本页不提供自动隔离保证。

## 步骤

### 打开方式

```text
reforge dev 页:     http://localhost:6051/?debug
编辑器「引擎试玩」:   打开同源 play.html?project=…（及 workspace/scene）；按钮不自动加 debug。
手工示例:           play.html?project=pal&debug
```

DEV 安装门仍要求查询参数 `debug`，其他同源参数原样生效。面板在左上、宽度上限420px，视口小于480px时收窄；状态、指令、触发、战斗、图层五个 tab 各有用途。Esc 隐藏并退出帧步进，不触游戏菜单；隐藏后按反引号重开，不需要刷新。字段输入期间屏蔽游戏快捷键，其他按键透传，不能吞掉对话推进。

### 状态页

先刷新状态确认观察对象：位置控制权按队长、队伍跟随、编外跟随精灵、当前场景实体排序，显示位置、朝向和 `world/script/follow/mount`。载具有 parent/偏移，队长显示 `partyMove`，实体显示 authority epoch、注册的 script/auto motion 和有效 lifecycle gate。

世界变量检视只读，显示队伍、金钱、背包、技能、灵葫值、flag/var 和实体状态统计。“刷新状态”同步两区。motion slot 是已注册或待执行信息，不等于实际控制权；script 接管期间，暂停的 auto slot 仍可存在。

### cheat console 命令（G4 覆盖矩阵）

下表完整保留原13行和验证路径；“手动”“K5 单测”等是原验证记录标签，不代表本轮执行。

| 命令 | 参数 | 复用路径 | DEV-only | 验证路径 |
|---|---|---|---|---|
| `help` | — | 面板内建 | 面板 DEV-only | 手动 |
| `scene` | `<sceneId> [col,row] [facing]` | runCommands(`loadScene`)，detached runner | 同左 | 手动（跳场景+进场） |
| `pos` | `<col,row> [facing]` | runCommands(`teleportParty`) | 同左 | 手动 |
| `give` | `<itemId> [count]` | runCommands(`giveItem`)（含意图守卫） | 同左 | 手动 + 背包检视 |
| `money` | `<n>` | runCommands(`giveMoney` delta) | 同左 | 手动 |
| `party` | `<actorId,…>` | 内存态覆写 world.party + 满血满蓝（?party 语义） | 同左 | 手动 + 检视 |
| `skill` | `<actorId> <skillId>` | 内存态授技 + MP 拉满 | 同左 | 手动 |
| `battle` | `<team>` | `runtime.host.startBattle`（?battle 路径） | 同左 | 手动 |
| `run-script` | `<scriptId>` | detached `runSharedScript` | 同左 | 手动（含占用确认） |
| `run-trigger` | `<entityId>` | detached `runEntityBehavior(trigger)` | 同左 | 手动 |
| `step` | — | frameStep.requestStep（一个 gameplay tick=100ms） | 同左 | 手动 + K5 单测 |
| `collision` / `triggers` | — | debugLayers 开关（?collision 叠加层扩展） | 同左 | 手动 |
| `state` | — | 刷新检视器 | 同左 | 手动 |

`state`/`var` 检视器只读；变更走 detached（含意图守卫）或 DEV 内存 mutation。直接命令没有调用写槽，不代表后来正常保存会剔除这些变更：本轮窄读 `skill/party` caller 修改当前 world，而普通保存从当前 world 克隆快照并交存储入口，不能据此承诺调试状态与正常存档隔离。

### 脚本 / 触发器触发（K3）

从 shared scripts、当前场景实体 trigger/auto、场景 hooks(onEnter/onTeleport) 选择目标。触发通过 `runDetachedScriptChain` 执行；主 runner 占用时并发，并显示“主 runner 占用中”。场景切换类脚本占用时先确认；detached 不排 onEnter。观察 running/done/error/cancel；再次点运行中的项用 Abort 取消，不把取消当成功完成。

### 战斗态构建器（K2）

先选 battleFields、现成 team 或从 enemiesById 多选敌人，再从 actors 多选队员，为成员设等级、HP/MP、装备(`slot=item,…`)、异常状态(`protect,…`)、中毒(`poisonId,…`)及道具(`itemId×count,…`)。

开战仍走 `startBattle`，参数为 DEV 的 `enemyOverride` / `partyPreset`。原 K2 合同是在战前 deep-clone world，战后或取消由 `withWorldPreset` 恢复；原单测记录为深等，金钱/物品/技能/状态不变。这个预设恢复合同不能外推给所有 console 命令，本轮也未重跑战斗或恢复验证。

### 帧步进（K5）

一步是固定100ms的 gameplay tick，不是墙钟 dt。原 `GameplayClock.advance(realNow, frozen, stepMs)` 记录冻结期 real 不积压、step 精确一拍。v1 只控制大世界 gameplay 相位中的移动、实体和 auto 脚本计时；战斗、fade/entity actions 演出和对话推进不单步，任何战斗启动会退出步进。

## 失败处理

缺 DEV 或 `debug` 参数先修入口，不从按钮、类型定义或旧截图推断面板已安装。主 runner busy 时按上面的并发/确认规则处理；触发失败、取消和未返回要分别记真实状态，不能重复点火冒充成功。表单键盘、Esc 或游戏快捷键出现冲突时保具体复现，不在文档包顺手改产品。

### DEV guard（K4/G1）

窄读现 main 的 `if (import.meta.env.DEV && params.has('debug')) await import('./debug-tools.js')` 动态入口，静态主链不直接引用模块。原 G1 记载：运行 `pnpm --filter @type-pal/reforge build` 后，`rg 'tp-debug|installDebugTools' dist/assets/*.js` 零命中，因 Vite 将 DEV 置 false 并 tree-shake，不产出 debug chunk。该段是旧构建验证，本轮未构建、未读最新 dist，不能写成本轮生产产物通过。

“不落档”只描述直接命令边界；`skill` 不隔离正常存档，原文也已明确。未知保存过滤、UI观感或当前打包结果应记待核，不能从旧 G1/手测/单测继承今天的执行信用。

## 完成定义

一次排错完成须给出 DEV URL/工程、命令或触发器、输入与占用状态、实际结果、恢复/取消及后续保存安排；若验生产剔除还要独立构建与产物证据。保留13条命令表和原验证标签不等于重新验证13个操作。

本次只做指南迁移与必要窄源码核读，没有运行命令、启动页面、构建 dist、产品/旧测试、runtime、E2E、视觉或 coverage。Owner/date 是本轮治理而非原作者/旧 G1 日期；候选由非作者逐篇验收，中央接账与最终零门另由 Codex 完成。

### 本次来源与完整原文

完整原文来自固定 Git `5641aa8ac19bc9b46e33f8ce7f98c217a6eaf067`，与设计源 d564、aa5 同 blob；原 blob `86a81b9668fab42e747011fb8fcc0328b63b8ce9`，SHA256 `d388aa8189c4d19424a63e5d717a0bc290ce1d2558ad152ce25f383a3e30dd96`。下方四反引号 text 只存不可交互来源，全部81行及末 LF 须严格逆回读；原命令与历史验证不在本轮执行。必要窄 primary 的真实范围另随完整43字段记录交付，整文件 hash 只识别来源，不代表整个产品模块审计。

````text
# reforge 调试工具（D13-1 首刀）

> 议题 13 backlog 的首刀落地。入口：`?debug`（仅 DEV 构建；生产构建不含本模块，见
> [D13-1 任务卡](../../ops/archive/tasks/done/D13-1-debug-tools-first-batch.md) 的 G1 构建产物验证）。
>
> 现有 URL 参数（`?scene/?pos/?facing/?entry/?party/?battle/?battle-scene/?give/
> ?field/?collision/?e2e-load`）保持兼容，本面板是其 overlay 形态。旧 `?skill=` 启动已被拒绝；
> 授技改走下方面板 `skill` 命令或编辑器战斗模拟器，该命令不会隔离正常存档。

## 打开方式

```text
reforge dev 页:     http://localhost:6051/?debug
编辑器「引擎试玩」:   打开同源 play.html?project=…（及 workspace/scene）；按钮不自动加 debug。
手工示例:           play.html?project=pal&debug
```
DEV 安装门仍要求查询参数 `debug`。试玩页加上该参数后，其余同源参数原样生效；不要把按钮当成已经打开面板。

面板位于左上，宽度上限 420px，并在 480px 以下收窄到视口宽度。五个 tab：① 状态 ② 指令
③ 触发 ④ 战斗 ⑤ 图层。Esc 隐藏面板并退出帧步进，不触游戏菜单；隐藏后按反引号重新显示，
无需刷新页面。表单字段键入时屏蔽游戏快捷键；面板打开时其余按键透传（不吞对话推进键）。

## 状态页

- **实体位置控制权（运行态，只读）**：按队长、队伍跟随成员、编外跟随精灵、当前场景实体的顺序，
  显示位置、朝向和 `world/script/follow/mount` 控制权。载具显示 parent 与偏移；队长显示
  `partyMove`；实体显示 authority epoch、已注册的 script/auto motion 和有效 lifecycle gate。
- **世界变量检视（只读）**：显示队伍、金钱、背包、技能、灵葫值、flag/var 与实体状态统计。
- “刷新状态”同时刷新以上两区。motion slot 是已注册/待执行信息，不等同于当前控制权；例如实体被
  script 接管时，暂停中的 auto slot 仍会保留并如实显示。

## cheat console 命令（G4 覆盖矩阵）

| 命令 | 参数 | 复用路径 | DEV-only | 验证路径 |
|---|---|---|---|---|
| `help` | — | 面板内建 | 面板 DEV-only | 手动 |
| `scene` | `<sceneId> [col,row] [facing]` | runCommands(`loadScene`)，detached runner | 同左 | 手动（跳场景+进场） |
| `pos` | `<col,row> [facing]` | runCommands(`teleportParty`) | 同左 | 手动 |
| `give` | `<itemId> [count]` | runCommands(`giveItem`)（含意图守卫） | 同左 | 手动 + 背包检视 |
| `money` | `<n>` | runCommands(`giveMoney` delta) | 同左 | 手动 |
| `party` | `<actorId,…>` | 内存态覆写 world.party + 满血满蓝（?party 语义） | 同左 | 手动 + 检视 |
| `skill` | `<actorId> <skillId>` | 内存态授技 + MP 拉满 | 同左 | 手动 |
| `battle` | `<team>` | `runtime.host.startBattle`（?battle 路径） | 同左 | 手动 |
| `run-script` | `<scriptId>` | detached `runSharedScript` | 同左 | 手动（含占用确认） |
| `run-trigger` | `<entityId>` | detached `runEntityBehavior(trigger)` | 同左 | 手动 |
| `step` | — | frameStep.requestStep（一个 gameplay tick=100ms） | 同左 | 手动 + K5 单测 |
| `collision` / `triggers` | — | debugLayers 开关（?collision 叠加层扩展） | 同左 | 手动 |
| `state` | — | 刷新检视器 | 同左 | 手动 |

`state`/`var` 检视器只读；全部世界变更走 detached（含意图守卫）或 dev 内存 mutation，不落档。

## 脚本 / 触发器触发（K3）

- 列表 = shared scripts + 当前场景实体 trigger/auto + 场景 hooks(onEnter/onTeleport)。
- 点击触发走 **detached**（`runDetachedScriptChain`），主 runner 占用时并发执行并显示
  「主 runner 占用中」徽标；**场景切换类脚本占用时先弹确认**（detached 不排 onEnter）。
- 触发状态（running/done/error/cancel）上屏；再次点击运行中的项 = Abort 取消。

## 战斗态构建器（K2）

- 战场任选（battleFields）；敌队 = 现成 team 或从 enemiesById 自由多选；我方 = actors 多选，
  逐成员设 等级/HP/MP/装备(`slot=item,…`)/异常状态(`protect,…`)/中毒(`poisonId,…`)；
  道具预设 `itemId×count,…`。
- 开战走同一 `startBattle` 入口，参数为 dev-only `enemyOverride` / `partyPreset`；
  partyPreset 战前 deep-clone world、战后/取消恢复（`withWorldPreset`，K2 单测证深等）。
- 全部内存态：战后世界恢复战前（金钱/物品/技能/状态零变化）。

## 帧步进（K5）

- 单位 = 一个 gameplay tick（固定 100ms），非墙钟 dt；`GameplayClock.advance(realNow,
  frozen, stepMs)` 新增 stepMs 参数（单测：冻结期 real 不积压 + step 精确一拍）。
- 作用域 v1 = 大世界 gameplay 相位（移动/实体/auto 脚本计时器）；战斗/演出(fade/entity
  actions)/对话推进不单步；任意战斗启动自动退出步进模式。

## DEV guard（K4/G1）

- 面板经 `if (import.meta.env.DEV && params.has('debug')) await import('./debug-tools.js')`
  动态引入；主包静态链不触及 debug 模块。
- 构建产物验证：`pnpm --filter @type-pal/reforge build` 后 `rg 'tp-debug|installDebugTools'
  dist/assets/*.js` 零命中（vite 把 `import.meta.env.DEV` 替换 false + tree-shake 死分支，
  不产出 debug chunk）。
````

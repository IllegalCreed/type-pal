# reforge 调试工具（D13-1 首刀）

> 议题 13 backlog 的首刀落地。入口：`?debug`（仅 DEV 构建；生产构建不含本模块，见
> [D13-1 任务卡](../ops/tasks/D13-1-debug-tools-first-batch.md) 的 G1 构建产物验证）。
>
> 现有 URL 参数（`?scene/?pos/?facing/?entry/?party/?battle/?battle-scene/?skill/?give/
> ?field/?collision/?e2e-load`）全部保持兼容，本面板是其 overlay 形态。

## 打开方式

```text
reforge dev 页:     http://localhost:6051/?debug
编辑器「引擎试玩」:   play.html?project=pal&debug （同源试玩页参数原样生效）
```

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
| `skill` | `<actorId> <skillId>` | 内存态授技 + MP 拉满（?skill 语义） | 同左 | 手动 |
| `battle` | `<team>` | `runtime.host.startBattle`（?battle 路径） | 同左 | 手动 |
| `run-script` | `<scriptId>` | detached `runSharedScript` | 同左 | 手动（含占用确认） |
| `run-trigger` | `<entityId>` | detached `runEntityBehavior(trigger)` | 同左 | 手动 |
| `step` | — | frameStep.requestStep（一个 gameplay tick=100ms） | 同左 | 手动 + K5 单测 |
| `collision` / `triggers` | — | debugLayers 开关（?collision 叠加层扩展） | 同左 | 手动 |
| `state` | — | 刷新检视器 | 同左 | 手动 |

`state`/`var` 检视器只读；全部世界变更走 detached（含意图守卫）或 dev 内存 mutation，不落档。

## 脚本 / 触发器触发（K3）

- 列表 = shared scripts + 当前场景实体 trigger/auto + 场景 hooks(onEnter/onTeleport)。
- 点击触发走 **detached**（`runDetachedV5ScriptChain`），主 runner 占用时并发执行并显示
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

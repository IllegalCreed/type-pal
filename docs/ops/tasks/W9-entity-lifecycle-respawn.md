# W9 - 实体生命周期、重现与明雷逃跑冷却

Status: blocked
Phase: phase2
Capability: W9 / B8 / B9 / X1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none（2026-08-10，Kimi/GLM 均可用）
Branch: main

## 目标

以可校验、可保存的实体生命周期表替代当前 `respawnSeconds + host.wait()` 和
`vanishEntity` 的临时实现。W9 必须同时承接两类一阶段真值：0x4B 的短暂自动行为暂停、
0x52 的倒计时隐藏并在离屏后重现；明雷战斗四种脚本接续必须与实体生命周期解耦且可审计。

本卡在 B10-1 发布完成后重新锁定。旧卡 2026-08-07 的 `agree/build allowed` 只作为历史记录，
被本次 post-B10 设计复核 supersede；在本卡三方重新签 `agree` 前不得修改实现文件或标记 build。

## 范围与硬边界

范围内：

- content13 的生命周期命令、hostile 胜利/玩家逃跑策略和严格校验；
- WorldState 顶层持久生命周期表、SAVE8/content10|11|12|13 归一与旧档边界；
- Reforge reducer、统一派生 gate、有效世界 tick、BattleResult 公共接口；
- PAL 上游翻译、逐 execution-site source ledger、B10→W9 append-only 发布与全量重生成；
- editor v12→v13 overlay/manifest-last 升级和生命周期/明雷策略 CRUD；
- W9 对 B8/B9/X1 capability-map 的口径与完整测试矩阵。

范围外：

- 18a/B10 混乱攻击、伤害公式、战斗动画和剧情演出内容本身；
- 将原版全局事件对象数组、下标身份、`sVanishTime`/负数哨兵带入 public schema；
- 通过修改 `projects/pal` 生成产物掩盖 extractor/translator/builder 缺陷。

硬边界：

- 不使用墙钟、后台 timer、Promise 或 detached `host.wait()` 推进生命周期；
- 0x4B 和 0x52 绝不再合并为含糊的 `vanishEntity`；
- 剧情/演出视觉验证登记到冻结后的集中 E2E，开发期不逐卡启动浏览器；编辑器/debug 等功能性 UI
  只做完成判断所需的最小视觉证据；
- 所有发布历史 append-only：已发布 B10/v12 authority 不得被 W9 或 source drift 改写。

## 上下文锚点（实现前必读）

- `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`；
- `docs/phase1/game-mechanics.md:1000-1111`：10fps、0x4B/0x52、状态正负语义和固定 320×320 离屏门；
- `docs/phase2/foundation/phase1-knowledge-harvest.md`；
- `packages/game/src/core/scene-system.ts:190-225`、`scene-system-search.ts:69-98`、
  `event-system.ts:1186-1189,3930-3947`：一阶段倒计时、手动确认和自动触碰 gate；
- `packages/content/src/character.ts:105-108`：当前已发布 `CONTENT_VERSION=12`、`minimumSaveVersion=8`；
- `packages/content/src/index.ts:67-104`：当前 `EntityDef.hidden`/`hostile.respawnSeconds`；
- `packages/content/src/script-v5.ts:18-25,74-85,145-205`：`EntityAddress` 对象、WorldScriptState 和
  当前 v5 command boundary；
- `packages/reforge/src/main.ts:1315-1327,2084-2092,3405-3417`：持久 `entityState` 与现行
  `vanishEntity`/hostile detached wait 的真实分离；
- `packages/reforge/src/save/types.ts:85-128`、`save/migration.ts:807-850`：SAVE8 historical/current
  resolver；
- `packages/migrate/src/translate-events.ts:1740-1760`、`migrate-content.ts:2433-2550`：当前错误的
  opcode 合并和标准明雷折叠入口；
- `packages/migrate/src/experimental/script-v5/source-execution-census.ts:23`、
  `pal-test-oracle.ts`、`append-only-transition-state.ts`：源账本和发布四元组 precedent；
- `packages/editor/src/core/open-local.ts:151`、`upgrade-local-v5-v6-epoch-v7.ts`：现有升级链和
  overlay/manifest-last 原子边界；
- 已发布 B10-1 parent：`docs/ops/tasks/B10-1-enemy-confused-attack.md`、commit
  `e714e073600a2cd87860fd6e20ea8db4f3f80109`。W9 不得 rewind 或改写该 parent。

## 冻结设计（post-B10，2026-08-10）

### 1. 版本与 append-only transition

- W9 是独立 `content12 → content13` successor；`CONTENT_VERSION=13`，
  `minimumSaveVersion=8`，`SAVE_VERSION` 不变。
- 新 transition id 固定为 `w9-entity-lifecycle-v1`。seal 使用 metadata/file/managed/hash 四元组，
  至少绑定：B10/v12 published metadata、B10 seal 与 successor surface、正式 source ledger digest、
  affected-file allowlist、parent/successor/full publish-surface digest、`12→13`/`8→8` 版本对和 seal
  自摘要。
- 历史剥离顺序固定：`W9 → B10 → R13-6C/R13-Z → R13-6B → older`。content11 initialize、content12
  W9 initialize、content13 current replay 是三个不同入口，不能把 current13 落入 generic merge。
- content13 current replay 必须先完整验签 published/rebuilt W9 authority 和 successor surface，再强制
  migration plan `writes=0/deletes=0/conflicts=0`；任何 source drift、null 槽移动或非零计划都 fail-closed。
  content12 initialize 可写但只允许 W9 白名单；B10/v12 四元组永远只读。
- manifest、oracle、canary、baseline 和 R13 shadow fixture 均由生产器重录，禁止手改 golden；W9
  发布后必须有 current13 dry replay 和重复运行 0/0/0 证据。

### 2. 生命周期 schema（顶层、嵌套、判别联合）

生命周期属于 engine world state，不属于 `WorldScriptState`/script authority：

```ts
type EntityLifecycleEntry =
  | { phase: 'suspended'; remainingTicks: number }
  | { phase: 'despawned'; remainingTicks: number }
  | { phase: 'awaitingExit' }
  | { phase: 'removed' }

type EntityLifecycleTable = Record<string, Record<string, EntityLifecycleEntry>>
// WorldStateV13: entityLifecycles?: EntityLifecycleTable
```
- 外层键为 `sceneId`，内层键为 `entityId`；不使用 `Record<EntityAddress, ...>`（对象键既非法也
  不能形成稳定 JSON）。缺少 map 或缺少条目严格等价 `normal`。
- `suspended/despawned.remainingTicks` 必须为正安全整数；`awaitingExit/removed` 不得携带该字段。
  validator 使用 exact keys，拒绝空 id、未知 phase、非整数/负数/溢出 tick、未知 scene/entity 和
  非对象嵌套形状。
- `EntityDef` 的静态 `hidden/collide` 与显式 `world.script.entityState` 仍各自保留；生命周期永不
  改写 EntityDef 或猜测/覆盖 entityState。content10/11/12 旧档缺 lifecycle 一律 `{}`/normal，
  不把 `entityState <= 0` 推断为 `despawned`/`removed`。旧 `vanishEntity` 的 detached 剩余时间不可伪造，
  这是一项记录在迁移说明中的一次性兼容边界。

### 3. 公共命令与派生 gate

public script 不再导出 0x52 的前态 toggle 或 `vanishEntity`。只提供语义明确的叶命令：

- `suspendEntity(target, ticks)`：可见/保留静态碰撞，暂停自动触碰、autoScript、hostile；允许
  triggerMode 1–3 手动确认；ticks 结束转 normal；
- `hideEntity(target, ticks)`：隐藏、退出碰撞/所有触发；ticks 结束进入 `awaitingExit`；离屏后转 normal；
- `restoreEntity(target)`：清除 lifecycle 条目并复位动作帧（不改 entityState）；
- `removeEntity(target)`：写入显式 `removed`，跨场景/读档永久有效。

同一 reducer 必须输出并由所有消费者共享：`visible`、`collidable`、`manualInteractable`、
`touchTriggerable`、`autoAllowed`、`hostileAllowed`。派生顺序为静态 def → entityState → lifecycle；
暂停态只关闭自动类 gate，隐藏/等待/移除态全部关闭。启动中的 auto/hostile 在下一提交点必须立即
cancel/gate，禁止各消费者维护第二份布尔副本。

生命周期 tick 使用独立 `eligibleLifecycleWorldTick` 门：只在所属 scene 为当前 scene、100ms 世界步、
无 active battle/menu、无 blocking presentation/dialog/confirm/script 时递减；离场冻结，回场按持久
剩余 tick 续算。不得复用当前会被对话推进的 `worldTicksThisFrame`，不得用墙钟或异步回调。

`awaitingExit` 的离屏判定使用实体 foot-anchor 的屏幕投影（不是 sprite 外框），相对相机固定
`320×320` 矩形，端点包含：相对坐标 `0`、`320` 仍隐藏，`-1`、`321` 才重现；重现只将动作帧复位为 0，
  不重置位置、朝向或碰撞类别。

### 4. BattleResult 与 hostile 策略

冻结唯一公共总终态：

```ts
type BattleResult = 'victory' | 'defeat' | 'playerFled' | 'enemyFled' | 'terminated'
```

`session.done` 是唯一事实；删除并行 public `enemyFled()` 布尔及所有 `??0`/HP-diff 猜测。映射与
战果口径：

| BattleResult | 脚本接续 | 奖励 | hostile lifecycle |
|---|---|---|---|
| victory | success fallthrough / `onDefeated` | 正常奖励 | `onVictory` |
| defeat | `onLose` / game over | 无 | 不应用 |
| playerFled | `onFlee` | 无胜利奖励 | `onPlayerFlee`（PAL 默认 15 tick suspend） |
| enemyFled | success fallthrough | 无奖励 | 不应用 |
| terminated | success fallthrough | 无奖励 | 不应用 |

`HostileBehavior` 不再使用含糊的 `success` 或 `respawnSeconds`：

```ts
onVictory: { kind: 'hide'; ticks: PositiveSafeInt }
         | { kind: 'remove' }
         | { kind: 'remain' }
onPlayerFlee: { kind: 'suspend'; ticks: PositiveSafeInt }
             | { kind: 'remain' }
```

PAL 标准明雷由源 provenance 明确填充 `onVictory` 与 `onPlayerFlee`；通用 authored v12 升级不臆造
PAL 专属 15 tick，旧缺字段的公开“永杀”意图确定性映射为 `onVictory:{kind:'remove'}`，逃跑映射
`remain`。`respawnSeconds` 仅在秒数为正且可精确换算为 100ms 安全整数 tick 时映射 `hide`，否则
路径化 fail-loud。

### 5. PAL 源账本与 opcode 规则

迁移必须先修 `translate-events.ts`/builder，再全量生成；不手改 `projects/pal`。真值不可串线：

- `0x4B@41073`：固定 `sVanishTime=-15`，无 operand 映射；生成 `suspendEntity(15)`。
- `0x52@41127/41176/41180`：`sVanishTime = op0 || 800`，按 SHORT 边界验证；生成 `hideEntity(N)`
  或在已证明负前态时生成显式 suspend/restore 语义，绝不生成 public toggle。
- 逐 site ledger 必须记录 `sourceAddress/opcode/operands/sourceCommandSha256/contextId/entrySite/
  channel/owner/self/target/disposition`，并绑定上游输入 digest、生成命令 digest 和 allowlist。
- GLM 已复算的守恒必须在正式 ledger 中逐 context 闭合：

```text
828 folded hostile（每个同时消费 0x4B+0x52）
+ 93 residual paired（同时保留两命令）
+ 7 residual 4B-only
= 928 execution contexts

源 sites = 828×2 + 93×2 + 7 = 1849
生成落点 = 828 hostile policies + 100 suspend + 93 hide = 1021
```

每个 context 必须能回链 owner、target disposition 和 opcode；仅有 `828+193` aggregate 不得签
build。无法证明 0x52 调用前态、非 100ms 秒值、SHORT 越界或 hostile respawn policy 的站点必须
fail-loud/列入显式例外，不得静默猜测。

### 6. SAVE、manifest 与 editor 升级矩阵

- 新增 `LegacyManifestV12`、`upgradeManifestV12ToV13`、`WorldStateV13`、
  `LegacySavePayloadV8Content12`；当前 manifest/content13 与 minimumSave8。
- SAVE8/content9 先沿既有 R13 historical chain 到 content10；W9 resolver 明确覆盖
  content10/11/12/13 → content13。四路 normalize 在任何 sidecar I/O 前校验 project/version/minSave，
  补 `entityLifecycles={}`，保留 `world.script.entityState`、position、FlowCursor/page/behavior/stage
  identity；不新增 W9 sidecar。
- editor 增加独立 v12→v13 升级器：在内存 overlay 完整校验（包括生命周期嵌套表、命令 target 和
  authored/PAL 分流）后，按 manifest-last 原子写入；半状态/manifest 先写/未知引用均拒绝。`projects/demo`
  与 `projects/e2e-own` 走 authored path，PAL 走 provenance path。
- W9 transition 的 source ledger、seal、manifest、oracle、canary、R13 shadow 和 baseline 必须由
  production builder 生成并重录；current13 重复 dry replay 要求 0/0/0 且 B10 surface 字节不变。

## 验收矩阵（实现后逐项填证据）

### content / schema

- content13 loader、strict exact-key validator、未知 scene/entity/phase、tick 溢出和旧 map 缺省；
- `EntityLifecycleEntry` 四态合法/非法矩阵；public 命令只出现 suspend/hide/restore/remove；
- hostile `onVictory/onPlayerFlee` 判别联合，禁止 `respawnSeconds/success` 和含损坏字段。

### reforge / battle

- reducer 覆盖四态、静态 hidden/collide、entityState 叠加、manual/touch 分离、auto/hostile gate；
- 15/800 tick、battle/menu/dialog/confirm/blocking script 冻结、场景往返、保存续算；
- 320×320 foot-anchor 端点 0/320 与 -1/321、动作帧 0、位置/朝向保持；
- 五种 BattleResult、session.done 唯一事实、敌逃/terminate 无奖励且不隐藏、playerFled 只走 onFlee；
- 旧 detached wait 完全删除，运行中的 auto/hostile 在生命周期变更后不再提交副作用。

### migrate / source ledger / append-only

- 0x4B 固定 15、0x52 `op0||800`+SHORT 边界、前态静态折叠和无法证明 fail-loud；
- 1849 source sites / 1021 landing points 逐 context ledger 与 828+93+7 守恒；
- content12 initialize、content13 replay、重复 CLI 与 R13 历史 rewind；非白名单改动、source drift、
  B10 authority 变化均 fail-closed；
- oracle/manifest/release/canary 全套重录，第二次迁移 writes/deletes/conflicts=0/0/0。

### editor / functional visual

- v12→v13 overlay CRUD、撤销/重做、删除/引用保护、保存重开、manifest-last/半状态拒绝；
- 中文区分“玩家逃跑后短暂暂停自动行为”和“胜利后隐藏并重现”，不暴露原版字段；
- 仅对 editor/debug 功能面板做一次最小浏览器/截图证据。剧情/演出视觉统一登记冻结后的 E2E，
  不在开发期重复跑。

## 推进签字（post-B10 重新锁定）

旧签字保留在历史记录，但不再作为准入：

- Codex：**agree（2026-08-10，修订设计）**。已按两席 counter 重写本卡；无实现修改。
- Kimi：**counter（2026-08-10，post-B10 设计复审）**：要求 content13/minSave8、顶层 nested
  判别联合、旧档缺省 normal 且不从 entityState 推断、0x52 静态折叠、五终态 BattleResult、
  manual/touch 分离和独立 eligible tick gate；修卡后复签。
- GLM：**counter（2026-08-10，post-B10 迁移/SAVE/editor 复审）**：要求 W9→B10 append-only 链、
  0x4B/0x52 文案纠正、1849-site ledger 守恒、SAVE8 content10/11/12/13→13、PAL/authored 分流、
  editor 原子升级和 oracle/canary 重录；修卡后复签。
- counter / 分歧处理：当前 build **blocked**；不得开始实现。待 Kimi/GLM 对本修订文本分别签
  `agree` 后，Codex 才能将状态改为 `build`。
- 缺签豁免：N/A，用户尚未批准。

#### Kimi 架构复审（2026-08-10，post-B10 修订版）：**counter（精确返工钉）**

复核 `docs/phase1/game-mechanics.md:1105-1119`、`reference/sdlpal/script.c:1794-1800` 与
`reference/sdlpal/scene.c:247-249` 后，发现冻结设计 §5（本卡 `:175-176`）对已证明的
`0x52` 负 `sState` 前态给出的“`suspend/restore`”落点不成立：源实现先执行
`sState *= -1`，再写入正倒计时；正倒计时期间渲染层因 `sVanishTime > 0` 隐藏，倒计时归零后
状态已为正，实体会**立即可见**，不再经过 `sState < 0` 的离屏门。因此它既不是
`suspendEntity`（该命令保持可见并保留碰撞），也不是当前 `hideEntity`（倒计时后进入
`awaitingExit`，仍要求离屏）。

返工钉：在不恢复 public toggle、四态和“无墙钟”边界的前提下，二选一并写入冻结设计、source
ledger disposition 与测试矩阵：

1. 增加明确的“计时到期立即恢复”语义（例如 `hideEntity` 的显式 `reappear: 'immediate'`
   变体或等价独立叶命令），并钉住“负前态 + N tick：N tick 内隐藏、在视口内也于到期点恢复”；或
2. 若正式 census 证明不存在可迁移的负 `sState` 前态，明确把该 disposition 列为 fail-loud
   例外（含 source site、原因和用户可接受的兼容边界），不得写成 `suspend/restore` 的隐式猜测。

在该返工钉落卡并由两席复签前，Kimi 不允许将本轮设计签为 `agree`，build 准入继续 blocked。

### 历史签字（2026-08-07，已 supersede）

Codex/Kimi/GLM 当时对四态、旧版 SAVE 可选字段、0x52 toggle 和 828+193 初步账本签 `agree`，
但 post-B10 复核证明其中的 content epoch、K1 entityState 前提、0x4B/0x52 operand 文案、
source provenance 和 BattleResult 终态不足以作为本轮 build 准入；历史意见不删除、不追溯改名。

## 实现 / Review / 用户验收

### Build

- Coding Owner: Codex（签字门禁满足前不得改实现文件）
- 修改文件：pending
- 实现摘要、命令与测试：pending

### Review

- Kimi：pending（需 `accept` 或列出返工）
- GLM：pending（需 `accept` 或列出返工）
- Codex：pending
- counter / 返工处理：pending

### 用户验收

- 用户结论：pending
- 后续任务：pending

## 交接日志

- 2026-07-30：Codex 开 W9 高风险卡并完成一阶段真值初审。
- 2026-08-07：旧设计三方 agree；仅作为历史记录保留。
- 2026-08-09：B10-1 发布、content12 current replay 0/0/0，commit `e714e073`。
- 2026-08-10：Kimi/GLM post-B10 只读复审均 counter；Codex 完成本修订卡，等待复签。剧情视觉按用户
  决策延后集中 E2E，功能性 editor/debug 视觉保留最小验证。
- 2026-08-10：主分支收口——W9 工作分支已合并并删除，后续统一在 `main` 上开发；本卡保留
  `blocked`/设计复审门禁，不代表已开始实现。

## 下一位 Agent 提示词

```text
接手任务：W9 实体生命周期/重现/明雷逃跑冷却设计复签。
任务卡：docs/ops/tasks/W9-entity-lifecycle-respawn.md
当前状态：blocked；旧 2026-08-07 agree 已 supersede，Codex 已修订并签 agree。
先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡“上下文锚点/冻结设计/验收矩阵”，
以及 docs/phase1/game-mechanics.md:1000-1111、B10-1 卡与 commit e714e073。
你的职责：只读设计复审，不得修改实现文件；检查 content12→13/minSave8、顶层 nested
entityLifecycles 判别联合、旧档缺省 normal 且不推断 entityState、0x4B 固定 15 与 0x52 op0||800、
1849-site ledger 守恒、PAL/authored 分流、SAVE/editor 原子升级、五态 BattleResult、统一派生 gate
和独立 eligible tick gate。
输出：在本卡签 `agree`，或写 `counter` 的精确 file:line/验收钉；未三方 agree 前不得开始实现、
不得标记 build/done。若 agree，明确允许 Codex 进入 build，并给出下一位 Agent 提示词。
```

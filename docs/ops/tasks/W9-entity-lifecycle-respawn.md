# W9 - 实体生命周期、重现与明雷逃跑冷却

Status: build
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
被本次 post-B10 设计复核 supersede；本轮三方已于 2026-08-10 重新签 `agree`，当前 build
准入以本卡最新冻结设计与验收矩阵为准。

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
  自摘要。B10 control graph 也必须递归绑定：`parent` 恰为 `r13-6c-lossy-closure-v1`、
  `requiredControls` 恰为单一 `r13-z-source-closure-v1`，二者再绑定同一个
  `r13-source-semantics-v1` parent digest；每层 metadata/file/managed/hash 四元组与非自指 publish
  surface 都须验签并纳入 W9 seal，不能只比较 B10 顶层 digest。
- 历史剥离顺序固定：`W9 → B10 → R13-Z → R13-6C → R13-6B → older`，与生产 rewind
  组合顺序一致；任一 control 半状态、缺失、额外 control、父摘要漂移或顺序错位均在 plan/写盘前
  fail-loud。content11 initialize、content12
  W9 initialize、content13 current replay 是三个不同入口，不能把 current13 落入 generic merge。
- content13 current replay 必须先完整验签 published/rebuilt W9 authority、successor surface 与上述
  B10 required-control graph，再强制
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

- `0x4B@41073`：固定 `sVanishTime=-15`，无 operand 映射；**只有已证明调用前 `sState>0` 时**才生成
  `suspendEntity(15)`。调用前为 `sState<0` 时，源语义是隐藏倒计时后仍过离屏门；为 `sState=0`
  时保持静态隐藏。正式 disposition 必须携带 `preState` 证明，无法证明则 fail-loud，不能把三者
  统一猜成 visible suspend。
- `0x52@41127/41176/41180`：`sVanishTime = op0 || 800`，按 SHORT 边界验证。正式
  execution-site ledger 必须证明这三个 source address 的每个 reachable context 在调用前均为
  `preState > 0`，只有证明通过才生成 `hideEntity(N)`（默认离屏重现）。任一 `preState <= 0`、
  unknown、动态不可证明或 source drift 都必须在 output/manifest 写盘前 fail-loud，且不得生成
  `hideEntity`、`suspendEntity` 或 public toggle；本轮 PAL W9 不扩充“到期立即恢复”schema。
- 逐 site ledger 必须记录 `sourceAddress/opcode/operands/sourceCommandSha256/contextId/entrySite/
  channel/owner/self/target/disposition/preState/preStateProof`，并绑定上游输入 digest、生成命令
  digest 和 allowlist；`preStateProof` 的可重放证据摘要必须进入 ledger seal。
- GLM 已复算的守恒必须在正式 ledger 中逐 context 闭合：

```text
828 folded hostile（每个同时消费 0x4B+0x52）
+ 93 residual paired（同时保留两命令）
+ 7 residual 4B-only
= 928 execution contexts

源 sites = 828×2 + 93×2 + 7 = 1849
生成落点 = 828 hostile policies + 100 suspend + 93 hide = 1021
```

每个 context 必须能回链 owner、target disposition、opcode 与 `preState` 证明；仅有 `828+193`
aggregate 不得签 build。无法证明 0x4B/0x52 调用前态、非 100ms 秒值、SHORT 越界或 hostile
respawn policy 的站点必须 fail-loud/列入显式例外，不得静默猜测。

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
- `ScriptRuntimeHostV5`、legacy `ScriptHost`、`ScriptProjectRuntimeV5`、debug host 与 `main` caller
  共用具名 `BattleResult`；若保留 legacy adapter，必须只在单一边界显式映射，源码中不得残留
  并行 `enemyFled()`/`'win'|'lose'|'flee'` 终态判断；五种结果均需接续/奖励/hostile/abort 负测。
- 旧 detached wait 完全删除，运行中的 auto/hostile 在生命周期变更后不再提交副作用。

### migrate / source ledger / append-only

- 0x4B 固定 15 与逐 execution-site 前态证明；0x52 `op0||800`+SHORT 边界，三个 source address
  的每个 reachable context 仅在 `preState>0` 时生成 hide；
- 0x4B/0x52 synthetic positive/negative/zero/unknown：只有已证明正前态允许预期 landing，
  `preState<=0`、unknown、动态不可证明或 source drift 均在 output/manifest 写盘前 fail-loud，
  landing command 为 0；
- 1849 source sites / 1021 landing points 逐 context ledger 与 828+93+7 守恒；
- content12 initialize、content13 replay、重复 CLI 与 R13 历史 rewind；非白名单改动、source drift、
  B10 authority 变化均 fail-closed；
- B10 `parent=R13-6C`、`requiredControls=[R13-Z]` 及共同 R13 source-semantics parent 的递归
  metadata/file/managed/hash、半状态、额外/缺失 control、非自指 surface 和固定 rewind 顺序负测；
- oracle/manifest/release/canary 全套重录，第二次迁移 writes/deletes/conflicts=0/0/0。

### editor / functional visual

- v12→v13 overlay CRUD、撤销/重做、删除/引用保护、保存重开、manifest-last/半状态拒绝；
- 中文区分“玩家逃跑后短暂暂停自动行为”和“胜利后隐藏并重现”，不暴露原版字段；
- 仅对 editor/debug 功能面板做一次最小浏览器/截图证据。剧情/演出视觉统一登记冻结后的 E2E，
  不在开发期重复跑。

## 推进签字（post-B10 重新锁定）

旧签字保留在历史记录，但不再作为准入：

- Codex：**agree（2026-08-10，修订设计）**。已按两席 counter 重写本卡；无实现修改。
- Kimi：**agree（2026-08-10，post-B10 修订后复审）**：content13/minSave8、顶层 nested
  判别联合、旧档缺省 normal 且不从 entityState 推断、0x52 正前态 fail-closed、五终态 BattleResult、
  manual/touch 分离和独立 eligible tick gate 均已落卡；本次补钉要求正式 execution-site
  ledger 证明 PAL 三个 0x52 站点 `preState > 0`，其余 `<=0/unknown` 一律 fail-loud 且零生成。
- GLM：**agree（2026-08-10，返工后迁移/覆盖复审）**：1849-site 守恒已独立复算；0x4B/0x52
  均已冻结逐 execution-site `preState` 证明、非正/未知/source drift 写盘前 fail-loud 与零生成；
  B10 parent/requiredControls 控制图、固定 rewind 顺序及 BattleResult 跨包五终态闭包均已进入设计与
  验收矩阵。详细 counter 与闭环证据见下方。
- counter / 分歧处理：Kimi、GLM 的 post-B10 counter 均已闭合，三方设计 `agree` 齐备；Coding
  Owner 已按工作流将卡头转为 `build`，build 准入 **allowed**。
- 缺签豁免：N/A，用户尚未批准。

#### Kimi 架构复审（2026-08-10，post-B10 修订后）：**agree（附 fail-closed 返工钉）**

复核 `docs/phase1/game-mechanics.md:1105-1119`、`reference/sdlpal/script.c:1794-1800` 与
`reference/sdlpal/scene.c:247-249` 后，确认若 `sState < 0`，源实现是“正倒计时期间隐藏、到期
立即可见”，既不是 `suspendEntity`（可见）也不是当前 `hideEntity`（进入 `awaitingExit`）。
本轮不为 PAL W9 扩充 immediate-reappear schema；改以**源站点 fail-closed 证明**闭合边界：

- 正式 execution-site ledger 必须为 `0x52@41127/41176/41180` 逐 context 记录
  `preState`、证明链/摘要和 owner/self/target，并证明每个 reachable site 的 `preState > 0`；
  ledger schema 与 digest 将 `preState` 证据纳入 seal，不能只写 aggregate。
- 任一 `preState <= 0`、未知、动态不可证明或 source drift 的站点必须在生成写盘前 fail-loud，
  不得发出 `hideEntity`、`suspendEntity` 或任何 public toggle；这也是 authored/PAL 分流的
  明确兼容边界，不得把 `suspend/restore` 当作猜测替代。
- 加入 synthetic negative-prestate fixture：构造 `0x52` 的负、零和 unknown 前态，断言迁移
  在 output/manifest 写入前失败、landing command 数为 0；同时保留 PAL 正前态三站的成功断言。

该钉保留四态、无墙钟和 public 无 toggle 的边界；返工后 Kimi **agree**，但 GLM counter 尚在，
build 准入仍 blocked。

#### GLM 迁移 / 覆盖复审（2026-08-10，post-Kimi counter）：**counter（精确返工钉）**

独立按 live extracted source 重建 `buildR13SourceExecutionCensus` 并按 `(owner,self)` 归并，结果为
`commands=43503`、`0x4B` source command **1**（`41073`）→ **928 execution sites**、`0x52` source
commands **3**（`41127/41176/41180`）→ **921 sites**；共 **928 contexts = 921 paired + 7
4B-only**，源 sites `828×2 + 93×2 + 7 = 1849`。再以 `buildPalMigration` 的 live
`foldedHostileRoots` 对照，`828/828` folded hostile 全部精确命中 paired context，剩余 paired
`93`、4B-only `7`，故计数守恒成立；这不能替代逐 site ledger。

当前设计对 `0x52` 已采用 Kimi 的正确 fail-closed 方案（正式 ledger 必须证明三个 source address
的每个 reachable site `preState>0`；负/零/unknown 零生成），GLM 同意该边界。但同一证明尚未落到
`0x4B`：live census 有 4 个 source context 的静态 `eventObject.sState=0`
（`s092/e1707,e1708,e1709,e1710`）。静态初值不等于 execution-time 前态，故正式 ledger 必须对
**每一个 0x4B site** 做可重放的 `sState` data-flow/pre-state proof（含 `0x49/0x6F/0x84/0x9A`
等状态写入及跨 scene 目标），并将证据摘要纳入 ledger/seal：

- `preState>0` 才允许当前 `suspendEntity(15)` landing；
- `preState<=0`、unknown、动态不可证明或 source drift 必须在生成/写盘前 fail-loud，不能静默把
  静态 hidden/负态映射为 visible suspend；若未来允许迁移这些语义，必须先扩充判别 disposition
  与测试矩阵，而不是复用 `suspend`。

至少加入与 Kimi `0x52` fixture 对称的 `0x4B` synthetic positive/negative/zero/unknown fixture：
只有正前态产生一个 15-tick landing，其他三类在 output/manifest 写入前失败且 landing command
数为 0；PAL live 928-site proof 通过后，`100 suspend + 93 hide` 的生成守恒才可进入 build。

Append-only 还须把 B10 seal 的 `parent` 与 `requiredControls` 递归钉住：当前 B10
`requiredControls` 为 `r13-z-source-closure-v1`，其 parent 链接 `r13-6c-lossy-closure-v1`。
W9 installer/replay 不能只比较 B10 自身 metadata/seal/successor surface；必须验证这些 control
seal 的 metadata/file/managed/hash 四元组、非自指 publish surface、W9→B10→6C/Z rewind 顺序，
并在 current13 重复回放保持 `writes=0/deletes=0/conflicts=0`。否则 GLM 不签 `agree`，build 继续
blocked。

最后，`BattleResult` 不能只停留在卡内表格：当前 public 边界仍在
`packages/reforge/src/battle/battle-session.ts:209`、`script-runner-v5.ts:39`、
`script-runner.ts:133-144`、`script-project-v5.ts:244-252`、`debug-tools.ts:70` 和
`main.ts:1430/2874` 暴露 `'win'|'lose'|'flee'`，并在 `main.ts:1844-1865` 读取
`enemyFled()`。实现验收必须把这些 host/adapter/caller 一并收窄到同一个具名
`BattleResult` union，或明确唯一的 legacy adapter（adapter 外不得残留旧字符串/布尔）；为
`victory/defeat/playerFled/enemyFled/terminated` 各钉一次端到端接续、奖励、hostile policy 与
abort/terminate 负测，禁止以 HP diff 或 `??0` 猜终态。否则设计仍有跨包公共接口漏项，GLM 不签
`agree`。

#### GLM 返工复审（2026-08-10）：**agree**

只读复核本卡冻结设计与验收矩阵后，原 counter 的三项返工钉均已文字闭合：

1. §5 已要求全部 `0x4B` execution site 携带可重放 `preState/preStateProof`，仅正前态允许
   `suspendEntity(15)`；负、零、unknown、动态不可证明与 source drift 均在 output/manifest 写盘前
   fail-loud、landing 为 0，并有对称 synthetic 矩阵。`0x52` 采用相同 fail-closed 边界。
2. §1 已递归钉住 B10 `parent=R13-6C`、唯一 `requiredControls=[R13-Z]` 及二者共同的
   R13 source-semantics parent，要求逐层四元组、非自指 surface、半状态/漂移负测与固定
   `W9→B10→R13-Z→R13-6C→R13-6B` rewind 顺序。
3. §4 与 reforge 验收矩阵已要求 `ScriptRuntimeHostV5`、legacy host、project/debug host 和 `main`
   caller 共用具名 `BattleResult`，旧字符串/`enemyFled()` 仅可留在唯一显式 adapter 边界，并覆盖
   五种终态的接续、奖励、hostile 与 abort/terminate 负测。

未发现新的高置信设计缺口，GLM 对本轮设计签 `agree`。本签字只解除设计门禁，不修改卡头状态，
也不构成实现或 `review→done` 验收。

### 历史签字（2026-08-07，已 supersede）

Codex/Kimi/GLM 当时对四态、旧版 SAVE 可选字段、0x52 toggle 和 828+193 初步账本签 `agree`，
但 post-B10 复核证明其中的 content epoch、K1 entityState 前提、0x4B/0x52 operand 文案、
source provenance 和 BattleResult 终态不足以作为本轮 build 准入；历史意见不删除、不追溯改名。

## 实现 / Review / 用户验收

### Build

- Coding Owner: Codex（三方 post-B10 设计 `agree` 齐备，build allowed）
- 修改文件：`packages/reforge/src/entity-lifecycle.ts`、
  `packages/reforge/src/entity-lifecycle.test.ts`、`packages/reforge/src/index.ts`、
  `packages/reforge/src/save/types.ts`、`packages/reforge/src/save/ops.ts`、
  `packages/reforge/src/save/migration-v13.ts`、`packages/reforge/src/save/epoch-v13.test.ts`
- 实现摘要：先落纯函数生命周期内核，不读取/改写静态 `EntityDef` 或 `world.script.entityState`；
  提供四态派生 gate、四个 mutation、当前 scene/eligible 世界拍递减、`despawned → awaitingExit`
  和 320×320 foot-anchor 离屏恢复边界。`awaitingExit` 不因 tick 自动清除。
- 验证（2026-08-10）：`pnpm --filter @type-pal/reforge exec vitest run
  src/entity-lifecycle.test.ts src/battle/battle-result.test.ts` → 2 files / 8 tests passed；
  `pnpm --filter @type-pal/reforge exec tsc --noEmit --pretty false` passed。
- SAVE 增量验证（2026-08-10）：`src/save/epoch-v13.test.ts` + `src/save/epoch-v10.test.ts`
  → 2 files / 33 tests passed；新增显式 `SavePayloadV8Content13`、无 sidecar 的
  content10|11|12|13→13 归一和生命周期引用闭包校验；当前 v12 loader/runtime 未切换。
- 剩余风险：尚未接入 main/typed v13 loader/runtime command adapter；在这些边界完成前，不得把本
  内核或 SAVE 增量声明为 W9 全链闭环或标记 done。

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
- 2026-08-10：Kimi 接受“不扩 schema + 0x52 execution-site 正前态证明 + 非正/未知零生成”的
  fail-closed 修订并签 `agree`；GLM counter 仍在，状态继续 `blocked`。
- 2026-08-10：GLM 确认 0x4B 逐 site 前态证明、B10 required-control graph 与 BattleResult 跨包
  验收三项 counter 均已闭合并签 `agree`；三方设计签字齐备，卡头状态仍由 Coding Owner 转换。
- 2026-08-10：Codex 复核三方 post-B10 设计签字均为 `agree`，将任务 `blocked → build`；后续统一
  在 `main` 上由 Codex 作为唯一 Coding Owner 实现，生成产物只允许由上游 builder 重建。
- 2026-08-10：Codex 完成纯函数生命周期内核与独立回归；审计确认 main 接入必须等待 v13 loader/save
  边界，避免把 `WorldStateV13` 强 cast 到当前 v12 canonical runtime。Next: 先补 typed v13 loader、
  SAVE resolver 与旧 v5 command adapter，再接 main 的统一 gate/tick/hostile policy。

## 下一位 Agent 提示词

```text
接手任务：W9 实体生命周期/重现/明雷逃跑冷却实现。
任务卡：docs/ops/tasks/W9-entity-lifecycle-respawn.md
当前状态：build；旧 2026-08-07 agree 已 supersede，Codex/Kimi/GLM 的 post-B10 设计签字已齐，
build 准入 allowed。
先读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡“上下文锚点/冻结设计/验收矩阵”，
以及 docs/phase1/game-mechanics.md:1000-1111、B10-1 卡与 commit e714e073。
你的职责：Coding Owner 严格按冻结设计实现 content13/SAVE/editor/reforge/migrate/append-only 全链，先修上游
translator/builder 再全量生成，不得手改 `projects/pal`。
输出：写回实现文件清单、逐项验证证据与剩余风险，并将任务转 `review` 交 Kimi/GLM 分别签
`accept` 或给出精确返工项；三方验收签字未齐前不得标记 `done`。
```

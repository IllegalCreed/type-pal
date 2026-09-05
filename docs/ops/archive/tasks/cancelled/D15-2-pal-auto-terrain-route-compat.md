# D15-2 - PAL auto 地形路线兼容修复

Status: cancelled
Phase: phase2
Capability: 议题 15 NPC 自主移动（PAL 内容兼容 / migration successor）
Coding Owner: Codex
Reviewer: Kimi（迁移架构）+ GLM（路线覆盖 / 数据账）
Blocked By: 用户裁决否定任务前提
Blocks: none

## 取消裁决（2026-08-13）

用户确认 PAL authored NPC 巡逻 / 演出走位本来就允许穿墙；只有敌人追击使用动态碰撞，且
`floating` 追击跳过地形与阻挡实体。D15-2 建立在“auto authored move/step 必须查 terrain”的错误前提上，
因此本卡取消，不发布 migration successor、不改 PAL 路线、不写 generated content。

本卡后文只保留为历史审计记录；原三方设计签字不再构成 build 准入，未完成的实现不得接入
current migration / release gate。正确修复回到 D15-1 runtime collision-domain：authored move/step
均为 `scriptedBypass`，chase/hostile 为 `dynamic`，`floating` 跳过完整 obstacle check（terrain 与阻挡实体）。

## 历史目标（已取消）

修复 PAL 旧 auto 路线与 D15 动态地形合同的兼容缺口：所有可达地面 auto `moveEntity`
继续使用 production terrain sweep，但不得因原版“不查墙”的旧路线永久等待。修复必须落在迁移
上游并重新生成，不得手改 `projects/pal`、放宽地图 collision，或在 Reforge 按 scene/entity 特判。

## 范围与硬边界

范围内：

- PAL registry/page/selection 全域 auto locomotion census 与 source-address ledger；
- production `walkTick + terrain sweep + map lattice` 同合同 dry executor；
- W9/content13 之上的 PAL 专属、同 schema append-only successor；
- 对逐项已证明路线作 deterministic detour / endpoint / exit 投影，并重生成 PAL；
- D15-1 runtime、迁移 release/oracle/canary 与登记的集中 E2E 回归。

范围外 / 禁止项：

- 不改 content schema、SAVE_VERSION、contentVersion、公开 `ScriptHost` 或 editor；
- 不把 `collide:false`、`floating` 或 sprite 外观当作穿墙许可；
- 不做 runtime A*、运行时 scene/entity allowlist、超时后穿墙或“受阻即假 resolve”；
- 不改地图 collision 来迁就旧路径，不手改 generated scene；
- 若某条可达路线确实需要 terrain bypass、新命令或公共 schema，停止该条并开 D15-3 请用户拍板。

## 上下文锚点（实现前必读）

- `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`；
- D15-1 本卡上游：`docs/ops/archive/tasks/done/D15-1-npc-movement-dynamic-collision.md`，特别是连续 footprint、
  100ms world tick、`moveEntity` 只在真 endpoint resolve、PAL-wide census 与上游修复铁律；
- 原版 / 一阶段真值：`reference/sdlpal/scene.c:851-902`、`reference/sdlpal/script.c:31-98`，
  `PAL_NPCWalkTo` 不查墙；`packages/game/src/core/scene-system.ts:279-307` 的旧 blocker 推队伍逻辑
  只作历史对照，不回灌 clean runtime；
- D15 production 合同：`packages/reforge/src/entity-walk.ts`、`entity-motion.ts:217-231`、
  `collision.ts:6-24`、`project-map.ts:116-139`；
- canonical / source 链：`packages/migrate/src/migrate-content.ts:2469-2474`、
  `experimental/script-v5/p7-canonical.ts:654-662,729-832`、
  `experimental/script-v5/source-execution-census.ts`、`data/extracted/events/all.json` 与
  `data/extracted/data/scene/*.json`；
- append-only precedent：`packages/migrate/src/pal-w9-entity-lifecycle.ts`、
  `pal-w9-control-graph.ts`、`scripts/migrate-content.mts:457-637`；
- 当前 discovery 工具：`packages/reforge/scripts/audit-entity-motion.mts`。它只证明红项与三口径，
  不能冒充本卡要求的完整 control-flow dry executor。

## 根因与首个 canary

- 源实体：`data/extracted/data/scene/4.json:7-14`，e76，`autoLabel=L_872`，`sState=2`。
- 源命令：`data/extracted/events/all.json` 地址 875，`0x10 [41,91,0]`。
- 生成腿：s004/e76 `(139,50) → (132,50)`；production `walkTick` 第 7 次尝试
  `(136.75,50) → (136.375,50)` 命中 `map-001` collision=1，Promise 永不完成。
- 浏览器入口：`http://localhost:6051/?scene=s004&pos=139,59&collision`。约 11.6 秒进入永久等待，
  因此回归必须跑完整一圈或至少 15 秒，不能沿用会漏报的 10 秒窗口。
- 原版 `PAL_NPCWalkTo` 不查地形；这是旧内容与新 runtime 合同的兼容问题，不是地图解码错误。

## 审计基线（D15-1 discovery，2026-08-13）

- 294 scenes；registry-wide mover 426 / solid 117；page-enabled 333 / 65；initial-page 311 / 60。
- registry-only 93 个 mover 全有 `selectEntityBehavior(channel:auto,use)` 引用，不是 dormant。
- `moveEntity` 1005 commands / 247 entities / 327 entity-behaviors（solid 143）。
- 静态 blocked endpoint 33 条；现有顺序扫描确认 segment hit 88 条；237 个 origin 未证明。
- `stepEntity` / `chasePlayer` 是 one-shot runtime 合同，blocked 不会永久挂 Promise；`nudgeEntity`
  是 authored choreography bypass。三者仍进 census 与来源账，但本卡不把它们改写成路线。
- 7 个 `chasePlayer` site 保持 D15 runtime fixture，不因本卡投影。

## 冻结设计（v1，三方设计 agree）

### 1. 同版本 append-only successor

- transition id 固定 `d15-pal-auto-terrain-route-compat-v1`，seal 路径固定
  `_transitions/d15-pal-auto-terrain-route-compat-v1.json`；parent 必须是已发布且完整验签的
  `w9-entity-lifecycle-v1` content13 authority。
- 本卡只改已有 v13 scene command 数据，不改 schema；因此 manifest 保持 content13 / minSave8、
  `SAVE_VERSION=8`，`manifest.json` 必须逐字节不变。allowlist 只含实际变化的 scene 路径与 D15 seal；
  seal 另绑定 manifest digest，不能把未变化 manifest 冒充 writer。
- seal 使用 metadata/file/managed/hash 四元组，至少绑定：W9 metadata + seal digest、W9 control-graph
  digest、W9 parent publish surface、motion-contract version、source-ledger digest、collision-map digest
  集、affected-file allowlist、D15 successor publish surface 与 seal 自摘要。
- D15 rewind 必须先验证完整四元组、逐项 route expansion 与 leaf digest，再折叠回原 `moveEntity`、
  删除 D15 seal/metadata/hash，逐字节还原 W9 surface。半状态、额外变化、陈旧 leaf、parent/source/map
  漂移均在 plan/write 前 fail-loud。
- 历史外层顺序固定 `D15 → W9 → B10 → R13-Z → R13-6C → R13-6B → older`。普通 current13
  迁移先验签/rewind D15，重建 W9，再重建 D15；不得让已发布 D15 落入旧 W9 generic merge。

### 2. 唯一 movement parity 合同

- （历史设计，已取消且未落地）D15-2 原拟新增只读 package subpath
  `@type-pal/reforge/entity-motion-contract`，只导出带常量
  `d15-motion-contract-v1` 的纯函数：`walkTick`、slow cadence/snap、`motionTerrainSweepBlocked`、
  `isBlockedAt/pixelToLattice`。不导出 planner 状态，不改 ScriptHost，不让 Reforge 依赖 migrator。
- migrate 已有 Reforge devDependency；projector/dry executor 直接消费该 subpath，不复制公式。这样
  迁移 trace 与运行时用同一代码，不靠“看起来相同”的第二实现。
- seal 绑定 contract version 与全 route trace digest。任何 runtime 合同变化会使 current replay
  fail-closed，必须新 transition/version 复审，不能动态重钉 expected digest。
- dry executor 对每个 `moveEntity` 从实际 origin 逐 100ms tick执行 production `walkTick`，每个 proposal
  用 `<=0.25` sweep + ground footprint `{0,0}` 查对应 ProjectMap collision；slow rest 只影响 tick 数，
  不改变几何 trace。界外恒 blocked。

### 3. registry + control-flow source ledger

正式 ledger 必须从 immutable extracted source、P7 owner/control graph、published W9 parent 与地图生成，
不从当前 generated JSON 猜 source：

- census 同时报 registry/page-enabled/initial-page 三口径，并覆盖 93 个跨 page/behavior selector；
- 递归覆盖 stages、stateMachine、branch、loop、behavior/page replacement、cross-target movement；
- 抽象位置状态使用精确有限 GridPos 集；`moveEntity/setPos/step/nudge` 更新位置，分支取 union，循环做
  有界 fixed-point。遇 player-dependent chase、无界位移或 widening 后仍不确定时标 `unresolved`，不得
  当 safe；
- control graph 证明 runtime entry、selection 与 unreachable。只有带入口闭包证明的 context 才可签
  `unreachable`；“当前页未引用”或“初始 state=0”都不是不可达证明。

每个 route site 至少记录：

```text
scene/entity/behavior/channel/contextId/entrySite/owner/self/target
sourceRoot/sourceAddress/opcode/operands/sourceCommandSha256
canonicalPath/parentLeafSha256/speed/originalTarget
originSet/originProof/mapId/collisionDigest/motionContractVersion
productionTraceDigest/firstBlockedSample/disposition/replacementDigest
```

ledger 还记录 generation command、所有输入 digest、三口径 summary、affected-file allowlist 与总自摘要。
source address、canonical path、target 或 command hash 任一漂移均停止生成；同一 source leaf 被多个
owner 投影时按 execution context 分账，不能按地址去重丢 context。

### 4. disposition 与投影规则

每个 registry motion context 必须有稳定 disposition；仅以下值合法：

| disposition | 适用 | 投影 |
|---|---|---|
| `runtime-safe` | 所有可达 origin 的 production trace 均不碰 terrain | 不改 leaf，只封存 trace |
| `detour` | endpoint 开放、origin 已证明、存在稳定安全绕路 | 用显式 `moveEntity` waypoint 序列替换原 leaf，最后严格到原 endpoint |
| `endpoint-adjust` | 原 endpoint 本身 blocked，且有 source/原版画面/用户认可的新站位 | 替换为明确新 endpoint；禁止自动“最近可走格” |
| `exit-truncate` | source/control graph 证明该腿紧接 hide/state0/remove 退场 | 只走到最后合法 waypoint 后执行既有退场；不得新增隐身语义 |
| `unreachable` | 完整入口/selection/control graph 证明不可执行 | 不改 leaf，封存不可达 proof |
| `runtime-one-shot` | step/chase；blocked 本来就完成或后拍重试 | 不改写，保留 D15 runtime fixture |
| `authored-nudge` | nudge choreography | 不改写，不把它计作 terrain-safe move |

- 任一 confirmed blocker 不得留 `unresolved`；任一 reachable unknown-origin move 在 done 前也必须取得
  可重放 origin proof 或停止发布。零 unclassified confirmed blocker 不是“只处理 33/88”即可。
- detour 搜索只在迁移期运行：以 exact origin/target（含分数格）和地图内整数 GridPos anchor 构图，
  固定邻居顺序与 UTF-16 排序，稳定
  shortest-path tie-break；每条 candidate edge 都用同一 production contract 实跑。找到格路径后从前
  向后贪心压缩为最少安全 line-of-sight waypoints，且每一压缩腿重新 trace 验证。无界搜索、随机 tie、
  运行时 A* 均禁止。
- 多 origin 共用同一 leaf 时，生成的同一 waypoint 序列必须对所有 origin 安全；否则保持 unresolved，
  由逐 context 上游拆分/显式路线处置，不可按当前初始位置特判。
- successor 表示固定为“原 body cell 原位替换成 N 个同 target/speed 的 `moveEntity` sibling”，不引入
  `branch/callScript` 包装、隐藏 flag 或新 schema；seal 为每次 expansion 记录 parent index、N、每个
  successor leaf hash。多 expansion 按 parent path 逆序应用/正序验证，rewind 才能无歧义折叠。
- projector clone-before-write，只改 ledger 指向的 canonical leaf。route expansion 按逆 path 顺序应用，
  每次先核 parent leaf hash；rewind 按 seal 中 exact replacement hash 折叠，保证双向逐字节闭合。
- waypoint 增加 authored pacing，必须把额外 segment/pause 计入 trace 并纳入视觉抽样；若观感不可接受，
  不得偷偷加 runtime bypass，应升级 D15-3 决策。

### 5. cursor / save 兼容边界

- v5/v13 持久 cursor 身份是 behavior + stage/state safe-point，不保存 command array index；`moveEntity`
  也没有 commandOutcome id。route expansion 只在一个已登记 leaf 的位置展开，不改 behavior/stage/state
  id、state transition 或 confirm command id。
- active movement 仍遵守 D15 线性化：只有 endpoint 才写 canonical `world.entityPos`/command completion；
  中途 quick-save 本来就不序列化半腿。加载后从 canonical position 和同一 stage/state 重放，新增路线
  不得伪造中间 cursor。
- 必须用 SAVE8/current13 fixture 钉三类：leaf 前、detour 中保存、leaf 后；跨 D15 publication 加载后
  不丢 behavior/page/stage/state identity，不重复下游不可逆命令。若测试证明 command expansion 会破坏
  已发布 cursor，则本卡停止并升级 schema/save 方案，不允许靠说明豁免。

### 6. CLI、重放与写盘事务

- 显式入口：`migrate:content -- --d15-auto-routes [--write]`。dry 默认只生成/验证 ledger、projector、
  rewind、loader 与 plan；`--write` 才以现有 `commitAndVerify` 事务写工程 + baseline + seal。
- W9-only / historical canary / oracle 入口在读取 published content13 时必须先识别并严格 rewind D15；
  不允许只删 seal 留下 route body。
- fresh publication：先生成并验签 W9，再以其 immutable snapshot 生成 D15。current13 普通
  `migrate:content`：D15→W9 rewind，分别重建，再要求最终 plan `writes=0/deletes=0/conflicts=0`。
- 写盘前后都重载 extracted source、地图与 project snapshot，验证 clone-before-write、source/map drift、
  ours drift 与 allowlist closure；新 Node 进程二跑必须 0/0/0。
- manifest 字节、W9 seal/body/metadata/hash、W9 control graph、非 allowlist managed file必须逐字不变。

## 验收矩阵

### ledger / dry executor

- golden：294 scenes、426/117 registry、333/65 page-enabled、311/60 initial，以及 93 selector-only；
- stages/stateMachine/branch/loop/behavior replacement/cross-target；多 origin union、fixed-point、unknown
  widening、unreachable 正/负证；
- move/step/chase/nudge 四类均入账，只有 move 进入永久 route disposition；
- source root/address/opcode/operands/canonical leaf/map collision/contract version 任一漂移 fail-loud；
- shuffled input / reversed traversal / 不同 locale 下 ledger、route 与 seal byte-identical。

### route projector / transition

- e76 精确钉 root 872/address 875，从 `(139,50)` 绕过旧 `(136.375,50)` 卡点，到 `(132,50)` 并继续
  一整圈；
- endpoint blocked、segment-only blocked、多 origin shared leaf、exit-truncate、无路径与 OOB；
- 每条 detour 的所有 segment 用 production trace 复验；投影后 zero confirmed permanent blocker；
- clone-before-write；project/parent/source/map drift；allowlist 越界；metadata/file/managed/hash 16 种
  半状态；install→rewind W9 字节相同；双跑同 digest；普通 current13 replay 0/0/0；
- manifest/W9/control graph 非写入负证；项目快照 seal 与 baseline authority 不一致 fail-loud。

### runtime / save / release

- Reforge motion 全量、D15 route fixture、临时 entity blocker 仍等待、terrain 仍阻挡、动态实体仍互撞；
- SAVE8 leaf 前/中/后与 behavior/page/state identity；无重复不可逆后续；
- migrate typecheck/fast/canary/oracle/release、PAL full migration、全仓 `check`；
- 重跑 `audit:entity-motion`：三口径不缩水，所有 reachable move context 已分类，confirmed permanent
  blocker=0、unclassified=0；
- 集中 E2E：e76 完整一圈（≥15 秒只是最低，不替代整圈）、blocked endpoint 代表、exit 代表、
  多 NPC 动态避让代表；Kimi 做视觉审查，用户终验。

## 推进签字

### 进入 build 前：设计签字

- Codex: **agree（2026-08-13）**——同版本外层 successor、唯一 production motion contract、
  execution-context ledger、逐项 disposition、cursor/save 负证与 0/0/0 重放边界已冻结；不得在三签前
  修改 migrate/content 生成实现。
- Kimi: **agree（2026-08-12，本人迁移架构主审；附 1 条 build 期执行钉，见下）**——同 content13
  successor、D15→W9 rewind/seal、motion contract 依赖方向、cursor/SAVE8 兼容与 0/0/0 重放逐面
  压测成立（证据见「Kimi 设计复审记录」）。
- GLM: **agree（2026-08-13，本人路线覆盖/数据账设计主审，HEAD b9de09d0；非代理）**——registry/page/
  initial 三口径（426/117、333/65、311/60）、93 selector-only、1005 moveEntity、33/88/237 disposition
  闭包与 e76 canary **全部由权威 discovery 工具 `audit-entity-motion.mts` 本人实跑逐项复算精确吻合**（见
  下方「GLM 数据账复算证据」）。disposition 表 7 值对 confirmed blocker 零 unclassified 的要求、detour
  搜索固定邻居序 + UTF-16 tie-break + 每腿 production trace 复验、同 origin 共 leaf 须全 origin 安全
  否则 unresolved 的规则闭合 33/88/237 缺口。无新增 counter。
- build 准入结论: **allowed（Codex / Kimi / GLM 三方设计 agree 齐；Kimi 执行钉已记；可进入 build）**

#### GLM 数据账复算证据（2026-08-13，HEAD b9de09d0；本人实跑 audit-entity-motion.mts，非代理）

**权威计数器实跑**（`pnpm --filter @type-pal/reforge exec tsx scripts/audit-entity-motion.mts`，exit 0），
summary 与卡文「审计基线」逐项精确吻合：

| 指标 | 卡文 | 本人实跑 | 核对 |
|---|---:|---:|---|
| scenes | 294 | sceneCount=294 | ✓ |
| auto-enabled entities | (989 口径) | enabledAutoEntities=989 | ✓ |
| registry mover / solid | 426 / 117 | registryMovers=426 / Solid=117 | ✓ |
| page-enabled / solid | 333 / 65 | pageEnabledMovers=333 / Solid=65 | ✓ |
| initial-page(current) / solid | 311 / 60 | currentMovers=311 / Solid=60 | ✓ |
| registry-only selector | 93 | registryOnlyMoverSelectors=93 | ✓ |
| moveEntity commands / entities / entityBehaviors / solid | 1005 / 247 / 327 / 143 | perKind.moveEntity: 1005/247/327/143 | ✓ |
| endpoint blocked | 33 | endpointTerrainBlocked.length=33 | ✓ |
| segment blocked (production walkTick) | 88 | sequentialSegmentTerrainBlocked.length=88 | ✓ |
| unknown-origin moves | 237 | unknownOriginMoves.length=237 | ✓ |
| chasePlayer sites | 7 | perKind.chasePlayer.commands=7 / entities=6 | ✓ |

**93 selector-only 非 dormant ✓**：`registryOnlyMoversAllSelectorReferenced=true`（工具输出）——93 个
registry-only mover 全部有 `selectEntityBehavior(channel:auto,use)` 引用，与卡文「不是 dormant」一致。

**33/88/237 disposition 闭包口径 ✓（关键非互斥性已核）**：33（endpointTerrainBlocked）、88
（sequentialSegmentTerrainBlocked，已用 production walkTick 实跑确认）、237（unknownOriginMoves，origin
未证明）是**三个独立审计输出，非互斥分类**（本人核 unknown∩endpoint=63、unknown∩segment=2，有重叠）。
卡文 §4 disposition 表正确处理为**逐 context 处置**：一个 unknown-origin move 若同时 endpoint-blocked，
须同时满足 origin proof + endpoint disposition。卡文行 148「零 unclassified confirmed blocker 不是只处理
33/88 即可」+ 行 147「任一 reachable unknown-origin move 在 done 前必须取得可重放 origin proof 或停止发布」
准确反映了该非互斥闭包要求。1005 moveEntity commands 在 build 期须全部落到 7 个 disposition 之一，
confirmed permanent blocker=0、unclassified=0（验收矩阵已钉）。

**e76 canary 根因逐字吻合 ✓**：audit 工具的 sequentialSegmentTerrainBlocked 记录显示 s004/e76（behavior
`default`、path `behaviors.auto.default.flow.stages.0.body.15` 与 `.body.3`、solid:true）移动腿
`from:{col:139,row:50} → to:{col:132,row:50}`，`firstBlockedFrom:{col:136.75,row:50}`、speed=normal、
map=map-001——与卡文「生成腿 `(139,50)→(132,50)`；walkTick 第 7 次尝试 `(136.75,50)→(136.375,50)`
命中 collision=1」**逐字一致**。(139,50) 是移动起点（leaf 处初始位置），非 generated 静态位置
{col:140,row:68}——两者不同坐标系（移动起点 vs 实体生成位置），卡文无误。
源 `data/extracted/data/scene/4.json` e76 = id76 pos(1152,1664)autoLabel=L_872 sState=2 spriteNum=32 核实成立。

**GLM 非阻塞建议（不阻塞 build 准入）**：
1. build 期正式 ledger 须从 immutable extracted source + P7 owner/control graph + published W9 parent + 地图
   生成（不从当前 generated JSON 猜 source）——discovery 工具已证红项与三口径，但卡文 §3 明示它「不能冒充
   完整 control-flow dry executor」，正式 ledger/dry executor 是 build 交付物，GLM 仅核实设计口径正确。
2. 33/88/237 的非互斥性（unknown∩endpoint=63 等）须在正式 ledger 的逐 context disposition 表里显式处理
   重叠（同一 context 可能同时需 origin proof + endpoint/segment disposition），不能按 33/88/237 三数
   简单相加分桶。

Evidence: `audit-entity-motion.mts` 本人实跑 exit 0 summary（294/989/426/117/333/65/311/60/93/1005-247-327-143/
33/88/237/7 全项）+ sequentialSegmentTerrainBlocked e76 记录 (139,50)→(132,50) firstBlocked 136.75 +
data/extracted/data/scene/4.json e76(1152,1664,L_872,sState2)。只读核查 + 实跑，未改实现文件，未代签 Kimi。

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- done 准入结论: blocked

## Kimi 设计复审记录（2026-08-12，本人；只读核查，未改实现，未代签 GLM）

- **同 content13 successor ✓**：append-only 结构镜像已验证的 W9 先例（`_transitions/` seal +
  baselineMetadata.transitions + affected-file allowlist；工程不携带 baseline transition metadata，
  `pal-w9-entity-lifecycle.ts:466-467`），manifest 字节不变、contentVersion 13 / SAVE8 不动的
  声称与该结构一致。
- **D15→W9 rewind/seal ✓**：基线路径 `assertRewoundW9Parent`（`pal-w9-entity-lifecycle.ts:366-384`）
  先比 successor publish surface digest、再折叠、再比 parent digest + B10 graph/seal——D15 顶层
  改动会让任何未升级 D15-aware 的 W9 消费方当场 fail-loud，不存在静默腐蚀路径；外层顺序
  D15→W9→B10→… 与 `migrate-content.mts:472-483` 的既有 rewind-then-rebuild 模式兼容。
- **Reforge motion contract ✓**：`entity-motion.ts:217-231` 的 `motionTerrainSweepBlocked`（≤0.25
  采样含 endpoint + footprint）即卡文所指 production 合同；reforge 现有 additive subpath 导出
  先例（`entity-action-player`、`script-compiler-v5`），migrate devDependencies 已含
  `@type-pal/reforge: workspace:*`，依赖方向 migrate→reforge 无环；seal 绑定 contract version
  使 runtime 合同变化 fail-closed，设计成立。
- **cursor/SAVE8 ✓**：`FlowCursor`（`packages/content/src/script-v5.ts:32-34`）仅
  `stage`/`state` 两种身份、无命令数组下标，卡文「cursor 不保存 command index」属实；expansion
  在 stage body 内原位替换 leaf 不扰动持久 cursor，§5 的三类 fixture + 破坏即停止升级条款足够。
- **0/0/0 重放 ✓**：普通 current13「rewind D15→rewind W9→分别重建→plan 0/0/0」镜像已验证的
  W9 模式（`migrate-content.mts:546-562`）；disposition 表（detour 须 endpoint 开放 + origin
  证明 + 全 origin 安全、endpoint-adjust 禁止自动最近可走格、exit-truncate 须 source 退场证明、
  unresolved 不得冒充 safe）闭合 33/88/237 缺口；detour 搜索固定邻居序 + UTF-16 tie-break +
  每腿 production trace 复验，满足 byte-identical 重放。
- **build 期执行钉（非 blocker，落实现时执行）**：`rewindPublishedW9PublicationIfPresent` 现有
  10 个调用点（含 5 个测试与 source-ledger）；D15-aware 应实现为两个 rewind 入口
  （baseline 用 `rewindPublishedW9PublicationIfPresent`、工程用
  `rewindPublishedW9ProjectAgainstPublishedBaseline`）上游的统一 choke point，而非逐调用点修补。
  注意工程侧入口（`pal-w9-entity-lifecycle.ts:440-474`）折叠前无 surface digest 预检，D15
  顶层内容会先漏过、由下游 B10 digest 兜底（仍 fail-loud，但错误定位晚一层）；choke point
  必须同时盖住工程路径。遗漏站点的安全网已核实为 fail-loud，不构成设计 blocker。

## 视觉验证记录

- Visual Verification Owner: Kimi + User
- Visual Verification Timing: 代码冻结后的集中 E2E；开发期只运行 deterministic trace / headless fixture。
- 入口: s004/e76 完整一圈；其余按 disposition 各抽代表，路径与预期由 ledger 输出。
- 证据路径: `output/playwright/d15-2/`（待 build）。
- 结论: pending。

## 交接日志

- 2026-08-13 Codex: D15-1 PAL-wide discovery 发现 33 endpoint / 88 sequential segment 红项，并用
  s004/e76 浏览器实证旧路线会永久等待，依上游铁律开卡。
- 2026-08-13 Codex: 完成 v1 设计并签 agree；把 registry 426/117、source ledger、production motion
  contract、逐项 route disposition、same-version append-only rewind 与 save/cursor 负证写成 build 门禁。
  Next: Kimi 审迁移架构 / seal / cursor，GLM 审 426 全域覆盖 / dry executor / 数据账；两席 agree 前
  保持 draft，不得修改 migrate/content 实现。
- 2026-08-12 Kimi（本人迁移架构主审）: 签 **agree（附 1 条 build 期执行钉）**。五面压测记录见
  「Kimi 设计复审记录」；执行钉：D15-aware rewind 应落在两个 W9 rewind 入口的统一 choke point
  （含工程侧无预检路径），而非逐调用点修补；遗漏站点已核实 fail-loud，不构成 blocker。
  Next: GLM 审 426/117/333/65/311/60、93 selector-only、1005 move 与 33/88/237 disposition 闭包；
  GLM agree 前保持 draft，不得修改 migrate/content 实现。

## 下一位 Agent 提示词

请先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、D15-1 与本卡。当前 Status=draft，
Codex 已签设计 agree；Kimi 已签 agree（附 1 条 build 期执行钉：D15-aware rewind 统一 choke point，
见「Kimi 设计复审记录」末节）；请只读审查，不得改实现。GLM 重点复算：426/117/333/65/311/60、
93 selector-only、1005 move、stages/stateMachine/branch/loop/cross-target origin proof、33/88/237
disposition 闭包。输出明确 `agree` 或逐条 `counter`；不得代签另一席。GLM 设计签字未齐前不得开始
migrate/content build，不得标记 D15-1 review/done。

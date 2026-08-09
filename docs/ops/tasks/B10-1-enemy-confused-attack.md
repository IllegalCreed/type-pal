# B10-1 - 混乱敌人攻击同伴

Status: draft
Phase: phase2
Capability: B4 / B5 / B10
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Unavailable Agents: none（2026-08-07 GLM/Kimi 均已恢复,补审中）
Branch: `codex/b10-1-enemy-confused-attack`

## 目标

修复 Reforge 中敌人处于“乱”状态后仍照常施法、变身、召唤、逃跑或攻击玩家的问题。敌人混乱时必须按一阶段机制真值保留完整 RNG 顺序：先完成一次随后会被丢弃的玩家目标抽样，再从包含源编队空槽的全敌槽拒绝死/空后抽取一个活敌；抽到自己则本回合跳过，抽到同伴则走专用伤害公式和专用演出。

## 范围

- 范围内:
  - battle-core 敌人混乱决策、结算和 `lastAction` 证据。
  - battle-session 专用表现路由。
  - battle-anim 专用滑步、命中特效、受击抖动和复位时间线。
  - `EnemyTeamDef` / 上游迁移对原始编队空槽的语义保留；以 contentVersion 12
    append-only successor 发布，不改写已冻结的 contentVersion 11。
  - 编辑器本地工程 v11→v12 原子升级、敌队槽位编辑 UI 和 PAL 生成工程发布闭环。
  - SAVE8/content10|11→content12 的纯 identity normalization；世界态与 SAVE_VERSION 不变。
  - core / session / animation 回归测试。
- 范围外:
  - 玩家混乱行为；现有有意偏离不改。
  - 存档世界态、SAVE_VERSION 和世界实体生命周期；本卡只处理 content epoch envelope 兼容。
  - backlog 18b / W9 的明雷逃跑冷却和怪物重现。
- 明确不做:
  - 不把混乱攻击同伴塞进普通敌人物攻链。
  - 不用“随机另一只敌人”替代“包含自己、抽到自己 Pass”。
  - 不增加 jitter、暴击、格挡、援护、护体、附毒或攻击音。

## 上下文锚点

- 已拍板决策 / 铁律:
  - 用户于 2026-07-30 要求游戏机制直接参考一阶段 `docs/phase1/game-mechanics.md` 已核实真值，不得猜测。
  - `docs/phase2/READ-FIRST.md` 铁律 9：战斗/数值/机制真值以 `game-mechanics.md` 为首选，一阶段实现同时是演出 UX 真值。
  - 本任务涉及伤害公式，按高风险任务开卡；三方设计签字前不得修改实现文件。
- 代码锚点(`file:line`):
  - `docs/phase1/game-mechanics.md:833-883`：敌人混乱选目标和伤害真值。
  - `reference/sdlpal/fight.c:4489-4517`、`reference/sdlpal/fight.c:4578-4654`：原始目标选择、结算和演出。
  - `packages/game/src/core/battle/enemy-ai.ts:68-117`：一阶段全槽拒绝采样、自身 Pass 与状态优先级。
  - `packages/game/src/core/battle/actions/attack.ts:464-524`：一阶段专用公式与结算。
  - `packages/game/src/core/battle/anim-timeline.ts:1170-1240`：一阶段专用动画。
  - `packages/reforge/src/battle/battle-core.ts:639-646`、`:727-746`、`:2133-2253`：当前 decision、AI 与敌行动。
  - `packages/reforge/src/battle/battle-session.ts:2032-2074`：当前只处理玩家 `attackMate` 的表现路由。
  - `packages/reforge/src/battle/battle-anim.ts:1-100`：Reforge 动画帧模型。
- 已知坑 / 审计文档:
  - `projects/pal/content/skills.json` 的鬼降会对敌人施加 `confused`，缺口真实可达。
  - 当前 ready hook 已禁止 confused 敌执行，`applyEnemyEffect` 也禁止其变身/召唤；普通 AI 决策仍漏掉混乱分支，必须在 rules/fallback 前截断。
  - 一阶段按全敌槽拒绝死/空采样，不能先构造活敌列表，否则分布虽同但 RNG 消耗不同。
  - 原版与一阶段都会在 sleep / paralyzed / confused 分支前先抽一次玩家目标；混乱分支会丢弃这个结果，但 RNG 消耗不能省。
  - 当前二阶段 `EnemyTeamDef.members`、迁移器和 runtime 都会压紧/过滤空槽；原始 380 队中有 68 队含 `0` 槽，其中 56 队仍有至少两个有效敌人。只对当前 `s.enemies` 采样无法忠实还原这些队伍的 RNG 流，不能把“活目标分布相同”冒充严格忠实。
  - 一阶段稳健处理物抗 0 为“不除”；当前 PAL 153 个敌人物抗实际最小 1、最大 99、零值 0 个，但编辑器/测试仍可构造 0。
  - 2026-08-09 接手复核发现：原三方设计签字早于 contentVersion 11 正式冻结。直接把
    `members` 改成 `slots` 会改写已发布 epoch，必须新开 contentVersion 12 successor 后再做。
  - `script.c:009E/009C` 进一步证明动态槽上限不能简化成常量：summon 只填当前
    `[0..wMaxEnemyIndex]` 内空槽且不足时整体失败；divide 扫描固定 5 槽，可扩展
    `wMaxEnemyIndex` 到最高新占用槽并按新布局重算站位。
- 不得重新引入:
  - 抽到自己后重抽。
  - 让混乱敌继续跑 AI rules / fallback。
  - 用钳后 HP 差显示超杀伤害；真值显示完整公式伤害，HP 自身钳到 0。
  - 借本任务改变玩家混乱或全局普通敌 AI 的 RNG 契约。
- 相关测试:
  - 一阶段 `packages/game/src/core/battle/__tests__/enemy-ai.test.ts:158-210`。
  - 一阶段 `packages/game/src/core/battle/__tests__/actions.test.ts:953-1003`。
  - 一阶段 `packages/game/src/core/battle/__tests__/anim-timeline.test.ts:1357-1405`。
  - `docs/phase2/foundation/phase1-knowledge-harvest.md:316-379`。
  - `docs/phase2/battle-presentation-audit-2026-07-05.md`。
  - [`docs/ops/audits/b10-1-source-slot-census-2026-08-09.md`](../audits/b10-1-source-slot-census-2026-08-09.md)：G1/G2 可复现 census 与 20 支交叉队伍。

## 验收条件

- 功能:
  - 无活玩家保持当前战斗结束边界；存在活玩家时先按全玩家槽拒绝死亡角色抽一次目标，再判 sleep/paralyzed/confused。sleep/paralyzed 仍 Pass，但精确消费这次 RNG。
  - confused 在任何 AI rule/fallback 前截断；`silence + confused` 仍攻击同伴，`sleep/paralyzed + confused` 必须 Pass。
  - 从保留原始语义空槽的完整敌槽 `[0..max]` 抽取，死/空拒绝重抽；包含自己，抽到自己直接 Pass。64 次异常保护耗尽后 Pass，消费次数有界。
  - 专用公式精确为：
    - `str = SHORT(attacker.attackStrength) + (attacker.level + 6) * 6`
    - `def = SHORT(target.defense) + (target.level + 6) * 4`
    - `damage = calcBaseDamage(str, def) * 2 / target.physicalResistance`
    - 物抗非 0 时整数截断；0 时不除；结果 `<= 0` 保底 1；HP 钳到 0。
  - `lastAction` 保留目标敌槽和完整公式伤害；dualMove 两次行动独立选目标、独立消费 RNG。击杀经验、金钱和胜利检查只结算一次。
  - 专用动画 12 帧：3 帧递归中点滑步、effect 9/10/11、4 帧目标抖动/首帧伤害数字、Delay5、攻击者复位 Delay2；无声音。
- 测试:
  - 决策覆盖无活玩家、sleep、paralyzed、confused 的精确 RNG 消耗；选同伴、选自己、仅自己、原始空槽/死亡槽拒绝重抽、64 次保护、dualMove 独立抽样。
  - 全表证明 cast / transform / summon / divide / flee / fallback 被 confused 绕过。
  - 结算覆盖标准值、高防保底 1、物抗截断、物抗 0、SHORT 正负边界、超杀数字、无额外 RNG 和无普通防御链。
  - 动画逐帧断言 midpoint、overlay、抖动、数字、时长与最终复位；每帧无声音且不进入普通攻击/法术 sprite，缺 effect sprite 时仍保持时序。
  - session 证明 enemy `attackMate` 进入专用 timeline，不落普通敌人物攻。
  - 击杀结算只发生一次，终局前仍完整播放专用时间线；session 使用 `lastAction.damage` 完整 overkill 数值而非 HP 差。
- 文档:
  - 更新 `design-backlog` 18a 与 capability-map B10 备注；任务卡记录验证证据。
- 视觉 / 手工验证:
  - 开发期只做确定性逐帧/路由测试；战斗演出实走登记到代码冻结后的集中 E2E，不在 build/review
    多 Agent 重复截帧。敌队槽位编辑器属于功能性界面，允许 Codex 做一次最小浏览器验证。

## 推进签字

### 进入 build 前:设计签字

> **2026-08-09 门禁重开。** 下方 2026-08-06/07 的签字保留为战斗真值的历史审查证据，
> 但不再覆盖 content epoch、编辑器升级、SAVE envelope 和 summon/divide 动态上限的
> 新增设计。content v11 已发布冻结；在本增补三方重新签字（或用户明确豁免）前，
> **不得修改实现文件、不得把任务标为 build/done**。

#### v12 增补的当前有效签字

- Codex: **agree**（2026-08-09，完成 v11→v12 successor 方案与源 `009E/009C` 动态槽
  复核；接受条件见「2026-08-09 v12 设计增补」）
- Kimi: **pending**（需复核 content/save/editor/migration 原子升级及 K1-K5）
- GLM: **pending**（需复核发布账本、源槽 census、oracle/回放矩阵及 G1-G4）
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: **blocked（等待 v12 三方 agree 或用户批准缺签豁免）**

#### 2026-08-07 历史战斗设计签字（不作为当前 v12 build 门禁）

- Codex: **agree**（2026-08-06，语义空槽 schema 冻结：0/65535 语义区分、slots 数组
  保序保空、迁移 fail-loud——见设计结论 1）
- Kimi: **agree**（2026-08-07，额度恢复补审，战斗分层/表现路由主审：decision 截断/
  独立 helper/session 路由/专用动画分层对源成立，附 K1-K4 build 准入钉——站位空槽
  表现、召唤落槽规则、路由负测、lastAction 消费边界；见「Kimi 设计压测」）
- GLM: **agree（2026-08-07，公式/覆盖矩阵主审：slots schema（0 占位 vs 65535 跳过、保序保空、wMaxEnemyIndex=slots.length-1）对源 battle.c:1595-1658 + fight.c:4489-4517 + game-mechanics.md:889 kBattleActionAttackMate 核实成立；attackMate 公式独立 helper + lastAction.damage 完整记录口径正确。附 G1 build 准入钉：380 队源槽 census（68 含 0 槽 / 56 多活敌 / 槽位守恒）由 build 期 GLM 冻结。见「GLM 设计压测」）**
- counter / 分歧处理: 无 counter（历史记录）
- 缺签豁免: N/A（历史记录）
- build 准入结论: **superseded**（被 2026-08-09 v12 增补门禁替代）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **冻结语义槽 schema（2026-08-06，源自 battle.c:1595-1658 + fight.c:4489-4517）**：
   - **`0` 与 `65535` 语义不同**：battle 初始化 `if (w == 0xFFFF) continue`（65535 不占位）；
     `0` 不满足 `w != 0` 不生成敌人，但 `rgEnemy[i++].wObjectID = w` **占位并计入
     `wMaxEnemyIndex`**（`wMaxEnemyIndex = i - 1`，i = 非 65535 条目数）。混乱抽样
     `RandomLong(0, wMaxEnemyIndex)` 在全槽范围迭代，`wObjectID==0`/死槽重抽。
   - **schema**：`EnemyTeamDef.slots: Array<string | null>` —— 数组长度 = 源编队
     非 65535 条目数（= wMaxEnemyIndex+1）；每个位置 = 敌人 slug（源有效值）或
     `null`（源 `0` 空占位）；**顺序与空位保留，不得压紧**。淘汰旧
     `members: string[]` 压缩列表（spawn 由 slots 派生）。
   - **迁移**：`mapEnemyTeams` 逐源条目：`65535` → 跳过；`0` → `null` 占位；有效
     值 → slug；未知 id fail-loud；**空位不压缩、顺序不变**。380 队全量源槽 census
     （68 队含 `0` 槽、56 队 ≥2 有效敌、总槽数守恒）由 GLM 冻结。
   - **runtime 初始态**：battle 固定 5 槽与 `slots` 前缀一一对应（含 null），初始
     `wMaxEnemyIndex = slots.length - 1`；混乱抽样在当时 `[0..wMaxEnemyIndex]` 迭代，
     null/死重抽、自身 Pass、64 次 failsafe。summon 不扩上限，divide 才可把上限扩到
     新占用槽（完整规则见 v12 增补）。
2. `EnemyDecision` 增加内部 `attackMate` 形态，携 `targetEnemyIdx`；runtime battle slots 与语义编队槽一一对应。
3. `decideEnemyAction` 在无活玩家门之后，先完成一次玩家目标拒绝抽样，再判 sleep/paralyzed/confused；confused 在构建普通 AI view 之前处理。按完整敌槽拒绝空/死槽，64 次仅作异常 RNG fail-safe；抽到自身返回 Pass。
4. `performEnemyAction` 为 `attackMate` 走独立 helper，使用局部 SHORT cast 与 `calcBaseDamage`；结算后把完整公式伤害写入内部 `lastAction.damage`。
5. `battle-session` 在通用非 attack 过滤前识别敌方 `attackMate`，读取双方 `basePos`、目标 frame0 高度与已结算 damage，调用专用 builder。
6. `battle-anim` 按一阶段 12 帧 UX 真值移植；不复用普通攻击音、攻击帧或防御表现。

### 2026-08-09 v12 设计增补（当前有效，待 Kimi / GLM 复审）

#### A. content epoch 与本地工程升级

1. **v11 immutable parent**：`projects/pal` 当前 `contentVersion: 11` 及其 baseline
   不得原地改成 `slots`。B10 发布是新的 `contentVersion: 12` successor，
   `minimumSaveVersion` 继续为 8，`SAVE_VERSION` 不变。
2. `WorldStateV12 = WorldStateV11`（只增加内容 epoch，不复制世界态）；content 导出新增
   `LegacyManifestV11`，`CurrentManifest` 改为 `ProjectManifest<12>`，并提供严格的
   `upgradeManifestV11ToV12`（只接受 v11/min8）。旧 v4…v10 本地升级链必须在内存中
   直接闭环到 v12，不能把 v11 中间形状写盘后再让当前 loader 读取。
3. `EnemyTeamDef` v12 只接受 `{ id, slots: Array<string | null> }`；v11 历史形状由
   `LegacyEnemyTeamDefV11` / `upgradeEnemyTeamsV11ToV12` 消费。通用本地工程的
   `members` 按原顺序映射为全是 string 的 `slots`（无法凭空恢复已被 v11 压掉的 PAL
   空槽）；PAL 生成工程必须走上游 source mapper，不能用该兼容升级器补空槽。
4. 编辑器升级必须先在 overlay 中同时校验 v12 manifest + 槽位文件 + 全量 canonical
   loader，再以 `enemy-teams.json` 在前、`manifest.json` 最后提交；任一半状态、重复 id、
   非 `string|null` 槽、超过 5 槽或未知敌 id 都 fail-closed。编辑器槽位 UI 的“清空”保留
   `null` 位置；“删除槽”才改变数组长度，新增槽只能在 5 槽上限内追加。

#### B. runtime 槽位与源 `009E/009C` 动态上限

1. 战斗态必须保留**固定容量 5 的带洞槽数组**（实现可用 `enemySlots` 或等价显式
   `slotIndex/maxEnemyIndex` 结构，但不得再用 dense `enemies.length` 代替源索引）。
   初始 `maxEnemyIndex = slots.length - 1`；`null` 槽占索引、占站位/随机范围但不生成敌人。
2. 初始站位按当前 `maxEnemyIndex + 1` 的布局和槽索引派生；空槽留洞。所有玩家选敌、
   混乱抽样、`lastAction.targetEnemyIdx` 和演出路由都解释为语义槽索引。
3. **summon (`script.c:009E`)**：只扫描 `0..maxEnemyIndex` 的空槽；请求数量大于可用
   空槽时整次失败并走 failure branch，不扩展上限；成功时按升序填槽。该规则须覆盖
   PAL 中含空槽且带 summon 的 20 支队伍（含 team-65/66/290）。
4. **divide (`script.c:009C`)**：仅一名活敌且 HP>1 时执行；扫描固定 5 槽填充，成功后
   `maxEnemyIndex` 扩到最高新占用槽（可超过初始 slots 长度），并按新上限重算所有敌人的
   原始站位；不把 divide 错当作 summon 的“当前上限内填槽”。覆盖 team-84/87/303/304。
5. 混乱每次行动在当时的 `0..maxEnemyIndex` 上做全槽拒绝采样（null/死槽重抽、抽到
   自己 Pass、64 次保护）；因此 divide 后随机范围随源规则扩大，dualMove 两次独立。

#### C. PAL append-only migration / replay

1. 新 transition id 暂定 `b10-enemy-team-slots-v1`，seal 路径暂定
   `_transitions/b10-enemy-team-slots-v1.json`。seal 至少绑定：parent content11
   `enemy-teams.json` digest、source `enemy-teams.json` digest、method version、
   380 队 census、successor `slots` digest 和自身 digest。
2. 发布 builder 只能从已加载的 content11 baseline 复制其它托管文件，替换
   `content/enemy-teams.json` 并 append seal；manifest 以 v12 原子切换。必须使用
   `appendOnlyTransitionState` 四元组（metadata/file/managed/hash），已发布 replay
   要求 `published == authority`，禁止无条件覆盖历史 seal/文件。
3. R13-6B / R13-Z / canary 的历史回放在剥离旧权威前，必须先
   `rewindB10PublicationIfPresent` 恢复 content11 的 `{members}` 表面并移除 B10 四元组；
   半状态、parent digest、重建 source census 任一不符都 fail-closed。B10 replay 本身
   必须是 0 writes/0 deletes/0 conflicts。
4. 发布后重录 PAL oracle（producer contract、manifest/content 快照和 projection 按实际
   结果更新），不能只手改 `projects/pal/content/enemy-teams.json` 或旧 fixture fingerprint。

#### D. SAVE / loader 兼容矩阵

- 当前 canonical loader 只接受 manifest content12。
- SAVE8/content10 与 SAVE8/content11 均可在 v12 工程中被预检并纯内存 normalize 到
  SAVE8/content12；SAVE8/content12 直接通过；其它组合拒绝，且不读 sidecar。
- `SavePayloadV8` 的 world 仍为 `WorldStateV12`，normalize 继续执行现有
  `skillUseCounts` 严格补齐/校验；本卡不得顺手放宽存档边界。

#### E. 增补验收钉

- **G1**：源 380 队 / 原始 1900 项；65535 跳过后 861 语义槽，其中 104 个 `0` 空槽、
  757 个有效槽；68 队含空槽、56 队含空槽且至少两名有效敌；生成前后槽位总数守恒。
- **G2**：含空槽 + summon/divide 的队伍 census 与四条动态规则逐队钉住，不能只测合成两敌。
- **G3**：v11 baseline→v12 successor 的 seal/replay/rewind、manifest 原子提交、oracle
  重录和 R13 历史回放全矩阵；任何已发布内容被重写即 fail。
- **G4**：SAVE8/content10|11|12 预检/normalize 矩阵，v11 本地工程原子升级与半状态恢复。
- **K1**：固定 5 槽 + `maxEnemyIndex` 的类型/站位实现与空洞视觉；不允许 dense array 偷换。
- **K2**：summon 当前上限内填槽、divide 固定容量扩上限及站位重算的源对拍。
- **K3**：enemy/player `attackMate`、普通敌物攻/法术三路负测，`lastAction` union 按 kind 收窄。
- **K4**：编辑器清空/删槽/加槽 round-trip 与 v11→v12 overlay 全量 loader 闭环。
- **K5**：战斗演出实际回放登记集中 E2E；开发期只保留逐帧单测，编辑器功能页做一次最小
  浏览器验证。

### 已知风险

- 风险: `lastAction.target` 当前在敌行动中通常表示玩家槽，新增同伴攻击后语义依赖 kind。
- 缓解: decision 使用显式 `targetEnemyIdx`，session 仅在 `side=enemy && kind=attackMate` 时按敌槽解释；补类型和路由负测。
- 风险: 超杀显示值与 HP diff 不同。
- 缓解: 结算时记录完整 `damage`，动画不事后从 HP diff 推导。
- 风险: 伤害公式可能被误接到普通物理函数。
- 缓解: 测试用 defending/protect/固定 RNG 证明普通链完全未参与。
- 风险: 为空槽改 schema 会影响 380 支敌队的站位、召唤房间和随机流。
- 缓解: 380 队全量源槽 census 已读出 1900/861/104/757（68 个含空槽、56 个含空槽且多活），
  另钉 20 支含空槽 summon/divide 队；v12 successor、固定 5 槽与动态 `wMaxEnemyIndex`
  三方复审后再实现。
- 风险: v11 已发布，直接替换 `members` 会破坏 immutable baseline 与旧 R13 回放。
- 缓解: 新增 B10 append-only seal + v11 rewind + v12 loader/save/editor 升级；任何
  published authority 漂移均 fail-closed。

### 主审立场

- Reviewer: Kimi（战斗分层/表现路由）+ GLM（公式/覆盖矩阵）
- 结论: **历史 GLM agree（附 G1）+ Kimi agree（附 K1-K4）；v12 增补待复审**
- 必改项: 见 G1 + K1-K4（build 准入钉）
- 是否建议进入 build: **当前不得进入 build；等待 v12 增补三方 agree**

### 三方争议记录(按需)

- Codex: 二次核对后撤回“省略废弃玩家抽签”的初稿；严格采用一阶段完整 RNG 顺序，并把源编队空槽保留纳入设计门禁。
- Kimi: **agree（2026-08-07，战斗分层/表现路由主审）**。详见「Kimi 设计压测」。
- GLM: **agree（2026-08-07，公式/覆盖矩阵主审）**。详见「GLM 设计压测」。
- 用户拍板: 2026-07-30，一阶段游戏机制文档是真值，不得猜测。

#### Kimi 设计压测（2026-08-07，战斗分层/表现路由，额度恢复补审）：**agree（附 K1-K4 build 准入钉）**

**方法**：只读设计压测；一手核 battle-core.ts summon/敌行动现状（:288/:791/:856 召唤
落槽引用、:2098 已有玩家 attackMate 路由先例）、enemies.json summon 使用面（32 处）、
game-mechanics.md:833-883 真值段。未修改实现。

**对源核实（战斗分层成立）**：

1. **decision 截断分层**：无活玩家门 → 废弃玩家目标抽样（RNG 消耗不省）→
   sleep/paralyzed/confused 判定 → confused 在构建普通 AI view 前截断——对源完整 RNG
   顺序;cast/transform/summon/divide/flee/fallback 全表绕过证明进测试矩阵 ✓。
2. **表现路由**：session 在通用非 attack 过滤前识别 `side=enemy && kind=attackMate`、
   按敌槽解释 targetEnemyIdx;lastAction.damage 记完整公式值（不从 HP diff 推导）——
   与现状 :2098 玩家 attackMate 路由并列同构,路由模式有先例 ✓。
3. **独立 helper + 专用动画 12 帧**:SHORT cast + calcBaseDamage 独立 helper 不接普通
   物理链;专用滑步/effect 9-11/抖动/复位时间线不复用普通攻击音帧——一阶段 UX 真值
   移植口径正确 ✓。
4. **dualMove 独立抽样、64 次 failsafe 有界** ✓。

**K 钉（build 准入必落,增量于 G1,不阻塞 agree）**：

- **K1（站位空槽表现）**:slots 保序保空后,spawn 派生的**战斗站位**必须写明规则——
  空槽是否留站位空洞（源 rgEnemy 数组空槽不生成敌人,有效敌站位按槽位索引分布);
  若压紧,68 队的站位观感偏移。build 前写明「站位按槽位索引派生（空槽留位）」或
  用 census 证明原版站位不依赖空槽;68 队代表队进视觉验收。
- **K2（召唤/分身落槽规则）**:battle-core 有 summon（enemies.json 32 处引用）——
  原版召唤/分身写 `wObjectID==0` 空槽;slots null 槽可否被召唤填充必须写清
  （可填 → 填充后参与混乱抽样,语义自洽;不可填 → 注明偏离与影响面,68 队中哪些
  队含召唤敌进 census 交叉）。
- **K3（路由负测）**:attackMate 路由 side/kind 双判据;普通敌物攻/法术/玩家 attackMate
  （:2098 现状）路径零回归测试;session 不误把敌 attackMate 送进普通敌物攻时间线。
- **K4（lastAction 消费边界）**:lastAction.target 语义分裂（玩家槽 vs 敌槽）已由显式
  targetEnemyIdx 规避 ✓;钉:所有 lastAction 消费点（session 演出/日志/测试断言）按
  kind 判据路由,类型层 union 收窄,防后续消费点误读 target。

**结论**：**agree**。decision/结算/表现三层划分与一阶段真值对齐;K1-K4 为 build 验收钉,
不阻塞准入。建议进入 build(G1 census 由 GLM build 期冻结)。

**边界**：本 agree 只准入 B10-1 build,不代表 done。

#### GLM 设计压测（2026-08-07，公式/覆盖矩阵）：**agree（附 G1 build 准入钉）**

**方法**：只读设计压测；一手核实 game-mechanics.md:889（kBattleActionAttackMate 混乱攻击同伴真值）、
battle.c:1595-1658 / fight.c:4489-4517 锚点（卡内引用）、slots schema + 迁移 + runtime 口径。未修改实现。

**对源核实（设计成立）** ✅：
1. slots schema（0 vs 65535 语义区分）：battle 初始化 `if (w==0xFFFF) continue`（65535 不占位）；
   `0` 不满足 `w!=0` 不生成敌人但 `rgEnemy[i++].wObjectID=w` 占位并计入 wMaxEnemyIndex——与源逐条吻合。
   `slots: Array<string|null>` 保序保空（null=源 0 空占位）、不压紧，spawn 由 slots 派生——正确。
2. wMaxEnemyIndex = slots.length-1 + 混乱抽样在 [0..slots.length-1] 全槽迭代、null/死重抽、自身 Pass、
   64 次 failsafe——对源完整 RNG 顺序（含废弃玩家抽样）。
3. attackMate 公式独立 helper（局部 SHORT cast + calcBaseDamage）+ lastAction.damage 完整记录（不从
   HP diff 推导）+ 不复用普通攻击音/帧/防御——公式隔离纪律正确。
4. session 路由 `side=enemy && kind=attackMate` 按敌槽解释 targetEnemyIdx，负测防误接普通物理链——口径清晰。

**G 钉（build 准入必落，非 agree 阻塞）**：
- **G1（380 队源槽 census——GLM build 期冻结责任）**：380 队全量源槽 census 必须落——68 队含 0 槽、
  56 队 ≥2 有效敌、总槽数守恒（生成前后槽位不漂）。这是设计卡明确的 GLM 责任，build 前冻结；
  含空槽队伍的站位/召唤房间/随机流影响须在 census 里钉死。

**结论**：设计方向干净、slots schema 对源、公式隔离纪律正确，RNG 顺序完整（含废弃抽样）。**agree**。
G1（380 队源槽 census）为 build 准入必落钉——GLM 席位于 build 期冻结。建议进入 build（blocked on Kimi
战斗分层/表现路由主审）。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: **不得开始**；2026-08-09 发现旧签字早于 content v11 发布，v12 增补尚缺 Kimi/GLM 设计签字。
- 实现摘要: pending（不得把设计草案当实现）
- 运行命令: pending
- 浏览器 / 手工检查: 战斗剧情/演出视觉 deferred 到集中 E2E；编辑器功能页待 build 后最小验证。
- 跳过的检查及原因: 设计门禁未满足，未修改实现文件。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-30 Codex: 对照一阶段机制文档、实现与 SDLPal 完成只读审计；确认缺口覆盖 decision、结算、lastAction、session 路由和专用动画，而非单一 if 分支。
- 2026-07-30 Codex 二次真值核对: 初稿漏了 confused 前废弃玩家目标抽样；同时发现二阶段已压掉 68/380 队的原始空槽。已撤回 Codex 设计签字并把 slot schema / migration 纳入门禁。Next: 先冻结精确槽位方案，再由三方设计签字。
- 2026-08-06 Codex: 语义空槽 schema 冻结完成（battle.c:1595-1658 一手核实）：
  `0` 占位计入 wMaxEnemyIndex、`65535` 不占位（`if (w == 0xFFFF) continue`）；
  `EnemyTeamDef.slots: Array<string|null>` 保序保空，length = 非 65535 条目数；
  迁移 65535→跳过/0→null/有效→slug，未知 id fail-loud；runtime wMaxEnemyIndex=
  slots.length-1，混乱抽样全槽重抽。Next: Kimi/GLM 设计压测签字。
- 2026-08-07 GLM: 设计压测 agree（G1 380 队源槽 census,build 期冻结）。
- 2026-08-07 Kimi: 额度恢复补审,设计压测 **agree（附 K1-K4）**——三方 agree 齐,
  **build 准入 allowed**。K1 站位空槽表现规则、K2 召唤/分身落槽规则（enemies.json
  32 处 summon 引用的真实交叉点）、K3 路由负测（玩家 attackMate 现状零回归）、
  K4 lastAction 消费边界 kind 判据收窄。详见「Kimi 设计压测」。Next: Codex build
  （G1 census 由 GLM build 期冻结）。
- 2026-08-09 Codex: 接手后先检查已发布 manifest/baseline，确认当前 contentVersion=11
  已冻结；同时对照 `script.c:009E/009C` 发现 summon 不扩 `wMaxEnemyIndex`、divide 才扩
  固定 5 槽。撤回旧 build 准入，写入 v12 epoch / editor / SAVE / append-only replay
  增补；当前只保留 Codex agree，等待 Kimi/GLM 设计复审。

## 下一位 Agent 提示词

```text
接手任务: B10-1 混乱敌人攻击同伴 v12 设计复审
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
当前状态: draft；v12 增补 Codex agree，Kimi/GLM pending，build 准入 blocked。
你的角色: 审查方——只读审查设计；不得修改实现文件、不得标记 build/done。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(尤其「2026-08-09 v12 设计增补」);
  docs/phase1/game-mechanics.md:833-883、fight.c:4489-4517/4578-4654、
  一阶段 enemy-ai.ts:68-117/attack.ts:464-524/anim-timeline.ts:1170-1240、
  `reference/sdlpal/script.c:2776-2945`。
输出必须明确：
  1) `agree` 或 `counter`；
  2) v11 immutable→v12 successor、SAVE8/content10|11→12、editor 原子升级是否闭环；
  3) 固定 5 槽、summon 不扩上限、divide 扩 max 的源对拍；
  4) append-only seal/replay/rewind、R13 历史回放和 oracle 重录门禁；
  5) 你要求的返工项或用户待拍板问题。
若签 `agree`，请在本卡「v12 增补的当前有效签字」留下日期、审查范围和 G/K 钉；若 `counter`，
停止推进并写清冲突。不得开始实现、不得标记 done。
```

```text
接手任务: B10-1 混乱敌人攻击同伴 v12 设计复审（GLM 侧重点）
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
请只读核对 G1-G4：源 380 队/1900 原始项/861 语义槽/104 空槽/757 有效槽，20 支
空槽+summon/divide 交叉队；v11 baseline→v12 seal/replay/rewind 与 oracle/R13 历史回放；
SAVE8/content10|11|12 预检矩阵。输出 `agree` 或 `counter` 及具体理由，不得改实现文件。
```

```text
接手任务: B10-1 混乱敌人攻击同伴 v12 设计复审（Kimi 侧重点）
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
请只读核对 K1-K5：固定 5 槽与 maxEnemyIndex 的类型/站位保持、summon 与 divide 的不同
落槽/扩上限规则、enemy/player attackMate 与普通物攻/法术的 session 路由隔离、
lastAction union 收窄、编辑器清空/删槽/加槽的可逆 UX，以及战斗演出 deferred 到集中 E2E
而编辑器功能页仅做一次最小视觉验证。输出 `agree` 或 `counter`、具体返工项/用户裁决点；
不得修改实现文件、不得标记 build/done。
```

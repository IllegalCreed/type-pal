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
- Kimi: **counter（2026-08-09，最小 6 条，方向全部认可）**——v11 immutable 前提、epoch/SAVE/
  编辑器升级机制、源 009E/009C 规则、append-only 同构性均逐条核实成立；以下缺口必须先落卡
  （改卡文，不改方向），落实后 Kimi 可快速转 agree：
  1. **C1 seal 增绑 parent transition digest**：现有每条 seal 都绑 `parent: {transitionId, digest}`
     指向链尾 seal（r13-z-transition-mg2.ts:70-73、pal-r13-six-c.ts:46-49），rewind 靠它防链断裂；
     卡文只绑 parent content11 enemy-teams 文件 digest，须补绑当前链尾（r13-6c/r13-z）的 transition
     digest，与同级先例对齐。
  2. **C2/C3 补内容面半状态判别（最大漏洞）**：`appendOnlyTransitionState` 只判 seal 四元组，不判
     内容文件；B10 是首个「seal + 内容文件替换」hybrid。卡文必须明文两条断言：(a) initialize 路径若
     baseline enemy-teams.json 已是 slots 面或 digest 不等于 seal 声明的 parent digest → fail-closed，
     不得把半发布当首发布再发一遍；(b) replay 路径必须显式断言 baseline 实际 enemy-teams.json
     digest == seal.successor slots digest，防 seal 齐而内容被改/回滚。
  3. **C3 回放枚举漏 P4/v4 shadow**：`published-v4-snapshot.ts:242-243` 对 baseline 与 project 各跑
     一次 rewind 链，B10 发布后同样需要包 B10 rewind，否则 v4 shadow 测试在 slots 面上炸。G3 应收成
     一张明确清单：四条回放链（R13-Z/6A canary/6B/P4-v4 shadow）+ oracle 两个硬编码常量
     （`pal-test-oracle.ts:163-174` TRANSITION_IDS、`:237` producerContractVersion）+ 「journal 崩溃
     恢复后重跑 = replay 0/0/0」用例。
  4. **A 节漏 demo/e2e-own 工程与 migrate 入口**：`projects/demo`、`projects/e2e-own` manifest 同为
     contentVersion 11（无 enemy-teams.json，原子晋升即可），loader 切 12 后不晋升就打不开；
     `migrate-content.mts:1243-1264` 发布白名单只收 4…11、R13-6B 目标写死 9|10→11，B10 管线须显式
     append v12 分支；`pal-boss-overlay.ts:26` 仍读 `team.members[0]`。这些消费点须列入卡文改动清单。
  5. **B3 summon 失败条件补全**：源除「空槽不足」外还有隐身/眠/痹/乱四项并列失败
     （script.c:2898-2907），卡文只提空槽；build 期须完整还原失败条件并补对应负例，否则又造一处
     语义偏离。
  6. **A4/K4 钉 validator 位置**：v12 slots 域级严格校验（重复 id / 非 `string|null` / 超 5 槽 /
     未知敌 id）必须新增在 content 包并由编辑器 overlay 阶段调用；现有 validate-refs.ts:1013-1028
     （无重复 id、无 null 概念）与 loader-v5 的 indexById 不够，卡文须点名。
- Codex 对 counter 的落卡响应（2026-08-09，待 Kimi 复核转签）：
  1. C1 已冻结 primary parent=`r13-6c-lossy-closure-v1`，并以 `requiredControls` 同时钉
     `r13-z-source-closure-v1` sibling digest；parent content/source/successor/surface digests 全列。
  2. C2 已补 initialize/replay 两条内容面半状态断言，并采用 6C installer 四重校验模板。
  3. C3/G3 已补 R13-Z/6A canary/6B/P4-v4 shadow 四链、oracle 两硬编码控制和 journal
     恢复后 replay 0/0/0；B10→6C/Z→6B rewind 顺序已冻结。
  4. A5 已补 demo/e2e-own、migrate content12 首发/replay、R13-Z current 入口与
     `pal-boss-overlay.ts` 首槽消费点。
  5. B3 已补 hiding/sleep/paralyzed/confused 与空槽不足五类失败门、count 默认 1。
  6. A4/K4 已点名 content structural/ref validators，并要求 loader/overlay 显式调用。
  GLM 的 installer/pinning、publish-time-surface 去自指、rewind 最外层顺序三项已分别合入 C1-C4，
  不再留作实现期口头约定。
- Kimi 对其余交办面的结论：SAVE D 节四条**成立**（双轴 identity、拒绝矩阵、不读 sidecar、
  skillUseCounts 结构严格保留——建议 G4 沿用 epoch-v10.test.ts:124-145 模式显式枚举跨轴拒绝
  组合，非阻塞）；K1 固定 5 槽 + maxEnemyIndex 方向成立（一阶段已是忠实 oracle，Reforge 改造
  撞击点为 spawnIntoSlot 单规则拆分、basePos 一次定死不变量、session 槽索引路由）；K2 源对拍
  逐条成立；K3/K5 认可；编辑器「清空=保留 null、删槽才改长度、加槽限 5」UX 口径认可。
- Kimi 战斗分层二次复核（2026-08-09，用户指定重点：5 槽/maxEnemyIndex、summon/divide、attackMate
  路由、lastAction、视觉分层）：**agree（附 3 条 build 期补强钉，不阻塞准入；v12 整体仍 blocked
  on 上述 6 条卡文）**。逐面核实：
  - **固定 5 槽 + maxEnemyIndex**：方向成立。源 battle.c:1599-1719 与一阶段 battle-state.ts:702-707,
    839-862 均为带洞结构先例；Reforge 消费者全量清单已核（见交接日志），B2「全部解释为语义槽索引」
    覆盖方向正确。
  - **summon 不扩上限 / divide 扩上限重算站位**：源对拍逐条成立（script.c:2870-2952 / :2776-2868 +
    PAL_LoadBattleSprites battle.c:913-942）；一阶段 battle-opcodes.ts:1202-1267,1311-1424 已是忠实
    oracle；spawnIntoSlot（battle-core.ts:420-435）必须拆成 summon 填洞 / divide 扩上限两条规则，
    与审计文档 b10-1-source-slot-census-2026-08-09.md:76-77 警告一致，卡文 B3/B4 已分列 ✓。
  - **attackMate 路由隔离**：插入点核实正确——不加路由时 enemy attackMate 在 battle-session.ts:2140
    通用过滤被 return null、落 :1608-1623 fallback 即时飘字，**不会误进普通敌物攻**（敌物攻要求
    kind==='attack' 且目标坐标解释在玩家侧）；玩家 attackMate 先例（core :1761-1783 / session
    :2099-2115）与设计同构。击杀计赏（core :1093-1102）与 pendingDeaths（session :1574-1578）为
    kind 无关旁路，混乱击杀同伴自然进死亡淡出+计赏，无遗漏；dualMove 每动独立决策（core :1027-1036,
    :2407）无旁路。decideEnemyAction 的 canAct 门（:883/:1488）是混乱分支的真正改造入口，与设计
    结论 3「构建普通 AI view 之前截断」一致。
  - **lastAction 类型收窄**：方向必要且正确——现 lastAction 是 battle-core.ts:256-291 的内联匿名
    类型（kind: string 开放串），且无 damage 字段（session 靠 hp diff 反推 :2112/:2147/:2215）；
    玩家 attackMate 结算（:2264-2274）也不写 damage。enemy attackMate 若沿用 hp diff 反推，超杀
    数值必丢——设计「core 写显式完整 damage」是新机制且必须。
  - **视觉分层**：卡文 :99-101、K5、Build 节与 2026-08-08 用户拍板一致——战斗演出登记集中 E2E、
    开发期只做确定性逐帧/路由单测、编辑器功能页仅一次最小浏览器验证 ✓。缺 effect sprite 时现有
    行为是静默跳过 overlay（battle-session.ts:2158-2164, :2696-2703），与验收「缺 sprite 仍保持时序」
    吻合 ✓。
  - **3 条 build 期补强钉（进 K1/K3/K4 验收，不阻塞 agree）**：
    - K1+：5 槽带洞的 null 安全扫尾清单必须进验收——裸访问点：core `aliveEnemies` :413-414、
      flee 难度求和 :1815-1817、战果累计 :1094-1101、fleeAll :2474；session `aliveEnemyIdxs` :643、
      快照/diff 循环 :1560/:1574/:1619/:1638、terminal 快照 :852/:1069、resetVisual :512、
      `enemyAppearance` :436（expectDefined）、`spawnIntoSlot` :423（expectDefined 会在 null 槽炸）。
    - K3/K4+：lastAction 在 core :256-291 与 session :1802-1820 是**两份结构重复的内联类型**——
      union 收窄必须收成单一具名 discriminated union 两处共用，新增 `damage`/`targetEnemyIdx` 字段；
      attackMate 路径 session 伤害改读 lastAction.damage，不从 hp diff 推导。
    - casualty 边界：enemy attackMate 不匹配 shouldCheckPlayerCasualties 的 attack/cast 判据
      （core :749-751），语义正确地跳过玩家 casualty sweep；但 refreshCasualtyPrevHp（:1091-1092）
      路径 build 期须确认不被污染，补负测。
- GLM: **agree（2026-08-09，完成 v12 数据/迁移/覆盖主审：content11→12 successor、SAVE8/
  content10|11→12、编辑器原子升级、append-only seal/replay/rewind、R13 历史回放、oracle 门禁、
  G1 census 全部只读核实通过；附 G1-G4 build 准入钉与 3 条卡文修正）**
  - **事实修正（R13-6C 现已 append-only 受护）**：本卡 C 节与 OPS-RW1 均引用过“6C 缺 replay 守卫”
    的旧审查结论；GLM 本次一手核 `pal-r13-six-c.ts:119-146`，6C **现已**走 `appendOnlyTransitionState`
    四元组 + replay 模式四重校验（self-digest / metadata / hash / `isDeepStrictEqual`）。卡文 C2“禁止
    无条件覆盖历史 seal/文件”方向正确，但**实现模板应直接克隆 6C 的 `installR13SixCSeal`**（最简
    published-authority installer），R13-Z planner 的 `assertHistoricalControlsPinned` 硬编码 skip 了
    `R13_Z_SEAL_PATH`，B10 若复用 R13-Z planner 须自留 pinning 口子，或走 6C 独立 installer。
  - **C 节 append-only 闭环核实成立**：`append-only-transition-state.ts:10-28` 四元组（metadata/file/
    managed/hash）+ initialize/replay/半状态 fail-loud 与设计一致；R13-Z `r13-z-transition-mg2.ts:
    427-446` 的 published==authority + 0-writes replay 是直接先例；6C `rewindPalR13SixCPublicationIfPresent
    (168-200)` 是零内容叶 rewind 模板；`migrate-content.mts:377` 的 rewind 链序（6B∘6C）是 B10 rewind
    的接入点。
  - **A/D 节升级链核实成立**：`upgradeManifestV10ToV11`（skill-execution-v11-upgrade.ts:8-22，严格
    preflight contentVersion===10 && min8 → clone+bump）是 v11→v12 模板；`WorldStateV5..V11` 单类型
    别名链（character.ts:51-70）证明 `WorldStateV12=WorldStateV11` 是既有约定；loader-v5.ts:218-226
    只接当前 CONTENT_VERSION；save/migration.ts:278-308,823-844 preflight + identity normalizer +
    skillUseCounts 严格补齐已是现成机制，v12 仅需把接受 contentVersion 集合扩到 (11,12) 并把 838 行
    bump 到 12。
  - **编辑器原子升级核实成立**：`upgrade-local-v5-v6-epoch-v7.ts:107-197` 已实现 overlay + canonical
    loader 内存闭环（写盘前 `loadProjectV5From(overlay)` 全量校验），“绝不先落盘中间 7/7”注释即设计
    A2 要求；`project-io.ts:342-478` writeProject 已是 binaries→content→manifest-last 顺序。A4 的
    enemy-teams.json 先 / manifest 最后与既有 ordering 吻合。
  - **G1 census 实算复现**：独立 node 脚本复算——380 队/1900 项/1039 个 65535/861 语义槽/104 个 0
    空槽/757 有效槽/68 含空槽队/56 含空槽且≥2 有效敌，与卡文 G1 逐项一致；v11 `members` 总数 757 与
    源有效槽数守恒。`migrate-enemies.ts:243` 确认 65535 当前被 `continue` 丢弃 → v12 slots 重生成必须
    从 `data/extracted/data/enemy-teams.json` 上游重跑（铁律 10），不得手改 `projects/pal` 产物。
  - **G2 cross-list 核实**：13 个 summon/divide 敌（objIdx 409/420/421/445-divide/469/473/474/519/
    522/523/524/534-divide/546）与含 0 槽队伍交叉恰为 20 队，与审计文档 G2 表逐项吻合；team-65/66/290
    含 summon、team-84/87/303/304 含 divide 属实。battle.c:1599-1719 `if(w==0xFFFF) continue` / 0 占槽
    `rgEnemy[i++].wObjectID=w` 语义核实成立。
- counter / 分歧处理: 无方向分歧；GLM agree（G1-G4 准入钉 + 3 条非阻塞修正）；**Kimi counter
  （2026-08-09，最小 6 条卡文修正，见上签字表）**——待 Codex 落卡后 Kimi 复核转 agree。
- 缺签豁免: N/A（GLM agree、Kimi counter，用户未批准免签）
- build 准入结论: **blocked（GLM agree 已签；Kimi 6 条卡文落实并转 agree 后满三签）**

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
   **validator 必须新增在 content 包**：结构 validator 拒绝 legacy `members`、重复 team id、
   非 `string|null` 和超过 5 槽；引用 validator 以同批 `EnemyDef.id` 拒绝未知非 null 敌 id。
   canonical loader 与编辑器 overlay 都必须显式调用这两个边界，不能依赖 `indexById` 或
   现有只遍历 `members` 的 `validate-refs.ts` 间接兜底。
5. `projects/demo` 与 `projects/e2e-own` 同为 content11/min8 且没有 `enemyTeams` 文件，随本卡
   做 manifest-only 原子晋升到 v12，并分别走 current loader 闭环。PAL 迁移入口必须新增明确的
   content11→12 首发与 content12 replay 分支：更新 `migrate-content.mts` 的 4…11 白名单、
   R13-6B 9|10→11 目标路由及 R13-Z/current replay 入口，禁止 content12 回落到旧 successor
   refresh。`pal-boss-overlay.ts` 的首领判定改读语义 `team.slots[0]`（不得 `find` 第一个非 null，
   否则改变源“首槽”语义），并纳入迁移回归。

#### B. runtime 槽位与源 `009E/009C` 动态上限

1. 战斗态必须保留**固定容量 5 的带洞槽数组**（实现可用 `enemySlots` 或等价显式
   `slotIndex/maxEnemyIndex` 结构，但不得再用 dense `enemies.length` 代替源索引）。
   初始 `maxEnemyIndex = slots.length - 1`；`null` 槽占索引、占站位/随机范围但不生成敌人。
2. 初始站位按当前 `maxEnemyIndex + 1` 的布局和槽索引派生；空槽留洞。所有玩家选敌、
   混乱抽样、`lastAction.targetEnemyIdx` 和演出路由都解释为语义槽索引。
3. **summon (`script.c:009E`)**：只扫描 `0..maxEnemyIndex` 的空槽；请求数量大于可用
   空槽时整次失败并走 failure branch，不扩展上限；`hidingTime>0` 或施法者 sleep /
   paralyzed / confused 任一非零也与空槽不足并列失败；成功时按升序填槽。请求 count
   缺省/非正值按源规则归 1。该规则须覆盖 PAL 中含空槽且带 summon 的 20 支队伍
   （含 team-65/66/290），并为五类失败门分别补负例。
4. **divide (`script.c:009C`)**：仅一名活敌且 HP>1 时执行；扫描固定 5 槽填充，成功后
   `maxEnemyIndex` 扩到最高新占用槽（可超过初始 slots 长度），并按新上限重算所有敌人的
   原始站位；不把 divide 错当作 summon 的“当前上限内填槽”。覆盖 team-84/87/303/304。
5. 混乱每次行动在当时的 `0..maxEnemyIndex` 上做全槽拒绝采样（null/死槽重抽、抽到
   自己 Pass、64 次保护）；因此 divide 后随机范围随源规则扩大，dualMove 两次独立。

#### C. PAL append-only migration / replay

1. 新 transition id 冻结为 `b10-enemy-team-slots-v1`，seal 路径冻结为
   `_transitions/b10-enemy-team-slots-v1.json`。seal 必须绑定当前发布控制链，而不只绑定
   内容文件：primary `parent` 指向本批最后安装的 `r13-6c-lossy-closure-v1` 及其 metadata/
   published-seal digest；由于 R13-Z 与 6C 是 `r13-source-semantics-v1` 的独立 sibling，seal
   另以 `requiredControls` 钉住 `r13-z-source-closure-v1` digest，缺任一控制即 fail-closed。
   同时绑定 parent content11 `enemy-teams.json` digest、source `enemy-teams.json` digest、
   method version、380 队 census、successor `slots` 文件 digest、publish-time-surface digest
   和自身 digest。publish-time-surface 必须是已替换 slots、但剥离 B10 seal 四元组后的表面，
   禁止把 seal 自身计入 authority digest 造成 replay 自指。
2. 发布 builder 只能从已加载的 content11 baseline 复制其它托管文件，替换
   `content/enemy-teams.json` 并 append seal；manifest 以 v12 原子切换。必须使用
   `appendOnlyTransitionState` 四元组（metadata/file/managed/hash），installer 直接克隆
   `installR13SixCSeal` 的 self-digest / metadata / file-hash / `published == authority` 四重校验，
   再增加内容面状态机：
   - initialize：seal 四元组全无时，baseline `enemy-teams.json` 必须是纯 v11 `{members}` 面，
     实际 digest 必须等于 expected seal 的 parent content digest；若已出现 `slots`、混合形状或
     digest 漂移，按半发布 fail-closed，不得当作首发再次覆盖。
   - replay：seal 四元组全齐且四重校验通过后，baseline 实际 `enemy-teams.json` 必须是纯 v12
     `{slots}` 面，文件 digest 必须等于 published seal 的 successor slots digest，且去自指
     publish-time-surface digest 必须等于重建 authority；内容被修改或回滚一律拒绝。
3. `rewindB10PublicationIfPresent` 先完整验证 seal/control/content successor，再把 `slots`
   过滤 null 还原为逐字节等价的 content11 `{members}`，核对 parent digest 后移除 B10 四元组。
   B10 是当前最外层 successor，因此恢复历史表面的固定链序是 **B10 → 6C/Z → 6B → 更旧层**；
   不得先剥 6C/Z 再读 B10 parent controls。四条调用链必须显式接入并测试：R13-Z current replay、
   R13-6A canary、R13-6B historical replay、`published-v4-snapshot.ts` 的 P4/v4 shadow；后者对
   published baseline 与 loaded project 两个快照都必须应用匹配的 B10 rewind/内容投影。
   半状态、parent controls、parent file digest、重建 source census 任一不符都 fail-closed。
4. journal 崩溃恢复必须覆盖 manifest/content/seal 四元组的每种中断表面；恢复后重跑只能得到
   replay `0 writes / 0 deletes / 0 conflicts`。若 B10 复用 R13-Z planner，须为新 transition 在
   historical-control pinning 中保留明确入口，不能被只跳过 `R13_Z_SEAL_PATH` 的硬编码吞掉。
5. 发布后重录 PAL oracle（producer contract、manifest/content 快照和 projection 按实际
   结果更新），并同步更新 `pal-test-oracle.ts` 的 `TRANSITION_IDS` 与
   `producerContractVersion` 两个硬编码控制；不能只手改 `projects/pal/content/enemy-teams.json`
   或旧 fixture fingerprint。

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
- **G3**：v11 baseline→v12 successor 的 seal/replay/rewind、内容面 initialize/replay 半状态、
  manifest 原子提交与 journal 恢复全矩阵；逐项覆盖 R13-Z、6A canary、6B、P4/v4 shadow
  四条历史回放链，oracle `TRANSITION_IDS` + `producerContractVersion` 两个硬编码控制，最终
  replay 必须 0/0/0；任何已发布内容或 parent control 被改写即 fail。
- **G4**：SAVE8/content10|11|12 预检/normalize 矩阵，v11 本地工程原子升级与半状态恢复。
- **GLM 卡文修正落实对照（2026-08-09 Codex）**：
  1. 6C installer 四重校验 + B10 内容面状态机 + historical-control pinning 已并入 C2/C4；
     6C 当前 append-only 事实口径已采用。
  2. publish-time-surface 去自指 digest 已并入 C1/C2。
  3. B10→6C/Z→6B 的最外层 rewind 顺序已并入 C3。
- **K1**：固定 5 槽 + `maxEnemyIndex` 的类型/站位实现与空洞视觉；不允许 dense array 偷换。
  build 必须逐一清扫 core/session 的所有敌数组消费点并做 null-safe 负测，不能只修
  `aliveEnemies`/spawn 主路径。
- **K2**：summon 当前上限内填槽、divide 固定容量扩上限及站位重算的源对拍。
- **K3**：enemy/player `attackMate`、普通敌物攻/法术三路负测；core/session 两份内联
  `lastAction` 形状收成单一导出的具名 discriminated union，以 `side + kind` 收窄
  `targetEnemyIdx/targetPlayerIdx/damage`，禁止继续复用多态 `target`。
- **K4**：编辑器清空/删槽/加槽 round-trip 与 v11→v12 overlay 全量 loader 闭环；content
  域级 structural/ref validator 必须直接被 loader/overlay 调用。另补 casualty sweep 的
  `prevHp` 负测，证明同伴击杀不会漏记或重复结算伤亡状态。
- **K5**：战斗演出实际回放登记集中 E2E；开发期只保留逐帧单测，编辑器功能页做一次最小
  浏览器验证。

#### GLM 战斗分层交叉核对（2026-08-09，K 域只读核实，不替代 Kimi 架构主审）

> 跨域覆盖（用户 2026-08-09 指定重点）。源语义、当前 reforge 基线与一阶段真值三向对拍，
> 确认 B 节战斗分层设计可实现且对源忠实；以下每项带 file:line 证据。**仍以 Kimi 的架构
> agree 为 build 准入主签**，本核对为 Kimi 提供结构化输入。

**源语义对拍（sdlpal，全部核实成立）**：
1. **summon（009E, script.c:2870-2952）**：空槽计数循环 `for(i=0;i<=wMaxEnemyIndex;i++)`（2890-2896），
   fill 同界升序（2910-2932），`x<y` 整次失败走 operand[2] 分支（2898/2905），**不写 wMaxEnemyIndex**。
   ✓ 与 B3 一致。补遗（卡文应记全）：失败条件除 `x<y` 外还含 `iHidingTime>0` 或施法者 sleep/
   paralyzed/confused（2898 三选一），operand[1] 默认 count=1（2883）。
2. **divide（009C, script.c:2776-2868）**：单活敌门 + HP>1 门（2790，`w!=1 || wHealth<=1` 走 operand[1]）；
   fill 扫**固定 MAX_ENEMIES_IN_TEAM=5**（2812，注释“not limited by original team layout”）；
   `wMaxEnemyIndex=w`（2836-2840，可超初始 slots 长度）；站位经 `PAL_LoadBattleSprites`（2842，
   读 `EnemyPos.pos[i][wMaxEnemyIndex]`）+ 位移混合动画 + `PAL_BattleUpdateFighters`（2866）重算。
   ✓ 与 B4 一致。术语修：卡文“重算站位”在 sdlpal 是 formation-column + sprite-order 重算，
   非 PAL-classic stance 状态机。
3. **battle init（battle.c:1599-1719）**：固定 5 槽 rgEnemy；`65535`→`continue`（1604），
   `0`→跳过 spawn 但 `rgEnemy[i++].wObjectID=w`（1716）占槽，`wMaxEnemyIndex=i-1`（1719）。
   ✓ 与 B1 一致。**锚点修**：卡文引用 ~1595-1658 实为 1599-1719（1658 在 Fox Demon hack 段中部）。
4. **confused 抽样（fight.c:4488-4517）**：`RandomLong(0,wMaxEnemyIndex)`（4509），拒绝集
   `wObjectID==0 || wHealth==0`（4511-4514，**空槽与死槽都拒**），抽到自己 `goto end`=Pass（4594）。
   ✓ 与 B5 一致。

**当前 reforge 基线（net-new 改造点已定位）**：
- `decideEnemyAction`（battle-core.ts:877-896）**无 confused 分支**：`canAct`（:1488）把 confused 当
  纯抑制器（与 sleep/paralyzed 同列），confused 敌直接 `pass`——确认“漏掉混乱分支”。
- runtime `s.enemies: BattleEnemyState[]`（:208）是** dense array**；`MAX_ENEMIES=5`（:899）仅作 push 上限。
  divide（:939-963）与 summon（:966-980）用 `aliveEnemies().length` / `MAX_ENEMIES - aliveEnemies().length`
  算槽位，`spawnIntoSlot`（:420-435）复用死槽或 push。**无 maxEnemyIndex / 固定 5 槽结构**——B1/B2
  提案是净新增运行时形状。这是本卡最高风险点（见下风险栏）。
- 玩家 `attackMate` 路由（battle-session.ts:2100-2115）**仅玩家侧**，是敌侧路由的直接先例；
  敌侧 attackMate 当前会落入通用敌物攻块（:2181）把 `target` 误读为玩家槽。
- `lastAction.target`（battle-core.ts:256-291）是单一 `number`、语义随 side/kind 漂移：玩家 attack=
  敌槽、玩家 attackMate=玩家槽、敌行动=玩家槽。kind 收窄可行且局部（target 是唯一多态字段）。

**一阶段真值对拍（packages/game，作为 UX/RNG 真值核实成立）**：
- `enemy-ai.ts:100-110` 全槽拒绝采样（`rangeInclusive(0,len-1)` + 拒 hp<=0）+ 抽到自身 Pass（:108），
  对源；但 :111-116 有一条 pre-filtered `aliveEnemies` 单抽 fallback（旧 fixture 兼容，**不同 RNG 流**），
  生产调用 `battle-system.ts:2660` 总传 `enemySlots`——**phase2 必须传全槽，否则 RNG 静默漂移**。
- RNG 顺序（enemy-ai.ts:74-88）：玩家目标抽样**无条件先于** sleep/paralyzed/confused 分支，结果可能
  被丢弃但 RNG 不可省——对源 fight.c:4578。
- `attack.ts:477-525` 专用 helper（str/def/calcBaseDamage `*2/physRes`、≤0→1、HP clamp），**不在普通物攻链**，
  对源 fight.c:4634-4643。注意 phase1 对 physRes==0 加了 `!==0` 守卫（sdlpal 无此守卫，实际敌 physRes≥1
  不触发）——phase2 保留此防御性偏离即可。
- `anim-timeline.ts:1193-1240` 12 帧结构（3 中点滑步 + effect 9/10/11 + PostMagic 抖动 + Delay5 + Delay2，
  无音）对源 fight.c:4598-4652。
- **一阶段已用固定 5 槽带洞模型**：`MAX_ENEMIES_IN_TEAM=5`（battle-opcodes.ts:267），
  `battle-state.ts:838-858` 把 0/null 条目造成占位的 `defeated` 空槽（`objectId:0`），`battle-system.ts:2660`
  `enemySlots=state.enemies.map((e,i)=>({idx:i,hp:e.e.health}))` 含洞。→ **phase2 复刻同模型可行**。

**最高风险点（GLM 标记，供 Kimi 主审权重）**：dense→固定 5 槽改造触及全部敌迭代点
（aliveEnemies/buildAiView/performAttackAll ORDER(:2219)/spawnIntoSlot/divide-summon 槽位算术/
session 表现路由/pendingDeaths-pendingGains）。须 Kimi 确认改造口径（显式 enemySlots 或 slotIndex/
maxEnemyIndex）与全部消费点一致；GLM 侧负责 census 钉（含空槽队的站位/召唤房间/随机流影响逐队落测）。

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
- 结论: **v12 增补 GLM agree（2026-08-09，附 G1-G4 与 3 条修正）；Kimi counter（2026-08-09，
  最小 6 条卡文修正，方向认可）**——历史 2026-08-07 战斗签字保留为真值审查证据。
- 必改项: G1-G4 + K1-K5（build 准入钉，K1/K3/K4 含 Kimi 二次复核补强钉——null 安全扫尾清单、
  lastAction 单一具名 union 两处共用、casualty prevHp 负测）；Kimi counter 6 条（seal parent 绑定、
  内容面半状态断言、P4/v4 shadow 回放枚举、demo/e2e-own 与 migrate 入口、summon 失败条件补全、
  validator 位置）须先落卡。
- 是否建议进入 build: **当前不得进入 build；Kimi 6 条落卡并转 agree 后满三签**

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
- 2026-08-09 GLM：完成 v12 数据/迁移/覆盖主审，签 design **agree（附 G1-G4 钉 + 3 条卡文修正）**。
  全部只读核实：content11→12 successor（`upgradeManifestV10ToV11` 模板、`WorldStateV5..V11` 单别名链、
  loader-v5.ts 版本门）、SAVE8/content10|11→12 identity normalize（migration.ts:278-308,823-844 现成机制）、
  编辑器原子升级（upgrade-local-v5-v6-epoch-v7.ts:107-197 overlay+loader 内存闭环 + project-io.ts
  manifest-last）、append-only seal/replay/rewind（append-only-transition-state.ts 四元组 + R13-Z
  published==authority + 6C `installR13SixCSeal` 四重校验 + rewind 链序）、oracle 重录门禁。G1 census 独立
  复算 380/1900/861/104/757/68/56 全项吻合；G2 cross-list 20 队逐项核对；battle.c:1599-1719 0/65535 语义
  核实。**事实修正**：6C 现已 append-only 受护（pal-r13-six-c.ts:119-146），旧“6C 缺 replay 守卫”结论
  作废——OPS-RW1 A1 与本卡 C 节引用均应更新。3 条非阻塞卡文修正（C2 克隆 6C installer / publish-time-surface
  digest 去自指 / rewind 链序）已写入 E 节。Evidence: 本卡签字表 / E 节 / 审计文档
  b10-1-source-slot-census-2026-08-09.md；未改实现文件，未标 build/done。Next: Kimi v12 复审 agree 后满
  三签可进 build；build 前 Codex 落 3 条卡文修正。
- 2026-08-09 GLM（战斗分层交叉核对，用户指定重点）：完成 K 域三向对拍——sdlpal 源语义（summon 009E /
  divide 009C / battle init 1599-1719 / confused fight.c:4488-4517）、当前 reforge 基线（decideEnemyAction
  无 confused 分支、enemies 是 dense array 无 maxEnemyIndex、玩家 attackMate 路由 :2100 是敌侧先例、
  lastAction.target 多态）、一阶段真值（已用固定 5 槽带洞模型 battle-state.ts:838-858，RNG 顺序含废弃玩家
  抽样，专用公式/动画不在普通链）。**结论：B 节战斗分层设计对源忠实、可实现；与 Kimi counter 无冲突。**
  GLM 额外标记的最高风险点：dense→固定 5 槽改造触及全部敌迭代点（aliveEnemies/buildAiView/
  performAttackAll(:2219)/spawnIntoSlot/divide-summon 算术/session 路由/pendingDeaths-pendingGains），
  须 Kimi 主审确认改造口径与全部消费点一致。卡文锚点修：battle init 实为 1599-1719（非 1595-1658）。
  Evidence: E 节「GLM 战斗分层交叉核对」段（带 file:line）；未改实现文件，未标 build/done。Next: 仍以
  Kimi 架构主审为 build 准入主签；本核对为 Kimi 提供结构化输入，GLM 负责含空槽队 census 逐队落测。
- 2026-08-09 Kimi：完成 v12 增补架构/迁移/UX 复审，签 design **counter（最小 6 条卡文修正，方向
  全部认可）**。只读核实成立的面：v11 immutable（baseline _state.json 10 seal 账本 + managedFiles）、
  epoch/升级机制同构（WorldStateV12=V11 alias 链、内存闭环 + manifest-last 为现有范式）、SAVE D 节四条
  （双轴 identity、拒绝矩阵、不读 sidecar、skillUseCounts 结构严格保留）、源 009E/009C 规则逐条对拍
  （script.c:2776-2952，一阶段已是忠实 oracle；Reforge 现有 summon 房间口径与 divide 站位重算确属待修
  偏离）、append-only 机制同构、G1 census 抽查属实。6 条待落卡（见签字表）：C1 seal 增绑 parent
  transition digest；C2/C3 补内容面半状态断言（initialize 半发布 fail-closed + replay baseline digest ==
  seal.successor，四元组只管 seal 不管内容文件）；C3 回放枚举补 published-v4-snapshot.ts:242-243 P4/v4
  shadow + G3 收拢清单（TRANSITION_IDS / producerContractVersion 硬编码常量 + 崩溃恢复 replay 0/0/0）；
  A 节补 demo/e2e-own manifest 晋升与 migrate-content.mts:1243-1264 白名单、pal-boss-overlay.ts:26 消费点；
  B3 summon 失败条件补隐身/眠/痹/乱四项并列（script.c:2898-2907）；A4/K4 钉 v12 严格 validator 新增在
  content 包并由 overlay 阶段调用。与 GLM 结论无冲突（GLM 的 6C installer 模板修正与第 1 条互补）。
  Evidence: 本卡签字表 / 主审立场；只读核查，未改实现文件，未标 build/done。Next: Codex 落 6 条卡文 +
  GLM 3 条修正后回 Kimi 复核转 agree。
- 2026-08-09 Kimi：战斗分层二次复核（用户指定重点），签 **agree（附 3 条 build 期补强钉，不阻塞；
  v12 整体仍 blocked on 6 条卡文）**。逐面核实：固定 5 槽/maxEnemyIndex 有源与一阶段双先例；summon/
  divide 源对拍成立、spawnIntoSlot 拆两规则与审计文档警告一致；enemy attackMate 不加路由会落 fallback
  即时飘字而非误进普通敌物攻，插入点（session :2140 前）正确，击杀计赏/dualMove 旁路无遗漏；lastAction
  无 damage 字段、hp diff 反推会丢超杀，core 显式写 damage 是必须的新机制；视觉分层与用户 2026-08-08
  拍板一致，缺 effect sprite 静默降级与验收口径吻合。补强钉：K1+ null 安全扫尾清单（core :413/:1815/
  :1094/:2474、session :643/:1560/:1574/:1619/:1638/:852/:1069/:512/:436/:423）；K3/K4+ lastAction
  两份内联类型（core :256-291、session :1802-1820）收成单一具名 union 并加 damage/targetEnemyIdx；
  casualty prevHp（core :1091-1092）负测。Evidence: 本卡签字表；只读核查，未改实现文件。Next: 不变——
  Codex 落 6 条卡文 + GLM 3 条修正后回 Kimi 复核转 agree。
- 2026-08-09 Codex：已逐条落实 Kimi counter 6 条与 GLM 3 条卡文修正：C1 同时绑定 6C primary
  parent 与 R13-Z required control；C2 增内容面 initialize/replay 半状态；C3/G3 补四条历史回放、
  P4 双快照、oracle 双硬编码和 journal replay 0/0/0；A4/A5 补 content validators、demo/e2e-own、
  migrate content12 入口和 boss 首槽；B3 补五类 summon 失败门；GLM 三项已内嵌 C1-C4。
  未改实现文件、未标 build/done。Next: Kimi 只读复核并把 counter 转 agree；转签前门禁仍 blocked。

## 下一位 Agent 提示词

```text
接手任务: B10-1 混乱敌人攻击同伴 v12 增补——落实 Kimi counter 与 GLM 修正后回签
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
当前状态: draft；v12 增补 Codex agree、GLM agree（附 G1-G4 + 3 条修正）、Kimi counter（最小 6 条），
build 准入 blocked。
你的角色: Coding Owner——只改任务卡卡文，不得修改实现文件、不得标记 build/done。
请你做: 把 Kimi 签字表中 6 条逐项落入「2026-08-09 v12 设计增补」对应节（C1 seal parent transition
digest；C2/C3 内容面半状态两条断言；C3 P4/v4 shadow 回放 + G3 收拢清单含 oracle 两个硬编码常量与
崩溃恢复 replay 用例；A 节 demo/e2e-own manifest 晋升 + migrate 白名单 + pal-boss-overlay 消费点；
B3 summon 失败条件四项并列；A4/K4 validator 新增在 content 包），并同步落实 GLM 的 3 条修正
（C2 克隆 6C installer / publish-time-surface digest 去自指 / rewind 链序）。完成后记交接日志，
回 Kimi 复核转 agree。
不要做: 不得改实现文件；不得标 build/done；不得触碰用户 dirty 的
docs/ops/tasks/D14-3-reward-event-bus.md；若对任一条有异议，写明理由请用户拍板，不得静默改口径。
```

```text
接手任务: B10-1 v12 增补——Kimi counter 落卡复核（落卡后使用）
任务卡: docs/ops/tasks/B10-1-enemy-confused-attack.md
只读核对 Kimi 6 条与 GLM 3 条是否逐项落实；无遗漏则 Kimi counter 转 agree、build 准入改 allowed、
Status 改 build 并记交接日志；有缺口只点未落实卡文，不扩新范围。不得改实现、不得标 done。
```

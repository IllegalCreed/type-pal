# ED-ENEMY-DEFEATED-EVENT-1 - 敌人击败后结果可读化与安全编辑边界

Status: done（2026-08-29 偷取道具名称返工经 Codex / Kimi / GLM 刷新 accept，User 复验通过）
Phase: phase2
Capability: B7（不改变 capability-map 状态，不重开已 done 的 ED-ENEMY-1）
Coding Owner: Codex
Reviewer: Kimi（schema / runtime / 命令边界）+ GLM（PAL 数据覆盖 / 文案 / 测试矩阵）
Visual Verification Owner: Codex + User
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: `main`

## 用户问题与目标

用户于 2026-08-29 指出敌队成员行显示“不可偷取 · 3 条战败指令”，既无法理解“战败”是谁战败，也无法知道
三条具体是什么、应去哪里查看。用户同意新开本卡，把底层命令计数改成可理解的“击败后结果”，并提供完整查看入口。

一句话 `before -> after`：敌队只显示“3 条战败指令”，敌人页又只展示折叠后的奖励字段，关联条件与提示语不可见
-> 敌队直接说明“击败后有 11% 概率获得蜂巢 ×1”，敌人页按执行顺序展示完整事件，同时只让已经有安全结构化
合同的奖励字段可编辑，其余命令完整可读但暂不开放写入。

代表场景：`team-4` 有两个 `enemy-403` 蜜蜂槽位。每一行都应显示“击败后：11% 获得蜂巢 ×1”，点击后进入
蜜蜂定义，并能看见：

1. 89% 概率结束本敌槽的后续事件；
2. 获得蜂巢 ×1；
3. 显示“获得一个蜂巢”。

两个槽位必须保留为两行，因为胜利后它们会各自独立执行一次，不能为了消除视觉重复而合并运行时语义。

## 范围

### 范围内

- 只在敌人 / 敌队语境中把“战败指令、战败奖励”改为“击败后事件、击败后奖励”；玩家败北的 `onLose`
  继续使用“战败处理”，不得全局替换。
- 敌队成员行用解析后的中文结果替代裸 `onDefeated.length`，并保持整行跳转到对应敌人定义。
- 敌人页展示完整、有序、可展开的 `onDefeated` 事件树；嵌套分支、终止、物品、对白和其余合法命令均不得隐藏。
- 当前严格可识别的“可选概率保护 + giveItem + 相邻 dialog”继续由现有结构化奖励表单编辑，并与事件树共享同一个
  `enemy.onDefeated` 数组。
- 对当前 schema 允许、但尚无安全领域编辑合同的事件提供可读只读展示；引用解析失败时保留原值并明确标错。
- 以纯 presenter、聚焦测试、静态穷尽性与最小浏览器检查防止未来命令种类静默退化成神秘计数。

### 范围外

- 不改 content schema、contentVersion、save、migration、runtime、触发时机、概率算法或 PAL 生成数据。
- 不直接修改 `projects/pal` 或 migration baseline。
- 不把相同敌人定义的多个槽位去重，也不把执行单位误写成“敌人类型只执行一次”。
- 不把通用 `AuthorCommand` 编辑器原样接到 `onDefeated`；它会暴露 `startBattle / loadScene / callScript /
  moveParty / loop / confirm` 等本上下文不允许的命令。
- 本卡不开放 `setFlag / setVar / addVar` 等高级命令写入；现有变量引用索引未覆盖敌人，贸然开放会制造不可追踪引用。
- 不提供 raw JSON 作为普通作者入口；不以“高级命令会原样保留”代替内容可见性。
- 不重开已完成的敌队引用、奖励归属、偷取或运行时结算工作。

## 前提真值门

### 一句话前提

`EnemyDef.onDefeated` 的真实语义是“战斗胜利后按终局敌槽顺序执行的敌种脚本”，不是玩家战败指令；当前 UI
显示的“3 条”只是顶层数组长度，PAL 截图中的三步共同表达一项 11% 概率蜂巢奖励，而不是三个独立奖励。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 胜利后按敌槽执行每个槽位的 `wScriptOnBattleEnd`，不按敌人定义去重。 | `reference/sdlpal/battle.c:1331-1337` |
| 第一阶段 | 仅胜利路径按敌槽执行战后脚本，发生在胜利结算中，不是玩家败北处理。 | `packages/game/src/core/battle/battle-system.ts:3367-3397` |
| 当前二阶段 schema / runtime | `EnemyDef.onDefeated` 是受限命令 union；仅 `victory` 时按终局槽位的 `scriptOwnerDef` 顺序运行，每槽独立。 | `packages/content/src/enemy.ts:85-105`; `packages/content/src/enemy-script.ts:87-115,560-616`; `packages/reforge/src/battle/battle-session.ts:1161-1164`; `packages/reforge/src/main.ts:2620-2638` |
| 当前二阶段编辑器 / 数据 | 敌队行只数顶层命令；敌人页只把严格奖励模式折叠成物品/数量/概率，关联对白和完整命令树无查看入口。PAL 153 敌中 15 个有 `onDefeated`，现有结构全部可识别为奖励模式。 | `packages/editor/src/ui/EnemyTeamTab.tsx:420-451`; `packages/editor/src/ui/EnemyTab.tsx:187-259,645-653,1152-1230`; `packages/migrate/src/translate-enemy-scripts.pal.test.ts:61-78` |
| 本任务目标 | 不改变任何运行时或数据语义，只把同一 canonical 数组解释成可读摘要和完整事件树；现有奖励编辑继续写同一数组，其余事件只读。 | 本卡冻结设计与用户 2026-08-29 裁决 |

### 截图对应的一手证据

- `team-4 = [enemy-403, enemy-403]`：`projects/pal/content/enemy-teams.json:31-35`。
- 蜜蜂三条顶层命令：`projects/pal/content/enemies.json:422-453`。
- 物品 `115` 是蜂巢：`projects/pal/content/items.json:1364-1367`。
- 敌名与提示语：`projects/pal/content/locale.json:13,164`。
- 三条的严格含义：89% 分支内 `stopScript`，否则 `giveItem 115`，随后显示 `dlg.13119`，即 **11% 获得蜂巢
  ×1，并显示“获得一个蜂巢”**。

### PAL 确定性 census

审计输入：

- `projects/pal/content/enemies.json` SHA-256
  `c082eb15f80dcbd484d409043f761655ad1de82b04c45f31780436b9459401b9`
- `projects/pal/content/enemy-teams.json` SHA-256
  `84817dfe160b42d63d57f0bae043b3d21407a97ad5a139b8aacade12092a19cb`
- 两份文件与 `packages/migrate/baselines/pal/content/` 对应文件逐字节一致。

| 口径 | 结果 |
|---|---:|
| 敌人总数 / 非空 `onDefeated` | 153 / 15 |
| 顶层命令长度 | 2 条 ×11；3 条 ×4；合计 34 |
| 递归节点 | 38：`branch×4 / stopScript×4 / giveItem×15 / dialog×15` |
| 现有结构 | 11 个 `[giveItem, dialog]`；4 个 `[branch(chance→stopScript), giveItem, dialog]` |
| 当前结构化奖励识别 | 15/15 全部识别；当前 PAL 的“未识别高级命令”实际为 0 |
| 重复槽覆盖 | 11/15 个带事件敌人出现在重复槽；涉及 20 个敌队，最大重复 3 次 |

Schema 还允许 `clearDialog / wait / playSound / playMusic / stopMusic / loseItem / giveMoney / setFlag /
setVar / addVar`，所以实现不得只为 PAL 当前四种 kind 写页面特判。

### 历史验收缺口（在本卡收口，不重开旧卡）

- `ED-ENEMY-1` 的冻结设计曾要求高级演出进入脚本编辑：
  `docs/ops/tasks/ED-ENEMY-1-enemy-team-reward-authoring-closure.md:78-84,302-303`。
- 其复审记录实际承认 dialog / branch 只是原样保留：同文件 `:405-408`；最终签字却写成“仍可经高级路径编辑”：
  同文件 `:437-439`。
- 当前代码没有这条高级编辑入口。旧卡的敌人 / 敌队权威、schema 与运行时结论继续有效；本卡只承接遗漏的可见性，
  并明确把高级写入延后到受限命令 policy、引用索引和 validator 真正闭合之后。

### 运行时边界

- 执行顺序是：战斗结算写回与战后状态清理 -> 每个终局敌槽的 `onDefeated` -> 恢复场景声音 / 音乐；它不是
  敌人死亡瞬间 hook：`packages/reforge/src/main.ts:2601-2649`。
- `stopScript` 终止当前槽的整个 transient body，但不阻止下一个敌槽继续执行：
  `packages/reforge/src/script-runner-core.ts:149-186,296-339`。
- transform / divide / summon 后执行的是终局槽携带的 `scriptOwnerDef`；摘要不得声称按“击杀历史”结算：
  `packages/reforge/src/battle/battle-core.ts:992-1059`。
- hostile `onLose` 是玩家败北后的场景实体处理，属于另一套类型和调用链，不在本卡改名范围：
  `packages/content/src/scene-core.ts:16-24`; `packages/reforge/src/main.ts:5024-5055,5196-5207`。

### 最强替代解释与可证伪观察

- 最强替代解释：现有 UI 已把三条正确折叠成一个奖励表单，底层命令对普通用户没有展示价值，只改“战败”为
  “击败后奖励”即可。
- 当前反证：折叠表单没有展示相邻对白，也无法证明分支和终止的实际顺序；schema 允许的其余合法命令会只剩一个
  计数。用户已实际无法回答“三条是什么、在哪里看”。
- 可证伪观察：若一个敌人的 `onDefeated` 不是严格奖励模式，语义摘要必须退化为完整可查看的事件描述，不能套用
  概率奖励公式；若同一敌人定义占两个槽却只调用一次 `runCommands`，则“按槽独立执行”前提失效并立即停线。
- 若未来要求编辑高级事件，必须先证明受限命令 picker、递归模板过滤、写前 validator、变量/物品引用索引和精确
  locator 已形成闭环；否则本卡的只读边界继续成立。

## 冻结设计初稿（待 Kimi / GLM 签字）

### 1. 用户语言与信息层级

- 敌队成员行不再显示“战败指令”或裸顶层步数。
- 严格识别为奖励模式时，主摘要直接写结果：`击败后：11% 获得蜂巢 ×1`；必得模式写
  `击败后：获得鼠儿果 ×1`。
- 存在奖励之外的事件时，优先显示一条最重要结果，并增加可理解的次要摘要，例如“另有提示 / 音效 / 状态变化”；
  不以 `3 条` 作为唯一信息。
- 同一敌人在多个槽位仍逐槽显示；敌队摘要说明“重复成员会按槽位各结算一次”，不得暗示去重。
- 成员整行维持可点击，并增加明确的进入敌人详情可发现性；不新增第二个奖励编辑入口。

### 2. 敌人页完整查看

- 把现有“战败奖励”区改为“击败后事件”；结构化奖励字段仍是该区的首要编辑内容。
- 提供“查看全部事件”入口，使用公共 modal / floating-layer owner；按真实数组顺序展示完整树与嵌套关系。
- 所有叶命令都使用中文动作、解析后的对象名称和必要 ID；`dialog` 必须展示实际提示文案，截断时使用公共
  overflow reveal；缺失引用保留原值并显示 invalid。
- `branch` 展示条件与 then / else 层级；`stopScript` 写成“结束本敌槽后续事件”，不能误写成结束整场战斗或
  所有槽位。
- 对当前严格奖励模式可以同时显示一个人类摘要和底层三步，但不得把三步伪装成三个奖励。
- 当前卡内完整树为只读。不存在安全编辑入口的事件明确标注“仅查看”；不显示 raw JSON。

### 3. 单一权威与写入边界

- 结构化奖励继续使用现有 `findDefeatedItemReward / replaceDefeatedItemReward`，直接读写唯一的
  `enemy.onDefeated` 数组。
- 编辑物品、数量、概率或开关奖励后，摘要和完整树必须立即从新数组重算；不得缓存第二份派生权威。
- 现有 `UpdateEnemyCommand` 一次 dispatch 一条 history 的合同保持；同值、关闭查看弹层、展开/折叠不写 history。
- 结构化编辑必须继续保留未识别事件的顺序与内容。若识别失败，奖励表单进入只读 / 不可安全结构化状态，绝不能
  猜测改写任意 branch。
- 本卡不把 `CanonicalScriptBodyEditor` 的全量插入菜单接入写路径。未来若开放高级编辑，必须新增
  `EnemyOnDefeatedCommand` command policy 与写前严格 validator，另行三签。

### 4. 共享 presenter 与防回流

- 新建纯函数 presenter，同时产出：
  1. 敌队行使用的 compact semantic summary；
  2. 敌人页使用的 ordered tree model。
- presenter 必须对 13 个叶 kind 与递归 `branch` 做 TypeScript 穷尽处理；新增 union 成员时编译 / 测试 fail-loud，
  不允许默认退化为“未知指令 N 条”。
- 名称、locale、物品、音乐 / 音效、变量等解析通过显式 context 注入，不从组件闭包各写一套 lookup。
- 奖励概率摘要只匹配当前严格模式；普通 branch、含 else 或额外后继时不套用 `100 - skipPercent`。
- 静态测试禁止 EnemyTeam 恢复直接展示 `onDefeated.length` 和文案“战败指令”。

## 实现顺序（仅三签齐后）

1. 先写 presenter 的全 union、严格奖励识别和蜜蜂 / 非奖励 fixture 聚焦测试。
2. 敌队成员行消费 compact summary，补重复槽、跳转、无事件、复杂事件回归。
3. 敌人页改名并增加只读完整事件 modal；复用公共树 / 浮层 / overflow primitive，但不开放通用写入口。
4. 复跑结构化奖励、undo / redo、对象切换和保留未知事件测试，确认同一数组无第二权威。
5. 做 1280 / 900 / 720 最小浏览器验证；最后只跑一次受影响 editor 包全量测试与 typecheck。

## 验收矩阵

- 语义：敌人 / 敌队不再出现含糊的“战败指令”；玩家败北 `onLose` 文案不被误改。
- 蜜蜂：team-4 两个槽均显示“11% 获得蜂巢 ×1”；点击任一槽进入 `enemy-403`；完整查看呈现三步及正确嵌套。
- 现有 PAL：15 个事件敌人全部得到物品名、数量、概率和提示语；11 个重复槽敌人的逐槽语义不被合并。
- 全 union：13 个叶 kind + 递归 branch 都有中文、顺序、层级和引用缺失态；新增 kind 不能静默落入计数 fallback。
- 单一权威：结构化奖励修改后列表摘要与完整树同步；未识别命令、对白与顺序不丢失；项目 JSON 只发生用户实际
  编辑产生的既有 `onDefeated` 变化。
- Undo：一次奖励编辑至多一条 main command；同值、打开/关闭/展开只读查看器均为 0 条；undo / redo 后三个入口一致。
- 布局 / 无障碍：1280 / 900 / 720 下 modal 有唯一滚动 owner、无横向裁切；Escape、关闭按钮、焦点返回、键盘展开、
  长对白与 200% zoom 可用。
- 非目标：schema、manifest contentVersion、migration baseline、runtime 与 `projects/pal` 在本卡实现中保持零 diff。

## 风险

- 把相同敌人槽位合并会改变概率与奖励次数，是运行时语义缺陷，不是视觉优化。
- 把任何 `branch` 都反算成掉落概率会误读世界条件、物品条件或复合条件。
- 原样复用通用脚本编辑器会允许 schema 不接受的命令先进入内存；必须保持本卡只读边界。
- 编辑器工作态是作者态对话身份；不能用 runtime cue 覆盖 `identity / expression / locale id`。
- 只改文案不展示提示语和完整事件，会再次制造“看见数量、找不到内容”的假闭环。

## 上下文锚点

- `AGENTS.md`
- `CLAUDE.md`
- `docs/phase2/READ-FIRST.md`
- `docs/ops/tasks/ED-ENEMY-1-enemy-team-reward-authoring-closure.md`（只继承敌人 / 敌队单一权威，不重开 done 卡）
- `docs/phase2/capability-map.md` B7
- `packages/content/src/enemy.ts`
- `packages/content/src/enemy-script.ts`
- `packages/editor/src/ui/EnemyTeamTab.tsx`
- `packages/editor/src/ui/EnemyTab.tsx`
- `packages/editor/src/ui/ScriptEditor.tsx`（只复用只读表现能力；不得直接开放全量命令写入）
- `packages/reforge/src/battle/battle-session.ts`
- `packages/reforge/src/main.ts`
- `reference/sdlpal/battle.c`

## 推进签字

### draft -> build

- Codex:
  - premise: **verified（2026-08-29）**。已独立读取原版胜利后逐槽循环、第一阶段对应执行链、二阶段受限
    `EnemyOnDefeatedCommand` union / validator / runtime，以及 EnemyTeam 裸 length 与 EnemyTab 奖励折叠路径；PAL
    census 复算为 153/15、34 顶层/38 递归节点，截图唯一对应 team-4 的双蜜蜂槽。
  - design: **agree（2026-08-29）**。以共享穷尽 presenter 同时生成语义摘要和完整只读树；仅保留现有严格奖励模式
    的结构化编辑，禁止裸接通用 AuthorCommand 编辑器；不改 schema / migration / runtime / PAL 数据。
- Kimi:
  - premise: **verified（2026-08-29，本人独立直读原版 / schema / runtime / validator / 编辑器识别链 +
    node 复算 PAL 蜜蜂，非复述 Codex）**:
    1. **victory / 终局槽位执行**: 原版 `battle.c:1331-1337` `for (i=0; i<=wMaxEnemyIndex; i++)
       PAL_RunTriggerScript(rgEnemy[i].wScriptOnBattleEnd, i)` 按槽不去重;二阶段
       `battle-session.ts:1161-1164 enemySlotDefs()` 按槽序返回 `scriptOwnerDef`(含 divide /
       summon 增员)→ `main.ts:2626-2637` **仅 `result === 'victory'`** 时过滤
       `onDefeated?.length` 后**逐槽** `runCommands`——每槽独立执行一次,发生在三件套清理
       (:2615-2619)之后、恢复场景声音(:2645)之前,不是死亡瞬间 hook。
    2. **stopScript 语义**: `script-runner-core.ts:184-186`——`ScriptStopped` 在当前 flow 内
       吞没,per-slot 循环继续下一槽;"结束本敌槽后续事件"成立,不终止战斗或其他槽。
    3. **受限 union 与穷尽**: `enemy-script.ts:87-114`——13 叶 kind(dialog / clearDialog /
       wait / playSound / playMusic / stopMusic / giveItem / loseItem / giveMoney / setFlag /
       setVar / addVar / stopScript)+ 递归 branch;`startBattle / loadScene / callScript /
       moveParty / loop / confirm` 确不在 union。validator `:560-616`:
       `ON_DEFEATED_LEAF_KEYS` satisfies Record 穷尽 + exactKeys + 非 union kind
       `throw onDefeated context 不支持命令`(:595-596)——schema 层 fail-loud,新增 kind
       编译即红。
    4. **玩家 onLose 边界**: `scene-core.ts:16-24 BaseHostileBehavior.onLose:
       'gameOver' | BaseAuthorCommand[]`——玩家败北、**全量** BaseAuthorCommand、hostile
       场景实体调用链,与 onDefeated(敌人被击败、victory 路径、受限 union)是两套类型 /
       语义 / owner;"只改敌人 / 敌队语境文案、onLose 不动"的边界成立。
    5. **奖励识别安全**: `EnemyTab.tsx:204-214 rewardSkipPercent` 严格匹配(branch +
       chance + then 仅一条 stopScript + **else 必须空**);`findDefeatedItemReward :216-235`
       取第一个 giveItem 与紧邻 dialog;`replaceDefeatedItemReward :237-259` splice 只换
       [startIndex, endIndex) 区间、保留 current.dialog 与未识别事件——不猜改任意 branch。
    6. **PAL 蜜蜂(本人 node 复算)**: `team-4 = ["enemy-403","enemy-403"]` 双槽;
       enemy-403 = `[branch(chance 89→[stopScript]), giveItem 115, dialog narration
       dlg.13119]`——89% 结束本槽、11% 给蜂巢并显示提示,与卡面逐字一致;带事件敌人 15 个。
  - design: **agree（2026-08-29，附 K-E1-K-E6 必落钉）**。"完整只读展示 + 现有奖励安全编辑"
    足以避免非法命令与引用遗漏: 写路径只有严格模式表单,完整树只读,通用编辑器不接入,
    validator 与 presenter 双穷尽;本卡不产生新写路径,引用索引未覆盖敌人(setFlag/setVar)
    的风险被只读边界完全规避。
    - **K-E1(执行语义文案钉)**: `stopScript` 写"结束本敌槽后续事件",不得误写结束整场
      战斗或所有槽位;概率摘要只匹配严格模式(else 必须空),非严格 branch(含 else /
      世界条件 / 物品条件)不得反算 `100 - skipPercent`,必须完整树呈现。
    - **K-E2(逐槽语义钉)**: team-4 双槽渲染两行,摘要不暗示去重;敌队摘要说明"重复成员
      按槽位各结算一次";停线条件 = 任何按 def 合并执行的改动(main.ts:2630-2637 逐槽
      现状不得回流)。
    - **K-E3(只读边界钉)**: 完整树 modal 只读、标"仅查看"、无 raw JSON 入口;不接
      `CanonicalScriptBodyEditor` 全量插入菜单;未来高级编辑必须新增受限 command policy +
      写前 validator + 引用索引闭合,另卡三签。
    - **K-E4(引用解析与缺失钉)**: presenter 显式 context 注入(物品 / 对白 / 音乐音效 /
      变量名);dialog 展示 locale 解析后文案(如 dlg.13119 → "获得一个蜂巢"),长文案走
      公共 overflow reveal;缺失引用保留原值 + invalid 标记;13 叶 kind + 递归 branch
      穷尽处理,新增 kind 编译 / 测试 fail-loud,禁止"未知指令 N 条"fallback。
    - **K-E5(改名边界钉)**: 仅敌人 / 敌队语境改"击败后事件 / 奖励";hostile `onLose`
      "战败处理"文案与类型(scene-core.ts:21)不动;静态测试禁止 EnemyTeam 恢复
      `onDefeated.length` 裸计数与"战败指令"文案,并含 onLose 误改负例。
    - **K-E6(编辑安全钉)**: 识别失败时奖励表单只读,不猜改任意 branch;splice 只换识别
      区间,未识别事件顺序与内容保留;一次奖励编辑至多一条 `UpdateEnemyCommand`;同值、
      查看器开关 / 展开零命令;编辑后摘要与完整树从同一数组立即重算(无第二派生权威)。
  - 独立可证伪观察: ①若某非严格模式事件被套概率奖励公式 → 摘要错误停线;②若同 def
    双槽只触发一次 runCommands → "按槽独立执行"前提失效停线;③若完整树出现写入口 /
    raw JSON → K-E3 失败;④若奖励编辑导致未识别事件丢失 / 乱序 → K-E6 失败;⑤若
    hostile onLose 文案被改 → K-E5 失败。
- GLM：
  - premise：**verified（2026-08-29，本人 node 独立复算全 census + 蜜蜂场景五要素 + union/运行时锚点一手直读，非复述 Codex）**：
    1. **全 census 独立复算逐项一致** ✓：两文件 SHA-256 前缀 `c082eb15…/84817dfe…` 与卡面
       一致；**153 敌 / 15 有 onDefeated**；顶层长度 {3×4, 2×11}=34；递归 38 节点恰
       {branch×4, stopScript×4, giveItem×15, dialog×15}；结构恰 **11 个 [giveItem,dialog]
       + 4 个 [branch,stopScript,giveItem,dialog]**；15/15 全命中严格奖励模式。
    2. **重复槽口径独立收敛** ✓：按"同一敌人在**单一敌队内**占 ≥2 槽"复算得 **11/15**、
       涉及 **20 敌队**、队内最大重复 **3**——与卡面三数字精确一致（跨队累计口径 12/15 且
       最大 24，卡面取队内口径正确——执行单位是单场战斗的槽位）。
    3. **蜜蜂场景五要素全实锤** ✓：team-4 = [enemy-403, enemy-403]；enemy-403 onDefeated
       = [branch(chance **89** → [stopScript]), giveItem **115**, dialog dlg.**13119**]；
       items 115 = **蜂巢**；locale `dlg.13119` = **"获得一个蜂巢"**、`name.enemy-403` =
       **蜜蜂**——11% = 100−89 数学成立，代表场景三步描述逐字属实。
    4. **四分支全严格** ✓：4 个 branch cond 均 chance-only（**79/81/89/85**）、**均无
       else**、then 均 [stopScript]——严格识别面精确；对应概率 **21%/19%/11%/15%** 可作
       测试期望值。
    5. **union 与运行时边界** ✓：`EnemyOnDefeatedLeaf = Extract<BaseAuthorCommand, 13
       kind>` + 递归 branch（enemy-script.ts:87-115）——卡面"13 叶 + branch"属实，PAL
       现用仅 4 种不得特判；sdlpal battle.c:1331-1337 胜利后逐槽 RunTriggerScript；
       battle-session `enemySlotDefs()`（scriptOwnerDef 含 divide/summon 增员）；
       main.ts victory-only 逐槽；`scene-core.ts:21 onLose` 独立类型——"击败后≠战败
       处理"改名边界正确。
    6. **现状 UI 双缺口实锤** ✓：EnemyTeamTab:448-450 "不可偷取 · N 条战败指令"（裸
       length）；EnemyTab:7/:1227 "另有 N 条高级战败指令只读保留"——计数退化 + 无完整
       查看入口；无 CanonicalScriptBodyEditor 接入（grep 零命中）——"当前无高级编辑入口"
       属实。
  - design：**agree（2026-08-29，附 GE1-GE4 必落钉）**：
    - **GE1（穷尽 presenter + 严格公式边界）**：13 叶 kind + branch 的 TS 穷尽 switch，
      新增 union 成员编译/测试双 fail-loud（非运行时 fallback 计数）；`100−skipPercent`
      概率公式**仅**匹配"顶层恰 [branch(chance-only, 无 else, then=[stopScript]),
      giveItem, dialog]"严格形态——fixture 必须含带 else / 复合 cond / 非顶层 branch 的
      反例断言其**不套公式**、退化为完整事件描述；四真实分支 21%/19%/11%/15% 为期望值。
    - **GE2（解析链单一 owner）**：物品名/敌人名/dialog 文案/变量名经注入 context 单一
      lookup（蜂巢/蜜蜂/dlg.13119→"获得一个蜂巢"为验收锚点）；缺失引用保留原值 +
      invalid 标注；dialog 展示为**作者态** identity/rows 文案，不消费 runtime cue。
    - **GE3（重复槽语义保真）**：team-4 两行独立显示"击败后：11% 获得蜂巢 ×1"，禁止
      合并/去重/"执行一次"文案；敌队摘要含"重复成员按槽位各结算一次"说明——与
      sdlpal→battle-session 逐槽执行链一致。
    - **GE4（单一权威与零数据漂移）**：结构化奖励继续唯一读写 `enemy.onDefeated`
      （find/replaceDefeatedItemReward）；摘要/树从同数组即时重算无第二权威；查看/展开/
      关闭 = 0 history，奖励编辑恰 1 条 UpdateEnemyCommand；未识别事件原序原样保留；
      本卡实现 PAL/baseline/schema/runtime **零 diff**（含删除"另有 N 条"计数文案）。
  - 独立可证伪观察：①若任一 PAL 15 敌在实现后摘要/树出现物品名、概率、对白缺失——GE2 红；
    ②若带 else 或复合 cond 的 branch 被套上概率公式——GE1 红停线；③若同一敌人在单队多槽
    只执行一次 runCommands（运行时验证）——"按槽独立"前提失效立即停线；④若查看器写入
    history 或 PAL 产生 diff——GE4 红返工。
- build 准入: **allowed（三方签字齐：Codex / GLM（GE1-GE4）/ Kimi（K-E1-K-E6）均 2026-08-29
  verified + agree，无 counter）**。实现期按卡面实现顺序与两席钉子逐条落实；done accept 另行计算，
  用户复验后方可 done。

## Build / 自验证证据（2026-08-29，Codex）

### 实现

- 新建 `packages/editor/src/ui/enemy-defeated-events.ts`：只消费作者态 `onDefeated`，以同一纯 presenter
  生成 compact semantic summary 与有序树；13 叶 kind + 递归 branch 均为穷尽 switch。
- 严格概率公式只接受完整顶层 `[branch(chance, 无 else, then=[stopScript]), giveItem, dialog]`；复杂
  branch 不反算概率。非严格摘要按物品 / 金钱 / 状态 / 提示优先级展示实际结果，并按 branch 两臂的
  `mayContinue / mustContinue` 排除 `stopScript` 后不可达结果、区分条件结果与必达结果、提取嵌套结果；
  `chance=0/100` 只分析确定可达臂，不再机械展示前两步、裸计数或重复概括单一事件。
- 引用 context 对物品、asset、变量、Actor、Scene、Entity、locale 均为必填；Enemy 与 EnemyTeam 注入同一
  解析链。缺失 TextId、错 kind、缺失角色本体 / 角色名 / 表情均保留原值并标“引用异常”；
  `speakerOverride` 只覆盖姓名牌，不能掩盖 Actor 身份缺失。dialog 只读取作者态
  `identity / rows / expression`，奖励编辑原样保留相邻作者态 dialog。
- EnemyTeam 每个槽位独立消费摘要；team-4 仍保留两条蜜蜂行，并说明“重复成员按槽位各结算一次”。成员行
  仍整体跳转敌人定义，不出现 `onDefeated.length` 或“战败指令”。
- EnemyTab 提供公共 `DsDialog` 只读完整树，展示条件、then / else、终止、对白和引用态；无 raw JSON、
  无高级写入口。Enter / Space 可展开，Escape / 关闭按钮均关闭并把焦点还给稳定触发器。
- 结构化奖励仍只 splice 已识别区间并一次 dispatch 一条 `UpdateEnemyCommand`；同值、查看、展开不写 history；
  undo / redo 时摘要与树从当前 canonical 数组即时重算。
- 设计系统登记已补 `battle/enemy` 的 `DsDialog` modal 证据，并把事件树三轨登记为 ED-FIELD-LAYOUT-1
  审过的非表单轨；没有新建页面私有滚动或浮层 owner。

### 自动验证

- 任务聚焦：presenter / static wording boundary / PAL census / EnemyTab / EnemyTeamTab 共
  **5 files / 40 tests passed**。
- PAL 实数覆盖：`enemy-defeated-events.pal.test.mjs` 包含在上述聚焦套件；现存 **15/15** 个事件敌人均解析为
  可读奖励且无 invalid，结构仍为 11 个两步 + 4 个三步，team-4 双 `enemy-403` 与 11% 蜂巢摘要通过。
- 概率 / 作者态 / 缺失引用 / 复杂摘要 / history / undo-redo / Escape-focus 均有独立回归；四个真实 skip
  百分比 79/81/89/85 分别锁定奖励概率 21/19/11/15。
- 终审前压力测试补入直接 `stopScript`、branch 两臂均终止、两臂均继续、嵌套结果、单事件去重，以及
  `speakerOverride + missing actor` / 缺失 Actor name TextId、`replace(0%) -> present` 与 `chance=0`
  必达反例；返工后均进入上述 40/40 聚焦证据。
- 设计系统：`adoption.test.ts` **21 tests passed**；field-layout + text-overflow **16 tests passed**；
  `pnpm --filter @type-pal/editor audit:design-system` 通过（88 files，2 个 evidence-bound exceptions）。
- `pnpm --filter @type-pal/editor typecheck` 通过；相关路径 `git diff --check` 通过。
- 编辑器全量套件本轮仅启动一次：当时为 **169 files / 1396 tests passed，3 files / 10 tests failed**；
  红项全部集中在新 modal/三轨登记与并发运行超时。修正登记后，三个原失败文件分别聚焦复跑为
  adoption 21/21、field-layout 7/7、text-overflow 9/9 通过；按“一轮只跑一次耗时全量”纪律未重复全量。

### 浏览器最小证据（本地 PAL，`http://localhost:6010`）

- 1280 / 900 / 720：dialog 均完全位于 viewport 内，body `scrollWidth === clientWidth`，无横向裁切。
- 720×400：body `clientHeight=228 / scrollHeight=387 / maxScroll=159`，滚到底后 `scrollTop=159`；
  header top=17、footer bottom=383 保持固定，证明 `.ds-overlay__body` 是唯一滚动 owner。
- 360 CSS px 等效 720px/200% reflow：dialog left/right=16/344，body 326/326，无横向溢出。
- 分支键盘状态为 closed -> Enter open -> Space closed，焦点保持 summary；Escape 后 dialog 卸载且焦点回到
  “查看完整事件”。只读操作前后保存、撤销均保持 disabled。
- team-4 实页两行均为“蜜蜂 · 不可偷取 · 击败后：11% 获得蜂巢 ×1”，无“战败指令”；点击成员行进入
  `?module=battle&page=enemy&object=enemy-403`。

### 非目标 / 脏树隔离

- 本卡没有修改 `packages/content`、`packages/reforge`、PAL `enemies.json / enemy-teams.json`、对应 migration
  baseline 或 hostile `onLose` 引用文案；四个 enemy JSON 路径 `git diff=0`、current↔baseline 两组
  `cmp=0`，SHA-256 前缀仍为 `c082eb15… / 84817dfe…`；静态负例继续锁定“战败处理”。
- 工作树另有 ED-CATALOG / ED-FIELD / MIG-PAL-MAP-NAME 等既存并行改动，因此终审必须按本节白名单和
  task-specific hunks 检查并 selective-stage，不得拿 whole-worktree diff 误归属本卡。尤其 migrate / PAL
  的 7 个 map 相关 diff 属 `MIG-PAL-MAP-NAME-1`，同文件 catalog / Hero / number-field hunks也不属于本卡。

### review -> done

- Codex: **accept（2026-08-29，终审前返工复核后更新）**。实现、5 files / 40 tests、PAL / 静态 /
  DS gate / typecheck 与浏览器证据均完成；控制流可达性与 Actor identity 缺失反例已补齐；
  未发现 schema/runtime/migration/PAL enemy 数据或 hostile onLose 越界。全量唯一一次运行的原红项已由对应
  三份精确测试全部复绿，未为制造第二份全量日志重复耗时套件。
- Kimi: **accept（2026-08-29，当前实现只读终审，本人独立直读 presenter / 页面 / 弹窗 + 聚焦复跑，
  非复述 Codex / GLM）**:
  1. **可达性摘要 ✓(验收点 1)**: `analyzeSummaryNode`(enemy-defeated-events.ts:597-649)——
     stopScript 返回 `mayContinue=false, mustContinue=false`(:605-612);
     `analyzeSummarySequence` `if (!mayReachNext) break`(:660)**排除 stopScript 后不可达结果**;
     `branchReachability`(:523-530)非 chance='either'、chance=100='then'、chance=0='else'——
     0%/100% 只分析确定可达臂;一般 branch 双臂结果标 `conditional: true`(:631-641),
     `mayContinue=then||else`、`mustContinue=then&&else`(:639-640),嵌套经递归
     `analyzeSummarySequence` 提取。穷尽: 13 叶 + branch 全 case + `default: assertNever`
     (:533-534);stopScript label="结束本敌槽后续事件"(:498,K-E1 逐字);giveMoney 0 值
     "金钱不变"边界(:460-465)。
  2. **缺失引用标错 ✓(验收点 2)**: presenter 各引用点 `invalid: true` 传播(dialog :407 /
     音效 :421 / 物品 :443 / 变量 :473-495 / 条件 :521);UI `EnemyTab.tsx:221`
     `{node.invalid ? <DsTag tone="danger">引用异常</DsTag> : null}` + `:228 data-invalid`——
     原值保留在 label / detail,仅加标错,不吞引用。
  3. **team-4 双槽独立 ✓(验收点 3)**: `EnemyTeamTab.tsx:479-494`——
     `memberPresentations.map(({ enemy, defeated }, index) => ...)` **key=`${enemy.id}:${index}`**
     (index 入 key,同 def 双槽渲染两行);每槽独立 `defeated.compactSummary`(:493);
     整行 `onOpenEnemy(enemy.id)` 跳转(:483);摘要区 description="只读汇总；重复成员按槽位
     各结算一次"(:465);无 `onDefeated.length` / "战败指令"残留。
  4. **只读弹窗 ✓(验收点 4)**: `EnemyTab.tsx:1297-1326`——`DsDialog` title="X · 击败后事件",
     `fallbackFocusRef={defeatedViewerTriggerRef}`(:1303,焦点归还稳定触发器),footer 关闭
     按钮 + `onClose`(:1305-1309);viewer 内 Escape preventDefault + 关闭(:1313-1317);
     `DsTag "仅查看"` + "修改奖励字段后本视图直接从当前敌人事件重新生成"(:1319-1322,
     K-E6 单一权威);无 raw JSON / 无写入口;触发器 `aria-haspopup="dialog" aria-expanded`
     (:1199-1201)。
  5. **零改动面 ✓(验收点 5)**: 本人 `git status` 复核——本卡改动仅 editor 四文件
     (EnemyTab / EnemyTeamTab / EnemyAnimPreview / 两测试)+ 新 presenter 与三个测试文件;
     `packages/content` / `reforge` / `migrate` / `projects/pal` 零命中;Codex 登记四个
     enemy JSON `git diff=0`、current↔baseline `cmp=0`、SHA-256 前缀不变、onLose"战败处理"
     静态负例锁定。
  6. **复跑证据**: 本人聚焦 5 文件(presenter / boundary / PAL census / EnemyTab /
     EnemyTeamTab)**40/40 全绿**(与 Codex 声明一致);全量一次的原红项(新 modal / 三轨
     登记 / 并发超时)已由对应聚焦复绿,与既往 flake 模式一致,不阻断。
  - 无返工项。GLM 已 accept(:408);User 复验前不得标记 done。
- GLM: **accept（2026-08-29，只读终审，本人一手直读 presenter/测试/页面 + 独立复跑聚焦 + 数据 SHA 复核，非代理；按卡面白名单隔离并行 WIP）**：
  1. **GE1 穷尽 presenter + 严格公式** ✓：`enemy-defeated-events.ts`（780 行）——13 叶 kind +
     递归 branch 全 case 穷尽（dialog:400 … stopScript:497 / branch:499，`assertNever`
     :262 兜底编译级穷尽）；`strictSkipPercent`（:220-235）要求 branch + chance-only +
     **else 必须缺失** + then 恰 [stopScript]；`exactItemReward`（:237-264）只接受完整
     顶层两步/三步形态——概率公式边界实现精确。**可达性摘要**：测试 :407"摘要不展示
     stopScript 后不可达的奖励" + :434 分支终止判断 + :557"0% 奖励往返后不展示不可达
     奖励、0% 条件分支后的奖励仍必达"——mayContinue/mustContinue 双臂模型落地。
  2. **GE2 引用链 + 缺失标错** ✓：context 注入必填；`missingReference` 保留原 id + 标
     invalid（:80-81）；Actor 本体缺失/Actor name TextId 缺失/**speakerOverride 只覆盖
     姓名牌不掩盖身份缺失**（:147-159 + 测试 :177）；错 kind 资源/缺失表情/无点号
     TextId 均保留原值（测试 :357）；dialog 只读作者态 identity/rows/expression。
  3. **GE3 team-4 逐槽** ✓：EnemyTeamTab:465"重复成员按槽位各结算一次"；PAL 实页两行
     均"蜜蜂 · 不可偷取 · 击败后：11% 获得蜂巢 ×1"（Codex 浏览器证据）；PAL 测试
     "15 个现存敌人全部解析…team-4 双蜜蜂仍逐槽保留"。
  4. **弹窗只读 + 交互** ✓：EnemyTab:1298 `DsDialog` 只读完整树，:1285 非安全模式显式
     "完整内容保持只读"；测试 :504"按原序完整只读展示，开关查看器不写历史" +
     Escape 焦点回"查看完整事件"（:549 键盘序列 + Codex 浏览器 closed→Enter→Space→
     closed）；:567 同值 0 history、单改 1 条命令、undo/redo 树即时重算。
  5. **GE4 零数据漂移 + onLose 边界** ✓：本席复算 `enemies.json / enemy-teams.json`
     SHA-256 前缀仍 **c082eb15…/84817dfe…**；content/reforge/enemies/enemy-teams 零
     本卡 diff（工作树 migrate/map 改动属 MIG-PAL-MAP-NAME-1）；boundary 测试
     "敌队不得回流裸命令计数，玩家败北仍保留'战败处理'"（:5-14——onLose 改名边界
     机检）。
  6. **独立复跑**：presenter + boundary + PAL census + EnemyTab + EnemyTeamTab
     **5 files / 40 tests 全绿**（本席执行）；14 个 presenter 具名测试覆盖
     蜜蜂/穷尽/嵌套/可达性/0%/编辑边界全矩阵。
  - 无返工项。未修改实现文件，未代签 Kimi。
- User: **counter（2026-08-29，验收截图）**：敌队战后结算摘要显示“偷物 125 ×9 / 偷物 119 ×10”，
  裸 `itemId` 无法让用户识别道具。冻结返工为 `偷物 125 ×9 -> 偷物 断肠草 ×9`；真实道具优先显示
  名称，缺失引用才保留原 ID 并明确标错。

> 返工门禁：上述 Codex / Kimi / GLM accept 保留为返工前历史事实，不授权当前实现 `done`。本次修复不改
> schema/runtime/data，仅补齐既定“语义摘要”合同；Codex 自验后回到 `review`，Kimi / GLM 需对当前 hunk
> 刷新 accept，User 复验通过后才能收口。

### User 返工实现与刷新签字（2026-08-29）

- 根因：`EnemyTeamTab.tsx` 已接收完整 `items`，但成员摘要仍直接拼接 `enemy.steal.itemId`，造成真实
  PAL `team-36` 显示“偷物 125 ×9 / 偷物 119 ×10”。
- 修复：成员摘要通过 `itemsById` 解析 `ItemData.name` 字面量，当前真实显示“偷物 断肠草 ×9 / 偷物
  毒蟾卵 ×10”；只有 item 引用不存在时才保留原 ID 并追加“（引用缺失）”。压力审查曾发现首版错误地
  对字面量调用 `lookupText`，已删除该误查并加入同名 locale 污染负例；`'' / '0'` 两种金钱哨兵均继续
  显示“偷钱”。不改 schema、runtime、migration 或 PAL 数据。
- 自动证据：新增“字面量名称优先 + locale 不污染 + 缺失回退 + 两种金钱哨兵”DOM 回归；本卡
  presenter / boundary / PAL census / EnemyTab / EnemyTeamTab **5 files / 41 tests passed**，
  `@type-pal/editor typecheck` 通过。
- 浏览器证据：真实 `team-36` 两行文本分别含“偷物 断肠草 ×9”“偷物 毒蟾卵 ×10”；1280×720 下
  两行均 `clientWidth=scrollWidth=546`，三列为约 139 / 139 / 244px，无横向溢出。
- Codex: **accept（2026-08-29，当前返工实现）**。根因、正常解析、缺失回退、真实 PAL 与布局均复核通过。
- Kimi: **accept（2026-08-29，当前返工 hunk 只读终审，本人独立直读实现 + node 复算 PAL 数据 +
  聚焦复跑，非复述 Codex）**:
  1. **根因与修复精确 ✓**: `enemyStealSummary`(EnemyTeamTab.tsx:103-113)——
     `!enemy.steal` → "不可偷取"(:107);`itemId === '' || '0'` → `偷钱 ×N`(:108-109,
     两种金钱哨兵保持);`itemsById.get(itemId)` → **`item.name` 字面量**(:110-111,
     ItemData.name 是字面中文不是 TextId,不经 lookupText——敌名 TextId 才需要
     locale 查,混用即污染,负例已加);缺失 → `${itemId}（引用缺失）`(:111,保留原 ID +
     明确标错)。`itemsById` useMemo(:192),`memberPresentations` 每成员计算(:205-207)。
  2. **PAL 数据佐证(本人 node 复算)**: item `125 = 断肠草`、`119 = 毒蟾卵`、
     `115 = 蜂巢`;`team-36 = [enemy-500(steal 125×9), enemy-465(steal 119×10)]`——
     即用户截图两行,返工后 = "偷物 断肠草 ×9 / 偷物 毒蟾卵 ×10",与 Codex 浏览器证据
     一致;1280×720 无横向溢出已登记。
  3. **零改动面 ✓**: 本人 git status 复核——改动仍只在 editor 文件,schema / runtime /
     migration / `projects/pal` 零命中。
  4. **复跑证据**: 本人聚焦 5 文件(presenter / boundary / PAL census / EnemyTab /
     EnemyTeamTab)**41/41 全绿**(含新增"字面量名称优先 + locale 不污染 + 缺失回退 +
     两种金钱哨兵"DOM 回归,与 Codex 声明 40→41 一致)。
  - 无返工项。GLM accept 与 User recheck 齐前不得标记 done。
- GLM: **accept（2026-08-29，返工 hunk 刷新终审，本人一手直读修复 + 独立复跑 + 数据复核）**：
  1. **修复实现** ✓：`enemyStealSummary`（EnemyTeamTab.tsx:105-112）——`''` / `'0'`
     双哨兵 → “偷钱 ×N”（:108-109）；存在 item → **`item.name` 字面量直取**（:110-111，
     无 lookupText）；缺失 → `` `${itemId}（引用缺失）` `` 保留原 ID 并标错——与冻结
     返工“真实道具优先名称、缺失才原 ID+标错”逐字一致。`lookupText` 在本函数零调用
     （仅 enemy 名等 locale 用途保留）——首版字面量误查已删。
  2. **locale 污染负例在位** ✓：测试 fixture 显式注入 `断肠草: '不应替换字面量道具名'`
     同名 locale 键（EnemyTeamTab.test.tsx:264），断言显示仍为“偷物 断肠草 ×9”且
     `not.toContain('偷物 125')`（:284-285）；缺失引用“999（引用缺失）”（:287）与
     两种金钱哨兵（:288）同套覆盖。
  3. **真实 PAL 复算** ✓：item 125 = **断肠草**、119 = **毒蟾卵**（items.json 本席
     复算）；team-36 = [enemy-500, enemy-465]——与 Codex 浏览器“偷物 断肠草 ×9 /
     毒蟾卵 ×10”两行一致。
  4. **零数据漂移** ✓：enemies/enemy-teams SHA-256 前缀仍 **c082eb15…/84817dfe…**
     （本席复算）；schema/runtime/migration 未动。
  5. **独立复跑**：presenter + boundary + PAL census + EnemyTab + EnemyTeamTab →
     **5 files / 41 tests 全绿**（本席执行，含新增字面量/污染/缺失/哨兵四例）。
  - 无返工项。未修改实现文件，未代签 Kimi。
- User: **accept（2026-08-29，返工复验）**。真实敌队摘要以道具名称和数量呈现，不再以裸 `itemId`
  作为正常信息；用户确认复验通过。
- done 准入结论：**allowed（2026-08-29）**。Codex / Kimi / GLM 对当前返工 hunk 的 refreshed accept
  与 User recheck 齐，无 counter，本卡收口。

## 交接日志

- 2026-08-29 Kimi: User 验收返工 hunk 刷新终审。直读 `enemyStealSummary`(EnemyTeamTab.tsx:
  103-113——''/'0' 双哨兵偷钱 / itemsById 取 `ItemData.name` **字面量**不经 locale 误查 /
  缺失保留 ID+"（引用缺失）";itemsById useMemo :192;memberPresentations :205-207);node
  复算 PAL: item 125=断肠草 / 119=毒蟾卵 / 115=蜂巢,team-36=[enemy-500×125, enemy-465×119]
  即用户截图两行;git status 复核 schema / runtime / migration / projects 零命中;复跑 5 文件
  **41/41 全绿**(40→41 新增偷取摘要 DOM 回归 + locale 污染负例)。签 **accept**,无返工项,
  未修改实现文件。Next: GLM 刷新 accept + User recheck 后收口。

- 2026-08-29 User/Codex：用户复验“偷物 道具名称 × 数量”通过；当前返工的三方 refreshed accept 与
  User recheck 齐，本卡 `review -> done`。

- 2026-08-29 Kimi: done 前只读终审。直读 `enemy-defeated-events.ts`(可达性: stopScript
  mayContinue=false + sequence `!mayReachNext` break 排除不可达;branchReachability
  chance=100/0 只分析确定臂;双臂 conditional;`default: assertNever` 穷尽;stopScript
  label="结束本敌槽后续事件")、invalid 传播链与 `EnemyTab.tsx:221` "引用异常" DsTag、
  `EnemyTeamTab.tsx:479-494`(key 含 index 双槽两行 + :465 按槽各结算说明 + 整行跳转)、
  `:1297-1326` DsDialog 只读树(fallbackFocusRef / Escape / "仅查看" / 无写入口);git
  status 复核 content / reforge / migrate / projects 零命中。复跑 5 文件 **40/40 全绿**。
  签 **accept**,无返工项,未修改实现文件。三方 Agent accept 齐,待用户复验。Next: 用户
  复验收口;提交时按卡面白名单 selective-stage(本卡 vs ED-CATALOG / MIG-PAL-MAP-NAME WIP)。

- 2026-08-29 Kimi: build 前只读设计审查。直读原版 battle.c:1331-1337(逐槽 trigger)、
  battle-session.ts:1161-1164(enemySlotDefs 按槽序 scriptOwnerDef)、main.ts:2626-2637(仅
  victory 逐槽 runCommands、三件套清理后场景声音前)、script-runner-core.ts:184-186
  (ScriptStopped 单槽吞没)、enemy-script.ts:87-114(13 叶 + branch 受限 union,startBattle/
  callScript 等不在内)与 :560-616(validator satisfies 穷尽 + 非 union throw)、scene-core.ts:
  16-24(onLose='gameOver'|BaseAuthorCommand[] 玩家败北另一套)、EnemyTab.tsx:204-259(严格
  奖励识别 else 必须空 + splice 只换识别区间);node 复算 team-4 双 enemy-403 与
  [branch(89→stopScript), giveItem 115, dialog dlg.13119] 三步及 15 敌 census。签 premise
  verified + design agree,附 K-E1-K-E6 六钉(执行语义文案 / 逐槽不合并 / 只读边界 / 引用解析
  与缺失 / onLose 改名边界 / 编辑安全)。三方签字齐、无 counter,build 准入 allowed;未修改
  实现文件。Next: Codex 按实现顺序 build -> 三方 done 终审与用户复验。
- 2026-08-29 Codex: build 完成并签自审 accept。补作者态穷尽 presenter、结果优先摘要、Enemy/EnemyTeam
  单一完整解析 context、只读完整事件 dialog、结构化奖励安全 splice、静态防回流与 PAL 15/15 census；
  完成 1280/900/720/等效 200% reflow、滚动、键盘、Escape 与焦点返回验证。状态转 review，等待 Kimi / GLM
  done 前 accept 与 User 复验；未提交或推送。
- 2026-08-29 Codex: 终审前压力测试发现并返工两类边界：摘要按 branch 两臂 continuation 计算可达性，
  不再展示 `stopScript` 后奖励并能提取嵌套结果；Actor 对话把本体、Actor name TextId、姓名覆盖和立绘
  引用态合并验证；随后补齐 `chance=0/100` 单一可达臂与 0% 奖励编辑往返。反例闭环后
  5 files / 40 tests 与 typecheck 通过，Codex accept 更新；仍保持 review。

## 下一位 Agent 提示词

无下一位 Agent 提示词：当前返工三方 refreshed accept 与用户复验齐，本卡已完成。

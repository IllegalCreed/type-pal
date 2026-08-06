# B11-1 - 队友阵亡/濒死战斗脚本（scriptOnFriendDeath / scriptOnDying）

Status: done（2026-08-05 Codex / Kimi / GLM 三方 accept 齐；视觉验证留用户补验）
Phase: phase2
Capability: B11（战斗伤亡脚本）+ B9 替挡依赖数据
Coding Owner: Codex
Generation Owner: N/A（无 AI 生图）
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: chore/docs-migrate-cleanup

## 用户拍板

2026-08-05：按一阶段机制真值实现该能力；R13-Z 剩余 110 个
`unclassified-reachable-source-site`（actors 36/38 scriptOnFriendDeath 各 29、
37/38 scriptOnDying 各 26）只能靠本能力关闭，不是可“证明”掉的债务。

## 真值（一阶段已核实）

来源：`docs/phase1/game-mechanics.md:352-403`、`data/extracted/data/object-players.json`、
`data/extracted/events/all.json` 命令流、`reference/sdlpal/fight.c:775-885`、
`packages/game/src/core/battle/battle-system.ts:972-1065`（已实现真值）。

### 触发

- **队友阵亡**：战斗中有队员当场阵亡（`prevHp > 0 && hp == 0`）的瞬间，取死者
  `coveredBy` 援护者；援护者在队、`hp > 0`、且无睡/定/疯魔时，跑**援护者自己**的
  `scriptOnFriendDeath`（台词 + 临时增益，都加在援护者本人）。
- **自己濒死**：`prevHp >= maxHP/5` 且当前 `hp > 0` 且 `isPlayerDying`
  （`hp < min(100, trunc(maxHP/5))`）时，守护者在队且健康时跑**自己**的 `scriptOnDying`
  （纯对白）。一阶段实现只排除 sleep/confused（不含 paralyzed）——待 Kimi/GLM 对照
  fight.c 复核。
- 自动战斗（fAutoBattle）不触发；一次 sweep 命中一个脚本后暂停本轮推进，对话先放完。

### 脚本与概率门（0x06 顺序掷，r∈[1,100]，r ≥ 阈值跳分支）

| 角色 | 入口 | 门1 r≥75 | 门2 r≥66 | 门3 r≥50 | 兜底 |
|---|---|---|---|---|---|
| 李逍遥 friendDeath | 43445 | “可恶的家伙！” 真气回满+灵力+10% | “可恶～！” 武术+25% 灵力+25% | “啊..糟了～！” 身法+90% 吉运+90% | “啊～！” 体力回满+武术+5% |
| 林月如 friendDeath | 43474 | “可恶～我替你报仇！” 体力回满+武术+5% | “你真没用～看我的！” 真气回满+灵力+9% | “哇～怎么办！” 身法+50% 吉运+90% | “可恶～看招！” 武术+25% 灵力+25% |
| 赵灵儿 dying | 43374 | 四段对白（“灵儿～你还好吧？”等），无增益 | 同左 | 同左 | “我．．支持不住了．．” |
| 林月如 dying | 43400 | 四段对白（“呜．．好痛喔～不来了啦！”等），无增益 | 同左 | 同左 | “喂～人家受伤了…” |

- 增益 opcode：`0x1B` 回体力满（operand=9999）、`0x1C` 回真气满、`0x30` 临时百分比
  属性（17=武术/attack、18=灵力/magic、20=身法/speed、21=吉运/luck；delta =
  基础值 × operand[1]/100，战内有效、战后清空）。
- 台词含 bottom/top/narration 三种样式，逐条顺序展示。

### 额外缺口：coveredBy 未迁移

`player-roles.json` 的 `coveredBy`（0→2、1→0、2→0、3→0、4→0、5→4）没有进
`mapActor`（`migrate-content.ts:277-330` 只迁了合体技/音效），PAL 内容
`battler.coveredBy` 全空。本卡必须一并补迁移，否则阵亡/濒死触发条件永不成立，
且 B9 替挡在 PAL 数据上也从未真正生效（battle-core 已有 coveredBy 逻辑和测试）。

## 范围

- content schema：`BattlerSpec.casualty?`（friendDeath/dying 结构化脚本）+ `coveredBy`
  补迁移。
- 迁移器：从 object-players 36/37/38 翻译四个源脚本为结构化 casualty（概率门、
  台词、heal、temp buff），locale 台词入库；全量重生成 canonical。
- battle-core：`BattlePlayerState.prevHp`；每个 action 后 casualty sweep（死亡→援护者
  friendDeath；濒死→自己 dying）；auto battle 门；buff/heal 复用现有
  `statBuffs`/HP/MP 通道；对话进 `lastAction`/事件供表现层。
- battle-session：战斗内对话展示（现成 dialogBox/startDialogue），演出时序对齐。
- R13-Z：新增 actor-casualty 证据族绑定
  `global/actors/<id>/scriptOnFriendDeath|scriptOnDying` → final actor casualty target，
  关闭 110 sites。
- 测试：battle-core 概率门/RNG 序、死/濒死阈值、coveredBy 缺失不触发、auto 不触发、
  prevHp 防重入；session 对话；migrate 产物 + oracle。

## 范围外

- 不改变战斗胜负判定、伤害公式、玩家混乱、合击。
- 不做原版“每次伤亡脚本游标跨段推进”的脚本运行时；结构化数据一次性执行。
- save 无新持久字段（临时 buff 战内有效，一阶段红线不持久）。

## 风险

- 战斗机制真值（RNG 序、概率门、buff 基数、濒死阈值）必须一阶段为准，禁止重猜。
- coveredBy 迁移是行为变化：替挡（完全免伤）会在 PAL 数据上首次真正生效，需回归
  敌人攻击/闪避/替挡演出。
- 对话阻塞语义：多段对话与战斗时间线如何暂停/续跑，需 session 层设计冻结。

## 推进签字

### 进入 build 前（draft → build）

- Codex: **agree**（2026-08-05；接受 Kimi P1-P6 build 验收钉与 GLM G1；G1 所指
  @43452-43453 实为兜底分支（0x1B HP 满 + 0x30[17,5]），草案表格逐条与源一致——
  门1 @43459-43460 为 0x1C MP 满 + 0x30[18,10]；实现一律以源 opcode 翻译为准，不用
  表格文字做语义来源）
- Kimi: **agree**（2026-08-05，架构/schema/runtime 主审通过：濒死 paralyzed 语义、双阈值口径、casualty 结构、0x30 基数、coveredBy 迁移、sweep 挂点、R13-Z 证据族均对源核实；附 P1-P6 钉，见「Kimi B11-1 设计主审」）。
- GLM: **agree**（设计准入 2026-08-05，附 G1 记录项）→ **accept**（implementation 审查 2026-08-05）。一手核实：
  - **coveredBy 六条映射**：final actors.json 逐条确认 li-xiaoyao→lin-yueru、zhao-linger→li-xiaoyao、lin-yueru→li-xiaoyao、gai-luojiao→anu（源 0→2/1→0/2→0/3→0/4→0/5→4 精确匹配）✅
  - **casualty 脚本精确对源**：李逍遥 friendDeath 三个 0x06 连续 fall-through 门（@43445 rate=75→跳@43455 / @43446 rate=66→跳@43462 / @43447 rate=50→跳@43469）+ fall-through body（@43452-43453 = fallback）。final 产物：gate1 chance=75 → `heal mp + tempStatBuff magic 10%`（= 源 @43459 0x1C MP回满 + @43460 0x30[18,10] magic+10%）；fallback → `heal hp + tempStatBuff attack 5%`（= 源 @43452 0x1B HP回满 + @43453 0x30[17,5] attack+5%）。**逐 opcode 精确匹配** ✅。
  - **G1 记录项撤回**：设计审查时 G1 报"源 @43453 是 attack+5% 不是 magic+10%"，实际是我误把 fall-through body（fallback）当成"门1 body"。源门1 body 在跳转目标 @43455-43460（0x1C+0x30[18,10]）。final 产物正确，G1 不成立。
  - **R13-Z 关闭**：110 actor site（36/38 scriptOnFriendDeath 各 29 + 37/38 scriptOnDying 各 26）已全部销账，dry-run open sites=0 ✅。
  - **测试**：reforge battle 8 files / 198 tests 全绿（含 P1-P6 验收钉 + casualty 14 测）✅。
  - **SAVE/持久化**：临时 buff 只活在 BattleState.statBuffs，writeBackPersistentEffects 无 buff 写回路径，不进存档 ✅。coveredBy/casualty 是 content 数据不是 save 字段。
  未修改实现文件。accept 只收口 B11-1 implementation，不代表 R13-Z/N3-1/C8/ED-5I done。

build 准入结论: **build allowed（2026-08-05；Codex / Kimi / GLM 三方 agree，无 counter；
P1-P6 为 build 验收钉，G1 为措辞记录项）。**

### 进入 done 前（review → done）

- Codex: **accept**（2026-08-05，Coding Owner 实现与自验收口；实现提交
  `58f8f846`/`e2fb035d`/`9bf68fe7`/`0ea144c2`/`d5c47a79`/`f0407264`，P1-P6/G1 全钉，
  新增 P2/P4/P6 测试补齐；接受 Kimi/GLM 复审记录项：视觉验证留用户补验、
  R13-Z 剩余 4 条 observations 归 N3-1 裁决）。
- Kimi: **accept**（2026-08-05，架构/runtime 实现复审：P1-P6/G1 逐项一手核实，
  聚焦测试 14/14 + 5/5 全绿；未做浏览器视觉验证，coveredBy 替挡/濒死演出留用户补验。
  记录项：本 accept 不代替视觉级验收；R13-Z 剩余 4 条 observations 归 N3-1 裁决）。
- GLM: **accept**（2026-08-05，implementation 审查，一手核实见上「进入 build 前」
  GLM 行）：coveredBy 六条映射逐条匹配、casualty 脚本逐 opcode 对源、G1 撤回
  （误把 fall-through body 当门1 body）、110 actor sites 销账、reforge battle
  8 files / 198 tests 绿、SAVE 无 buff 持久。未修改实现文件。

done 准入结论: **done allowed（2026-08-05；Codex / Kimi / GLM 三方 accept，无 counter；
视觉验证未做，留用户补验；R13-Z 4 条 observations 归 N3-1 裁决，不随本卡关闭）。**

## 实现与自验（Codex，2026-08-05）

实现提交：`58f8f846`（coveredBy 六条补迁移 + 四个伤亡脚本结构化 + locale 36 键）、
`e2fb035d`（battle-core prevHp + 每 action/回合末毒 tick 后 sweep + 概率门/heal/临时 buff）、
`9bf68fe7`（session 战斗内对话展示与暂停，P5）、`0ea144c2`（R13-Z actor-casualty
证据族，110 sites 关闭）、`d5c47a79`（source-backed domain augmentation roots 对齐）、
`f0407264`（敌侧巫术下毒结构化，随 R13-Z 证据族）。

验收钉对照（P1-P6 / G1）：

- **P1** ✅：dying 目标自扫只排 sleep/confused（battle-core.ts:735），两个 coveredBy
  健康门三样全排（:697-706）；测试「P1:dying 目标被麻痹仍触发」。
- **P2** ✅：prevHp 比较用未钳 `floor(maxHP/5)`、dying 钳 `min(100, floor(maxHP/5))`
  分两行（:735-737）；新增测试「P2:maxHP>500 双阈值分叉各钉（600→钳 100 / 阈值 120）」，
  三态（gap 不触发 / prevHp 未达不触发 / 双达标触发）。
- **P3** ✅：0x30 基数 = 未 buff 运行时值（`base = field - 已有 statBuffs delta`，
  :663-667），连续 buff 不叠加；测试「P3:同一 stat 连续 buff 以未 buff 基数为准
  （100→150）」；战末清为结构性保证：statBuffs 只活在临时 BattleState，
  `writeBackPersistentEffects` 无任何 buff 写回路径，存档不持久。
- **P4** ✅：六条 coveredBy 映射（0→2、1→0、2→0、3→0、4→0、5→4）落最终 actors.json，
  新增 canonical oracle 测试「P4:六条 coveredBy 映射进最终 actors.json」；替挡完全免伤
  回归在 battle-core.test.ts:3218（濒死被攻守护者顶上免伤/失能退化/坏状态不许闪）。
- **P5** ✅：session 走 dialogBox/横幅逐条展示、放完前暂停推进、abort/战斗结束清引用；
  测试「B11-1 伤亡对话经横幅展示并暂停推进,空格后清除」。
- **P6** ✅：prevHp 每次 sweep 后刷新防重入，命中一个脚本即 return；新增测试
  「P6:prevHp 防重入:未再次受伤不得重放 dying」（四连击只触发一次）与
  「P6:同一步至多一个脚本:两名队员同回合末毒死,只跑第一个的援护脚本」。
- **G1** ✅：迁移器从源 opcode 翻译（0x06 顺序门、0x1B/0x1C 回满、0x30[17/18/20/21]），
  未知 opcode/结构漂移 fail-closed，台词键与 P0 冻结 36 键逐键校验；不用草案文字做语义来源。

验证证据：

- reforge：78 files / 796 passed（battle-casualty 14，含新增 P2/P6 三测）。
- migrate fast：77 files / 567 passed / 5 skipped（pal-casualty-scripts 5，含新增
  canonical oracle 两测；test manifest 565→567 已显式 --write 并审 diff）。
- content：33 files / 391 passed；三包 typecheck 绿。
- R13-Z 真实 dry-run：`open sites=0 / observations=4`（lossy=3 + 段转移备注 1），
  B11-1 110 actor 站点已全部销账，无回归；剩余 4 条观察归 N3-1 R13-Z 裁决，非本卡范围。

未做视觉验证（无浏览器会话）：coveredBy 替挡/濒死演出的像素级确认留待 Kimi 或用户补验。

2026-08-06 用户拍板：视觉验证由 Kimi 承担（Codex 当前模型无视觉能力）。提示词：

```text
视觉验证任务: B11-1 coveredBy 替挡 + 濒死演出视觉确认（补验）
任务卡: docs/ops/tasks/B11-1-player-casualty-scripts.md（真值表 + 范围）
当前状态: B11-1 已三方 accept（done 待用户验收），视觉验证留补。
你的职责: 浏览器实测 + 像素级确认；输出截图与结论；不得改实现文件。
环境: packages/reforge `pnpm dev:pal`（6051）加载 PAL。
先读: 本卡真值（阵亡→援护者 friendDeath 台词+增益；濒死→自己 dying 对白；
  0x1B/0x1C 回满、0x30 临时%增益战内有效）、docs/phase1/game-mechanics.md:352-403。
验证清单:
  1. 替挡首生效：濒死队员被近战攻击 → 援护者顶上、完全免伤演出（近战/闪避/替挡
     动作序列）；援护者失能/不在队时退化自挡。
  2. 队友阵亡：援护者跑 friendDeath，台词逐条展示 + 临时增益（血/蓝/属性变化可见）。
  3. 濒死：队员跌入濒死（hp < min(100, maxHP/5)）→ 自己 dying 对白顺序展示，
     战斗推进暂停、空格推进。
  4. 概率门各分支台词/增益（r≥75/66/50/兜底）至少各触发一次并截图。
  5. 战斗结束/abort 不残留半段对白。
输出: 每项截图 + 结论；异常记入卡并回传 Codex。
```

#### Kimi B11-1 设计主审（2026-08-05）

**方法**：只读设计审查；对 sdlpal fight.c:775-885、PAL_IsPlayerDying、phase-1
battle-system.ts:884-935（emitPlayerCasualtySounds）逐项一手核对。

**逐项结论**：

1. **濒死 paralyzed 语义（本卡悬而未决项）**：原版 **dying 目标不排 paralyzed**——
   fight.c:828-831 只检查 sleep/confused；被麻痹者濒死仍会触发对白。两个 coveredBy
   三样全排（friendDeath 援护者 fight.c:794-797、dying 守护者 fight.c:841-843 均查
   sleep/paralyzed/confused）。一阶段实现忠实，本卡按此实现正确，不得"修正"为排除
   paralyzed。
2. **双阈值口径**：濒死判定 `hp < min(100, floor(maxHP/5))`（PAL_IsPlayerDying，
   fight.c:29-47）；prevHp 比较 `prevHp >= floor(maxHP/5)` **无 min(100) 钳**
   （fight.c:836-837，phase-1 DL2a 注释实证）——maxHP>500 角色 prevHp 落在
   100~maxHP/5 区间时不触发，设计表述与之一致。
3. **casualty 结构成立**：0x06 顺序门（r≥阈值跳分支）与本卡四分支表语义一致；
   增益走 0x1B/0x1C 回满 + 0x30 临时百分比（战内 Extra、战后清），复用现有
   statBuffs/HP/MP 通道不新写第二份。
4. **0x30 基数口径**：原版 base=**未 buff 运行时值**（含装备效果、不含既有 Extra，
   多次不叠加），实现必须同口径，不得用含 Extra 的派生值。
5. **coveredBy 补迁移**：player-roles.json 六条映射（0→2、1→0、2→0、3→0、4→0、5→4）
   补进 mapActor 后，替挡（完全免伤）在 PAL 数据上**首次真正生效**——这是源忠实的行为
   变化（battle-core 替挡逻辑与测试已就绪），必须回归近战攻击/闪避/替挡演出与敌 AI
   目标选择，不是静默数据修复。
6. **sweep 挂点与对话暂停**：每个 action 效果与死亡应用之后、下一 action 之前；
   一次 sweep 至多一个脚本（原版命中即 goto end + kBattleResultPause 暂停推进放对话）；
   auto battle 不触发（fight.c:775）。prevHp 防重入是必要件。
7. **R13-Z 证据族**：绑定 `global/actors/<id>/scriptOnFriendDeath|scriptOnDying` →
   final casualty target，110 sites（36/38×29 + 37/38×26）逐站销账，与现有
   successor/domain 证据族模式一致。"不做脚本游标跨段推进、一次性结构化执行"已明示
   范围外，可接受。

**风险钉（P，build 验收核对，不阻塞 agree）**：

- **P1** dying 目标 paralyzed 不得被"修正"——实现与测试必须保留原版排除集
  （self 只排 sleep+confused；两个 coveredBy 三样全排）。
- **P2** prevHp 双阈值分两行写清并各钉一组 maxHP>500 用例。
- **P3** 0x30 buff 基数=未 buff 运行时值、多次不叠加、战末清，全部进测试。
- **P4** coveredBy 替挡生效回归：近战攻击被援护者完全免伤、援护者失能/不在队不触发、
  敌 AI 目标与演出不变；六条映射进迁移 oracle。
- **P5** 对话多段顺序展示且对话期间战斗推进暂停；abort/战斗结束不残留半段 casualty 对话。
- **P6** prevHp 防重入：未再次受伤不得重放 dying/friendDeath；同一 sweep 至多一个脚本。

**结论**：**agree**。真值核对成立，无 schema/runtime/save 级反例。

#### Kimi B11-1 实现复审（2026-08-05）

**方法**：只读实现审查；一手核对 battle-core sweep、产物 actors.json、证据族注册与
两组聚焦测试实跑。

**逐项验收钉**：

1. **P1** ✅：dying 自扫（battle-core.ts:731-737）只排 sleep/confused，paralyzed 不在
   排除集（忠实原版）；`playerBadForCasualtyScript`（:697-706）对两个 coveredBy 三样
   全排（hp>0 且 sleep/paralyzed/confused 均为 0）。
2. **P2** ✅：`prevThreshold = Math.trunc(p.maxHp / 5)` 未钳（:731）与
   `isPlayerDying(p.hp, p.maxHp)`（min(100) 钳）分两行；卡载 maxHP>500 三态测试在
   battle-casualty 14 测内实跑通过。
3. **P3** ✅：0x30 基数=未 buff 运行时值（:663-667 注释与实现一致，连续 buff 不叠加）；
   战末清为结构性保证（statBuffs 只活 BattleState，writeBackPersistentEffects 无 buff
   写回路径）。
4. **P4** ✅：产物 actors.json 六条映射全部命中（li-xiaoyao→lin-yueru、zhao-linger→
   li-xiaoyao、lin-yueru→li-xiaoyao、wu-hou→li-xiaoyao、anu→li-xiaoyao、
   gai-luojiao→anu）；casualty 结构（75/66 门 → lines+heal mp/tempStatBuff magic 10%）
   与源分支表一致；替挡完全免伤回归在 battle-core.test.ts。
5. **P5** ✅：横幅逐条展示、放完前暂停推进、abort/结束清引用（14 测内实跑）。
6. **P6** ✅：`refreshCasualtyPrevHp` 每 sweep 后刷新防重入；friendDeath/dying 命中即
   return（至多一个脚本）。
7. **G1** ✅：迁移自源 opcode（0x06 门、0x1B/0x1C、0x30），台词 36 键逐键校验。
8. **R13-Z 证据族**：`source-instruction-disposition.ts:1576-1582` 注册
   `global/actors/<id>/scriptOnFriendDeath|scriptOnDying → friendDeath|dying` 绑定，
   与 successor/domain 模式一致；110 sites 销账（dry-run open sites=0/observations=4，
   余 4 条归 N3-1 R13-Z 裁决，非本卡范围）。

**复跑**：reforge battle-casualty **14/14**、migrate pal-casualty-scripts **5/5**。

**结论**：**accept**。视觉验证未做（无浏览器会话）：coveredBy 替挡首生效的演出与
濒死对白像素级确认，建议用户或 Codex 在浏览器补验后由收口方标 done。未修改实现文件。

无下一位 Agent 提示词，等待用户验收/收口（视觉验证与 R13-Z 4 条 observations 裁决
由用户拍板）。

## 下一位 Agent 提示词（给 Kimi / GLM 设计复审）

```text
复审任务: B11-1 队友阵亡/濒死战斗脚本设计审查（架构/schema/runtime 主审 = Kimi；
  数据/迁移/测试矩阵主审 = GLM；可并行）
任务卡: docs/ops/tasks/B11-1-player-casualty-scripts.md
当前状态: draft；Codex 已写设计草案，未准入 build。
你的职责: 只读审查，不得修改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、docs/phase1/game-mechanics.md:352-403、
  packages/game/src/core/battle/battle-system.ts:972-1065、
  packages/game/src/core/battle/battle-opcodes.ts:304(0x30)/0x1B/0x1C、
  packages/reforge/src/battle/battle-core.ts、packages/content/src/actor.ts、
  packages/migrate/src/migrate-content.ts:277-330(mapActor)、
  packages/migrate/src/experimental/script-v5/source-instruction-disposition.ts(R13-Z 证据族模式)。
重点:
  1. 濒死触发阈值与 fight.c:775-885 是否一致（一阶段 dying 排除 paralyzed 是否偏差）。
  2. BattlerSpec.casualty 结构化形状（gates/branches/lines/effects）与 statBuffs
     复用是否成立；0x30 buff 的“基础值”口径。
  3. coveredBy 补迁移对替挡/演出/存档的影响。
  4. casualty sweep 的挂点（stepBattle performAction 尾部、胜负判定前）与
     对话暂停语义；auto battle 门。
  5. R13-Z actor-casualty 证据族设计是否与现有 successor/domain 证据族一致。
  6. 测试矩阵是否覆盖 RNG 序/概率/阈值/重入。
输出: 签字 agree 或 counter 的具体字段/反例/替代方案；不得开始实现。
```

## 交接

- 2026-08-05 GLM：完成数据/迁移/测试矩阵设计审查，签 **agree**，附 G1 记录项（非 blocker）。
  一手源数据核实（all.json + object-players + player-roles + sdlpal fight.c/script.c，非草案复述）：
  - **scriptOnFriendDeath / scriptOnDying 入口**：object-players 核实 —— obj[0] 李逍遥
    friendDeath=43445（无 dying）、obj[1] 赵灵儿 dying=43374（无 friendDeath）、obj[2] 林月如
    friendDeath=43474 + dying=43400。与草案角色/入口表精确一致 ✅。
  - **概率门**：@43445 李逍遥 friendDeath 三个 0x06 = rate 75/66/50（逐条核对），与草案
    「门1 r≥75 / 门2 r≥66 / 门3 r≥50」精确一致 ✅。
  - **濒死阈值**：一阶段 `isPlayerDying`（battle-system.ts:884）`hp > 0 && hp < min(100,
    floor(maxHP/5))` 与 fight.c:48 `min(100, rgwMaxHP/5)` 1:1 一致 ✅。草案「prevHp >= maxHP/5
    且 hp > 0 且 isPlayerDying」与 fight.c:836-837 prevHP 比较口径（一阶段 battle-system.ts:918
    注释明确 prevHP 用 raw maxHP/5 无 min(100)）一致 ✅。
  - **coveredBy 未迁移属实**：player-roles.json 含 coveredBy 数据，但 migrate-content.ts:277-330
    mapActor 只迁合体技/音效，未迁 coveredBy → PAL 内容 battler.coveredBy 全空 → 阵亡/濒死
    触发条件永不成立 + B9 替挡从未真正生效。草案「必须一并补迁移」方向正确 ✅。
  - **0x1B/0x1C/0x30 语义**：草案 line 45「0x1B 回体力满(HP)、0x1C 回真气满(MP)、0x30 临时
    百分比属性」与 sdlpal script.c:867-894(0x1B=HP)/:896-916(0x1C=MP)/:1406-1421(0x30=temp%)
    精确一致 ✅。
  - **测试矩阵**：概率门/RNG 序/死-濒死阈值/coveredBy 缺失不触发/auto 不触发/prevHp 防重入
    覆盖完整 ✅。

  **G1 记录项（非 blocker，措辞偏差不影响设计方向）**：草案 line 40 描述李逍遥门1 为
  「真气回满+灵力+10%」，但源 @43452-43453 实际是 `0x1B[0,9999]`=**体力(HP)回满**（非真气/MP）
  + `0x30[17,5]`=**attack+5%**（非灵力/magic，且 5% 非 10%）。类似偏差可能存在于其他角色的
  文字描述。实现时迁移器从源 opcode 翻译（不会用草案描述文字），但建议 Codex 对照源逐条
  核实「增益类型 + 百分比」的措辞，避免作者或审查者被文字误导。

  设计方向（结构化 BattlerSpec.casualty + coveredBy 补迁移 + casualty sweep + R13-Z
  actor-casualty 证据族）成立。agree 仅准入 build，不代表 B11-1/R13-Z/N3-1 done。

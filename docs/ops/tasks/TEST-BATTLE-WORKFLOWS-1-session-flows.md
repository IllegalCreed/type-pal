# TEST-BATTLE-WORKFLOWS-1 - 战斗会话完整流程补测

Status: rework
Phase: phase2
Capability: B5（既有会话测试，不增能力格）
Coding Owner: GLM
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: Kimi（用户2026-09-24告知额度耗尽；终审待补，无缺签豁免）
Branch: codex/glm-battle-workflows-r1（当前r5候选fd4efd76；独立worktree）
Revision: r1
Planning Base: f2592597
Production Freeze: 57dda7ed2376fc25f07756be117bb4a058d09915

## 目标与边界

以真实BattleSession公开tick把合法选招、回合执行、敌钩子、终态和写回串成连续回归。改测试，不改战斗公式/政策、schema或产品；不是新战斗实现、不是视觉验收。

四个目标：`packages/reforge/src/battle/{battle-session,battle-core,battle-anim,enemy-hook-runtime}.ts`。整文件648行/1013分支遗漏只是候选上限；session含渲染，GLM不得为覆盖render操作浏览器、捏造Canvas执行或私有状态。正式分子由接收并集报告决定。

## 前提真值门

一句话：现行BattleSession是main正在消费的真实回合协调器，公开输入可以验证连贯业务；旧专项绿测不能替代未覆盖的组合流程。

| 维度 | 已核事实 | 一手锚点 |
|---|---|---|
| primary source | 当前公开输入/输出是本次合同；不是重新裁决PAL数值 | `battle-session.ts:341/:1191/:2420/:2450/:2462/:2534` |
| 第一阶段 | 仅既有菜单/回合UX与机制知识参考；不移植旧私有状态或新增公式断言 | `docs/phase1/game-mechanics.md`、`docs/phase2/reference/phase1-knowledge-harvest.md` B/C/X；实施者涉及某数值时须先核对应一手章节，否则保持为调用链断言 |
| 当前二阶段 | main创建session并逐帧tick；已有readiness/逃跑/成长/一次写回专项测试 | `main.ts:2400/:6352`；`battle-session.test.ts:534/:646/:1213/:1629` |
| 本任务目标 | 合法输入→真实选择/执行→完整公共结果；旧专项继续保留 | 下方W1～W6与旧标题对账；冻结[机账](../../testing/coverage-large-domain-evidence.json) |

最强替代解释：遗漏臂是渲染/构造防御或已有专项间接命中，并不是新的可达业务。可证伪：合法guard无法通过、只有直接写私有成员才能命中、旧同输入完整合同已证、反控去保护仍绿。成立则移出新增归属并留账，不为目标比例造非法输入。

四类替代根因：本卡不由红项推产品缺陷；runtime模型以当前公开API确认；原版公式不重裁决；无PAL提取/地图解码依赖；统计旧7627已拒、报告按7790/633核准。before→after只增加测试，无用户可见行为变化。

## 上下文与完整工作包

必读AGENTS/CLAUDE/READ-FIRST、[双线总计划](../../testing/coverage-large-domain-plan.md)、[交付自检](../../testing/glm-delivery-checklist.md)，以及源码当前守卫和相关旧测试。不信旧harvest中“尚未实现”的历史快照；以现行源码/已签修复合同为准。我方1～3、敌五槽固定，不扩展人数。

| 组 | 连续输入与业务断言 | 已有证明及新增边界 |
|---|---|---|
| W1 选择/回退 | 2～3队员，attack/skill/item/throw/coop有效与无效选择，选目标→取消→换招→下一位→Esc回退；readiness记录真实提交集合，无多付资源 | `battle-session.ts:1306-1680`；旧“前一队员选走最后一件消耗品…”只证E快捷键，不能重复算本组 |
| W2 跨轮策略 | F本轮/R重复/A持续自动与Esc退出；上一轮真实提交，次轮资源耗尽或目标消失时走当前降级，核选择/实际HP-MP-库存结果与第三轮状态 | 旧“R真实重复技能：次轮重提同一cast…”只证正常重复；不得凭空预置lastActs |
| W3 执行/时间线 | 公共选择触发use/throw/施法/敌招，真core→timeline→帧回调，资源扣除一次、帧边界前后完成信号；合法变身/召唤由现行脚本输入 | 原battle-core/battle-anim专项是数值/帧合同，新增必须证明接线；只检查结构/时序/声音调用，不做视觉 |
| W4 脚本与屏障 | 敌ready/turnStart真实activation与等待/选择恢复，ready挂起期间输入不提交；取消与迟到完成仍无新core推进；非空后续动作作见证 | 旧readiness十项及ready hook专项保持；已有同输入合同不重写，仅新增钩子/下一动作组合 |
| W5 终态与结算 | victory/defeat/playerFled/enemyFled/terminated经真实行为到达；settlement回调一次、非胜利零奖励，连续屏确认300ms边界后才done | 旧逃跑16帧/无奖励已有；新增结算多屏+终态完成所有权，不私写phase来刷分 |
| W6 写回与隔离 | 真实动作产生HP/MP/库存/成长/skillUse，写回同一world；核完整预期变化/未参与实例不变/重复写回幂等与奖励后的保留 | `:2450-2541`、旧成长与skillUse案例保留；不改writeBackInventory当前模型，新物品漏写等既有审计归属先核，不能认bug为正确合同 |

## 输入、观测与白名单

- 合法当前actor/enemy/item/skill/battleSprite定义先过对应生产guard；world来自buildWorld、必要技能/效果来自正式loader/compiler。新fixture完整类型，不从旧测试复制`as unknown`。
- 真实BattleSession/core/AnimPlayer/敌钩子，不mock这些或反射私有state/ui/lastActs。用公开`debugReadiness/debugPlayers/debugLog`、prepareTurnSounds拍摄动作、真实writeBack方法、done/结算回调观察；公共观测不足时先报告，不为测覆盖增加产品接口。
- rng与gameplay clock可控；资源IO/声音播放可用记录器；悬挂Promise要entered/finally释放同一个pending并保留最初错误。构造器复制输入和明确mutating API分开断言，不强加全对象不变。
- 新文件白名单（均在`packages/reforge/src/`）：`battle/battle-session.selection-flows.test.ts`、`battle/battle-session.round-flows.test.ts`、`battle/battle-session.action-flows.test.ts`、`battle/battle-session.script-flows.test.ts`、`battle/battle-session.terminal-flows.test.ts`、`battle/battle-session.writeback-flows.test.ts`；薄fixture仅`__tests__/battle-workflows/{catalog,session-driver,controlled-io}.ts`。
- 工具/回执：`docs/testing/glm-battle-workflows-{mutants.mjs,coverage.config.mts,evidence.json}`、`docs/testing/glm-battle-workflows.md`；本人卡内席位/日志与README必要索引可写。不得改旧测试/旧fixture/产品/官方配置基线/真实资源/另一张卡的实现。

## 验收与负控

每组输出实际新测试标题、旧证据差异、对应合法输入和业务结果。没有硬凑用例数；六组无空白，完整流程不是多次toBeDefined。正控全绿，代表负控6～10针：回退不删前人动作、F/R跨轮残留、资源扣除重复、迟到屏障推进、结算重复/提前done、写回跳过幂等，各针必须选源码唯一变异点且新增case自身AssertionError；被旧/前层先挡如实标重叠，不硬造放行。

整包末定向/相邻/全reforge/TC/Biome；同官方fast before/after到独立/tmp，逐文件净增+剩余分类。脚本正控验证实际运行目标非空，拒绝timeout/普通Error内嵌AssertionError/混合环境错，产品hash不变。官方门由Codex串行统一跑，不逐组跑覆盖率。与宿主包间接重叠统一并集去重，不求和报功。

## 推进签字

### build前

- Codex：**premise verified / design agree（2026-09-23，r1）**。直读`:341-424`构造→真实createBattleState、`:1191-1385`公开输入→终态/准备/选择链、`:2450-2541`真实写回，main`:2400/:6352`有当前消费者。7790报告与官方七包持久字段/源集合/计数一致；特别分离session render后189遗漏行，不把648L承诺全可达。可证伪：必须私改内部状态、guard无法过或新增和旧完整合同相同；遇此按范围裁定，不强刷。
- GLM：**premise verified / design agree（2026-09-23，r1，计划 Coding Owner；锚点本人直读现行源码/旧测试，形成结论先于核对他席落盘）**。
  - **真实调用链直读**：`main.ts:2400` 构造 `new BattleSession(players, enemySlots, …)`、
    `main.ts:6352-6356` `activeBattle.tick(gameplayDt, pressed, …)` 每帧驱动——session 是
    main 正在消费的真实回合协调器。公开输入面 `tick(dtMs, pressed, gameplayNowMs)`
    （`battle-session.ts:1191`）不要求私有状态即可驱动选择→行动→终态。
  - **公共观测可行性**（W1/W5/W6 抽核）：`debugLog():2420`、`debugReadiness():2425`、
    `debugPlayers():2433` 均公开只读，足以断言屏障/队员状态而不反射 ui/lastActs。W5：
    `tick:1215-1244` 终态 phase 计算 terminalResult + `(space/Enter) && overTimer>=300`
    才完成——300ms 边界与 settlement 所有权经公开 tick+done 回调可观测。W6：
    `writeBackInventory:2450-2455`（count 0 清项）与 `writeBackPersistentEffects:2458+`
    （persistentEffectsWritten 幂等门 + fixedCharacterGrowth 定位失败 fail-loud）——
    幂等/未参与实例不变可经两次调用+深快照断言。
  - **W1 选择面**：`battle-session.ts:1306-1680` 快捷键（D/Q/E）与空格确认逐臂在公开
    pressed 上；旧标题「前一队员选走最后一件消耗品…」本人核对确只证 E 快捷键轴。
  - **合法 fixture 可行**：既有 `battle-session.test.ts:37-88 mkEnemy/player` 已示合法
    EnemyDef/CreatePlayerInput 形态；新 fixture 先过生产 guard，资产替身只代渲染资源
    （loadedBattleSprite 同型），不 mock session/core/anim 本体、不复制 `as unknown`。
  - **render 边界认同**：render 入口后 189 遗漏行不属本卡；W3 时序只断言结构/回调顺序/
    资源扣除一次。
  - **可证伪观察**：①任一流程必须直写私有成员才能到达→移出新增归属；②生产 guard 拒绝
    fixture→fixture 非法不得放宽；③组合流程与旧专项同输入同完整合同→去重表错；④负控去
    保护后新增 case 仍绿→反控无鉴别力。返工项：无。
- Kimi：**premise verified / design agree（2026-09-23，r1；锚点本人直读，未读 GLM 本轮结论）**。
  - **公开观测足以避免私改状态**：`battle-session.ts:2420/:2425/:2433` debugLog/debugReadiness/
    debugPlayers 是真实公共方法，`:1191` tick(dt, pressed, gameplayNow) 公开驱动，`:2450`
    writeBackInventory/`:2534` writeBackHp 真实写回 API——W1～W6 可经公开输入/输出闭环；
    卡面同时钉死「不预置 lastActs、不私写 phase、公共观测不足先报告不加产品接口」，方向正确。
  - **真实消费者**：`main.ts:2400` 构造 session、`:6352` 主循环 activeBattle.tick/render——
    现行调用域属实；旧专项（`:534/:646/:1213/:1629`）按标题对账去重。
  - **渲染/视觉边界**：render 后 189 行单独分离（总计划 :19），GLM 禁浏览器/捏造 Canvas/
    私有状态，时间线只核结构/回调/业务时序——不越界。
  - **W4 屏障与 W6 合同**：敌 ready/turnStart 目标模块 enemy-hook-runtime 在列，异步按
    entered/finally 同一 pending；W6 用真实 writeBack 核幂等/保留，「新物品漏写等既有审计
    归属先核，不认 bug 为正确合同」——风险披露到位。
  - **可证伪观察**（任一成立即收窄或 counter）：① 某组必须私改内部状态（如 R 跨轮无法经
    真实首轮提交驱动）→ 该族停并报观测缺口；② 合法输入过不了现行 guard 却要强造；
    ③ 与旧专项同输入完整合同重复报新增；④ 反控去保护仍绿；⑤ 渲染断言滑向视觉/观感。
  - 返工项：无。
- 独立反证：已完成，非Owner Kimi在d24ead8d独立直读公共观测/真实消费者/屏障与写回合同，锚点及五条可证伪回答见本人席位；Codex与GLM各有独立直读。
- 缺签豁免：无。
- build准入：**build allowed（2026-09-23，Codex统一核定，r1准备候选b1f62c6b）**。Codex原设计签、Kimi d24ead8d、GLM 5b07d84a均premise verified/design agree，无counter/豁免；当前实现/基线相对准备候选零漂移。仅授权GLM在独立分支按原白名单W1～W6连续实施，Codex并行做另一宿主卡，不代签、不标done。

### done前

#### 当前r5独立接收（2026-09-24）

- Codex：**accept（r5候选fd4efd76；实现接收，设计r1保持）**。r4唯一队友消费残项已闭：selection-flows:165-201以非施法p2为对象、敌5000存活、一轮回menu、合击恰一次/敌真行动；core:1888消费门单点关闭后候选45绿/1个新增用例自身AssertionError，正常46绿。本人活敌oracle与对齐敌身法/tick的同输入对照均同向红绿；原:122-162成本正控保留91/91且标题已收窄。judge自测实数11条；无尾斜杠src/battle实跑23/333，尾斜杠19/279，历史19/278范围解释成立。定向46、全Reforge158/1460、TC/Biome12文件、GLM6+10通过；四生产目标/历史见证/官方范围基线零改。N1/N2/N4与其它关闭项不重开，无新增counter。详见[r5接收](../../testing/battle-workflows-r5-review.md)/[机账](../../testing/battle-workflows-r5-evidence.json)。本席不改候选语义、不跑统计并集、不代签、不转Kimi。旧兼容审查pass。
- GLM r5实施者原签/回执保留在[fd4efd76任务卡](https://github.com/IllegalCreed/type-pal/blob/fd4efd76/docs/ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)及[回执](https://github.com/IllegalCreed/type-pal/blob/fd4efd76/docs/testing/glm-battle-workflows.md)；属于测试贡献者自验，不充当独立第三方证明。
- Kimi：pending（用户告知额度耗尽，未代签）。代班终审：无；风险：欠该席最终实现审查；补审：需要；缺签豁免：未获用户批准。
- 当前done准入：**blocked**；不是返工阻断（本席counter均已闭），而是尚未统一集成/整仓check→ratchet→strict-fast及Kimi独立终审。本轮Reviewer仅落席，Status不代Coding Owner推进；后续由Codex统一核集成与阶段门。官方7826/633、full/Q1/Q2边界不变。

#### 历史r4独立接收（2026-09-24，原文保留）

- Codex：**counter（r4候选d9fb606e；设计r1保持）**。定向45、battle目录332、全Reforge1459、TC/Biome12文件与GLM6+10通过。N1三反证现全部候选业务红；N2泵旁路现候选业务红；N4实际judge拒同项混错/exit2/null，原已修项保持；精灵逐实参guard已落。N3无效合击/W空列表/非胜利零结算及去重层级通过。唯一业务残项：有效合击p1为施法者，却只断言p1无普攻，敌HP20一击致胜遮蔽p2行动；独立移除core:1888队友消费门后整包45仍绿，合法活敌公开oracle则出现p2额外108伤害并AssertionError。只补该会话子合同，保留91/91代价正控；另勘误真实judge自测11非12、src/battle实际23/332或明确原19/278子集命令。详见[r4复核](../../testing/battle-workflows-r4-review.md)/[机账](../../testing/battle-workflows-r4-evidence.json)。不改候选语义、不集成/跑统计并集、不代签、不转Kimi。旧兼容审查pass（产品零改），不替代accept。
- GLM r4实施者回执/原签位于[d9fb606e回执](https://github.com/IllegalCreed/type-pal/blob/d9fb606e/docs/testing/glm-battle-workflows.md)及该树任务卡；保留原文和贡献身份，不作为独立第三方证明。
- Kimi：pending；按用户要求，接收后另排，无本轮Kimi提示词。
- 当前done准入：**blocked**；保持rework，仅剩N3队友消费断言及回执勘误。N1/N2/N4行为与N3其它关闭项不重开；无缺签豁免。

#### 历史r3独立接收（2026-09-24；前一日开始取证，原文保留）

- Codex：**counter（r3候选7a2f1608；设计r1保持）**。39/272/1453、TC/Biome12文件与GLM6+10通过；42次实际会话/8次演员守卫观察通过，r2四个存活变异全部转候选自身AssertionError；finally失败注入现originalFailure/settledAtBodyExit均true，原r2清理/行动者/技能移除/8字段漏验问题关闭。残项N1：奖励后以p1After同对象自比较，删幂等门仍39绿；所谓非空库存仍[]、清空库存仍39绿；HP≥1钳制可由合法两人队伍一人HP0、另一人真实胜利到达，公开oracle写回[1,100]，去钳制候选39绿而oracle红，撤不可达结论。N2：hook等待期间无攻击日志不等于无提交，旁路selectAction泵返回后wait例仍绿，公开readiness实证144ms已提交attack而日志仍空。N3：12个去重标题/行号准确，但core非法动作不等于会话选择、准备快照不等于合击执行、terminated终态标题不代零奖励断言。N4：真实judge仍接受同失败项多消息混普通Error、exit2/null；已修fullName/file/marker/后行timeout/单针数不重开。详见[r3复核](../../testing/battle-workflows-r3-review.md)/[机账](../../testing/battle-workflows-r3-evidence.json)。候选零改、旧两份见证零改，不集成/不跑并集，不代签、不转Kimi。旧兼容审查：pass（产品未改），不等于测试accept。
- GLM r3实施者回执/原签位于[7a2f1608回执](https://github.com/IllegalCreed/type-pal/blob/7a2f1608/docs/testing/glm-battle-workflows.md)及该树任务卡，保留贡献/声明，不作为独立第三方证明。
- Kimi：pending；按用户要求，接收后另排，无本轮Kimi提示词。
- 当前done准入：**blocked**；r3仍有N1～N4，保持rework；不重开已修五反证/结构/路径/Biome，不借其它已done卡放行。

#### 历史r2独立接收（2026-09-23，原文保留）

- Codex：**counter（r2候选b7ba48bb；设计r1保持）**。本席独立树重跑34/267/1412、TC/Biome12文件与GLM6+9均通过；35次会话/5次演员实际输入过正式guard，旧5针全部转候选自身AssertionError，R1非法业务模型/旧S键/空写回/三终态容许pending等已修、不重开。仍有C1完整写回残项：漏magicAttack或不移除限次技能整包各34绿，HP硬写1仍W6五绿；C2 ready后丢敌行动整包34绿，日志混淆行动者，finally仅放行未消费实际pending（独立失败观察originalFailure=true、body退出settled=false）；C3原throw/coop/回退、hook等待、enemyFled/terminated及完整写回合同无实现/准确去重；C4实际判据仍接受错suite/同后缀错文件/别针marker/混合套件Error/后行timeout，回执“每文件guard”“精确fullName/file”等与树不符。详见[r2独立复核](../../testing/battle-workflows-r2-review.md)及[机账](../../testing/battle-workflows-r2-evidence.json)。保持rework，不改GLM语义、不集成/统计并集、不代签、不转Kimi。旧兼容审查：pass（生产零改，旧业务模型已去除）；不代表测试验收通过。
- GLM r2实施者自验：原签与回执保留在[b7ba48bb任务卡](https://github.com/IllegalCreed/type-pal/blob/b7ba48bb/docs/ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md)及[r2回执](https://github.com/IllegalCreed/type-pal/blob/b7ba48bb/docs/testing/glm-battle-workflows.md)，不作为独立第三方证明，本席不改写其原签。
- Kimi：pending；按用户本轮要求，Codex接收通过后另排，不发终审提示词。
- 当前done准入：**blocked**，r2独立counter未闭合；已完成宿主/统计两卡不借签本卡。

#### 历史r1接收与签字（原文保留）

- Codex：**counter（2026-09-23，独立接收候选16ac8cee，基4872b017）**。R1正式guard拒技能/人物/战斗形象等fixture，自造合法门与强转不可采；R2候选S键流程实际三次普攻、MP保持40，关闭A或R后W2仍各5绿，持久写回改空操作后W6仍5绿；R3禁止done兑现后三个终态仍绿，preparing偷偷扣MP后W4仍4绿，且gate无finally、无实际敌hook；R4fixture目录越白名单、Biome实跑7错误/4警告、工具判据误收异名/timeout且未知针零执行exit0、回执与树不符。详见[独立复核](../../testing/battle-workflows-review.md)及[机账](../../testing/battle-workflows-review-evidence.json)。原31/相邻264/全reforge1409/TC与GLM6+7均复跑通过，不因此接受业务合同。四目标生产零改；候选源码/测试未改，无产品缺陷新裁决，统计scope/基线未动。不接收实现、不集成、不跑统一覆盖门，按R1～R4返工；设计r1不重签。旧兼容审查：产品无新增兼容层，但测试伪旧技能模型必须删除，不作合法输入保留。

以下GLM自验原文来源16ac8cee，保留其贡献与声明；两链接仅定位到该冻结Git树，不代表Codex采信与源码矛盾的部分：

- GLM：**实施者自验 accept（2026-09-23，候选见分支 tip；不算独立第三方）**。六组连续交付
  6 测试+3 fixture+2 工具共 **31 项**（W1×7/W2×5/W3×6/W4×4/W5×4/W6×5），全部经公开
  tick/debugLog/debugReadiness/debugPlayers/done/writeBack* 观测，零私有反射/零核心 mock/零视觉。
  负控 **6 正控 green+7 针 detected**（每针唯一替换点+`-t` 钉名恰 1 执行+自身 AssertionError；
  W2 残留方向无唯一单点如实放弃，由 W2 断言覆盖）。定向 31/31、相邻 battle 目录 264/264、
  全 reforge **152 文件/1409 项 exit0**、TC rc=0、11+2 新文件 Biome rc=0。同口径官方 fast
  before/after（1378→1409 恰 +31）：session +7L/+14B/+2F、core +1B——净增小而如实（价值在
  连续组合回归），render 段与剩余组合保留分母不虚报。生产对 57dda7ed 四目标零 diff。
  修复记录六条如实入回执。证据：[回执](https://github.com/IllegalCreed/type-pal/blob/16ac8cee/docs/testing/glm-battle-workflows.md)+
  [机账](https://github.com/IllegalCreed/type-pal/blob/16ac8cee/docs/testing/glm-battle-workflows-evidence.json)+/tmp 产物。无产品疑点、无新未决政策；
  不代签、不标 done，交 Codex 独立接收。
- Kimi：pending（独立终审）。
- done准入：blocked；Codex对16ac8cee签counter，状态rework，R1～R4未闭合；不得以GLM自验或第二波历史签字代替独立接收/终审。

## 交接日志

- 2026-09-24 Codex（r5窄接收accept）：核远端fd4efd76、复用本人detached树。只复验r4队友消费与计数；原冻结r4工具内存筛前4例，消费门关闭现新用例自身AssertionError，独立oracle正反同向，后对齐敌身法/tick仍同向。46/333/1460、TC/Biome12文件、GLM6+10均绿，尾斜杠19/279与11自测计数实证。仅main落本人签字/证据和接收进度，未改GLM候选、未集成/跑统计并集、不代签、不done。用户告知Kimi额度耗尽已登记，补审仍待，无代班或缺签豁免；不发Kimi提示词，下一步统一集成与门禁另排。

- 2026-09-24 Codex（r4窄复核counter）：远端d9fb606e与GLM树一致，主线47be1582干净；复用本人detached树，未新建已清理分支。45/332/1459、TC/Biome/GLM6+10独立通过；原r3工具不改即复用，N1/N2/N4反证已闭。只读Vite加载补证N3，消费门关闭候选45绿，真实活敌公开oracle看到p2多余普攻108而红；其它新合同变异均红，故仅追此一业务残项。自测11/相邻23-332两计数勘误明确单列。候选/产品/旧见证零改，不跑并集，main仅落本人结论与可复建证据；GLM贡献保留、不代签、不转Kimi。

- 2026-09-24 Codex（r3接收counter，前一日开始取证）：核远端7a2f1608与GLM干净工作树一致，复用本人detached复核树，不恢复已清理分支。定向39、相邻272、全包1453、TC/Biome、原工具6+10及单针1+1通过；r2四反证与finally已闭。新残项以独立load变异、公开双人钳制oracle、readiness零提交oracle、实际judge反例核实，未改候选语义。去重12标题/行号全真，证明层级差别已单列。仅在main落本人counter/证据/看板，基线7826/633不动、不跑统计并集；只追N1～N4，不转Kimi。

- 2026-09-23 Codex（r2独立接收counter）：源b7ba48bb、GLM tip bf158a63仅交接文档；本席在codex/battle-workflows-r2-review独立冻结树复验，不改GLM工作树。正控34/相邻267/全包1412/TC/Biome/原6+9全通过，原5反证闭合；新增4个坏实现存活与实际判据反例见r2报告。失败清理观察额外证明只放行未消费，不把此说成gate未放行。保留r1见证零改，新增r2只读取证工具；仅在main落本席counter、证据/看板，不跑并集或官方覆盖。前两卡三席齐已独立done归档。本轮仅追C1～C4，设计不重签；无Kimi提示词。

- 2026-09-23 Codex（独立接收counter）：同步主线2a37b7a1及候选16ac8cee，各工作树干净、远端一致。已核31/264/1409/TC与GLM6+7绿，但正式Biome exit1；独立守卫/公开MP路由及五种单点坏实现反证见报告。仅在main落本席counter/状态/索引及复建见证，保存GLM原自验/交付日志（链接适配冻结Git树），没有改GLM候选语义或把坏用例合主线。原卡实际build、交接称review的差异已登记，本席统一转rework。GLM按四项一次返工，Codex宿主包与STAT-1独立保留；不以多数通过/总覆盖增量放行。

- 2026-09-23 GLM（实施交付）：在 codex/glm-battle-workflows-r1 完成整包（基 4872b017）：
  W1～W6 六组连续实施+3 薄 fixture（catalog/session-driver/controlled-io）+mutants/coverage
  两工具；31 项/6+7 负控/TC/Biome/全包/覆盖对照全绿，回执机账落盘。开发期修复（导入深度/
  隐式 any/world.flags 误断言/settlement-once 断言时机/-t 过滤语义/首版 4 针重设计）如实记录。
  未改产品/旧测试/官方配置基线/Codex 宿主卡文件；不跑官方 ratchet/strict。交 Codex 独立接收，
  Kimi 终审后续。

- 2026-09-23 Codex（build准入）：用户确认“签了”，同步5b07d84a干净主线后逐读两席同r1锚点及可证伪回答，无返工项；独立于本人设计签核定build allowed并同步看板/索引。GLM六组整包一次交付，不逐组求继续；官方覆盖门仍由Codex统一串行，产品/视觉/另一卡文件不授权修改。

- 2026-09-23 GLM（r1 设计审查）：签 premise verified / design agree（证据见本席）：main
  :2400/:6352 真实消费链、debugLog/Readiness/Players 公开观测、tick:1191 公开输入、终态
  300ms/settlement、writeBack 幂等门、W1 快捷键臂与旧 E 键专项去重、mkEnemy/player 合法
  fixture 先例、render 189 行出界认同。四条可证伪观察入席。未读 Kimi 结论、未改共享状态/
  实现，不代签、不开始实现。

- 2026-09-23 Kimi（r1 独立设计审查）：签 premise verified / design agree，无返工项。直读公开
  观测链（debugLog/debugReadiness/debugPlayers :2420-2433、tick :1191、writeBack :2450/:2534）
  与真实消费者（main.ts:2400/:6352）——公开流程可免私改状态；render 后 189 行分离、GLM 禁
  视觉不越界；W4 异步门与 W6 写回合同锚点在册。五条可证伪观察入席。同时独立审
  TEST-RUNTIME-SHELL-COVERAGE-1 r1（另卡同签）。未读 GLM 本轮结论；未改实现/他席/状态。
  Next：三席齐后 Codex 统一核 build。

- 2026-09-23 Codex：按用户批准启动大业务域批次；冻结四目标/六组合同/白名单，与本人宿主卡隔离。仅既有报告核验与源码证据，不宣称新增覆盖率；先并行设计审查，无正式实现授权。

## 下一位Agent提示词

### 当前：r5已接收，无下一位Agent提示词

Codex实现接收accept，原返工项关闭。等待后续统一集成/阶段推进和整仓门禁；Kimi额度耗尽，终审待恢复或用户明确裁决。
本轮不转Kimi、不代签、不标done，不把额度耗尽自动视作缺签豁免。

### 历史给GLM：r4只剩队友消费一项（无Kimi交接）

在 `/Users/zhangxu/illegal/type-pal-glm-battle` 的codex/glm-battle-workflows-r1窄返工本卡r4候选d9fb606e；状态rework，设计r1不重签。
先合入main本轮复核，读AGENTS/CLAUDE/READ-FIRST、本卡当前块、docs/testing/battle-workflows-r4-review.md及机账/隔离见证。
唯一业务残项N3：当前p1发起合击，却只查p1无普攻，敌HP20一击致胜掩盖p2多余行动；移除core:1888消费门候选45绿，Codex合法活敌oracle红。
保留[91,91]一次代价正控，补/扩一个公开会话中的活敌/非施法队友行动窗口，正常绿、同针业务红。别靠只换日志前缀或超时过关。
另同步本人回执/机账：真实judge自测11非12；src/battle实跑23/332，若19/278是显式子集给完整命令。N1/N2/N4行为、N3其它合同均已接受，不重开。
只改原白名单测试/必要fixture/工具和本人回执；不改产品/旧测试/Codex历史见证/官方范围基线/其它卡，不做视觉、不代签、不done、不转Kimi。
定向/全Reforge/TC/Biome、原负控和队友消费负控整包交Codex再接收；统计并集待实现通过后统一。

### 历史给GLM：r3收窄残项N1～N4（无Kimi交接）

在 /Users/zhangxu/illegal/type-pal-glm-battle 的codex/glm-battle-workflows-r1返工本卡r3候选7a2f1608，状态rework，设计r1不重签。
先合入main本轮counter，读AGENTS/CLAUDE/READ-FIRST、本卡当前r3块、docs/testing/battle-workflows-r3-review.md及机账。
只闭N1～N4：奖励后用独立完整预期快照钉幂等、非空合法库存保真；撤HP0即全队判负的不可达说法，补公开多队员胜/逃钳制用例；
hook wait用公开readiness动作观察证明零提交（非只零日志）；去重按真实层级纠正并补剩余会话选择/合击执行/零奖励证据；
judge每条failureMessage皆须业务断言且变异exit必须1，加入同项混错/exit2/null反例。同步库存/精灵guard宣称与分支增量43+1=44的勘误。
已修r2四反证、finally/行动者/技能移除/8字段首次结果、fullName/file/marker/timeout/单针数不重开；不硬凑39项。
仅改原白名单与本人回执/机账/席位日志，不改产品、旧测试、Codex历史见证、官方范围基线或他卡；不做视觉、不代签、不done、不转Kimi。
整包定向/相邻/全Reforge/TC/Biome与负控交Codex重新接收，统计并集待接收通过后统一。Codex按新候选自行适配冻结见证。

### 历史给GLM：r2残项C1～C4（无Kimi交接）

在 /Users/zhangxu/illegal/type-pal-glm-battle 的codex/glm-battle-workflows-r1返工本卡，r2候选b7ba48bb仍counter/rework，设计r1不重签。
先同步main本轮counter（不checkout主工作树），读AGENTS/CLAUDE/READ-FIRST、本卡当前块、docs/testing/battle-workflows-r2-review.md与机账。
只闭C1～C4：完整world/成长8字段/限次技能移除/HP-MP终值及非目标保真；敌ready后的真实行动归属；finally消费原prepare Promise并保留原失败；
原throw/coop/回退/hook等待/enemyFled/terminated等合同补齐或按准确旧标题去重；负控判据全名/物理路径/本针marker/混错/timeout拒绝与真实控制数，实际fixture接入守卫并勘误回执。
已修非法业务模型、ArrowLeft/A/R、非空写回、前三终态和五个旧反证不重开，不硬凑34项。
Codex新r2见证冻结旧反例；后续由Codex适配，不改历史工具凑绿。只改原白名单新文件与本人回执/机账/席位日志，
不改产品/旧测试/官方范围基线/其它卡，不做视觉，不代签、不done、不转Kimi。整批定向/相邻/全Reforge/TC/Biome与负控一次交付；统计并集待Codex实现接收后统一。

### 历史给GLM：R1～R4整包返工

在 `/Users/zhangxu/illegal/type-pal-glm-battle` 的`codex/glm-battle-workflows-r1`返工TEST-BATTLE-WORKFLOWS-1 r1，候选16ac8cee被Codex counter、卡已rework，设计不重签。先同步main的本轮counter并合入本人分支，保留全部三席原文/历史日志，不checkout主工作树。必读AGENTS/CLAUDE/READ-FIRST、本卡、`docs/testing/battle-workflows-review.md`、机账与独立见证工具；当前31/264/1409/TC和原6+7绿不构成接收。

一次闭合：R1正式guard/现行完整类型，删除伪技能模型/业务数据强转，将三个fixture移回原`src/__tests__/battle-workflows/`；R2按真实方向键+确认施法，核MP/动作集合/目标与实际非空成长、skillUse、HP/MP/库存写回，W2不能继续在关A/R后全绿；R3敌ready/turnStart真钩子、取消迟到/finally同一pending、五种精确终态和逐屏300ms，禁止pending/rejected当成功；R4修Biome七错误/四警告、确切标题/来源/加载标记与判据自测、未知针必须失败，按最终树重生回执/计数/修复记录。原合同已有证据可逐项准确去重，不把未做项直接延后，不凑31项或百分比。

独立见证冻结旧反例（关闭A/R、空写回、永不done、preparing偷扣MP）；新候选应以合法正控和上述坏实现变红证明修复，不改Codex历史见证/原探针，路径或标题改后由Codex适配复核。只改原白名单新测试/fixture/工具及本人回执/机账/席位日志，不改产品/旧测试/官方配置基线/其它卡，不做视觉。整包定向/相邻/全reforge/TC/Biome、负控和/tmp同口径覆盖一次交Codex，官方check/ratchet/strict由Codex接收后统一；不代签、不标done、不转Kimi。

### 历史给GLM：六组连续实施（16ac8cee交付后被counter）

在 `/Users/zhangxu/illegal/type-pal` 接 TEST-BATTLE-WORKFLOWS-1 r1，卡 `docs/ops/tasks/TEST-BATTLE-WORKFLOWS-1-session-flows.md` 已由Codex核build allowed（Codex b1f62c6b/Kimi d24ead8d/GLM 5b07d84a三席齐），设计不重签。先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡W1～W6/白名单/最新日志、coverage-large-domain-plan/evidence、自检清单。创建独立worktree与`codex/glm-battle-workflows-r1`，不checkout主工作树，不动Codex宿主卡文件。

按六组连续实施真实BattleSession公开流程，合法guard先行、同一实际输入完整快照、entered/finally同一pending、精确候选AssertionError单点负控；禁私改state/ui/lastActs、mock核心、视觉和产品改动。旧合同重复/防御/不可达/产品疑点单列，不把不明确政策写成绿测；局部受阻不停止其它组。整批定向/相邻/全reforge/TC/Biome及独立/tmp同口径before/after、6～10负控，完整回执+机账+精确SHA一次交Codex。不要逐组跑覆盖率，不跑官方ratchet/strict、不改基线/排除/超时，不代签、不标done、不转Kimi；由Codex接收后统一终审。

### 以下为历史设计审查提示词（已完成）

### 给GLM（与Kimi同r1并行）

在 `/Users/zhangxu/illegal/type-pal` 审本卡r1 draft。先同步/核工作树，读AGENTS/CLAUDE/READ-FIRST、卡内W1～W6与总计划、7790冻结机账、自检清单；独立读现行guard/真实caller/旧tests，不读Kimi本轮结论。你是计划Coding Owner，核合法fixture及公共观测能否支撑六组，抽W1/W5/W6给直接锚点与可证伪反例；只写本人premise verified/design agree或counter及日志，提交推送，不改共享状态、不代签、不开始实现。同步也独立审Codex的TEST-RUNTIME-SHELL-COVERAGE-1 r1：本卡与其分工不冲突，分别签本人席位。三席齐后由Codex统一核build；本卡开放后同独立分支六组连续实施，不逐组等待。

### 给Kimi（与GLM同r1并行）

在同仓独立审本卡r1 draft及TEST-RUNTIME-SHELL-COVERAGE-1 r1。先读AGENTS/CLAUDE/READ-FIRST、各卡/总计划/冻结机账；不读或复述GLM本轮结论。重点验证BattleSession公共观测不会迫使私改state、公式/渲染不越界、W4真实异步门和W6变更合同；宿主卡真实import与外部IO边界是否可行，不以AST复制代替整入口。分别写本人带一手锚点的premise/design或可复现counter、日志并提交推送；只改本人块、保留他席，不改共享状态、不实施、不代签、不标build/done。

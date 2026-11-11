# E2E-Q2-1 — Q2 战斗专项与首批小闭环

Status: build
Phase: cross-phase
Owner: Codex（范围、独立验收、中央接入与集成）
Coding Owner: q2_panel（表现） / q2_rules（规则） / q2_inputs（双端 E2E） / Codex（集成与台账）
Reviewer: Codex
Visual Verification Owner: Codex（双端采集与复验） / User（产品取舍）
Visual Verification Timing: mixed
Last reviewed: 2026-11-11
Template: task-card-v1 / 1.0.0
Branch: codex/q2-battle-followup

## 目标

通过合法固定局面和真实浏览器操作验证正常战斗，逐项记录指令、目标、状态变化、实际呈现与结算。Q2 按入口及覆盖记录、规则与操作、AI/状态/特殊机制、动画音画、完整生命周期五批推进。首批建立双端入口、采集和离线比较，覆盖单人单敌、多人多目标、用药后结算。当前修复首批发现的演出差异，并推进第二批单体普攻与多回合操作。

## 范围

复用 `scripts/e2e` 下测试专用 Vite 适配、真实输入 runner、事实采集、离线判定与不可变证据绑定。Game 使用已有 `applyFixture`，Reforge 使用现有 trial parser、正式 BattleSession 与结算。每例使用独立测试快照和新的浏览器上下文，与用户存档隔离。首批返工、第二批机制和文件准入见各自的记录，结果写回同一覆盖报告。

Q1 速胜入口、001–010 前驱、content23/SAVE12 及原始资源按各自的现行合同。AI、状态和特殊机制以及完整音画、世界存读按后续批次验收。需要新的产品取舍或改变机制真值时先单独核前提。

## 前提与证据

| 维度 | 已核事实与来源 | 本轮适用边界 |
| --- | --- | --- |
| 原始数据 | Game 原队 1 / 3 对应一个 / 三个灯笼；敌数据 2 与物件 399 不同层。Reforge 为 team-1 / team-3、enemy-399。止血草 99 单体治疗 50、消耗一份。 | 原始数据和当前作者定义分别读取；场景不使用带灵儿触发逃跑剧情的草妖。 |
| 第一阶段 | `packages/game/src/dev/dev-panel.ts` 的公开 `applyFixture(deps, fixture, rngSeed)` 重建合法队伍/背包并正常调用 `startBattle`；浏览器原有 B 键 fixture picker 可复用。 | 只在测试专用配置装配固定局面与种子，之后使用真实按键；不改私有状态模拟行动或胜利。 |
| 第二阶段 | `battle-trial-config.ts`、`battle-trial-prepare.ts`、`battle-trial-session.ts`、`battle-trial-host.ts` 共用当前 loader、正式 BattleSession、资源准备、正常输入及正式结算。 | 新 host 接入仍核真实 sourceToken/revision。独立试打不提供正常存档和场景战后剧情。 |
| 首批开工 | 用户已批准五批计划，并要求“复用现有基建，把测试入口、采集器、比较器和覆盖台账做好，先跑通小闭环”。 | 2026-11-07 首批按入口与比较闭环准入。第二批准入见下文。 |

首批最强替代解释是“同一随机种子必然得到同一伤害与行动队列”。首批基点 Game 构队先抽敌方再抽玩家，Reforge 相反。Game 使用 mulberry32，RF trial 默认 Math.random。首批记录各端种子、算法与逐次抽样，验证各端重复性、跨端指令、目标与实际生效状态。原始伤害和抽样用途进入第二批。

若观察器供给期望值、漏失行动或结算、重复扣药未被拒绝、用同一日志自比代替双轨、缺失字段被当相等，或 overflow / 启动失败被当业务反控，即推翻第一批通过结论。

## 上下文锚点

- [阶段规则](../../phase2/READ-FIRST.md)、[五批既定范围](../../phase2/roadmap.md#104-q1-全流程-e2e-硬契约)、[知识收获](../../phase2/reference/phase1-knowledge-harvest.md)、[机制来源与勘误](../../phase1/game-mechanics.md)。历史缺口先复现，不把旧状态当现有缺陷。
- [E2E 合同](../../testing/e2e/contract.md)、[测试治理](../../testing/governance.md)、[工程质量](../../engineering/guides/code-quality.md)、[文档交付协议](../../engineering/guides/document-quality.md)。
- `scripts/e2e/browser-journey.mjs`、`evidence-recorder.mjs`、`input-ledger.mjs`、`capture-local.mjs`、`evidence-artifact.mjs`、`evidence-dependencies.mjs`、`trace-refinement.mjs`。复用独占进程、watchdog、输入回执、深拷贝/容量拒绝、依赖指纹、原件绑定与录制。
- Game `core/battle/battle-system.ts` 的正常 action queue / tickPerformAction / 结算；RF `battle/battle-session.ts` 的 stepBattle 后、lastAction 清空前的真实动作提交点。只轮询现有地图 dump 或文字日志不足以证明完整动作。

## 验收

1. 三个合法场景从当前工程/原始数据启动；真实输入完成指令和目标选择、正常动作、结算。新上下文重复执行得到同端相同业务轨迹，输入与观察原件可追溯；所有速胜配置关闭。
2. 采集器只存实际事实，具备统一序号、时间、引擎/场景/执行身份；保留阵容、原槽/实例、HP/MP、状态、库存、指令、动作与随机调用。缺开始/终点、截断、异常、丢行动须拒绝。
3. 离线验证既核各端独立业务预期，也核双端可比行动序列，输出首个失败现场。随机数值和音画的已授/未授范围分开，不能靠最终胜利抵消错误。
4. 错目标、重复扣药、漏行动等反例使用同一判定入口；区分坏记录 IO 拒绝与真实功能变异检出。至少一个隔离真实错误重新采集后由指定业务断言拒绝，保留失败与恢复。
5. 覆盖记录按场景与义务指向真实报告、trace、比较、录像与未完成项，接现有目录/报告体系；不另建手填全绿计数。每批运行、双端比较、视觉及后续范围分别维护。
6. 贡献者逐文件八维、必要有判别力的工具测试和反控；Codex 独立核交付、真实录制与原始结果。相关静态门零诊断；最终统一门与保护 PR 按现行流程执行。用户分屏接受另记，作者不能代签。

## 当前模式推进记录

2026-11-07 Codex build allowed。基点 `43fea71735236272cfb7f6a1c61c3ac2e691a349`，用户已明确批准第一批。两份只读盘点核定入口、采集缺口和随机顺序差异，以上事实不包含本轮产品实跑。

root 单写集成树 `shared-item-flows` 中本卡、场景、RF 适配、公共 runner、覆盖/目录与中央文档；Game owner 独占 `battle-game-*` 适配与其测试；比较 owner 独占 `battle-trace-*`、`battle-comparison-*` 与相应工具测试。公共合同先由 root 固定，交接后不同时改同一文件。

贡献者复用已经核干净、没有活动进程的独立树 `shared-chest-opening` 和 `item-flow-model`，分别使用 `codex/q2-game-driver`、`codex/q2-battle-compare`。原 HEAD 和仍有消费者的 ignored 证据保留在本轮本地回执；不清除旧 build，不恢复退役分支。任务结束按实际接收与消费者清理本轮分支/临时资源。

新增 Q2 测试域出版有界接入由 `q2_catalog_audit` 在独立 `item-flow-editor-validation` 树、`codex/q2-test-publication` 分支持有：只增加固定 43fea 基点之上的一个明确记录和配对 native 执行载体的验证，既有 catalog、来源桥与历史原件逐值保全。该贡献者可修改相应 docs 工具与必要测试、隔离 fixture 依赖清单；root 在接收前不改相同实现文件。catalog 实际条目、报告、原生证据、位置表与最终 SHA 仍由 root 单写。

## Draft: 设计与风险

场景参数与业务预期由 runner/判定方持有，观察器不能导入预期。各端适配保留原生阶段和实际动作，再投影到明确的战斗语义；相同敌定义的不同实例及空槽不能合并。runner 用现有输入回执，菜单提交事件另证输入已被消费。原生录像与判定分离，离线重比使用固定来源和原件指纹。

主要风险为随机调用分配不同、轮询漏失 lastAction、用调试器设胜利冒充真实战斗、前端默认 AI 触发剧情逃跑、实际生效装备/初态不一致，以及再次调查/结算的重复入账。前置固定合法输入、在提交点观察、容量封口和逐次业务断言分别覆盖这些风险。

## Build: 实现与自测

代码冻结候选 `a8673cfcc9fc5767a6d02a3895964e7977bd7e16`。首批三个固定样本在Game和Reforge各跑两次，十二场均走真实手动战斗、原生动作和结算；六组跨端有效状态和六组同端规则随机/原生动作重复均通过。入口复用现有browser journey、watchdog、input ledger、依赖闭包及不可变artifact；JSON输入池1401项。具体参数、覆盖和原件以[唯一报告](../../testing/domains/cross-phase/battle-foundation/report.md)与配对evidence为准。

真实test-only双扣药变体在合法用药后报 `business/action-after`，库存实际2→0；改回正常serve模式后恢复通过。另四项原件入口反控准确拒绝缺SHA、缺真实输入回执、重复context和陈旧依赖，恢复通过；IO反控不授产品变异信用。22项定向工具测试和贡献者174项相邻出版测试通过，零失败/skip/todo；本地全仓typecheck、439项E2E工具测试、50项质量工具测试及lint已通过；lint为6788文件、0 error/warning/info。文档门及受保护集成取本次PR的实际检查，不提前记未来结果。

归档保留实际运行、校准失败、逐文件八维/独立返工、三条原速分屏及原Git候选恢复bundle，不复制原始游戏资产或整棵临时树。当前代码库存新增21项仍pending，保留原970项closed。

## Review: 审查与返工

三个贡献者分别在独立分支冻结交付，root核实际差异、A–H、原件及必要反控后集成。独立只读复核发现的依赖/输入回执、反控信用、非代码输入、原件绑定、native行动与失败生命周期六项缺口均已修复；最后核三个收尾提交后无剩余项。root另核实际装备/派生属性、首批矩阵、原生业务反控和原件离线重比。复核完整回执在[唯一归档](../evidence/E2E-Q2-1-battle-foundation-20261107.tar.gz)的 `build/q2/delivery/`。

原始伤害与随机分配未授信：当前多人原件保留340/354、857/908，以及Reforge飘字有效扣血30的差异，后续分别按规则/表现核对。绘制Math.random、音频、完整动画与世界/存读仍未测；不因此修改第一批判据或标完整Q2通过。

文档全套门曾发现旧目录身份专测仍固定24条，实际新增有界Q2后为25；仅追加明确ID并保留旧18及原生合同检查，失败身份与原TAP保留在同一归档，恢复后再核集成资格。

## 用户验收

范围与第一批开工已获用户批准。首版三条原速静音分屏随首批执行归档。用户于 2026-11-11 回报底栏、死亡淡出和用药飘字三处差异，进入下述返工。用户同时确定先由 Codex 使用双端日志对照和修复，证据无法判断的产品取舍再由用户裁定。

2026-11-11，用户对修正后的三灯笼战斗和止血草用药两段分屏回复「通过」。三灯笼片段验收行动时隐藏底部队员信息框，以及敌人淡出完成后下一位队员才出手。止血草片段验收归位后显示回血黄字，数字位置与受药角色对齐。

分屏来自冻结候选 `54d7b378d5094950c10b73bb38a81883cd3d375d`，录像在复验归档的 `build/q2/followup/final-review/` 下，分别为 `party-lanterns-split.mp4` 和 `herb-settlement-split.mp4`。对应实现已随 PR #53 合入主线，合并提交为 `89cb749a4dc63d4adf23669c98c0f043578568ad`。 [复验归档](../evidence/E2E-Q2-1-battle-followup-20261111.tar.gz) · [PR #53](https://github.com/IllegalCreed/type-pal/pull/53)

## 2026-11-11 首批分屏返工

用户在首批短片发现 Reforge 行动时仍画底部队员信息框，后续队员抢在上一个敌人淡出结束前出手。旧比较判定覆盖指令、有效状态与结算。其呈现观察记录绘制调用，缺少实际信息框绘制、死亡淡出与后续出手的时序合同。

| 维度 | 人物信息框与死亡淡出依据 |
| --- | --- |
| SDLPal CLASSIC | `reference/sdlpal/uibattle.c:888–925` 在行动期跳过底栏绘制。`reference/sdlpal/fight.c:748–763,889–894,4419` 在动作结束后检查死亡并同步等待淡出。`reference/sdlpal/battle.c:632–681` 的淡出为 72 个间隔 16 ms 的步骤。 |
| Game | `draw-battle-ui.ts:226–256` 在开始手动选择时画信息框，行动中隐藏。`battle-system.ts:414–416,1902–1950` 的死亡淡出等待阻断后续动作。 |
| Reforge 基点 | `battle-session.ts:2373–2415` 以对话控制底栏。`:1945–1960,2185–2198` 登记并绘制淡出，`:1109–1181` 仅终态分支有等待。首批多人原速分屏中巫后出手时第一只灯笼仍在右侧淡出，Reforge 底栏可见。 |
| 本轮目标 | 手动选指令和目标时显示底栏，行动与结算中隐藏。每批死敌淡出播完后推进后续动作。沿用作者此前选定的 alpha 渐隐和末敌结算短停拍。 [战斗表现审计的原裁决](../../phase2/archive/audits/battle-presentation-audit-2026-07-05.md) |

若旧录像中仍可见的是未受击的同形灯笼或飘字，需用敌实例槽位与实际 alpha/绘制记录推翻本归因。新的双端采集必须在真实绘制/回放边界区分淡出、动作开场、实际底栏与结算，保留事件次序和时间。对照在同一多人样本上用基点原生执行检出旧故障，并在恢复后验证非末敌、末敌与再次选择的可观察边界。两端内部帧数按各自时钟记录，画面语义和起止顺序独立核验。

Codex build allowed。基点 `18fac8f47fbb002bf76a4c97283225c7156447f2`。`q2_panel` 独占 Reforge `battle-session.ts` 及相应定向测试，在 `shared-chest-opening` 树的 `codex/q2-presentation-runtime` 交付。 `q2_inputs` 独占 `scripts/e2e/battle-*` 的双端观测、比较和测试，在 `item-flow-model` 树的 `codex/q2-battle-observation` 交付。Codex 持有本卡、现行合同/覆盖写回、集成与独立复验。保留旧原件和用户反馈，复验后提供正常速度可暂停分屏。

同日用户发现止血草回血黄字早于回位、位置随前移偏离。SDLPal `fight.c:4385–4406,940–946,665–684` 依次执行用物动画、脚本、复位、显示变化与收尾等待，按受益队员位置定位。Game `battle-system.ts:2194–2217,2625–2659` 在动画收尾用药，`present-battle.ts:175–195` 消费复位坐标。Reforge 基点 `battle-anim.ts:492–509` 在归位前出字，`battle-session.ts:1891–1913` 当时定锚。2026-11-11 用户要求回位后显示，与本轮核对的 SDLPal 和 Game 一致。若出字时受益者已在原位而锚点仍偏移，须进一步核数字绘制右缘和坐标。扩准入 `q2_panel` 独占 `battle-anim.ts` 及对应测试，`q2_inputs` 采集实际首次出字、用药者回位、受益者及逻辑画布坐标。用药原生反例与恢复均须实跑原地、前移、归位三个阶段。

手动指令状态由 `BattleCommandSelection` 持有。底栏绘制只读该类的自动攻击状态，`q2_panel` 可在 `battle-command-selection.ts` 公开只读查询，复用真实选择所有者。

非末敌淡出的 1152 ms 已满足 240 ms 行动间隔。放行后按下一次正常调度开始后续动作。末敌结算沿用既定停拍。`q2_panel` 持有 `battle-action-presentation-scheduler.ts` 的相应节拍操作及现有定向测试。

## 2026-11-11 第二批规则与操作

用户批准推进第二批。固定相同输入和随机值，先对齐已有多人样本的队列随机值分配与单体普攻结算，再实跑两回合的手动防御、对队友施法、用药、取消和重新选目标。

| 维度 | 随机用途和操作依据 |
| --- | --- |
| SDLPal CLASSIC | `fight.c:1461–1498,1535–1565` 先敌后我分配队列随机值。`:3636–3658,3756–3757` 单体先加值、暴击、逍遥额外判定、浮动，后抽体力经验。`:5139–5145` 普攻有效命中按附带道具概率抽取，即使概率为零。 |
| Game | `battle-system.ts:705–754,2550–2570` 与 `actions/attack.ts:94–104,401–418` 对应上述用途。单人巫后及原灯笼种子 708 实跑原伤 344、体力权重 3，等身法两方的队列为玩家 22、敌人 18。 |
| Reforge 基点 | `battle-core.ts:1103–1121,2145–2159,2375–2392,2709–2736` 先玩家身法、单体先体力、先暴击。未格挡非致死普攻的附带道具判定在无配置时提前返回。相同 seed708 局面实跑原伤 360、体力权重 2，等身法队列为敌人 22、玩家 18。原三灯笼原件的巫后 340/354、阿奴 857/908 按实际浮动抽样可复算。 |
| 本轮目标 | 对齐上述用途和执行次序。原伤、实际扣血和信息数字各自取证。双端沿用测试注入的 mulberry32，原版引用确定用途与区间，原生数据确定初态。 |

最强替代解释是初始装备、派生值或敌防御不同。原件核两端实际攻 252/350/300 和灯笼有效防 28 相同，固定种子让两端抽到同一串原值。等身法交换先手、巫后不同原伤和体力权重能分别拒绝对应错误。真实目标和取消回执是多回合结论的必要证据。

Codex build allowed。基点 `18fac8f47fbb002bf76a4c97283225c7156447f2`。`q2_rules` 独占 Reforge `battle-core.ts` 与邻近定向规则测试，在 `item-flow-editor-validation` 树的 `codex/q2-rules-runtime` 交付。允许已核队列及单体普攻随机顺序、无附带道具率的原生消费与相关回归。 `q2_inputs` 完成首批演出观测后，继续独占 `scripts/e2e/battle-*` 增加合法双回合操作、原生敌动作、取消和重选回执及必要规则比较。 Codex 核两个所有者的候选、原件、运行和台账。群攻、连击换敌、AI选择、音频与完整生命周期保留原计划的相应范围。

SDLPal `fight.c:3665,633–650` 用 16 位无符号生命扣原伤，以有符号差值显示原伤。Game `actions/attack.ts:261–282` 让 HP 钳零，显示值使用原伤。Reforge 基点 `battle-session.ts:1799–1831` 以已钳 HP 差减去第二击计算第一击，首批 30 HP 灯笼只显示 30。目标为正式动作结果携带首击原伤并由时间线绘制消费，实际扣血钳零。`q2_rules` 持有 `battle-last-action.ts` 与规则结果生产端，`q2_panel` 持有正式动作回放消费端。比较器同时核原伤、实际数字和 HP，以击杀样本拒绝使用剩余 HP 计算首击数字。

## 2026-11-11 执行与独立复核

冻结候选 `54d7b378d5094950c10b73bb38a81883cd3d375d`。Codex 核两个阶段实际绘制、合法输入、规则用途、定向红绿和原件绑定。最终 16 场正常战斗及双端与同端重比均通过，四个固定局面的覆盖、测得值与余项见[唯一覆盖报告](../../testing/domains/cross-phase/battle-foundation/report.md)。独立重比拒绝旧运行时的底栏、死亡淡出重叠、用药过早和位置偏差。复验按本批实采的动作首帧、淡出和数字判定。

相关 Reforge 全包 370 文件、9033 测试通过。规则所有者保留五个定向业务反例的真实红绿结果。表现所有者保留正常画布及节拍的失败和恢复。集成实际测试、比较原件、反控与原速分屏在 [11-11 复验归档](../evidence/E2E-Q2-1-battle-followup-20261111.tar.gz)。

集成仓全包 typecheck、440 项 E2E 工具测试和全仓 lint 通过。lint 为 6793 文件零错误、零警告、零信息。最终候选双扣药反控由 `business/action-after` 拒绝，恢复后一次消费与实际绘制复验通过。四个新增代码路径按代码治理账本列 pending。

PR #53 首次 fast coverage 跑完 20,433 项测试，覆盖率满足旧门槛。该次检查因 Reforge 测试范围和执行指纹需更新而退出 1。以保护基点 `18fac8f47fbb002bf76a4c97283225c7156447f2` 执行 `pnpm coverage:ratchet`，七包重新实测，Reforge 由 9,026 增至 9,033 项，四项覆盖率指标和汇总四项均提高。新基线记录生成时刻、Reforge 测试身份与覆盖计数和对应总计。 [首轮检查](https://github.com/IllegalCreed/type-pal/actions/runs/42948139226/job/130285796690) · [实测基线](../../../scripts/coverage/baseline.fast.json)

文档门定位到战斗会话归属报告的三个现行源码引用漂移。Codex build allowed，`q2_inputs` 负责已有出版桥、位置校验及相应测试，Codex 负责配对正文、目录与机器回执。校准 `battle-session.ts` 的三个 caller 源 SHA、范围和相应索引指针，以首批出版前的固定来源对照并追加适用性历史。原业务主张、候选与版本由比较门按既有原件核验。 [来源适用性回执](../evidence/E2E-Q2-1-battle-session-source-applicability.md)

## 状态与交接

- 2026-11-07 核现有 fixture/trial、采集/比较与目录，建立上述第一批有限准入；普通游戏与作者工程尚无改动。
- 2026-11-11 首批用户视觉返回返工，三处差异均已核一手依据和缺陷路径。用户已批准第二批规则与操作，按一手规则证据及合法多回合局面的准入推进。
- 2026-11-11 首批表现和第二批所列局面完成双端复验，父卡继续跟踪 AI、状态与特殊机制、完整音画和战斗生命周期。

## 下一位 Agent 提示词

后续批次先读[现行 E2E 合同](../../testing/e2e/contract.md)和唯一覆盖报告，再核一手规则、现有入口及可证伪的合法局面。按准入限定单一写入 Owner，交实际源码、真实操作、原件和明确覆盖边界。证据无法裁定的产品取舍由 Codex 汇总两端现场交用户。

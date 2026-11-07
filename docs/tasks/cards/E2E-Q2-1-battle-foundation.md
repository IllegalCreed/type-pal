# E2E-Q2-1 — Q2 战斗专项与首批小闭环

Status: build
Phase: cross-phase
Owner: Codex（范围、独立验收、中央接入与集成）
Coding Owner: Codex（Reforge 入口、场景、驱动与台账）；q2_entry_audit（Game 适配）；q2_trace_audit（比较合同与反控）；q2_catalog_audit（有限出版校验）
Reviewer: Codex
Visual Verification Owner: Codex / User
Visual Verification Timing: mixed
Last reviewed: 2026-11-07
Template: task-card-v1 / 1.0.0
Branch: codex/q2-battle-foundation

## 目标

通过合法固定局面和真实浏览器操作验证正常战斗，逐项记录指令、目标、状态变化与结算。Q2 按入口及覆盖记录、规则与操作、AI/状态/特殊机制、动画音画、完整生命周期五批推进。本轮只实施第一批：复用已有入口与浏览器基建，建立战斗采集和离线比较，跑通单人单敌、多人多目标、用药后结算三个小闭环，并证明比较器能拒绝错误。

## 范围

当前准入为 `scripts/e2e` 下测试专用 Vite 适配、场景和真实输入 runner、事实采集、业务判定与不可变证据绑定；以及现有测试目录、覆盖记录、任务/阶段入口的有限写回。Game 使用已有 `applyFixture`，Reforge 使用现有 trial parser、正式 BattleSession 与结算。每例使用新的浏览器上下文，不读取或写入用户存档。

原有 Q1 速胜入口、001–010 前驱与执行记录不变。第一批不实现后四批机制、不改伤害/排序/AI规则，不改 content23/SAVE12 或原始资源，不把独立试打授为地图回流、正式存读或完整战斗专项通过。需要新的产品取舍或改变机制真值时先单独核前提。

## 前提与证据

| 维度 | 已核事实与来源 | 本轮适用边界 |
| --- | --- | --- |
| 原始数据 | Game 原队 1 / 3 对应一个 / 三个灯笼；敌数据 2 与物件 399 不同层。Reforge 为 team-1 / team-3、enemy-399。止血草 99 单体治疗 50、消耗一份。 | 原始数据和当前作者定义分别读取；场景不使用带灵儿触发逃跑剧情的草妖。 |
| 第一阶段 | `packages/game/src/dev/dev-panel.ts` 的公开 `applyFixture(deps, fixture, rngSeed)` 重建合法队伍/背包并正常调用 `startBattle`；浏览器原有 B 键 fixture picker 可复用。 | 只在测试专用配置装配固定局面与种子，之后使用真实按键；不改私有状态模拟行动或胜利。 |
| 第二阶段 | `battle-trial-config.ts`、`battle-trial-prepare.ts`、`battle-trial-session.ts`、`battle-trial-host.ts` 共用当前 loader、正式 BattleSession、资源准备、正常输入及正式结算。 | 新 host 接入仍核真实 sourceToken/revision。独立试打不提供正常存档和场景战后剧情。 |
| 本任务 | 用户已批准五批计划，并要求“复用现有基建，把测试入口、采集器、比较器和覆盖台账做好，先跑通小闭环”。 | 第一批明确授权；其余四批仅保留队列，不预授实现或验收。 |

最强替代解释是“同一随机种子必然得到同一伤害与行动队列”。源码已证 Game 构队先抽敌方再抽玩家，Reforge 当前相反；Game 使用 mulberry32，RF trial 默认 Math.random。记录各端种子、算法与逐次抽样，先验证各端重复性；跨端比较依据明确的指令、目标、实际生效状态与已核业务 oracle。未对齐的随机数值不能静默过滤或直接判等，原始差异和未覆盖义务须可见。修抽样顺序不属于本轮默认准入。

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

范围与第一批开工已获用户批准；首批小闭环已生成三条可暂停静音双轨短片，左Game右Reforge，当前用户验收pending。音频、全面战斗表现和全量规则不因第一批入口跑通获得验收。

## 状态与交接

- 2026-11-07 核现有 fixture/trial、采集/比较与目录，建立上述第一批有限准入；普通游戏与作者工程尚无改动。

## 下一位 Agent 提示词

按本卡单一 Owner 范围实施并回报实际源码、合法输入、命令、原件和未覆盖项。首批技术结果与范围取唯一报告，当前不自动准入后四批或改变机制；证据缺失和产品取舍交 root 核定，不能用标记 passed 或新建弱测试替代真实浏览器闭环。

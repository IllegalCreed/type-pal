# 全仓代码质量治理总纲

Status: active
Last reviewed: 2026-11-02
Owner: Codex
Template: plan-status-v1 / 1.0.0

## 目标与时间范围

本页维护 CODE-QUALITY 专项的路线、批次边界和证据入口。原路线始于2026-10-04的 `b9ba7e0faadf56519da024c0343f5b44b9a5c447`；具体代码审查与改动按当前用户/任务卡准入执行；本文路线不额外授予产品范围。专项仍未全仓完成。

模块地图按 shared 字节/类型、pal-extract 纯解析与IO、game 机制/生命周期/呈现、content canonical、migrate 真源/事务、reforge新架构、editor会话/命令/设计系统及 scripts 工具分域。原八行地图完整保留在[固定历史原稿](#历史来源)；它是入口地图，静态依赖和行数不构成缺陷证据，也不代表完整调用图。

## 里程碑

下表归纳原卡已记载的有限结果；`done`仅指当时该窄批。各批原执行者、失败、数字与准入以原卡及[固定历史原稿](#历史来源)为准，不把本次文档治理写成再次代码验收。

| 批次 | 有来源的历史结果 | 当前读取边界 |
|---|---|---|
| Q1/Q1b | RLE合法/非法边界与PAL引用census过期oracle的有限修正 | generic framing允许0/0x80 no-op，strict sprite零长拒绝；不改collector或项目内容来凑数 |
| Q2/Q2b | MKF/RNG/YJ2及shared类型子批按后继卡收口 | 空槽、尾部、early-EOS/重叠回引有合法域；剩余caller/数据语义不因codec收口自动完成 |
| Q3 extract | events/io/PNG/symbols/其它解析器及CLI分批登记 | CLI审计无新增生产缺陷；原资源宽容合同按caller读，不把所有fallback删去 |
| Q3 game h–w | 资产、UI、工具、present、battle helpers及主流程的各有限批次记录 | fetch参数、音量NaN、比例NaN、wave与catalog分别有原窄修；其它只读审计不算生产修复 |
| Q3x | progression与两专属测试的原3条新增记录 | 4个相邻测试文件/205项不是4条新增关闭；活人gate、池顺序、主/隐藏经验上限不混 |
| Q4/Q5 | 原总表为draft，账本有部分content/migrate逐文件条目 | 不能由局部条目宣布content/migrate/reforge/editor整域完成或自动进入build |
| Q6/Q6a | 部分工具与ledger记录完整性门登记 | 工具PASS只核记录，不赋予源码语义信用；E2E另属其Owner |

具体入口：[Q1](../archive/done/CODE-QUALITY-1-governance.md)、[Q2b](../archive/done/CODE-QUALITY-2b-shared-yj2-boundaries.md)、[Q3k](../archive/done/CODE-QUALITY-3k-game-present-primitives.md)、[Q3t](../archive/done/CODE-QUALITY-3t-game-battle-opcodes.md)、[Q3u](../archive/done/CODE-QUALITY-3u-game-battle-state-runtime.md)、[Q3w](../archive/done/CODE-QUALITY-3w-game-battle-settlement-finalization.md)、[Q3x](../archive/done/CODE-QUALITY-3x-game-battle-progression.md)、[Q6a](../archive/done/CODE-QUALITY-6a-ledger-integrity.md)。

## 当前状态

以下是2026-10-25已登记的阶段记录；本次只迁移阅读位置，不重验这些代码、旧执行或远端发布。实时逐路径数量仍由账本维护，正在执行的批次由[任务看板](../board.md)和对应任务卡决定；日期化记录不指定今天的治理分支。

2026-10-25用户指定下一阶段收口当前52个review文件；从PR23合并的main0e14、同一治理分支接续。[固定52路径/原状态与当前阶段](../cards/QUALITY-REVIEW-52-CLOSEOUT-1.md)分开核旧说明、证据缺口与实际返工，不重开全部103+或提升2870pending。当前固定52/52代码与本地统一门接受、0文件仍review；实际远端发布尚待核验，历史门仅按版本/影响域复用，昂贵门留稳定阶段收尾。

2026-10-25当前94–102有限模块本地收口，唯一治理分支codex/code-quality-94-102；20新关闭、34既有关闭桥接，54逐文件八维与统一门完整。唯一采集及精确结构重计原件见[当前窗口](../evidence/CODE-QUALITY-94/approved-closeout/README.md)，远端发布由关联PR/main CI记录。全仓未全部完成，不扩103+。

2026-10-25 pre94以[固定83卡队列](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/all-cards.md)为唯一代码进度，原83范围已accept；[最终本地统一门](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/README.md)分开记录实际check、单次覆盖率失败／精确重计／同报告保护及待远端发布。下列波次数字保持原时点，不作为当前计数或验收；全仓专项并未全部完成。

当前逐路径状态及库存汇总只由[逐文件账本](code-quality-file-ledger.md)保存，由[真实完整性消费者](../../../scripts/quality/code-quality-ledger.mjs)与[追踪清单生成器](../../../scripts/quality/code-quality-inventory.mjs)对账。不能复制原稿多个“当前”数字作为今天进度；通过记录完整性门仍需后继源码语义审查。

生成器实际纳入所有Git tracked的 `packages/` 或 `scripts/` 路径中 `.js/.mjs/.mts/.ts/.tsx/.json` 文件；代码中的七包集合用于domain标记，不是过滤硬门。机器 `scope` 文案与旧总纲七包说法只能作概述，精确输入以该filter为准；输出每项默认待核，不能据此重置账本既有状态。只从显式记录及真实调用证据增量更新，不把机器快照提交成产品源。

## 阻塞与决策

历史计数冲突分开记载：Q2b原131/129差异未解释；Q3k的原ledger“3 fail”与卡/总纲“3 passed/1 failed”相反，现行账本只纠正该摘要并保留完整旧稿；Q3t/u均写215且u又写新增5，统计时点仍unknown；u/w排重按明确新增5/3，不凭相邻总数补出执行顺序。原末尾“YJ2/resources/tables待核”与前部及后继收口不一致，在[固定历史原稿](#历史来源)中保留，不恢复今天待实施或默认删YJ2合同。

P0要求直接失败证据、真实caller/oracle、before→after与相邻回归，静态诊断零error/warning/info；P1只有ownership/调用/生命周期证据齐全才拆边界；P2命名/公共出口全量跟caller且不以注释换词计整改；P3删除先证真实输入/唯一caller/替代方案，未知不自动删。旧版本例外仍按[现行工作流](../../engineering/guides/agent-workflow.md)与[二阶段规则](../../phase2/READ-FIRST.md)核定，不能由历史fallback名称决定。

schema/save/迁移/资产管线、第一阶段机制或可感知行为变化须停止受影响批次，另卡核primary与可证伪观察。CODE-QUALITY原路线不接管TEST-COVERAGE85、E2E或已完成架构拆分；本次没有新的产品取舍或三签要求。

以下2026-10-18记录保留当时的counter与源锚点勘误；解除情况须回对应原卡及后继证据核对，不能因后续阶段接受或历史分层自动关闭：

> 2026-10-18 pre-94 机制返工：三个独立审计 counter 已核实并登记[QUALITY-BATTLE-MAGIC-PARITY-1](../cards/QUALITY-BATTLE-MAGIC-PARITY-1.md)。0x42目标、0x66裸武术、非伤害敌法术自动防御按先红后绿修复；五项旧闭合记录（两实现/三测试）转review，无新增closed。旧波次门仍rework；本次定向不恢复其全仓/coverage信用。

> 2026-10-18 当前源区间勘误：uibattle.c飘字循环1746–1767、PAL_BattleUIShowNum 1770–1808（EOF1808）；PAL_PlayerLevelUp为global.c:2347–2409（EOF2409）。旧quote/历史快照中的1810/2454仅保留原记录，不是当前有效读取范围；见[直接核对](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/receipt-audit/anchor-corrections.json)。未重跑或重签产品/coverage门。

## 下一步

新批先按[任务卡](../cards/README.md)固定范围、证据、单一Coding Owner及验收；只修有直接反例的问题。先有限合同/typecheck/静态门，再按卡面要求执行全仓门，独立接收后同提交回写账本，不能以本次docs门代替产品测试/coverage或全仓逐文件完成。

复查时若账本/真实inventory不一致先报告并核路径增量；若失败推翻前提先停线，不以多数全绿、缩范围、ignore、强转或降低规则过门。专项完成仍要求全部待核/待审有实际闭环，当前没有该证据。

## 历史来源

完整治理前正文、原234行路线、Q3各批流水、所有旧计数、失败与复核均由[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/audits/code-quality-governance.md)恢复。原稿revision `22eead43a6c825e1345feb92441e09d340d22c18`、blob `2cd85b53f57292d8f8373ee5633eaeecef199938`及原引文身份不改；本页不另复制历史全文。历史卡中的旧行号和原命令按该固定来源读取，不套用当前文件行号或作为新执行准入。

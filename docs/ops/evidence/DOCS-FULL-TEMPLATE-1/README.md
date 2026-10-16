# DOCS-FULL-TEMPLATE-1 盘点证据

## 证据身份
2026-10-11；Owner: Codex；status: recorded；静态枚举，非内容深审。

## 来源与输入
源树 `/Users/zhangxu/illegal/type-pal`，HEAD `9aa3bed892728f17c70d2f86d1fe07db10a718b8`。完整原始字节计算 SHA；Git tracked/visible 与磁盘 physical 分列。

## 断言与业务 oracle
每个磁盘文件只列一次；候选扩展名为 Markdown/JSON/HTML；原绑定仅作 inherited-unrevalidated，不继承 reviewed。

## 结果
[inventory.json](inventory.json) 含逐文件清单、旧绑定、未绑定、解析结构和漂移；[protection.json](protection.json) 含四个保护文件的起始 hash。

## 限制与复核
标题和 JSON keys 仅供阅读排期，不能替代全文语义阅读。artifact owner 全部待核，不以目录猜 owner。候选工作树不含用户 draft 的正文；接收前必须重新核原树 delta。本轮无 runtime/E2E/视觉/coverage 结论。

## 2026-10-15 指南接入与更正

- [指南接入后的 pilot 复核](pilot-assessment-20261015.json)：旧 17 项只证明可回读，实际模板与 consumer 验收为 counter，accepted 0；不抹除原始记录。
- [逐文件绑定基线](binding-baseline.json)：1838 条候选排期，仍为 unread/needs-migration，不能作为全文审阅。
- [原 pilot 来源记录](pilots.json)、[原候选回读记录](pilot-candidates.json)与 `pilots/` 原样保留为历史证据；`.raw` 后缀不代表免审。
- [项目文档模型](../../guides/documentation-model.md)给出路由、事实权、写回与迁移完成标准；接入增量另记，不改变用户批准的分母。
- [2026-10-15 增量清单](delta-inventory-20261015.json)：1838 基线全部仍存在；新增候选与 23 份基线变化单列，不冒充重新深审。快照自身用 Git 定位，不自嵌 hash。

## 协作分层与 E2E-001 真实 pilot

- [旧协议保留回执](protocol-preservation-20261015.json)：完整原文引用与链接重算，原始字节由 Git blob 定位。
- [报告段落保留回执](e2e-report-preservation-20261015.json)：原段落按执行/结果/证据/历史重组，原 testing-meta 不变。
- [机器证据 consumer 回执](machine-pilot-consumer-20261015.json)：移除 envelope 后原对象 deep-equal，真实 paired consumer 零问题；无新增运行时通过。

## 历史与领域类型 pilot

- [第三批正文保留回执](pilot-body-preservation-20261015-03.json)：八篇原始 source blob/SHA 与具体重组方式；历史 prompt 尾空格的展示规范化另行注明，原始字节仍由 Git 保留。
- 本批还纠正阶段 catalog 的历史/ideas 分类并同步生成视图；生成器已改为只投影，不再按路径重置人工审查结果。

## E2E 合同与历史质量门 pilot

- [第四批正文保留回执](pilot-body-preservation-20261015-04.json)：合同逐章重排与原 metadata、历史质量原文回读；没有新执行结果。

## JSON catalog 真正 pilot

- [实际consumer回执](catalog-pilot-consumer-20261015.json)：18条阅读与4字段可逆勘误，schema/catalog、paired evidence、derived indexes零问题；不授予当前运行或全量完成。

## 域报告/配对机器证据批次

- [正文与JSON保留/锚点修正回执](domain-pair-migration-20261015.json)：原metadata/对象与历史版本不变，当前source行号显式校正，实际publication消费者另记；无新动态验收。

- [历史卡包A作者候选回执](contributor-history-cards-a-20261015.json)保留c86b92d原候选状态；根线程独立接收后的SHA与逐篇结论另写[本批回执](domain-pair-migration-20261015.json)，不改作者历史自验结果。

- [历史卡包B作者回执](contributor-history-cards-b-20261015.json)保留b8c8fa4f候选与作者自验；根线程逐篇独立接收、最终SHA及A/B交接时态同步记录在[本批回执](domain-pair-migration-20261015.json)，不授予旧FSA/用户观感/CI或动态通过。

- [第三阶段四篇迁移回执](phase3-migration-20261016.json)记录正文类型/状态纠正、14个原块映射和入口长文移入原议题池；原阶段裁决、冻结来源与未实施边界保留，独立候选复核及全量完成度另验。

- [2026-10-16 五份架构历史回执迁移](historical-receipts-20261016.json)：指定候选的证据语义、原文与历史工具引用归属；不继承动态通过。

- [C2历史执行机器变体pilot](c2-historical-execution-pilot-20261016.json)：006原true与本轮未执行分开，13份既有机器仅声明升版；独立实现/pilot已接收，日期义务与动态验收未关闭。

## R22 phase2 历史审计批次

- [R22 只读设计接收](readonly-phase2-audits-r22-20261016.json)：22篇历史审计的分类、冲突与源身份设计；不授迁移信用。
- [R22 根接入回执](contributor-phase2-audits-r22-20261017.json)：18 audit、3 plan、1 reference 的模板迁移、源/after SHA 与历史边界。
- [R22 只读独立复核](independent-r22-review-20261017.json)：13篇非作者全文复核，38条历史冲突，接受只读提案。
- [R22 候选独立接收](independent-r22-candidate-acceptance-20261017.md)：22/22正文、quote inverse、三账本和静态门接受；runtime/E2E/视觉/coverage credit 为 0。

## R23 ops archive audits

- [R23 只读独立复核](independent-r23-ops-audits-review-20261017.md)：9/9 全文读取，8 audit + 1 governance index，接受只读提案。
- [R23 根接入回执](contributor-ops-audits-r23-20261017.json)：源/after SHA、历史冲突、模板绑定和停止线。
- [R23 候选独立接收](independent-r23-ops-audits-candidate-acceptance-20261017.md)：9/9正文、quote inverse、三账本和静态门接收；runtime/E2E/视觉/coverage credit 为 0。


## R24 phase2 archive designs

- [R24 只读独立复核](independent-r24-phase2-designs-review-20261017.md)：21/21 phase2 archive design 全文读取，源零漂移，接受只读迁移提案；保留 4 类产品/历史边界 counter。
- [R24 根接入回执](contributor-phase2-designs-r24-20261017.json)：21 篇按 `design-spec-v1` + `archive-record-v1` 迁移，源/after SHA、具体语义冲突、停止线和继任入口逐篇记录。
- R24 不授予 runtime/E2E/视觉/coverage 信用；独立候选接收完成前保持 candidate/review，不能据此宣布全量完成。

- [R24 候选独立接收](independent-r24-phase2-designs-candidate-acceptance-20261017.md)：21/21，quote/template/overlay/三账本/after SHA 全部接收；raw JSON 格式化差异已显式记录为 non-blocking，解析内容相等；runtime/E2E/视觉/coverage credit=0。


## R25 phase2 archive plans

- [R25 只读独立复核](independent-r25-phase2-plans-review-20261017.md)：24/24 phase2 archive plan 全文读取，7335 行，源零漂移，接受只读迁移提案；4 类历史/产品边界 counter 保留。
- [R25 根接入回执](contributor-phase2-plans-r25-20261017.json)：24 篇按 `plan-status-v1` + `archive-record-v1` 迁移，源/after SHA、具体里程碑、冲突、停止线和继任入口逐篇记录。
- R25 不授予 runtime/E2E/视觉/coverage 信用；独立候选接收完成前保持 candidate/review，不能据此宣布全量完成。
- [R25 候选独立接收](independent-r25-phase2-plans-candidate-acceptance-20261017.md)：24/24，plan-status/overlay/quote/三账本/after SHA 全部接收；前置 JSON 格式化差异已显式记录为 non-blocking，解析内容相等；runtime/E2E/视觉/coverage credit=0。


## R26 indoor slice Markdown

- [R26 只读独立复核](independent-r26-indoor-slices-review-20261017.md)：4/4 Markdown indoor slice 全文读取，源零漂移；3 个 HTML mockup 明确 deferred。
- [R26 根接入回执](contributor-r26-indoor-slices-20261017.json)：2 archive-record + 2 plan-status/archive overlay，逐篇记录 source/after SHA、冲突、停止线和 successor。
- HTML mockup 三篇未计入 R26 迁移，保持 governed-legacy，等待 HTML archive variant/template contract 冻结。

- [R26 候选独立接收](independent-r26-indoor-slices-candidate-acceptance-20261017.md)：4/4 Markdown 候选接收；3 个 HTML mockup 因 HTML archive variant 未冻结而 deferred；runtime/E2E/视觉/coverage credit=0。


## R27 phase1 plans/audits

- [R27 只读独立复核](independent-r27-phase1-plans-review-20261017.md)：20/20 phase1 plans/audits 全文读取，源零漂移；17 plan-status + 3 audit-report。
- [R27 根接入回执](contributor-r27-phase1-plans-20261017.json)：逐篇记录历史里程碑/审计发现、冲突、停止线、source/after SHA 和 successor。
- R27 不授 runtime/E2E/视觉/coverage 信用；phase1 历史结论保持日期化。

- [R27 候选独立接收](independent-r27-phase1-plans-candidate-acceptance-20261017.md)：20/20 phase1 plans/audits 候选接收；quote 行尾空格用 `␠/⇥` 可逆保全；runtime/E2E/视觉/coverage credit=0。


## R28 phase1 plans/audits/index

- [R28 只读独立复核](independent-r28-phase1-plans-review-20261017.md)：22/22 phase1 plans/audits/index 全文读取，源零漂移；13 plan-status + 2 design-spec + 6 audit-report + 1 governance-index。
- [R28 根接入回执](contributor-r28-phase1-plans-20261017.json)：逐篇记录历史里程碑/审计发现、冲突、停止线、source/after SHA 和 successor。
- [R28 候选独立接收](independent-r28-phase1-plans-candidate-acceptance-20261017.md)：22/22 phase1 plans/audits/index 候选接收；quote 行尾空格用 `␠/⇥` 可逆保全；runtime/E2E/视觉/coverage credit=0。
- R28 不授 runtime/E2E/视觉/coverage 信用；phase1 历史结论保持日期化。


## R29 phase1 status/plan

- [R29 只读独立复核](independent-r29-phase1-status-readonly-review-20261017.md)：8/8 phase1 status/plan 全文读取，7 plan-status + 1 governance-index；源零漂移。
- [R29 根接入回执](contributor-r29-phase1-status-20261017.json)：逐篇记录历史状态、冲突、停止线、source/after SHA 和继任入口。
- [R29 候选独立接收](independent-r29-phase1-status-candidate-acceptance-20261017.md)：8/8 候选接收；无 runtime/E2E/视觉/coverage 信用。


## R30 phase1 foundation

- [R30 只读独立复核](independent-r30-phase1-foundation-readonly-review-20261017.md)：9/9 phase1 foundation 全文读取；2 design-spec + 2 governance-index + 3 guide-runbook + 2 reference-canon。
- [R30 根接入回执](contributor-r30-phase1-foundation-20261017.json)：逐篇记录历史边界、来源、冲突、停止线、source/after SHA 和继任入口。
- [R30 候选独立接收](independent-r30-phase1-foundation-candidate-acceptance-20261017.md)：9/9 候选接收；无 runtime/E2E/视觉/coverage 信用。


## R31 ops archive records

- [R31 只读独立复核](independent-r31-ops-archive-records-readonly-review-20261017.md)：4/4 acceptance/board-history 全文读取，全部 `archive-record-v1`；ops archive paths 不进入 phase/lore catalog。
- [R31 根接入回执](contributor-r31-ops-archive-records-20261017.json)：逐篇记录历史范围、原始结论、当时证据、当前有效性、继任文档和 source/after SHA。
- [R31 候选独立接收](independent-r31-ops-archive-records-candidate-acceptance-20261017.md)：4/4 候选接收；无 runtime/E2E/视觉/coverage 信用。


## R32 ops cancelled task cards

- [R32 只读独立复核](independent-r32-ops-cancelled-tasks-readonly-review-20261017.md)：7/7 cancelled task cards 全文读取，全部 `task-card-v1 + archive-record-v1`；状态保持 cancelled。
- [R32 根接入回执](contributor-r32-ops-cancelled-tasks-20261017.json)：逐篇记录目标、范围、前提、取消状态、验收边界、交接和 source/after SHA。
- [R32 候选独立接收](independent-r32-ops-cancelled-tasks-candidate-acceptance-20261017.md)：7/7 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。


## R33 phase2/lore and HTML artifacts

- [R33 只读独立复核](independent-r33-phase2-lore-readonly-review-20261017.md)：18/18 全文读取；12 篇 Markdown 迁移，3 篇 HTML 原型使用 byte-stable `archive-record-v1` artifact envelope。
- [R33 根接入回执](contributor-r33-phase2-lore-20261017.json)：逐篇记录模板、历史边界、artifact 归属、source/after SHA、冲突和继任入口。
- [R33 候选独立接收](independent-r33-phase2-lore-candidate-acceptance-20261017.md)：18/18 候选接收；HTML 明确 out-of-routing/out-of-catalog；无 runtime/E2E/视觉/coverage 信用。


## R34 ops pre-E2E audits

- [R34 只读独立复核](independent-r34-ops-pre-e2e-readonly-review-20261017.md)：9/9 pre-E2E audit 全文读取，全部 `audit-report-v1` current-audit；静态审计不授执行信用。
- [R34 根接入回执](contributor-r34-ops-pre-e2e-20261017.json)：逐篇记录审计问题、范围、证据、反例、停止线、复核条件和 source/after SHA。
- [R34 候选独立接收](independent-r34-ops-pre-e2e-candidate-acceptance-20261017.md)：9/9 候选接收；ops audit 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。


## R35 ops guides

- [R35 只读独立复核](independent-r35-ops-guides-readonly-review-20261017.md)：4/4 ops guide/runbook 全文读取，全部 `guide-runbook-v1` current-guide。
- [R35 根接入回执](contributor-r35-ops-guides-20261017.json)：逐篇记录目的、前置条件、步骤、失败处理、停止线、完成定义和 source/after SHA。
- [R35 候选独立接收](independent-r35-ops-guides-candidate-acceptance-20261017.md)：4/4 候选接收；ops guide 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。


## R36 ops archive evidence

- [R36 只读独立复核](independent-r36-ops-evidence-readonly-review-20261017.md)：11/11 archive evidence Markdown 全文读取，全部 `evidence-receipt-v1 + archive-record-v1`；机器 JSON 留待独立字段/consumer 批次。
- [R36 根接入回执](contributor-r36-ops-evidence-20261017.json)：逐篇记录证据身份、来源输入、oracle、结果、限制、复核条件和 source/after SHA。
- [R36 候选独立接收](independent-r36-ops-evidence-candidate-acceptance-20261017.md)：11/11 候选接收；ops evidence 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。


## R37 ops JSON evidence artifacts

- [R37 只读独立复核](independent-r37-ops-json-evidence-readonly-review-20261017.md)：3/3 JSON 全量解析和字段读取，原始字节保持不变。
- [R37 根接入回执](contributor-r37-ops-json-evidence-20261017.json)：记录原始 top-level fields、byte-stable SHA、artifact envelope 和 consumer 边界。
- [R37 候选独立接收](independent-r37-ops-json-evidence-candidate-acceptance-20261017.md)：3/3 候选接收；JSON out-of-routing/out-of-catalog；无 runtime/E2E/视觉/coverage 信用。

## R39 ops evidence README

- [R39 只读独立复核](independent-r39-ops-evidence-readmes-readonly-review-20261017.md)：7/7 ops evidence README 全文读取；1 governance-index + 6 evidence-receipt，全部追加 archive-record 历史边界。
- [R39 根接入回执](contributor-r39-ops-evidence-readmes-20261017.json)：逐篇记录 source/after SHA、quote inverse、consumer 边界、catalog scope 和停止线。
- [R39 候选独立接收](independent-r39-ops-evidence-readmes-candidate-acceptance-20261017.md)：7/7 候选接收；ops evidence 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

## R40 ops machine JSON artifacts

- [R40 只读独立复核](independent-r40-ops-machine-json-readonly-review-20261017.md)：13/13 ops machine JSON 全量解析和字段读取，原始字节保持不变。
- [R40 根接入回执](contributor-r40-ops-machine-json-20261017.json)：记录原始 top-level fields、byte-stable SHA、`test-machine-evidence-v1` artifact envelope 和 consumer 边界。
- [R40 候选独立接收](independent-r40-ops-machine-json-candidate-acceptance-20261017.md)：13/13 候选接收；JSON out-of-routing/out-of-catalog；无 runtime/E2E/视觉/coverage 信用。

## R41 ops archive task/index

- [R41 只读独立复核](independent-r41-ops-archive-task-readonly-review-20261017.md)：10/10 ops archive task/index 全文读取；2 governance-index + 8 task-card archive overlays。
- [R41 根接入回执](contributor-r41-ops-archive-task-20261017.json)：逐篇记录历史状态、source/after SHA、quote inverse、successor 和清理边界。
- [R41 候选独立接收](independent-r41-ops-archive-task-candidate-acceptance-20261017.md)：10/10 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

## R42 ops archive task cards

- [R42 只读独立复核](independent-r42-ops-archive-task-readonly-review-20261017.md)：20/20 archive task cards 全文读取；全部 `task-card-v1 + archive-record-v1`。
- [R42 根接入回执](contributor-r42-ops-archive-task-20261017.json)：逐篇记录历史状态、source/after SHA、quote inverse、successor 和清理边界。
- [R42 候选独立接收](independent-r42-ops-archive-task-candidate-acceptance-20261017.md)：20/20 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

## R43 ops archive task cards

- [R43 只读独立复核](independent-r43-ops-archive-task-readonly-review-20261017.md)：20/20 archive task cards 全文读取；全部 `task-card-v1 + archive-record-v1`。
- [R43 根接入回执](contributor-r43-ops-archive-task-20261017.json)：逐篇记录历史状态、source/after SHA、quote inverse、successor 和清理边界。
- [R43 候选独立接收](independent-r43-ops-archive-task-candidate-acceptance-20261017.md)：20/20 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

## R44 ops archive task cards

- [R44 只读独立复核](independent-r44-ops-archive-task-readonly-review-20261017.md)：20/20 archive task cards 全文读取；全部 `task-card-v1 + archive-record-v1`。
- [R44 根接入回执](contributor-r44-ops-archive-task-20261017.json)：逐篇记录历史状态、source/after SHA、quote inverse、successor 和清理边界。
- [R44 候选独立接收](independent-r44-ops-archive-task-candidate-acceptance-20261017.md)：20/20 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

## R45 ops archive task cards

- [R45 只读独立复核](independent-r45-ops-archive-task-readonly-review-20261017.md)：20/20 archive task cards 全文读取；全部 `task-card-v1 + archive-record-v1`。
- [R45 根接入回执](contributor-r45-ops-archive-task-20261017.json)：逐篇记录历史状态、source/after SHA、quote inverse、successor 和清理边界。
- [R45 候选独立接收](independent-r45-ops-archive-task-candidate-acceptance-20261017.md)：20/20 候选接收；ops archive 不进入 phase/lore catalog；无 runtime/E2E/视觉/coverage 信用。

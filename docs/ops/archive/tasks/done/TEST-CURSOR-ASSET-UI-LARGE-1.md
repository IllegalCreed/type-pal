# TEST-CURSOR-ASSET-UI-LARGE-1 — 已交付测试有限收口

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Phase: phase2
Owner: Cursor（作者交付已冻结）
Reviewer: Codex
Capability: test-coverage / finite-closeout
Visual Verification Timing: N/A（本次只接入测试，不改变产品或重走剧情）
Branch: `codex/cursor-asset-ui-large-r1`
Last reviewed: 2026-10-15
Governance Owner: Codex（历史卡包 A 候选；待独立验收）
Template: task-card-v1 / 1.0.0

## 目标

保留 Cursor 的资源与编辑器界面测试在有限收口中的裁决：717 例当时现行回归；54 针的产品/测试字节与重建 mutant hash 对应。目标是说明具体接收边界与退出项，不把原配额完成度改写为验收。

## 范围

phase2 的该固定作者交付 `fefab931c4174f0755e0d7766a8757490194a067`。原卡只允许选择性接入新测试/专属 fixture，保护产品、旧测试、共享配置与真实数据；本轮仅迁移该历史卡正文，不接入测试、不合作者产品树。

## 前提与证据

原卡以 `8efe048610fab7aa4a257a716b91ece30194eba8`、content22/SAVE11 为当时接收目标；这些版本是历史坐标，不是当前产品版本合同。固定作者 SHA 与封板 SHA 的 Git commit 对象在本次 checkout 中存在，但本轮未重新证明作者树的测试结果。二阶段资源/UI 的合法输入必须来自当时公开 typed caller；本卡未列单用例输入、组件行为断言或视觉回执，不能仅由 717/54 推导覆盖。

最强替代解释是卡中“当前不标 done”代表任务仍待收口；[统一收口卡](TEST-FROZEN-CLOSE-1.md#收口与退休条件)明确给出 2026-10-04 完成门、CI 与精确退休结果，故该句属于封板前中间态。若统一卡的封板证据被撤销，应重新核受影响收口，不凭本次格式迁移续签。

## 验收

原历史验收为：717 例当时现行回归；54 针的产品/测试字节与重建 mutant hash 对应；用户 2026-10-03 要求完成已交付测试审核与错误/过期材料清理。原 700 预算终止；702 净新估算被明确拒绝，717 仅为历史有限回归数，不能改写为 717 净新。

54 针的字节/hash 对应是原卡裁决；本轮不复跑反控，不把重建 mutant hash 单独转换成现行运行信用。统一卡记最终全仓 check 19204、七包 typecheck、静态零诊断，以及 2026-10-04 两项 CI success；本卡旧 18683 是先前阶段数字，不覆盖最终账。此次只核文档结构、来源回读与链接，不重跑这些历史门。

## 状态与交接

保留顶部 `Status: done`、原 Owner、作者分支与 Closed Evidence；原“下一步完成门再 done/退休”已由统一卡封板记录承接，不是现在的执行指令。无下一位贡献者提示词；本轮文档候选交根线程 Codex 独立核源与写回中央 review/SHA，作者自验不替代接收。

## 历史范围

2026-10-03 有限接收、2026-10-04 main `d8a81d4c21a32efa3c140fb5858c83465b01bc5e` 封板。Documentation `37145486289`、Coverage `37145486286` 的 success 保留为历史卡陈述；本轮没有在线复查 CI，也没有新 coverage 通过结论。

## 当时证据

原卡固定作者 `fefab931c4174f0755e0d7766a8757490194a067`、main 目标与 Closed Evidence 完整保存在原文。[统一历史审计](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/audit-report.md)区分回归、净新、反控和静态筛选；[统一收口卡](TEST-FROZEN-CLOSE-1.md)记录最终门与退休。每个 file×fullName 的输入和 raw 不在此短卡内，不能由本轮摘要补齐。

## 当前有效性

historical。原 700 预算终止；702 净新估算被明确拒绝，717 仅为历史有限回归数，不能改写为 717 净新。

54 针的字节/hash 对应是原卡裁决；本轮不复跑反控，不把重建 mutant hash 单独转换成现行运行信用。历史 done 不授权当前分支删除、测试接入、兼容恢复或产品修改。

## 继任文档

该轮接收与退休以[统一收口卡](TEST-FROZEN-CLOSE-1.md)的终态为准；当前测试准入走[现行工作流](../../../agent-workflow.md#测试质量验收用户-2026-10-03-固化)与[测试治理](../../../../testing/governance.md)。这是同一任务的历史解释，没有新建平行测试报告或覆盖率信用。

## 原始结论

以下完整原卡只按原始时点解释。原字节可从 Git blob `32998f147597f3a0f1b84aa2ad08c4c82c27a7f2` 回读；新增正文没有替代原历史判断。

> # TEST-CURSOR-ASSET-UI-LARGE-1 — 已交付测试有限收口
>
> Status: done
> Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
> Phase: phase2
> Owner: Cursor（作者交付已冻结）
> Reviewer: Codex
> Capability: test-coverage / finite-closeout
> Visual Verification Timing: N/A（本次只接入测试，不改变产品或重走剧情）
> Branch: `codex/cursor-asset-ui-large-r1`
>
> ## 当前独立裁决
>
> 固定作者提交 `fefab931c4174f0755e0d7766a8757490194a067` 已核真实Git对象。717例现行回归；54针产品/测试字节与重建mutant hash对应。702净新估算不接受为事实，原700预算终止。
> 产品、旧测试、共享配置和真实数据不因本卡改动；现行main目标8efe048610fab7aa4a257a716b91ece30194eba8/content22/SAVE11，仅选择性接收新测试/专属fixture，不merge旧产品树或恢复旧兼容。
>
> [统一验收与准确机账](../../../../testing/archive/legacy/batches/finite-test-intake-20261003/README.md)、[统一收口卡](TEST-FROZEN-CLOSE-1.md)。全仓check18683已通过、七包类型与静态零；官方ratchet的migrate函数比例窄修与最终strict/推送/CI仍须完成，当前不标done、不删作者分支。
>
> 用户2026-10-03要求完成全部已交付测试收口并删除错误/过期材料。本卡范围由Codex裁决为上述有限现行回归，不追原数量预算；未核语义净新不给信用，错误反控不计有效。旧提示词、失败转录、失效工具与不实回执从工作树移除，历史仅由Git保存。
>
> ## 下一步
>
> 无下一位贡献者提示词。Codex完成最终质量门、main推送与GitHub必需CI核验，之后更新done并按精确SHA和可恢复备份退休本分支/树；独立产品draft不随本卡done。

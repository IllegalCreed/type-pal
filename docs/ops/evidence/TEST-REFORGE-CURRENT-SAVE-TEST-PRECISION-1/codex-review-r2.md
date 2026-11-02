# 当前存档测试精简二审：有限返工

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: audit-report-v1 / 1.0.0

本页是 Codex 2026-10-07 对 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 的二审（历史）：固定候选 `3f925b0d3`、测试/证据提交 `81ea05328`；派发、冻结不变；Codex 独立复核未写贡献者树。结论 counter（已在三审逐项闭合）。

## 审计问题

- r1 返工后的剩余 oracle 充分性与工具/账对齐。

## 范围与证据

- 已关闭：B-R1-01 四条接线归还+两容器缺席拆分成立；独立重跑 r2 runner（20 判据自测、78 行基线、六针全部恰一指定业务 AssertionError、还原绿与末次重放通过；作者 18 个 raw/JSON 最终 hash 和六个重建 mutant 逐一复算）；定向 12 文件 173/173；B-R1-02 两共享文档逐字恢复派发值。

## 发现

- B-R2-01：三个最小独立产品变异分别施于临时副本候选三文件每次 78/78 全绿，同一变异作用于派发原结构测试则 61 例中恰一原合同 AssertionError——maxMP 属于必须有限数值字段（从字段数组移除即漏）、extraStatuses 稀疏空洞逐下标拒收（回调 entry===undefined 时 return 即漏）、poisons 稀疏空洞同型；共享循环只证明循环检查体不证明每个字段成员仍在数组。
- B-R2-02：旧 run-counterproof.mjs 仍锁 73 行、N05 指向已拆开的合并身份、N08 指向已更名身份——历史工具非最终候选可成功重放入口；README 77 条合同与实际 78、旧 168 与当前 173 并置未清楚标历史。

## 结论

- counter 留 rework；B 测试不合 main 不删其树/分支；下一位仅处理三原合同及工具/账，已关闭项不重开。

## 整改与复核

- 保留三个已存在的原业务轴恢复，不新开无限枚举任务；受影响合同映射到当前源/测试 hash 及执行集后重采，N05 与 NR5 同一变异不重复计信用。

## 历史范围

- 2026-10-07 二审记录（counter B-R2-01/02）；固定源 revision abcaee1db6c8…。

## 原始结论

- maxMP/extraStatuses/poisons 三原合同反证（变异单施 78/78 绿、旧测恰一红）。

## 当时证据

- 反例表与裁决在 quote 保全。

## 当前有效性

historical。二审 counter 已在三审闭合。

## 继任文档

当前结论归同目录 codex-review-r3.md。

## 原文保全

固定 source revision `abcaee1db6c80a04048d4a60636fdd8211c9fce2`，source SHA `2dc2fd2dd05a87de969f08d5307f5ab8f9561ad130ab4f1643f32d876963f972`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 当前存档测试精简二审：有限返工
>
> 历史r2审核：下列counter已在[三审](codex-review-r3.md)逐项闭合。保留原候选的失败结论，不作为当前候选的重复返工指令。
>
> 固定候选 `3f925b0d3c2ebe98742bcb2e01ec6ac703a13859`，测试/证据提交
> `81f20532880cee02c34047929963ff3b7b21e858`；
> 该提交之后仅任务卡回执。派发、冻结不变。Codex于2026-10-07独立复核，未写贡献者树。
>
> ## 已关闭项
>
> - B-R1-01四条height/spriteId/battleSprite/skillUseCounts内层接线归还，两个容器缺席补空拆分及输入不变断言成立。
> - 独立重跑r2 runner：20个判据自测、78行基线、六针全部恰一指定业务AssertionError、还原绿与末次重放通过；
>   作者18个raw/JSON最终hash和六个重建mutant逐一复算，与独立重跑身份对应。见[审计摘要](codex-r2-artifact-audit.json)。
> - 定向12文件173/173通过；Reforge/content typecheck均退出0且零诊断。未因counter再重复全包重门。
> - B-R1-02两个共享文档已逐字恢复派发值，旧判据库及r1原始反控证据未修改。
> - 原有重复值去重及typed/unknown边界治理保留；不是要求恢复多值数字矩阵。
>
> ## B-R2-01：原合同的剩余oracle仍不足
>
> 三个最小独立产品变异分别施于临时副本；候选三文件每次78/78全绿。
> 同一变异作用于派发的原结构测试，则61例中恰一原合同AssertionError。
> 完整[反例与hash/执行数/清理回执](codex-r2-loss/receipt.json)附12个native JSON/raw；
> 不同执行集的诊断对照，不冒称业务三态有效针。
>
> | 原合同 | 精确反例 | 必须保留的业务oracle |
> |---|---|---|
> | maxMP属于必须有限的数值字段 | 从assertCharacterInstance字段数组移除maxMP | maxMP=Infinity按其精确路径拒收 |
> | extraStatuses稀疏空洞逐下标拒收 | assertCarriedStatuses回调在entry===undefined时return | extraStatuses[0]空洞按该下标拒收 |
> | poisons稀疏空洞逐下标拒收 | assertActivePoisons回调在entry===undefined时return | poisons[0]空洞按该下标拒收 |
>
> 共享循环只证明循环检查体，不证明每个字段成员仍在数组；
> inventory的requireRecord/eachIndex也不证明两个独立回调没有跳过空洞。
> 此处恢复三个已经存在的原业务轴，不新开无限枚举任务。
> 作者如实登记了残余暴露面，但卡面要求删/并后的原合同仍有可反证oracle，不能将上述真实丢失当作等价去重。
>
> ## B-R2-02：当前工具与账的有限对齐
>
> 旧run-counterproof.mjs仍锁73行，N05指向已拆开的合并身份、N08指向已更名身份；
> 它是历史工具而非最终候选可成功重放的入口。旧14针保持历史原件，不宣称全是最终源码证据；
> 将仍认可的受影响合同映射到当前源/测试hash及执行集后重采，N05与NR5是同一个变异不重复计信用。
> 当前README的77条合同与实际78、旧168与当前173并置未清楚标历史；
> 最终实测后一次统一，不以计数作为任务指标。
>
> ## 裁决与下一步
>
> counter，留rework；B测试不合main，不删其树/分支。下一位仅处理三原合同及上述工具/账，
> 已关闭项不重开；无产品/配置/基准改动，model由用户手工选择GLM-5.3。
> 历史提示词保存在[归档任务卡](../../archive/tasks/done/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1.md)，不重复派发。
>
<!-- original-source-quote:end -->

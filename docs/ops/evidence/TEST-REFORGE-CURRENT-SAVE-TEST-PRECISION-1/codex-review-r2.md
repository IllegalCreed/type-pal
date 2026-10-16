# 当前存档测试精简二审：有限返工

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- 当前存档测试精简二审：有限返工 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 2dc2fd2dd05a87de969f08d5307f5ab8f9561ad130ab4f1643f32d876963f972。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision abcaee1db6c80a04048d4a60636fdd8211c9fce2；本轮 R69。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- 当前存档测试精简二审：有限返工：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `abcaee1db6c80a04048d4a60636fdd8211c9fce2`，source SHA `2dc2fd2dd05a87de969f08d5307f5ab8f9561ad130ab4f1643f32d876963f972`；下方 quote 可逆回原始 UTF-8 字节。
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

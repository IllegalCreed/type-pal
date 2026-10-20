# 当前存档精简独立审核：返工

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: audit-report-v1 / 1.0.0

本页是 Codex 2026-10-07 对 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 的一审（历史）：固定候选 `1b89e3eb8`、测试提交 `d731f0f4`、派发 d84b3db23、产品冻结 ce808b42e；Codex 独立核验未修改贡献者树。结论 counter（已在三审逐项闭合，保留原失败结论不作为重复返工指令）。

## 审计问题

- 误删合同的精简审查：共享 helper 不等于独立字段接线相同；共享文档白名单越界。

## 范围与证据

- 定向 12 文件 168/168 及 5/5 冻结 hash 通过；14 针原件 40 个 artifact hash 及原源/重建 mutant 逐枚对应（复算旧证据，未冒称 14 针业务全部重跑）。

## 发现

- B-R1-01：独占临时树四个变异各自单独作用于冻结 current-structure.ts，候选三文件均 73/73 绿；四变异同施于原派发结构测试则 61 例中恰四原合同 AssertionError——height 有限数接线/spriteId 类型条件/battleSprite 类型条件/skillUseCounts 内层数值接线被漏过（三个 appearance 字段是三个独立 optional 闭包非同一条循环；position 三个 requireFiniteNumber 也是独立调用）。
- B-R1-02：候选修改共享 docs/ops/evidence/README.md 与 phase-governance reviews JSON 超出卡面，须恢复派发值。

## 结论

- counter 不得合 main/done：定向绿与冻结 hash 不能抵消误删合同；保留 typed/unknown 治理但将合法外部输入边界归还各自原子合同，不机械恢复重复数字矩阵。

## 整改与复核

- 同一位置同谓词的 money Infinity/NaN、party null/对象、portrait number/null 去重可保留；hiddenExp.exp 被更强 R4 消息断言替代可保留；其它删/并逐接线复核，同 helper 不得作充分证据；两容器缺席补空拆独立 oracle 身份。

## 历史范围

- 2026-10-07 一审记录（counter B-R1-01/02）；固定源 revision abcaee1db6c8…。

## 原始结论

- 四接线误删反证（变异单施 73/73 绿、同施旧测恰四红）。

## 当时证据

- 反证表与裁决在 quote 保全。

## 当前有效性

historical。一审 counter 已在三审闭合。

## 继任文档

当前结论归同目录 codex-review-r3.md。

## 原文保全

固定 source revision `abcaee1db6c80a04048d4a60636fdd8211c9fce2`，source SHA `d5a6472ad953b99709cb402a802d81067ff91af1e842c58dc3e76c72891ecb76`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 当前存档精简独立审核：返工
>
> 历史r1审核：下列counter已在[三审](codex-review-r3.md)逐项闭合。保留原候选的失败结论，不作为当前候选的重复返工指令。
>
> 固定候选：`1b89e3eb843f67d0c3c305e53a3d2b0a58991877`；测试提交`d731f0f493c997637cf9e33b963db1e6d730d4ba`；派发`d84b3db236c35d2f7e2671741f4320b904f5c58c`、产品冻结`ce808b42e06dcd85999c1f10a5f1ca0b9009580b`。Codex于2026-10-07独立核验，未修改贡献者树。
>
> ## 裁决
>
> counter；不得合main/done。定向12文件168/168及5/5冻结hash通过，不能抵消误删合同。14针原件40个artifact hash及原源/重建mutant逐枚对应，但这里只复算旧证据，未冒称14针业务全部重跑。
>
> ### B-R1-01：共享helper不等于独立字段接线相同
>
> 在独占临时树，四个变异各自单独作用于冻结current-structure.ts；每次运行候选三文件均73/73绿。将四变异同施于原派发结构测试则61例中恰四个原合同AssertionError。完整native JSON见下表（相位执行身份不同：候选73与旧61，明确不称同执行集三态反控）。
>
> | 被漏过的接线 | 候选独立变异 | 旧断言 |
> |---|---|---|
> | assertGridPos height有限数接线 | [height，73/73](codex-B-loss-height.json) | 缺height拒收 |
> | assertAppearance spriteId自己的类型条件 | [spriteId接受number，73/73](codex-B-loss-spriteId.json) | spriteId=数字拒收 |
> | assertAppearance battleSprite自己的类型条件 | [battleSprite接受null，73/73](codex-B-loss-battleSprite.json) | battleSprite=null拒收 |
> | assertSkillUseCounts内层数值接线 | [仅requireRecord，73/73](codex-B-loss-skillUseCounts.json) | skillUseCounts内层非有限数拒收 |
>
> [旧61例四红原件](codex-B-old-loss-oracles.json)。三个appearance字段是三个独立optional闭包，不是同一条循环；position的三个requireFiniteNumber也是独立调用。resources同helper也不能证明skillUseCounts还在接线上。保留typed/unknown治理，但将这些合法外部输入边界归还各自原子合同；不机械恢复重复数字矩阵。
>
> 同一位置调用同谓词的money Infinity/NaN、party null/对象、portrait number/null；以及hiddenExp.exp被更强R4消息断言替代，去重可保留。其它删/并逐接线复核，尤其“同helper”不得作为充分证据。两容器缺席补空是独立normalizer，请将skillUseCounts与entityLifecycles拆为独立oracle身份，保留原件不变断言。
>
> ### B-R1-02：超出共享文档白名单
>
> 候选修改了共享docs/ops/evidence/README.md及docs/phase-governance/reviews/20261004-semantic-current-batch.json，与卡面不符。恢复到派发值，导航/pin只由Codex集成时维护。已有未变业务证据保留；执行集合变动仅重采受影响针及其绿基线/恢复，更新before-after/ledger和真实计数。不得追加任务配额。
>
> ## 下一步
>
> 原B会话使用GLM-5.3（由用户手工切换），只做上述有限r2修复；提交完整真实SHA及docs-only区间，停在review。A/C集成不授权B更新产品冻结、产品或其它旧测试。
>
<!-- original-source-quote:end -->

# 当前存档精简独立审核：返工

固定候选：`1b89e3eb843f67d0c3c305e53a3d2b0a58991877`；测试提交`d731f0f493c997637cf9e33b963db1e6d730d4ba`；派发`d84b3db236c35d2f7e2671741f4320b904f5c58c`、产品冻结`ce808b42e06dcd85999c1f10a5f1ca0b9009580b`。Codex于2026-10-07独立核验，未修改贡献者树。

## 裁决

counter；不得合main/done。定向12文件168/168及5/5冻结hash通过，不能抵消误删合同。14针原件40个artifact hash及原源/重建mutant逐枚对应，但这里只复算旧证据，未冒称14针业务全部重跑。

### B-R1-01：共享helper不等于独立字段接线相同

在独占临时树，四个变异各自单独作用于冻结current-structure.ts；每次运行候选三文件均73/73绿。将四变异同施于原派发结构测试则61例中恰四个原合同AssertionError。完整native JSON见下表（相位执行身份不同：候选73与旧61，明确不称同执行集三态反控）。

| 被漏过的接线 | 候选独立变异 | 旧断言 |
|---|---|---|
| assertGridPos height有限数接线 | [height，73/73](codex-B-loss-height.json) | 缺height拒收 |
| assertAppearance spriteId自己的类型条件 | [spriteId接受number，73/73](codex-B-loss-spriteId.json) | spriteId=数字拒收 |
| assertAppearance battleSprite自己的类型条件 | [battleSprite接受null，73/73](codex-B-loss-battleSprite.json) | battleSprite=null拒收 |
| assertSkillUseCounts内层数值接线 | [仅requireRecord，73/73](codex-B-loss-skillUseCounts.json) | skillUseCounts内层非有限数拒收 |

[旧61例四红原件](codex-B-old-loss-oracles.json)。三个appearance字段是三个独立optional闭包，不是同一条循环；position的三个requireFiniteNumber也是独立调用。resources同helper也不能证明skillUseCounts还在接线上。保留typed/unknown治理，但将这些合法外部输入边界归还各自原子合同；不机械恢复重复数字矩阵。

同一位置调用同谓词的money Infinity/NaN、party null/对象、portrait number/null；以及hiddenExp.exp被更强R4消息断言替代，去重可保留。其它删/并逐接线复核，尤其“同helper”不得作为充分证据。两容器缺席补空是独立normalizer，请将skillUseCounts与entityLifecycles拆为独立oracle身份，保留原件不变断言。

### B-R1-02：超出共享文档白名单

候选修改了共享docs/ops/evidence/README.md及docs/phase-governance/reviews/20261004-semantic-current-batch.json，与卡面不符。恢复到派发值，导航/pin只由Codex集成时维护。已有未变业务证据保留；执行集合变动仅重采受影响针及其绿基线/恢复，更新before-after/ledger和真实计数。不得追加任务配额。

## 下一步

原B会话使用GLM-5.3（由用户手工切换），只做上述有限r2修复；提交完整真实SHA及docs-only区间，停在review。A/C集成不授权B更新产品冻结、产品或其它旧测试。

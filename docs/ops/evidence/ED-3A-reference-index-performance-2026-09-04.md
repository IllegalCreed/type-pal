# ED-3A PAL 引用索引性能证据（2026-09-04）

环境：Apple M3 Pro / 18GB，Darwin arm64 24.6.0，Node 22.19.0，pnpm 10.29.2。基线与候选均通过
Vite SSR 载入真实 `projects/pal`（294 scenes、5,077 entities）；文件 IO、loader 校验和初始组装不计入
collector 样本。永久复现入口：

```sh
pnpm --filter @type-pal/editor benchmark:references -- --project projects/pal --samples 20
```

## 结果

| 指标 | A 批前基线 `9d2473c6` | 候选 `55a7fe84` | 预算 | 结论 |
|---|---:|---:|---:|---|
| snapshot warm p50 | 563.3ms | 623.729ms | ≤647.8ms（基线 ×1.15） | pass |
| snapshot warm p95 | 653.8ms | 749.724ms | ≤784.6ms（基线 ×1.20） | pass |
| derived warm p50 | 541.3ms | 608.590ms | ≤622.5ms（基线 ×1.15） | pass |
| derived warm p95 | 637.9ms | 663.234ms | ≤765.5ms（基线 ×1.20） | pass |
| 统一索引 build p50 / p95 | N/A | 28.067 / 39.715ms | 记录型；不得令总门超限 | pass |
| init request JSON / V8 | 16,556,593 / 15,511,159B | 相同 | JSON ≤16,887,725B | pass |
| ready reply JSON / V8 | 11,605,082 / 9,154,977B | 5,222,254 / 4,685,416B | JSON ≤13,345,844B | pass |
| request clone p50 | 221.1ms | 219.839ms | ≤245ms | pass |
| reply clone p50 | 45.1ms | 29.150ms | ≤55ms | pass |
| projectReferences JSON / V8 | N/A | 2,071,873 / 1,769,283B | JSON ≤2,500,000B | pass |

基线将 38,126 条 entity-address DTO 全部发布到 Worker reply（V8 5,624,880B，占旧 reply 61.4%），
其中 33,764 条是随目标实体一起删除的 self/companion 边，旧 UI 本来也会过滤。候选继续在 content 校验中
扫描全部 38,126 条，但统一删除/引用索引只物化 4,362 条真实跨 owner blocker；复合 entity edge 以同一个
edge id 加入必要 target bucket，不为 scene 父目标复制第二条 edge。候选最终为 5,991 rows、2,730 targets、
1,832 sources、1,952 locators、7,767 bucket entries。

## 候选原始样本（ms，n=20）

```text
snapshot:
623.729, 607.365, 603.772, 608.729, 628.666, 757.411, 628.287, 586.585,
628.633, 603.163, 607.635, 617.627, 749.724, 650.360, 643.557, 671.922,
662.231, 731.670, 604.120, 591.124

derived:
591.083, 596.525, 598.194, 608.590, 634.644, 636.080, 624.586, 630.036,
686.648, 662.005, 591.761, 596.508, 589.239, 591.760, 595.524, 602.773,
612.957, 639.899, 636.122, 663.234

project reference build:
35.805, 31.041, 28.477, 28.258, 27.195, 39.715, 40.567, 27.940,
26.908, 28.048, 27.578, 27.297, 28.078, 27.388, 28.004, 28.067,
27.814, 29.431, 29.405, 28.919

init request structuredClone:
224.549, 219.962, 217.356, 217.577, 217.104, 217.429, 223.245, 223.949,
219.839, 265.412, 219.805, 225.210, 227.398, 322.519, 221.392, 216.432,
216.723, 217.363, 221.703, 217.572

ready reply structuredClone:
29.962, 27.344, 30.516, 27.947, 30.425, 27.621, 30.362, 27.855,
28.390, 29.795, 27.303, 30.770, 29.210, 31.575, 29.150, 28.723,
30.860, 27.337, 30.588, 27.835
```

耗时只作同机手工回归，不进入易抖 CI。CI 使用确定性门：PAL blocker parity、rows/target buckets、
统一快照 JSON 上限、sync/Worker deep equality，以及 Worker reply 不同时携带旧 entity/scene-entry DTO。

## B 批战场 / 敌队 / 氛围纵切检查点

工作树基于 `03767dda`，加入 project-default / scene-default / hostile 的战场边、hostile 敌队边、
runtime world 氛围边，并把 startBattle / setAmbience / toggleDayNight 映射到领域 relation。真实 PAL
确定性规模变为 6,928 rows、2,961 targets、2,769 sources、2,889 locators、8,704 bucket entries；
其中新增 937 rows = 项目默认战场 1 + 场景默认战场 108 + hostile 敌队 828。领域 census 为
battle-field-use 141、enemy-team-use 1,002、ambience-use 42。

隔离复跑（n=20）结果：snapshot p50/p95 = 598.126/659.089ms，derived p50/p95 =
598.248/733.232ms，project-reference build p50/p95 = 32.247/43.107ms；均在 A 批冻结预算内。
ready reply JSON/V8 = 5,612,699/5,035,325B，projectReferences JSON/V8 =
2,462,318/2,118,980B，request payload 仍为 16,556,593/15,511,159B。索引 JSON 距 2.5MB
确定性门只余 37,682B，后续 B/C 不得机械抬阈值：必须随 adopter 迁移同步退役旧 DTO，并以完整 reply
净体积和冷/Worker 同构结果共同判断。

在隔离复跑前的一轮同机样本受其他测试负载影响，snapshot p50/p95 = 636.619/725.167ms、derived
p50/p95 = 675.556/817.795ms；前者通过、后者超手工时间预算。时间门不进 CI，因此保留该抖动记录；
确定性门与随后隔离复跑均通过，若后续隔离复跑再次稳定超限则按卡面约定收缩物化范围。

## B 批 skill / enemy / poison 纵切检查点

本纵切新增 1,194 条真实 PAL 战斗数据边：skill 338（含旧 collector 漏掉的 `learnSkill` 15）、
enemy 791、poison 65。直接叠加后的统一索引一度达到 2,800,349B，触发 2.5MB 硬门；没有抬高
预算，而是继续压 compact wire format：source key 改为由 `owner + section` 在消费端稳定重建、删除
重复 `targetKeys`、detail 字符串入表，并让无 detail row 省略尾槽。同步退役旧
`poisonReferenceIndex` Worker DTO。

最终隔离复跑（n=20）：snapshot p50/p95 = 629.435/672.606ms，derived p50/p95 =
616.444/717.467ms，project-reference build p50/p95 = 47.547/62.527ms，均在冻结预算内；单次
battle-data adapter 分解样本 12.631ms。ready reply JSON/V8 = 5,502,785/5,012,485B，统一索引
JSON/V8 = 2,365,516/2,108,012B。相对上一 B 检查点，增加 1,194 rows 后完整 reply 反而减少
109,914B，统一索引减少 96,802B；没有用双份 DTO 换取页面迁移。

最终规模：8,122 rows、3,218 targets、3,293 sources、3,419 locators、9,898 bucket entries、
30 relations。benchmark 现在同时输出统一索引各字段体积；当前最大项为 rows 758,174B、sources
733,928B、locators 642,238B，后续域继续以完整 reply 净变化和 2.5MB 索引门双重约束。

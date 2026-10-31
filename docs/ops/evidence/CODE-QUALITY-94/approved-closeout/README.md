# CODE94–102：菜单与Save有限模块收口

## 证据身份

id：CODE-QUALITY-94/approved-closeout；schemaVersion：1；Owner：Codex，单Agent。
唯一分支codex/code-quality-94-102，从main8ebcb70f0接续b8b2ffaf4；两项用户裁决分别落地于5ef8b0a8c与9c95ab64d，E2E插桩接线另列实际delta。候选含未提交的收尾元数据时以[逐文件索引](review.json)的SHA为准；本地回执不预告远端合并。

## 来源与输入

用户明确批准删除零生产调用的旧菜单接口，以及Save保存/读取/删除统一只接受整数1–5。54主路径中34项既有关闭按具体版本/调用环境复用，20项补齐A–H及必要返工；12相邻路径只核实际delta。旧b8与pre94回执保持原字节，不因新sourceRef失效而重写历史。

重新核全仓caller时发现Confirm/Triple/Switch八helper也只被测试消费，已随旧分页、ItemSelect工厂、装备entry和角色query退出。旧G“其它出口实际消费”声明撤回，getSelected真实商店caller保留；输入filter的七值现行合同及实际选择行为保持。

## 断言与业务oracle

- slot专测用真实Save和memory/private fake-IDB双backend，逐项拒绝NaN、±Infinity、小数、0、6并保留原槽321；1/5实际存读删。正式2正控/6指定AssertionError后恢复，未把首版matcher包装Error当严格counter。
- IDB失败open、reset/异常close、versionchange有原正式红绿；元数据别名与六字段/双向clone、标题回调失败、WORD字面兜底分别保留。
- 活跃Selection/flags/角色导航与相邻expect通过显式结构证明；两条异步测试加强实际完成、原Error对象与真实Save.load结果，旧37绿/新单业务红后恢复。
- 集中门发现旧Save内联校验锚点失效，三条真实E2E工具合同失败；修复后执行实际校验函数，非法输入在capture/meta/clone/write前拒绝。399工具绿，不冒称浏览器剧情重验。D1只同步catalog/report/evidence源码绑定与有限history，不升级原SCC/token/三针/版本/出版信用。
- 精确测试退休保留旧/新身份、文件SHA和授权；五项受保护删除逐一匹配，通用predicate未改。

## 结果

| 门 | 本轮实际结果 |
|---|---|
| 定向/相邻 | 50文件407＋cov85刷新37；Save相邻25；E2E工具399；具体重叠不相加冒充唯一测试总数 |
| 全仓check | 7包20605测试＋714工具全绿；七包typecheck0；lint6111文件0error/0warning/0info；stderr空 |
| 官方fast采集 | 唯一一次20168例、807生产源；全部测试绿，原命令exit1因四条旧比率拒绝，原stdout/stderr完整保留 |
| ratchet/protected | 仅primitives/item-select/player-status的精确结构删除重计，generic规则/阈值/scope不变；driver/Save/IDB收益和六个其它包保持；同一报告原policy tail重放exit0、五项退休匹配 |
| 收尾静态 | 提交前核uniform包中的docs-final/lint-final/ledger-final/diff-final四项exit0及零诊断；未齐不发布 |

[实施原件](implementation.json.gz)保留实施/反控过程；[统一门完整原件](uniform.json.gz)保留三轮全仓门的原始失败与最终恢复、唯一采集、原生summary、逐文件差异、重计、原policy重放证明及最后静态原件。条目均含完整字节数/SHA/base64，不裁剪成摘要。少数早期手动lint输出未保存、初次临时目录准备失败和过早读尚未生成的game报告均显式披露，不冒充业务counter。

当前机器账本3453tracked／531closed／52review／2870pending。下面只新增20项关闭，34旧关闭保留；剩余review/pending不借包绿升级。

| 新关闭文件 | 处置 |
|---|---|
| [packages/game/src/core/menu/__tests__/primitives.test.ts](../../QUALITY-PENDING-100-3/organization-menu-state.json) | 本轮review→已验证 |
| [packages/game/src/core/menu/item-select.glm-phase1-leaves.test.ts](../../QUALITY-PENDING-100-3/organization-menu-selection.json) | 本轮review→已验证 |
| [packages/game/src/core/menu/item-select.ts](../../../../../packages/game/src/core/menu/item-select.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/menu-driver.cov85.test.ts](../../../../../packages/game/src/core/menu/menu-driver.cov85.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/menu-driver.test.ts](../../../../../packages/game/src/core/menu/menu-driver.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/menu-driver.ts](../../../../../packages/game/src/core/menu/menu-driver.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/opening-menu.glm-phase1-leaves.test.ts](../../QUALITY-PENDING-100-3/organization-menu-state.json) | 本轮review→已验证 |
| [packages/game/src/core/menu/opening-menu.test.ts](../../../../../packages/game/src/core/menu/opening-menu.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/opening-menu.ts](../../../../../packages/game/src/core/menu/opening-menu.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/player-status.test.ts](../../../../../packages/game/src/core/menu/player-status.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/player-status.ts](../../../../../packages/game/src/core/menu/player-status.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/primitives.boundaries.test.ts](../../QUALITY-PENDING-100-3/organization-menu-state.json) | 本轮review→已验证 |
| [packages/game/src/core/menu/primitives.glm-phase1-leaves.test.ts](../../QUALITY-PENDING-100-3/organization-menu-state.json) | 本轮review→已验证 |
| [packages/game/src/core/menu/primitives.ts](../../../../../packages/game/src/core/menu/primitives.ts) | 本轮review→已验证 |
| [packages/game/src/core/menu/save-slot-menu.test.ts](../../../../../packages/game/src/core/menu/save-slot-menu.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/save/__tests__/api.test.ts](../../../../../packages/game/src/core/save/__tests__/api.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/save/__tests__/indexed-db.test.ts](../../../../../packages/game/src/core/save/__tests__/indexed-db.test.ts) | 本轮review→已验证 |
| [packages/game/src/core/save/api.ts](../../../../../packages/game/src/core/save/api.ts) | 本轮review→已验证 |
| [packages/game/src/core/save/indexed-db.ts](../../../../../packages/game/src/core/save/indexed-db.ts) | 本轮review→已验证 |
| [packages/game/src/core/save/__tests__/slot-domain.test.ts](../../../../../packages/game/src/core/save/__tests__/slot-domain.test.ts) | 本轮review→已验证 |

## 限制与低成本复验

在治理树运行：

```sh
node docs/ops/evidence/CODE-QUALITY-94/approved-closeout/verify.mjs
pnpm exec tsx docs/ops/evidence/CODE-QUALITY-94/approved-closeout/prove.mjs
```

两者默认只读：核54主文件/12相邻SHA、全部附件字节、指定红/绿集合、退休身份、官方指标及结构保持；不重跑全仓或coverage，也不机器认证C/D/F/G/H设计结论。任何实现/caller/输入或规则变化只重核受影响claim。未做新的剧情/视觉/真实浏览器IDB验收；JSON格式、DB版本、旧store升级/清档策略未改。schema/机制/生成物与103+范围不外扩。

本地冻结时尚未推送/建PR/合并；后续实际提交、保护CI、合并与main CI以关联Git/PR为准，最终回执另核，不由本页预告。

2026-10-31 导航补记：上表为当时关闭快照，旧路径及当时结论保留；四个已退役路径的链接现指向当前菜单状态身份映射，非重新授予关闭。当前状态以逐文件账本为准，八维补审／统一门仍各受其证据边界约束。

2026-10-31 筛选导航补记：旧item-select叶测试保留上表原身份，当前合同归物品筛选专测，链接转现用身份映射；不重授当时关闭。

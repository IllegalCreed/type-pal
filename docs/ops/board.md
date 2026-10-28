# 多 Agent 任务看板

当前看板只记录尚未终态的任务；历史状态快照见 [board-history/board-20261004.md](archive/board-history/board-20261004.md)。任务卡、证据与审计入口见 [ops README](README.md)。

Last reviewed: 2026-10-24
Template: governance-index-v1 / 1.0.0

## 目的
- 记录当前未终态任务的责任、状态和唯一入口，避免历史任务重新获得执行授权。

## 范围
- 当前包含：活动任务卡、负责人和下一步。
- 明确不包含：产品 runtime、E2E、视觉、coverage 或部署验收。

## 当前状态
- `status`: current
- `lastReviewed`: 2026-10-24

## 入口与责任
- canonical 入口：本看板、`docs/ops/tasks/index.md` 和各任务卡。
- Owner：Codex 维护看板一致性；各 Coding Owner 维护任务卡状态。
- 下游使用者：任务卡检查器、文档 registry 和跨阶段治理矩阵。

## 证据与下一步
- 关键来源：任务卡顶部 `Status`、任务卡正文、对应 evidence 目录和历史看板快照。
- 未决/阻塞：每个活动任务的具体缺口以卡内证据和状态为准。
- 下一步：任务状态变化时同步看板、生成索引、registry 和 review SHA。

| ID | 任务 | 状态 | 负责人/下一步 | 一句话备注 |
|---|---|---|---|---|
| DOCS-RECORD-INTEGRITY-1 | [R 波记录可信度撤回与补救](tasks/DOCS-RECORD-INTEGRITY-1.md) | rework | Codex / 扩大R23–R36撤信与验收锚点补救，待非作者验收 | 机械保真不授语义信用；原回执保全 |
| DOCS-FULL-TEMPLATE-1 | [全 docs 深度治理与模板化改写](tasks/DOCS-FULL-TEMPLATE-1.md) | rework | Codex总Owner；S65实际接入473，剩余135JSON+9MD | 新增473迁移/470审阅，progress144待办/0完整性；严格门仍未清零；不合main/不done |
| DOCS-NATIVE-JSON-1 | [原生JSON历史证据逐篇治理](tasks/DOCS-NATIVE-JSON-1.md) | rework | Codex / S56-S57已接入212，旧执行不重授 | 269与212当前接入按实账保留；本轮不重复计，剩余治理继续rework |
| DOCS-NATIVE-VITEST-269-1 | [269篇原生Vitest语义接入](tasks/DOCS-NATIVE-VITEST-269-1.md) | review | Codex / 269发布与夹具已独立接受 | 新增269文档迁移，严格实减538项；不授旧执行信用 |
| DOCS-REGISTRY-SPLIT-1 | [文档 registry 存储拆分](tasks/DOCS-REGISTRY-SPLIT-1.md) | build | registry_storage_author / 隔离实现；root独立验收 | 2.0.2设计非作者限定接受；新增登记缺口显式保留 |
| DOCS-CATALOG-SPLIT-1 | [phase/lore catalog 分片](tasks/DOCS-CATALOG-SPLIT-1.md) | rework | Codex / 非作者复核待补 | 实现保留；自验冒称独立与过早done撤回 |
| ED-ENTITY-STATE-PLAN-1 | [实体状态方案、脚本组合与编辑器预览](tasks/ED-ENTITY-STATE-PLAN-1.md) | review | Codex / 完整现场与E2E采集待续 | 首批UI用户验收通过；临时方案丢弃，正式状态须经E2E核对 |
| TEST-GLM-GAME-TURN-BOUNDARIES-1 | [战斗回合与结算边界测试](tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md) | rework | GLM / 补原始反控与合法输入；Codex复核 | 先前accept撤回；全绿与已合入不等于合同验收 |
| E2E-R4-1 | [路线驱动与合法检查点薄基线](tasks/E2E-R4-1-route-and-checkpoint-foundation.md) | build | Codex / 共性批次优先于006 | 001–005已验；浏览器启动失败自动清理待补 |
| E2E-005-1 | [买虾出门与香兰报信](tasks/E2E-005-1-shrimp-errand-and-xianglan-news.md) | review | Codex技术accept / 用户观感 | 技术证据已核，等待用户观感验收 |
| E2E-006-1 | [回客栈求药与张四出海上仙灵岛](tasks/E2E-006-1-inn-doctor-and-boat-to-island.md) | rework | Codex / 技术与用户视觉已接受 | 两路独立技术accept，Game完整78键校验C1关闭；实际起伏/终档/恢复与另存安全性能保留，构建warning和Testing来源门已修。全库文档治理待办仍阻塞，不合main/推送/done，不交GLM做E2E |
| REFORGE-OPENING-LOAD-ERROR-1 | [标题读档IO失败的悬空拒绝](tasks/REFORGE-OPENING-LOAD-ERROR-1.md) | draft | 等待前提核验 | 不得开始实现 |
| SCRIPT-AUTHOR-2 | [客栈脚本语义命名与坐标走位](tasks/SCRIPT-AUTHOR-2-readable-inn-choreography.md) | build | Codex / 后续语义命名治理 | 保存 counter 已闭合，剩余命名治理未完成 |

## 看板规则

- 只把当前未终态任务放在这里；done/cancelled/rework 历史回执进 archive。
- 任务顶部 Status、任务索引和此表必须一致。
- 证据只放 evidence/<task-id>/；审计正文与探针脚本分离。
- 历史报告保留原结论，不因归档升级为当前通过。

S43 文档接入：S40–S41 22篇非作者accept接收，Owner接20路由并显式处置旧artifactOnly；S42 683包机械成果保留、语义返工（579仅SHA oracle、37残句、28MD需真实正文判定）。七重复清册仅批准合并设计不删除，139按原生/系统/MD分族准入；212及runtime信用0，E2E006日期红不续。父子卡rework，不合main、不推送、不done。

S44：S42修正包保全/指定事实接受，Owner修组包字段、12模板前缀与四入口职责；七重复清册属于1838，暂不删。652原生待分族设计，895/1784与212/runtime信用保持，父子卡rework。

S45：S42补足384设计输入接收、17篇Markdown新版本限定接入；严格1784→1750（-34），当前待迁878、基线1457/1838，另3retired/99incremental。652原生合同按分族pilot推进，212及runtime信用0；提案新增差异待独立验收，E2E006日期红不续，父子卡rework。

S47：S45 Owner增量accept入账；S46批3终版652/双verify保全接受，pilot/选择器/consumer三项设计返工。Owner直接修74映射，3既有/23待准入/626待设计，无新增迁移，严格1750保持；原包不覆盖，父子卡rework。

S48：原652保全与352delta结构可复用；Owner修417字段表达及16消费者路径，首8载体/7形状设计与原型非作者accept。正式合同/路由/迁移未发布，1750保持，原53建议余项draft。

S49：39建议实际27可复用形状，12不满足其拟合同；原数据/既有信用保持。41mutation拆两形状，100review控制保合法空账本与转移边界。Owner实施首八固定原生guard，生产registry/routing和partial/needs状态保持，1750严格项不预扣。

S50：首八19字段内容获非作者逐篇接受，原生字节/历史撤信保持；Owner先镜像后真实接入并核投影。新文档接受与历史/runtime信用分开，E2E006过期和其余严格待办保持实际红；父子卡rework。

S52：S51机械658/1768保全；26 MD/HTML内容候选可复用，8静态Markdown按现有合同接入，原生/旧历史不变。505 JSON具体见证需补，127当前控制件由Owner负责；硬门仍按实际红，不合main/不done。

S53：S52非作者接入accept已接收；505补证实际值保全，Owner定向补20泛化旧稿，原生/旧包/状态不改。七字节别名待loader合同与反例后显式退役，父子卡仍rework。

S54：S53五轴非作者accept已接收；27沿用既有四原生合同，由Owner核精确来源与字段角色，先临时树真实consumer验证，未独立接受前不写正式语义/状态，父卡rework。

S59：S57非作者accept已接收；S58 142份结构/静态事实保留，Owner补必要来源/字段和两项控制声明。两HTML合同/三pilot与284工具/4620零诊断lint完成，真实check:docs仍strict1258/632；本轮0迁移，控制JSON合同仍draft。新增Owner差异待非作者复验，不合main、不推送、不done。

S61：原15HTML全部按两既有合同接入，3份旧reviewed不重复计数；严格1258→1231（-27），待迁632→617（-15），基线1478/1838。289文档工具全绿、lint4622零诊断，check:docs只余严格待办；127控制JSON仍draft。增量/封存集中复验，不合main、不推送、不done。

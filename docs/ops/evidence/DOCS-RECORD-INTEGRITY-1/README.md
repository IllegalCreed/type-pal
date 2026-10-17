# 记录可信度返工证据

Status: current
Owner: Codex
Last reviewed: 2026-10-18
Template: governance-index-v1 / 1.0.0

## 目的

保存 GLM 审计对应的当前勘误、降档清单、Git 证据和真实命令输出；不新授逐篇语义或独立验收信用。

## 范围

R39–R93 及后续收口撤回；生成分号损坏；R22/R24/R27/R38/R65/R66 勘误。旧 receipt 不改数字、不覆写原 stdout。

## 当前状态

rework。完整 check:docs 与 require-complete 的失败必须保留；结构及 lint 的结果分别记录。当前控制 JSON 通过 registry structuralRoots 外部定位，不自嵌自身 SHA，也不计语义完成。

## 入口与责任

- [返工卡](../../tasks/DOCS-RECORD-INTEGRITY-1.md)与[全量卡](../../tasks/DOCS-FULL-TEMPLATE-1.md)。
- [逐篇降档清单](correction-scope.json)：按实际 review 批次列出路径、前次状态与 SHA；不代表重新全文阅读。
- [核查与修复事实](integrity-audit.json)：Git diff、损坏修复和口径勘误。
- [receipt 历史筛查](receipt-history-scan.json)：Git 记录可见的变动候选，不能代替逐项真实性核验；mtime 不能证明历史重跑。
- [真实重跑索引](rerun.json)：command/cwd/输入快照、stdout/stderr 文件 SHA、时间与 exit/signal；全为 Codex 自验。

## 证据与下一步

历史接受结论已被本目录的当前撤回裁定覆盖。原文语义重审、非作者复核与 artifact 合同未完成前不 done。raw 输出放在本目录 raw/，只由执行捕获器生成，追加新文件替代手改。

## 已捕获结果与边界

保全的首个新执行session为a1622b45-a149-4288-9f17-7799d1236ed9，见rerun索引与其输入快照：docs工具128/128通过，R65/R66机械保真20/20；lint零诊断。严格内容门与check:docs因1909条撤回状态失败，require-complete也失败。后续接入本目录新JSON会增加待审分母，不能将旧快照数量冒作最终树数量。

首轮筛查的R65摘要手改已确认；其余15项现已逐项裁定，见下方新入口。当前未完成逐篇语义重审；58e899bf纠错包已获非作者限定接收，五项隔离继续，不授全量完成信用。

## 十五项逐项裁定（2026-10-18 续办）

- [逐项审计正文](receipt-candidate-adjudication-20261018.md)：10项记录变动可解释，5项执行或byte metadata信用隔离；不是15次执行通过。
- [固定源与artifact观察](receipt-candidate-observations-20261018.json)：Git before/after、JSON pointer、原始日志保全与局部身份对齐。
- [字节数反证](receipt-byte-count-counters-20261018.json)：72个当前stream SHA吻合，50个bytes实际为UTF-16长度；原字段/raw不改。
- 当前派生裁定以integrity-audit.receiptHistoryScreen.quarantinedClaims为准；原筛查与原receipt保持原字节。非作者独立验收后才进入真正逐篇语义重审，硬门未过不合main、不done。

## 非作者限定接收（固定58e899bf）

[独立报告](independent-review-58e899bf-20261018.json)由`/root/receipt_integrity_independent`生成，SHA `06c482cda4cd56705a72d15e36a763c5ccc62ca609e83a744878000083b6dacf`；作者为`/root`。新逻辑任务未参与候选制作，以固定Git/raw重核后限定接收，未发现新增阻塞counter。15项裁定及1896撤回、113 quote、6原生模板撤回获核实；五项隔离不解除。

[接入映射](independent-intake-58e899bf-20261018.json)保存报告和39项证据的原路径、仓库路径、SHA和字节数。raw现在分别归执行捕获器、历史artifact原字节留存、独立审查者产物所有；不能把后两者当新命令输出。原报告的临时绝对路径不改写，由映射负责定位。

统一门仍FAIL，任务不done、不合main。纠错包限定接受后开始单篇语义重审；本报告没有重授1838篇内容、历史执行、产品运行或coverage信用。

## S01 真正逐篇重审的独立结论

[READ-FIRST固定正文独立报告](independent-review-S01-8ef07ca7.json)逐项核11规则/5停止线，首候选counter后只在8ef07ca7正文SHA70a835e7…闭合sLayer/cover勘误，限定接受该正文与模板。报告SHA288a330b…及45证据原字节接入，路径对应见[独立接入映射](independent-intake-S01-8ef07ca7.json)。原counter不抹掉，原55行quote不改；不授其余R33、依赖整篇或1896撤回绑定、全量门及运行信用。


S01接入的6份编号源码摘录含原有行尾空格，0bac72c2完整范围diff真实失败已另捕获；目前仅将这6个payload以gzip无损承载。[接入映射](independent-intake-S01-8ef07ca7.json)同时列原payload SHA/bytes、存储SHA/bytes、from→to和解码规则。45/45解码后均匹配审查者原pin；原报告、原counter和0bac Git字节不改。不是trim原证据、排除文件或降低diff检查。


## S02 真正逐篇重审的独立结论

[测试治理固定正文独立报告](independent-review-S02-fe546c7e.json)SHA db1c98bc…限定接受fe54正文dbd68ac…与runbook模板，并复核S01的45原payload/6无损容器和0bac真实失败。[接入映射](independent-intake-S02-fe546c7e.json)为47原artifact逐项列gzip解码、payload/stored双pin；原报告与失败不改。仅S02从1896撤回中重授，当前剩1895，五隔离不解除；本轮两篇语义接受不等于继承总量重认证或全门通过。


## S03 固定正文的逐篇接收

[原非作者报告](independent-review-S03-f9fbf0c7.json)与[无损接入表](independent-intake-S03-f9fbf0c7.json)只接受f9fbf0c7的本篇正文/五章模板。Current six-stage index/canonical navigation and shared contract/checkpoint/preview/task entries remain distinct from publication and real execution. Historical SAVE11/verified and one-LF inverse claim do not renew present runtime or capture readiness. 原报告字节与失败保留，中央组合字节另验，不续其他R60或历史执行信用。


## S04 固定正文的逐篇接收

[原非作者报告](independent-review-S04-c8715c2c.json)与[无损接入表](independent-intake-S04-c8715c2c.json)只接受c8715c2c的本篇正文/五章模板。Human cross-stage navigation routes to the existing canonical audit/pair and formal parent index. Catalog depends001–005, historical006 findings do not admit006rework. Concrete issue-family attribution/backlinks cannot close render/save/preview/capture. 原报告字节与失败保留，中央组合字节另验，不续其他R60或历史执行信用。

## S03/S04固定中央组合的独立闭合

[固定65ee30ad非作者中央报告](../DOCS-REGISTRY-SPLIT-1/independent-S03-S04-central-review-65ee30ad.json)SHA `f3f8674ff4bb1e9887088095a950f55fd85261bd9420d9fe3979bd420f6e6821`逐项核两篇唯一迁移、其余旧绑定保全及七个新增pending；[146项运输映射](../DOCS-REGISTRY-SPLIT-1/intake-independent-central-65ee.json)保留原报告、manifest、原输出与自身失败。此次只闭合固定65中央待项，1896中仍3篇重授/1893待审、五隔离不解除；S01另列。后续写回及S05/S06另验，全量硬门仍FAIL，不将该报告外推为当前树或全docs接受。

## S05固定路线设计的单篇接收

[非作者原报告](independent-review-S05-b87a2397.json)与[236项无损映射](independent-intake-S05-b87a2397.json)保留原174/前219/新274全文审读、27依赖范围、七用户规则与五章设计、source/publication及synthetic IO反例；两个cold CLI提前缺资产失败和自身probe失败不改。只接受固定b87本文/模板且状态proposed，不授真实档、E2E/preview/visual/capture/coverage或其他R60信用。此次1896中4篇重授/1892待审，实际中央组合仍须独立验收。

## S05固定中央组合的独立闭合

[4ddd独立报告阅读投影](../DOCS-REGISTRY-SPLIT-1/independent-S05-central-review-4ddd17e4.json)及[62项原件映射](../DOCS-REGISTRY-SPLIT-1/intake-independent-central-s05-4ddd.json)限定接受S05唯一绑定、原2417旧对象与2424 pin保全。原payload SHA fb5ea36b…以gzip原字节保存；投影只改格式，map区分payload/stored/view身份。原harness失败和三项硬门FAIL保留；仅关闭固定4ddd待项，当前1896中4篇重授/1892待审不变，后继S06/S07/设计/本次接入另验。

## S06原生002审计的具体语义接收

[固定71非作者报告](independent-review-S06-71d74b4d.json)与[480项原件运输](independent-intake-S06-71d74b4d.json)保16native/5421B前缀、旧880 rework和71唯一句修正、实际source/consumer反例及全部失败。原20行/奖励偏序/三人生命周期/正式恢复按实际源码边界解释；false→true→false反例仅限读过的predicate，不能推游戏重现或全程不再现。仅固定本文/机器模板1.5接受，实际中央组合待验；1896中5篇重授/1891待审、五隔离不变。最终报告保持plain旧路由，新gzip授信路线未采用。

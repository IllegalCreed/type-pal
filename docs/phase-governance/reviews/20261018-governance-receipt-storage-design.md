# 治理执行回执的原件存储与引用设计

Status: proposed
Owner: Codex
Template: design-spec-v1 / 1.0.0
Design version: 1.0.0
Source snapshot: 4ddd17e401115c8f2ce128bbd2af0ab0349de8db

## 问题与目标

S05接入一个被真实重审的正文，同时新增六份待审报告/运输JSON；原始审查工具又产生自己的报告。若每次审阅都创建需要同样再审的canonical报告，会产生无限递归，挤占正文重审。本设计明确后续治理命令和审阅器产物的原件存储、可回读身份与逐篇授信合同，不降低正文深度或独立验收。

冻结1838基线、已登记2424条候选、现有pending及原历史路径不因本设计减少。本设计只约束批准后新产生的治理执行回执；不是把既有JSON改名压缩以退出治理，也不宣称现有报告已满足模板。

## 真值与约束

- 文档模型第4节已要求附件归属、immutable raw保全及review/control JSON避免无限自审；本设计是具体存储/consumer合同，须经非作者审查后冻结再用。
- 业务canonical JSON/HTML/Markdown、测试catalog与配对机器证据都是现有文档候选，继续逐篇迁移；e2e-002等原native字段、路径、版本、状态与公开consumer不在本设计迁移范围。
- 仅当完整核读实际内容确认是一次治理工具/审查命令的原生输出，且无既有canonical直接读取义务时，才可按raw附件存储。路径、后缀、generated字样、体积或artifactOnly都不能决定此归类。
- 作者自验不替代非作者。未全文读或未核完的正文仍partial/blocked；任何静态/fixture/运输成功都不授产品或历史运行、E2E、视觉、coverage信用。
- 不新增ignore/exclude/maxSize/structuralRoot豁免，不改变1838基线、全部当前候选的门禁分母和原SHA链。已登记的报告仍待其本身的真实语义/模板治理。

## 方案

### 原件与身份

后续一次性治理回执在执行进程实际退出后先冻结原始JSON、argv/cwd/起止时间/exit、完整stdout/stderr、输入与脚本快照。报告与manifest不互嵌自身内容hash；通过固定Git/blob或外部执行捕获定位。原件可用确定性gzip存入本任务已有raw归属目录，容器以解压payload SHA命名；原未格式化字节、失败、警告和自行probe设置错误全部保留。

每个引用明确列出repositoryPath、encoding=gzip、payloadSha256、payloadBytes、storedSha256、storedBytes、producerTask、authorTask/reviewerTask、sourceRevision、scope、owner、caller、关联任务、保留原因及退出条件。payload与stored两个SHA语义不能互换；解压后必须字节相等，不采用JSON等价代替原件保真。

同一payload可仅在实测相同字节时复用容器；多个producer原路径/时间/作用域的引用仍分别保留。manifest自身可作为另一raw产物，但不得声称manifest覆盖其生成后新增文件。输出未完成、空JSON或postpublish异常不能当成功回执。

### 逐篇记录与入口

每份正文继续在现有semantic review根保存独立条目：具体核心结论、实际读域/未读域、原/新SHA、sourceRefs、状态/owner、caller/合法输入/business oracle、排重、counter/rework、history/supersedes、before→after、停止线、下一步及模板符合性。这里的独立是逐条可区分，不要求每条另造一个canonical文件。

非作者冻结报告只作上述条目的原始证据附件。条目须把报告原字节身份与结论范围分开，并用rawReportRef完整记录双SHA；evidence.path指向实际容器，evidence.reportSha256明确表示解压后的报告SHA，同时保存storedSha256。旧plain报告字段语义与旧引用完全不变，不能暗中混用hash。

当前任务卡与既有证据入口链接该review条目、固定候选与原件引用，说明实际通过/失败和尚未通过范围；不为同一事实另造第二套状态表。报告、运输或命令退出成功本身不成为正文或模板完成的依据。

### Consumer 与提交顺序

先固定原/新正文、必要一手来源和非作者报告，再构造显式中央计划。可信接入工具对每个批准path/body/docType/templateId/templateVersion/report payload与stored身份都核精确白名单；先核所有输入、唯一binding、原donor其余对象与history保全、输出可写和依赖无环，再发布。

使用原文件字节核storedSHA/bytes、真实gunzip核payloadSHA/bytes与JSON合法性、报告主体/作者身份/限定verdict和候选SHA。一个nonAuthorReviewer=true布尔值不构成授权。旧plain合法/非法回归不退化；未批准路径、错正文/模板/版本、错报告/容器/hash、截断/损坏gzip均必须在任何registry/review写入前拒绝。

完整check:docs、lint、full-base和staged diff、strict及require-complete按实际候选运行，保原输出；不借局部门绿取消全量FAIL。多文件发布仍不是跨文件事务；发布后外部变动和空输出保留真实失败，不能自动刷新pin抹去竞态。

### 迁移映射

批准后新报告的迁移记录必须含原绝对源路径/原payload SHA与bytes、目标gzip路径/stored SHA与bytes、解码规则、Owner/producer/caller/作用域。入口改引用时逐个重算相对链接与两个身份，并实际验证消费；原source即使在/tmp也不能仅信文件名。

既有1838、2424候选及其绑定/原报告/旧运输map零迁移；如以后拟改变既有canonical路径，必须另给逐文件源SHA→目标、链接重算和所有公开consumer验证，不由本设计预先批准。任何原文档的模板符合性仍须真实正文迁移。

## 边界与风险

gzip不可直接用普通JSON reader读取，公开consumer必须明确支持该artifact引用，不能仅改扩展名后宣布兼容。原报告可用标准gunzip命令回读；若需要阅读投影，须明确显示原件/投影不同身份并另登记新canonical候选，不能为了便利让它自动完成。

raw目录也不能成为藏未审正文的入口。每次中央实际验收要从内容验证附件资格、双身份、原native/current候选不减少以及每篇完整review字段，不只数文件或信运输脚本。未知归属保持pending，不能由此排除硬验收对象。

本设计不修产品oracle、不改既有机器证据字段、不把S06隐藏序列的纯函数反例称为实际游戏复现。产品/不可逆清理取舍仍交用户；本设计不执行删除或历史重写。

## 验收

非作者全文核本提案、文档模型实际约束及fixed4ddd真实候选/已登记范围，提出最强替代解释：是否在将已审计候选偷换为raw，或把原报告压缩当正文迁移。只能在确认上述零缩分母和逐篇实审边界后冻结版本。

实施另由非作者实跑正负对照：一条合法gzip原件/报告/body/template完整迁移；两种合法非ASCII正文/原件；错body/作者或report identity/模板版本/未授权path、容器截断、payload/stored身份混换与旧plain回归；每个拒绝检查写入前全部输入字节不变。须核实际唯一binding及旧对象/顺序/历史、raw解压完整保全和无新ignore/structuralRoot。

先完成一篇真实机器证据pilot并获非作者正文与中央分别接收后才可复用。模板类别仍17，父模板和1838/新增候选不变。本设计或工具接入接受均不是全量完成；check:docs/strict/require-complete未零诊断时保持rework，不合main或done。

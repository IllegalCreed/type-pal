# CODE3g 当前八维复核

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页为CODE3g测试宿主切片收口（2026-10-21，Owner Codex）的治理候选页，原件为下方逐字节保全的固定main源（946B）。审计主题：替换三个重复子进程宿主为唯一cli-host，补真实所有权与清理顺序证据；清单新增实际目录全量oracle、精确stderr补强；900行产品CLI编排不随测试宿主切片自动关闭。

## 范围与证据

范围明确限五测试宿主文件（三CLI测试+cli-host.ts+cli-host.test.ts），900行CLI主编排与输出链留待下一轮既有八维缺口。逐文件A–H与保留项见[review.json](review.json)；完整执行原件（cli-audit-restored、manifest-before/after、host-calibration/no-wait/r3/cancel、four-card-extract-sealed等11项run）由[四卡共同归档](../../3b/closeout/evidence.json)索引；旧失败/旧警告/采集失误（首版hook转义致3 suite collection失败）均原样保留。

## 发现

关键发现按原时点保留：复制CLI单点漏manifest条目旧6绿、新5绿1指定业务红；去await close单点破坏2绿1红（r3复验）；host-cancel真实5000ms超时只作资源失败证据不算业务反控；旧观察副本采集早于断言加强，不虚称已执行新断言；最终four-card-extract-sealed 75文件445绿、stderr 0字节。

## 结论

原结论：四卡冻结后全check 20390、official ratchet/protected各19992及typecheck/lint零诊断；仅五测试宿主文件接受，CLI主编排仍partial。

## 整改与复核

上文待跑/候选计数属于先前时点，已被最终结果节替代；只读verify应MATCH，不重复执行测试。本治理不重开任务、不改变原done/接受终态语义。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 946B / SHA-256 3780c7957c553066e63539e3a2ff17fb7432f820c1dab74e74d454f31a6094d3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3g 当前八维复核

Status: evidence
Last reviewed: 2026-10-21
Owner: Codex
Template: evidence-index-v1 / 1.0.0

本片替换三个重复子进程宿主，补真实所有权与清理顺序证据。清单新增实际目录全量oracle；精确stderr补强。900行产品CLI编排不随测试宿主切片自动关闭，下一轮继续其既有八维缺口。

[逐文件A–H与保留项](review.json)。完整执行原件由[四卡共同归档](../../3b/closeout/evidence.json)索引；旧失败/旧警告/采集失误均原样保留，未取得统一门信用前不关闭文件。

## 2026-10-21 当前最终结果

四卡冻结后全check20390、official ratchet/protected各19992及typecheck/lint零诊断。仅五测试宿主文件接受，CLI主编排仍partial。 [当前总裁定](../../3b/closeout/evidence.json)；上文待跑/候选计数属于先前时点，已被本节替代。只读verify应MATCH，不重复执行测试。
```
<!-- incremental-original-source:end -->

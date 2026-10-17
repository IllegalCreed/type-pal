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

首轮筛查的R65摘要手改已确认；其余15项现已逐项裁定，见下方新入口。当前未完成逐篇语义重审，非作者纠错验收待执行，不授独立或全量完成信用。

## 十五项逐项裁定（2026-10-18 续办）

- [逐项审计正文](receipt-candidate-adjudication-20261018.md)：10项记录变动可解释，5项执行或byte metadata信用隔离；不是15次执行通过。
- [固定源与artifact观察](receipt-candidate-observations-20261018.json)：Git before/after、JSON pointer、原始日志保全与局部身份对齐。
- [字节数反证](receipt-byte-count-counters-20261018.json)：72个当前stream SHA吻合，50个bytes实际为UTF-16长度；原字段/raw不改。
- 当前派生裁定以integrity-audit.receiptHistoryScreen.quarantinedClaims为准；原筛查与原receipt保持原字节。非作者独立验收后才进入真正逐篇语义重审，硬门未过不合main、不done。

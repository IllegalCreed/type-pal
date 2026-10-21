# PRE-E2E 审计工具

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-21
Template: audit-report-v1 / 1.0.0

本页说明 pre-e2e 审计工具目录的职责边界：本目录只存探针、配置和验证脚本，审计结论在上级目录的报告中。原始 7 行说明在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 审计问题

- 要回答的具体问题：工具目录与报告目录的事实权分工——探针源码可读、可复跑，但其存在不等于产品 runtime 通过。

## 范围与证据

- 目录内容：probe-save-boundaries / probe-editor-persistence / probe-migration-boundaries / probe-phase1-world-lifecycle / probe-reforge-restore / probe-canonical-async / probe-scene-preflight / probe-battle-core / probe-battle-session / probe-phase1-battle / probe-test-gates / probe-precache-progress / probe-preview-cache / probe-editor-history / probe-editor-reference-delete / probe-editor-sprite-upload / probe-editor-trial / probe-save-barrier-family / probe-glm-next-barrier 等各批取证脚本。
- 完整迁移字段（源 SHA、after SHA、cwd、相对 import、公开 runner、合法输入、业务 oracle、停止线）见 quote 内 `ops-governance-layout-20261004.json` 链接。

## 发现

| 边界 | 说明 |
|---|---|
| 探针定位 | 断言各审计基线「尚未修复的输出」的反例证据，不是正式正确性回归门禁 |
| 退役规则 | 对应缺陷修复时应转为正确行为测试并退役旧假设，不为保持脚本通过保留旧产品行为 |
| 运行边界 | 独立 Node 进程、内存桩，无真实 IndexedDB/网络/用户目录写入；Vite 仅作模块转换 |

## 结论

- 当前能证明：各探针与其所属报告的对应关系及迁移字段可追溯。
- 当前不能证明：探针可读等于审计结论当前有效，或产品 runtime 通过。

## 整改与复核

- 修复 Owner：探针退役随对应修复卡执行；本页不授权删除或改写探针。
- 继任/supersedes：当前工具清单与状态以仓库实际为准。

## 历史范围

- ops/audits/pre-e2e 历史审计层；日期：undated（随 2026-10-04 ops 治理布局迁移）；固定 source revision `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`，source SHA `96f9acc5c831d1f7b8c41ef1b36fedb669f45e33ff9f45e288388ec1c571986d`；本轮 S20 全文核读真源后重写封套，quote 与分层逆回规则不变。

## 原始结论

- 原文 7 行（职责声明与迁移字段链接）完整保留于下方 quote。

## 当时证据

- 迁移字段 JSON（quote 内相对链接）记录每脚本的身份与边界。

## 当前有效性

historical。目录职责声明仍适用；探针结论的当前有效性回各批报告与修复回执。

## 继任文档

- 上级目录各批审计报告与修复回执。

## 原文保全

- 固定 source revision `348620bf3c68aa77a7ef7e1abef9b8eda08530d9`，source SHA `96f9acc5c831d1f7b8c41ef1b36fedb669f45e33ff9f45e288388ec1c571986d`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # PRE-E2E 审计工具
>
> 本目录只存探针、配置和验证脚本；审计结论在上级目录的报告中。脚本移动保留源 SHA、after SHA、cwd、
> 相对 import、公开 runner、合法输入、业务 oracle 和停止线，不能把探针源码读取当作产品 runtime 通过。
>
> 完整迁移字段见 [`ops-governance-layout-20261004.json`](../../../archive/ops-governance-layout-20261004.json)。

<!-- original-source-quote:end -->

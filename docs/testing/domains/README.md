# 测试文档工程域

Governance Owner: Codex / history_cards_a（本次文档候选，待非作者独立验收）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0

原文没有显式 Owner / Status 元数据；治理负责人不冒作原作者，治理日期不倒填原发布日期。

## 目的

将 runtime、ops、editor、phase1-runtime 四个 canonical 工程域入口分工导航；增补历史工具入口以解除18个无入链工具目录。

## 范围

本页只负责 4 个原有不同目标的导航；业务断言、测试状态与执行证据仍由下游唯一报告、catalog 和配对 evidence 承担。本页另显式列出 20 个既存历史工具目录，不新建报告或复活归档工具。

## 当前状态

导航状态为 current，表示本页提供现有入口。本次只重写导航、核对链接与归属，没有新增 source audit、runtime、E2E、视觉或 coverage 验收；候选等待独立复核。

## 入口与责任

- [Reforge runtime](runtime/README.md)：运行时所有权与调用链的 source audit。
- [Testing operations](ops/README.md)：legacy census、迁移和 CI governance。
- [Editor](editor/README.md)：编辑器表单与地图工作区所有权。
- [Phase 1 runtime](phase1-runtime/README.md)：第一阶段依赖所有权。

本页只维护这些入口的用途；原文未署 Owner，不能把下游 catalog 的 Codex 出版责任倒填成本页原作者。

### 历史工具目录

以下只统计原工具清单中的脚本文件，合计 112；不计测试数或已核 runner。空的 scene 工具页保留为 0。

- [content/authoring-and-runtime（16 项历史工具）](content/authoring-and-runtime/tools/README.md)
- [content/editor-workflows（1 项历史工具）](content/editor-workflows/tools/README.md)
- [content/engine-boundaries（1 项历史工具）](content/engine-boundaries/tools/README.md)
- [content/testing-records（2 项历史工具）](content/testing-records/tools/README.md)
- [editor/authoring-and-runtime（3 项历史工具）](editor/authoring-and-runtime/tools/README.md)
- [editor/battle（1 项历史工具）](editor/battle/tools/README.md)
- [editor/editor-workflows（22 项历史工具）](editor/editor-workflows/tools/README.md)
- [editor/supply-and-import（2 项历史工具）](editor/supply-and-import/tools/README.md)
- [editor/testing-records（2 项历史工具）](editor/testing-records/tools/README.md)
- [migration/supply-and-import（10 项历史工具）](migration/supply-and-import/tools/README.md)
- [ops/testing-records（4 项历史工具）](ops/testing-records/tools/README.md)
- [persistence/save-and-recovery（1 项历史工具）](persistence/save-and-recovery/tools/README.md)
- [phase1-runtime/engine-boundaries（2 项历史工具）](phase1-runtime/engine-boundaries/tools/README.md)
- [quality/quality-gates（21 项历史工具）](quality/quality-gates/tools/README.md)
- [runtime/battle（8 项历史工具）](runtime/battle/tools/README.md)
- [runtime/editor-workflows（1 项历史工具）](runtime/editor-workflows/tools/README.md)
- [runtime/engine-boundaries（13 项历史工具）](runtime/engine-boundaries/tools/README.md)
- [runtime/save-and-recovery（1 项历史工具）](runtime/save-and-recovery/tools/README.md)
- [runtime/scene（0 项历史工具）](runtime/scene/tools/README.md)
- [runtime/testing-records（1 项历史工具）](runtime/testing-records/tools/README.md)

## 证据与下一步

本页原源为 8 行，冻结读取基点 `2aebe7efd8cc8dea750bc0f05c5519ed74081b7d`，Git blob `bad0bde937fb6c414df4e0d64661a13310cae935`，SHA256 `130a089f1c748eb71984ef2acc4a145510605b598c2e9dcd7795b04143074e1a`。逐篇来源、after 和限制见[本包作者回执](../../ops/evidence/DOCS-FULL-TEMPLATE-1/contributor-domain-navigation-k-20261016.json)；任务范围取[全量治理任务卡](../../ops/tasks/DOCS-FULL-TEMPLATE-1.md)。

K0 已在本基点使两个旧批次正文 writer 主动退休，不能再用它们重生成本页。正文/模板与链接自验不能替代非作者验收或恢复旧工具执行。非作者逐篇核本页正文、原源与真实链接后，由根线程维护中央记录；本候选不自签接收。

### 治理前导航原文

以下是治理前导航的完整来源副本；仅保字节与链接来源，不是另一套现行状态。

<!-- K-SOURCE-BEGIN -->

> # 测试文档工程域
>
> 按真实 caller/模块/功能组织的 canonical 测试记录。Agent provenance 只在 catalog 和报告中保留。
>
> - [Reforge runtime](runtime/README.md)：运行时所有权与调用链的 source audit。
> - [Testing operations](ops/README.md)：legacy census、迁移和 CI governance。
> - [Editor](editor/README.md)：编辑器表单与地图工作区所有权。
> - [Phase 1 runtime](phase1-runtime/README.md)：第一阶段依赖所有权。

<!-- K-SOURCE-END -->

# 跨阶段文档真值矩阵

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: governance-index-v1 / 1.0.0

## 目的

按 ops ↔ lore ↔ phase1 ↔ phase2 ↔ phase3 ↔ testing 的关系定位可继承知识、事实权和停止线。机器来源是[cross-phase-matrix.json](cross-phase-matrix.json)，本页只提供导航，不将各域揉成同一个当前真值。

## 范围

现行规则、历史计划、创意、执行回执和文档迁移分别按其阶段与来源读取。`resolved` 表示边界已说明，`guarded` 表示缺口明确且禁止外推，`blocked` 表示需要一手证据或用户裁决；这些状态都不等于产品运行通过。

## 当前状态

全 docs 治理仍进行中。旧表的“563 份均已绑定”只属于原有限范围，不能覆盖 1838 必审基线和新增候选。实际迁移由[进度工具](../../scripts/docs/report-governance-progress.mjs)从 review、SHA 与正文合同投影，最终还要通过 require-complete 与独立语义复核。

## 入口与责任

| 关系 | 已说明的边界 | 状态 | 停止线 |
|---|---|---|---|
| Phase1 ↔ Phase2 架构 | 一阶段保真参考，二阶段新架构 | resolved | 不继承旧模块耦合或偶然调度 |
| Phase1 ↔ Phase2 schema/save | 知识可迁移，canonical 独立 | guarded | 没有当前字段/代码证据不宣称兼容 |
| Phase1 历史 ↔ Ops | 旧完成横幅不关闭今天的任务 | resolved | 不从历史计划恢复待办或旧 handler 结构 |
| Lore ↔ Phase2 内容 | 只消费确认项与明确版本 | guarded | 来源冲突、创意和安全自查不自动升格 canon |
| Guijie ↔ Phase3 | 均是未承诺候选/参考 | resolved | 需独立范围和产品裁决才能开 build |
| Ops 证据 ↔ runtime/testing | 文档记录与实际执行各有范围 | guarded | 截图、计数、任务状态不单独证明通过 |
| 文档类型 ↔ 全量模板 | 17 类合同，逐篇真实 pilot/迁移 | guarded | 旧 registry 和保真样本不算全量完成 |
| 旧协作协议 ↔ 当前 Ops | 原文留存，现行流程控制准入 | resolved | 不恢复固定三签或历史交接授权 |
| onEnter 下界探针 ↔ 测试信用 | 无 goto/BFS 的线性扫描只给下界 | guarded | 不推出全库不可达或据此撤销业务合同 |
| Phase3 美术参考 ↔ 当前 build | 仅阶段边界当前有效，旧技术/法律断语未重核 | guarded | 不把旧“现在/推荐/合法”当实施或发行授权 |
| Testing 出版 ↔ SAVE12 | 原审计/执行版本与当前源码常量分开 | guarded | 不改历史 candidate/versions/performed 或伪造新实跑 |

| 历史静态诊断 ↔ 当前零诊断 | E-06 原 0/50/11 保留，现行规则约束今天的检查 | guarded | 不倒改旧计数、不用历史 exit0 或旧例外放行 |

维护 Owner 为 Codex；每次实际变更回写相关 canonical、review、catalog 与矩阵，不把索引作为第二份状态源。

## 证据与下一步

机器行逐项保存来源、未知和停止线；只说明已登记关系，不代表全 docs 关系已穷尽。相关入口：[文档模型](../ops/guides/documentation-model.md)、[现行协作](../ops/agent-workflow.md)、[测试治理](../testing/governance.md)、[SAVE12 合同](../phase2/specs/save-system.md)、[DLC 创意](../lore/dlc-ideas.md)、[第三阶段参考](../phase3/reference/art-pipeline.md)。

当源证据推翻前提时先停受影响批次，更新关系和用户产品裁决，不将 guarded 擅改 resolved；全量审查仍由[任务卡](../ops/tasks/DOCS-FULL-TEMPLATE-1.md)推进。

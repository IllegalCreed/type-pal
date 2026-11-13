# 任务专属证据

Status: current
Owner: Codex（导航维护）；各任务Owner维护原件与caller
Last reviewed: 2026-11-11
Template: governance-index-v1 / 1.0.0

## 目的

按任务ID找到命令回执、机器产物、反控与交接材料，并回原卡判断这些证据证明了哪个候选、输入和范围。

## 范围

本目录按任务保存原件，不维护另一份完成清单或runtime、E2E、coverage结果表。目录存在、旧accept文字或原件全绿不自动证明当前产品通过。

## 当前状态

current只指导航；当前状态以原卡顶部及明确后继裁决为准。[全量文档治理](../cards/DOCS-FULL-TEMPLATE-1.md)已done，旧“当前治理仍rework”属于早期时点，不能覆盖母卡终态；历史撤信也不因后继完成恢复。

## 入口与责任

| 要查什么 | 下一跳 |
|---|---|
| 按目录名检索全部证据 | [目录检索](index.md)，仅定位时读，不复制执行状态 |
| 已知任务ID的原件 | [任务索引](../cards/index.md) → 原卡的证据/交接链接 → 对应任务目录 |
| 当前责任与后续动作 | [活动看板](../board.md) → 原任务卡 |
| 审计发现与代码治理范围 | [审计入口](../audits/README.md) → 原卡及配对证据 |
| 全量文档治理与历史纠错 | [母卡](../cards/DOCS-FULL-TEMPLATE-1.md)、[治理证据](DOCS-FULL-TEMPLATE-1/README.md) |
| 测试合同、E2E报告及其配对原件 | [测试入口](../../testing/README.md) |
| 007–009 复验期间的测试来源核验 | [运行时测试来源回执](E2E-R4-1-runtime-source-bindings-20261106.md) |
| 普通宝箱提取后的原件与来源 | [定向复跑原件](PAL-SHARED-CHEST-1-20261107.tar.gz)、[运行时来源核验](PAL-SHARED-CHEST-1-source-applicability.md) |
| 四类取物 content23 的来源与原件 | [来源适用性](N6B-ITEM-FLOWS-1-source-applicability.md)、[N6b 任务及三份原生归档](../cards/N6B-ITEM-FLOWS-1.md#证据恢复与复跑) |
| Q2 正常战斗复验 | [前两批原件与分屏](E2E-Q2-1-battle-followup-20261111.tar.gz)、[第三批原件与分屏](E2E-Q2-1-battle-mechanisms-20261111.tar.gz)、[赤毒头像返工](E2E-Q2-1-battle-poison-face-20261111.tar.gz)、[第四批动画与带声分屏](E2E-Q2-1-battle-av-20261112.tar.gz)、[防御复位与自动格挡](E2E-Q2-1-battle-guard-20261112.tar.gz)、[行动队列节拍与原速分屏](E2E-Q2-1-battle-action-cadence-20261112.tar.gz)、[玩家物攻伤亡与续战](E2E-Q2-1-battle-player-casualties-20261112.tar.gz)、[伤亡对白、雷咒、毒伤与全灭](E2E-Q2-1-battle-casualty-presentations-20261113.tar.gz)、[玩家仙术、合击、投掷与状态](E2E-Q2-1-player-battle-actions-20261113.tar.gz)、[爆炸与同批法术层序复验](E2E-Q2-1-spell-layer-recheck-20261113.tar.gz)、[合击降级和回梦收招](E2E-Q2-1-cooperative-fallback-and-spell-recovery-20261113.tar.gz)、[战斗会话来源校准](E2E-Q2-1-battle-session-source-applicability.md) |
| 已归档的时点记录 | [历史归档](../archive/README.md) |

任务Owner记录实际command/cwd、候选和输入身份、起止/exit/signal、完整输出与失败/恢复原件；复用现有原件与唯一review，不为每次核验复制全套日志或新增sidecar。Codex按[文档证据验收协议](../../engineering/guides/document-quality.md)独立裁定，作者自验不代签。

## 证据与下一步

新增或移动证据须说明生产者、caller、来源SHA、适用时点、保留理由和退出条件，并写回原卡与消费者。清理前核独有信息、字节pin、后继和历史引用；过时不直接等于可删，有引用也不等于永久必要。

旧完整列表、批次描述和原文按需从[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/README.md)恢复；原证据文件仍按任务保留，本次不重审或重写历史执行。上级：[任务与长期工作](../README.md)。

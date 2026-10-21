# 文档结构整理证据

Status: current（仅指导航）
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-21
Template: governance-index-v1 / 1.0.0

本页是 DOC-IA-2（全仓文档 IA 整理）时点证据目录的当前导航：relocation.json（搬迁前哈希、逐文件去向、目录映射）为本次执行输入的历史快照，不应根据当前树重写；另有补充移动记录（additional-attachments.json）与最终保真清理回执（preservation-report.json）。

## 目的

- 提供 DOC-IA-2 执行输入与保真回执入口；快照登记的是整理时点状态。

## 范围

- 当前包含：relocation.json、additional-attachments.json（执行过程附件移动计划；四张早期截图随后按用户意见退出工作树）、preservation-report.json（保留文件与可从 Git 恢复旧截图的区分）。
- 明确不包含：按当前树重写快照；截图字节的可恢复性以 Git 与回执为准。

| 文件 | 已核职责与使用边界 |
|---|---|
| relocation.json | 419条历史路径/角色/源SHA与9组目录映射；8种kind不是搬迁动作枚举，不能据此重新执行迁移。当前from直接对上旧baseline的398条；19条须沿6a653f97d之前的工具路径回查；另2条仍有来源缺口。 |
| additional-attachments.json | 两张对话截图的中间搬迁计划；后续preservation-report已将两图列入退役，当前旧路径与计划目标均不存在，不表示需要恢复截图。 |
| preservation-report.json | 当时419计划、261保留/重定位、134任务、89历史、9媒体、24消费者及9图退役的回执。计数分轴、不相加；9个recoveryRef的Git字节与原SHA已核实，旧failures=[]不代表今天重跑。 |

## 当前状态

- `status`: current（导航索引）；登记内容为整理时点快照。
- `lastReviewed`: 2026-10-21

## 入口与责任

- 登记文件：[relocation.json](relocation.json)、[additional-attachments.json](additional-attachments.json)、[preservation-report.json](preservation-report.json)。
- canonical 入口：本页与上述三个登记文件；上级为[时点证据](../README.md)。
- Owner：Codex（文档治理）；整理执行归 DOC-IA-2 原任务。
- 下游使用者：文档整理追溯。

## 证据与下一步

- 关键来源：目录原卡（源身份与逆回规则见下方程序生成的保全节，不在正文手写哈希）。
- 未决/阻塞：relocation的原看板条目SHA与声明baseline不同；DOC-IA-2自身任务条目在该baseline不存在。四个原/归档路径全部可达历史的1244个不同blob仍未命中两项声明SHA，未提交捕获仅是可能解释；不据此断言全仓/不可达对象无此blob。两项保持unverified，不刷新旧SHA。
- 下一步：[原生格式S23](../../../../phase-governance/templates/registry-proposal-20261011.md#2026-10-21-s23历史文档迁移与清理回执原生合同草案)已冻结三篇pilot，model/progress为当前治理消费者，不执行搬迁。三个JSON仅新增_governance五项说明与历史限制，剥离后所有原生字段和值与固定33cc对象相同；不复制来源，三件needs-migration保持，待证据验收。

## 原文保全

固定源 revision `1cfb47719fd36122d73b3d1ac7642cec192ccc15`，source SHA `7c5c025d86c795c0e6f9f69b51e5c6f0cd00e1b7895791f1cba2eb5234e9f1a5`；下方 quote 逆回读规则：直接逆回多 1B；精确排除 end 标记前恰一个未引用分隔 LF 后与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 文档结构整理证据
>
> relocation.json 登记搬迁前哈希、逐文件去向和目录映射；它是本次执行输入的历史快照，不应根据当前树重写。
>
> 上级：[时点证据](../README.md)。
>
> ## 文档与附件
>
> - [补充移动记录](additional-attachments.json) — 执行过程的附件移动计划；四张早期截图随后按用户意见退出工作树。
> - [最终保真与清理回执](preservation-report.json) — 区分保留文件与可从 Git 恢复的旧截图。
>
> - [relocation.json](relocation.json)

<!-- original-source-quote:end -->

# 架构回归实验历次复核合并索引

## 目的与边界

`architecture-regression-lab-codex-review.md`、`r2`–`r10` 是同一 GLM 实验包的逐轮独立复核，不是九个独立
产品合同。它们保留原始候选 SHA、counter、反例和审查时点；本页只合并导航与不变结论，不改写旧正文或旧 hash。
当前正式接收范围以 `architecture-regression-lab-completion.md` 及任务卡历史收口为准。

## 迁移 / 合并裁决

| 原始材料 | 当前处理 | 理由 |
|---|---|---|
| 首轮、r2–r6 | `archive-history`，由本页汇总导航 | 结论均为 counter/窄证据，逐轮账本有历史价值；复制为 canonical 会制造平行真相。 |
| r7–r9 | `archive-history`，保留各自反控边界 | 局部 G02/G04/G05/G06/G08 逐轮收窄，不能合并成“整包通过”。 |
| r10 + r10 evidence | `archive-history`，由最终接收材料 supersede 导航 | G01-07 与 V01 是可保留窄事实，V02–V04 仍未闭；完整实验包不因单轴通过而变 verified。 |
| `architecture-regression-lab-completion.md` | 仍为 legacy 平面材料，待独立 canonical 化 | 它是准备包收口，不属于当前 catalog 的 E2E contract/report；本批不盲搬。 |

## 不变事实与证据锚点

- r2–r6 的共同 counter：只读 verifier/全绿数量不能证明真实 caller、业务 oracle、合法输入或完整调用链；
  直接反例见各原始报告的逐组表。
- r7–r9 的共同收窄：只有存在实际业务结果、可解释输入和独立反控的窄合同可保留；不能为保住组数留下
  tautology、私有状态或 `as unknown as` 夹具。
- r10 的独立事实：G01-07 的取消平移反控与 V01 人物名称操作可留作窄证据，但 V02/V03/V04 的完整工作区、
  读取恢复与媒体矩阵仍未完成；不得把截图/启动单针写成整包 accept。
- 原始材料的 provenance（GLM 候选、Codex 复核）只出现在正文/分类账，不出现在 canonical 目录或文件名。

## supersedes 关系

本页 supersedes 的是“把每轮复核当成独立当前报告”的导航方式，不 supersede 原始历史结论。任何新的实验 revision
必须新建独立任务卡并在这里追加一行；不得修改历史报告正文来追溯抹平 counter。

## 删除与保留

本批没有物理删除原始材料：它们仍被任务卡与审计正文引用，删除会丢失可追溯 SHA。确认无引用且已有完整 canonical/evidence
配对后，后续批次才可按 `scripts/docs/relocate.mjs` 迁移或删除，并把原文件 SHA 写入迁移记录。

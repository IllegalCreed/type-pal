# 架构回归实验历次复核合并索引

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: governance-index-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 目的

把首轮与r2–r10共十份独立复核按时序导航，避免把同一GLM实验包拆成多个当前产品合同。原句“不是九个独立产品合同”完整保留在历史quote；新增层按实际十份报告说明集合，不据此新增执行次数。

## 范围

导航十份复核、一个r10机器原对象及completion。原迁移所说12份架构原文不含目录README，另8份runtime材料属于当时20份迁移；不是本包多接了8份或补证当前runtime。

该篇一手文档为本页完整保留的37行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 5c1bfdf833c7ee0faf17a8fba2406b3edb8226c1。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 当前状态

本页只维护历史材料的入口与解释边界。原无独立Owner/发布日期，不造新历史身份。r1–r8 counter、r9窄accept、r10整批counter与后来completion收口分时点阅读；r10当时V02–V04未完成不代表后继补验不存在。

## 入口与责任

原review入口集中于[历史原文目录](architecture-regression-lab/README.md)；最终准备包事实指向[最终接收回执](architecture-regression-lab/architecture-regression-lab-completion.md)，任务状态/授权以[原任务卡](../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)与现行工作流分别承担。本页不再复制一张当前逐组结论表。

## 证据与下一步

本页supersedes的是逐轮材料各自充当“当前报告”的导航方式，不抹除原结论。原迁移身份见[迁移清单](migrations/testing-domains-20261004.json)；工具/mutants仍在legacy不等于获本轮执行授权。后续新实验另卡，13MD候选与JSON待I0分别交接。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 目的与边界

原文第3行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 迁移 / 合并裁决

原文第9行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 不变事实与证据锚点

原文第18行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### supersedes 关系

原文第28行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 删除与保留

原文第33行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

原文无独立发布日期（不可由本轮2026-10-16治理日期倒填）；跨轮次历史导航，当前状态仅表示文档作用。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # 架构回归实验历次复核合并索引
>
> ## 目的与边界
>
> `architecture-regression-lab/architecture-regression-lab-codex-review.md`、`r2`–`r10` 是同一 GLM 实验包的逐轮独立复核，不是九个独立
> 产品合同。它们保留原始候选 SHA、counter、反例和审查时点；本页只合并导航与不变结论，不改写旧正文或旧 hash。
> 当前正式接收范围以 `architecture-regression-lab-completion.md` 及任务卡历史收口为准。
>
> ## 迁移 / 合并裁决
>
> | 原始材料 | 当前处理 | 理由 |
> |---|---|---|
> | 首轮、r2–r6 | `archive-history`，由本页汇总导航 | 结论均为 counter/窄证据，逐轮账本有历史价值；复制为 canonical 会制造平行真相。 |
> | r7–r9 | `archive-history`，保留各自反控边界 | 局部 G02/G04/G05/G06/G08 逐轮收窄，不能合并成“整包通过”。 |
> | r10 + r10 evidence | `archive-history`，由最终接收材料 supersede 导航 | G01-07 与 V01 是可保留窄事实，V02–V04 仍未闭；完整实验包不因单轴通过而变 verified。 |
> | `architecture-regression-lab-completion.md` | 已迁入 `archive/architecture-regression-lab/`，由本页导航 | 它是准备包收口，不属于当前 catalog 的 E2E contract/report；保留原文但不作为当前合同。 |
>
> ## 不变事实与证据锚点
>
> - r2–r6 的共同 counter：只读 verifier/全绿数量不能证明真实 caller、业务 oracle、合法输入或完整调用链；
>   直接反例见各原始报告的逐组表。
> - r7–r9 的共同收窄：只有存在实际业务结果、可解释输入和独立反控的窄合同可保留；不能为保住组数留下
>   tautology、私有状态或 `as unknown as` 夹具。
> - r10 的独立事实：G01-07 的取消平移反控与 V01 人物名称操作可留作窄证据，但 V02/V03/V04 的完整工作区、
>   读取恢复与媒体矩阵仍未完成；不得把截图/启动单针写成整包 accept。
> - 原始材料的 provenance（GLM 候选、Codex 复核）只出现在正文/分类账，不出现在 canonical 目录或文件名。
>
> ## supersedes 关系
>
> 本页 supersedes 的是“把每轮复核当成独立当前报告”的导航方式，不 supersede 原始历史结论。任何新的实验 revision
> 必须新建独立任务卡并在这里追加一行；不得修改历史报告正文来追溯抹平 counter。
>
> ## 删除与保留
>
> 本批已物理迁移 20 个代表性 report/evidence：12 个架构实验原文进入 `archive/architecture-regression-lab/`，
> 8 个 runtime owner report/evidence 进入 `domains/runtime/`，源 SHA 和目标写入迁移计划；legacy manifest 的 `retired`
> 块和分类账保留来源审计。对应 mutants/parity/tool 文件仍留 legacy，直到相对导入、公开 caller 和独立 canonical 工具包另批核验。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 5c1bfdf833c7ee0faf17a8fba2406b3edb8226c1 / SHA256 1a0f24b670ebbea235f3e54a01f618560134c2eb843259922ba800bbba952d26。原目录/索引无独立Owner或发布日期；来源身份由固定源与迁移清单承担。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

该导航不生产新的执行证据；逐篇review/evidence及最终回执才分别承担原观察，迁移清单只保当时来源SHA。

## 当前有效性

同包十轮审查的合并导航，不supersede原counter；最终历史范围只路由completion/任务卡，不制造平行真相。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab/architecture-regression-lab-completion.md)承接后续时点；[历史原文目录](architecture-regression-lab/README.md)与本合并索引只负责导航。历史授权/最终范围回到[原任务卡](../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../ops/agent-workflow.md)另核准入；无本次产品执行授权。

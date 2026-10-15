# type-pal 文档模型

Status: current
Last reviewed: 2026-10-15
Owner: Codex
Template: guide-runbook-v1 / 1.0.0

## AI Quick Path

本文回答：先读什么、信哪份、结果写回哪里。先按[操作路由](../../../AGENTS.md#操作与必读)选择规则，再从[任务索引](../tasks/index.md)进入当前任务。本文落实用户的 [Agent-first 指南](https://github.com/IllegalCreed/agent-doc-architecture/tree/169fc3d04f86ededf567e2b9d0417497ed7ef775)，适配差异见下文。

## 目的

让 Agent 按任务读取最少的必要上下文，并能区分现行合同、候选设计、历史结论和执行证据。整理文档的结果须落回原有权威来源，而不是继续增加一套平行状态表。

## 前置条件

- 先读根 `AGENTS.md` 的现行协议；历史三贤人章节不恢复固定三签。
- 任务跨阶段时逐项标注阶段，不能把第一阶段保真方针当成第二阶段架构合同。
- 修改前核工作树、任务卡和 source SHA；未知内容保持 unread/blocked，不以脚本提取标题代替全文阅读。
- 本项目接入现有 docs，保留稳定任务 ID、目录和机器 consumer；不为套用外部目录方案整体搬迁。

### 阅读分层与事实权

| 层 | 读什么 | 权威边界 |
|---|---|---|
| L0 | 根 AGENTS 的操作路由与硬约定 | 选择现行规则，不承载全部项目知识 |
| L1 | 本文、测试治理、阶段 READ-FIRST、协作流程 | 说明该类工作怎么做；不承诺某次执行已通过 |
| L2 | 活动任务卡、阶段规范、lore canon、测试 catalog | 任务状态取卡顶部；测试状态取 catalog；阶段与作者决策各有适用范围 |
| L3 | 报告、review record、机器回执、raw、截图、日志 | 只证明指定候选/时间/输入的观察，不自动成为当前规范 |

`docs/README.md` 负责按职责导航；README 和生成索引不复制业务结论。`docs/ops/tasks/index.md` 是任务顶部状态的确定性投影；看板是活动任务的执行分工。`docs/testing/catalog.json` 保留测试记录的索引事实权，`testing-meta`、报告和 evidence 保留配对合同。`document-registry.json` 只管理文档类型与审查覆盖，不能改写这两类状态源。

## 步骤

### 1. 选择位置和模板

| 要写的内容 | 写到哪里 | 模板/规则 |
|---|---|---|
| 非小改的目标、设计、实施、交接 | 当前任务卡原路径 | [完整/轻量任务卡](../templates/README.md)，同一 task-card 类型 |
| 可重复执行的工程操作 | ops/guides | guide-runbook |
| 持续生效的 Reforge 合同 | phase2/specs | design-spec，保留阶段真值边界 |
| 世界观来源、设定或创意 | lore 现有职责目录 | reference-canon / narrative-idea，候选不得升格 canon |
| 测试合同、域报告、E2E、机器 evidence | testing 的 canonical 路径 | [统一模板注册表](../../phase-governance/templates/README.md)与[测试治理](../../testing/governance.md) |
| 某次执行的审计、日志、截图、raw | 对应任务证据或测试 domain | evidence-receipt / audit-report，关联产生者与 caller |
| 历史结论及迁出材料 | 既有历史路径或显式迁移映射 | archive-record wrapper；保留原日期、结论、SHA、supersedes |

只创建有实际内容与消费者的文档。新文档从注册模板开始；旧文档必须先读正文再绑定类型，不能按 `ideas/`、`tasks/`、`README` 等路径直接判定语义。模板本身是合同，不是执行证据。

### 2. 稳定身份与状态

保留本项目的任务 ID、`e2e-NNN` 等既有身份，不引入外部 `D-YYYYMMDD-NNN` 平行编号。新 ID 先检索任务索引、Git 引用和活动 worktree，确认无冲突后登记。

任务沿用 `draft → build → review → done` 和 `blocked/rework/cancelled`；准入按 AGENTS 现行协议。测试沿用 catalog 的状态词与依赖规则。文档有效性另用 current/draft/historical/superseded，不把这些词机械互换。

路径变化必须有源 SHA、目标映射、链接重算和 consumer 验证。完成状态本身不作为批量搬目录的理由；已归档路径保留，不为统一结构迁回。确有迁移需要时按[文档维护](documentation.md)的显式映射流程执行。

### 3. 同提交写回

| 事件 | 必须写回 | 复核者/停止线 |
|---|---|---|
| 开始或接手非小改 | 任务卡目标、范围、准入、Owner；生成任务索引；活动看板 | Codex；无锚点不 build |
| 实施或范围变化 | 原卡实施事实、偏差、剩余项；受影响现行规范 | Codex；产品取舍交用户，不重写历史需求 |
| 测试状态或证据变化 | canonical report、配对 evidence、catalog；重新生成测试视图 | Codex；不得以绿数或覆盖率独立 accept |
| 替代现行规则 | 旧来源的 superseded-by、新来源的 supersedes、所有当前入口 | Codex；未知替代链不能作当前入口 |
| 改文档正文或导航 | 对应 review record 的本次差异、source/after SHA、限制与下一步 | 读实际差异后记录；禁止无差别刷新 hash 冒充复核 |
| E2E 确认剧情/编辑器起点 | lore 对应段、检查点目录、阶段报告、任务卡 | 按真实执行/源码核读/用户判断分开记录 |
| 发布或封板 | 当前概览/路线入口、发布回执、实际测试与部署证据 | 发布仍按原授权；静态文档门不能代替实跑 |

### 4. 机器证据与附件

JSON 保持机器字段和公开 consumer 读取路径；不能把原对象统一移到 `payload` 下就宣布兼容。envelope 优先作为不覆盖业务字段的元数据；原对象不能扩展时使用配对 sidecar，并验证真正 consumer。HTML 保留交互/脚本/资源引用，在可见说明与元数据层记录治理范围，不能转为 Markdown 摘要。

每个附件记录路径/SHA、产生者、Owner、caller、关联任务/报告、时间/版本范围、保留原因和退出条件。无法确认的归属标 pending，不根据文件名猜测。immutable raw 不因当前判定变化而改写，新判断另存并链接旧记录。

治理记录自身不自嵌自己的内容 hash；通过 Git blob/提交和独立回执定位。正文的 after SHA 放在 review record 中，review/control JSON 的机器字段适用其自身 schema，不能造成无限递归的“给 review 再造 review”。

### 5. 全量迁移与 pilot

用户批准的 1838 份是固定必审 cohort；新增/删除/路径变更单列增量，不静默改变分母。自动枚举、结构分类与旧 ledger 继承都是排期信息。只有读过正文并写出可反证的结论，才能转 content-reviewed。

pilot 必须在真实模板章节中表达该文档的具体语义，并检查入链、出链、状态/历史、机器字段和实际 consumer。只把原文拼进 wrapper、比较 substring、JSON deep-equal，均不足以验收模板。每类至少一篇通过前，同类批量迁移不得开始。

全量完成须清除未经批准的 governed-legacy，正文符合模板且逐篇 review 完整；无孤儿、断链、未解释冲突或 SHA 漂移。静态通过不能转换为 runtime/E2E/视觉/coverage 通过。

## 失败处理

- 证据与规范冲突时，先检查来源、阶段、版本与 scope；保留最强替代解释，停止受影响批次。
- SHA 漂移先读 delta，保留旧 after SHA 进入历史；不运行全仓无条件 hash refresh 来消诊断。
- 模板、状态或 consumer 合同不适配时登记具体 counter/rework；原证据保持可回读。
- 共享树发生其他 Owner 的修改时保护原文件，先同步候选分支再复核；不 reset、stash 或覆盖。

### 指南适配与暂未采用

| 指南建议 | 本项目落地 | 原因 |
|---|---|---|
| L0–L3、操作路由、写回闭环 | 本文与 AGENTS 操作表 | 减少默认全文扫描与平行真相 |
| 完成后路径稳定 | 新增迁移不因 done 自动移动；已有归档保持原位 | 链接和证据身份稳定 |
| 统一 plan/case 编号与目录 | 沿用任务卡、testing catalog 与现有生成视图 | 避免重新编号和第二份事实源 |
| baseline 中已知问题降为 WARN | 不采用诊断豁免；缺口作为迁移进度，不可伪装静态通过 | 用户要求 error/warning/info 全零 |
| 过期测试永不删除 | 按 AGENTS 测试质量裁决保留/合并/精简；历史由 Git 保存 | 已批准的排重与判别力规则优先 |
| 直接复制整套 Python linter | 在现有 Node docs 工具上补路由与模板检查 | 复用现有 parser、48 项回归与 CI |
| 发布后自动刷新日期 | 仅真实核读后更新 Last reviewed | 避免只改日期而不核内容 |

## 完成定义

本轮规则接入至少通过：路由目标存在；新迁移正文的必填章节有内容；任务/测试索引与源一致；历史 pilot 的不足已记 counter。全量任务继续由 [DOCS-FULL-TEMPLATE-1](../tasks/DOCS-FULL-TEMPLATE-1.md)记录，不能用接入完成代替 1838 份正文完成。

提交前运行 `pnpm check:docs`、`pnpm lint`、`git diff --check`；所有 error/warning/info 必须为零。发布另核对应产品与部署回执，不新增“文档全绿即批准发布”的捷径。

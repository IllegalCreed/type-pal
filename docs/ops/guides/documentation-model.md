# type-pal 文档模型

Status: current
Last reviewed: 2026-10-18
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

### 文档交付与证据验收协议

协议：`document-delivery-acceptance / 1.0.0`。这是全项目长期规范，适用于各阶段的新建、修订、模板迁移、归档与清理，以及 Markdown、JSON、HTML 和关联附件；不随某张任务卡或全量治理专项结束而失效。模板注册表定义格式，本文定义交付与验收；任务卡只记录范围、协议版本、Owner、候选、风险、例外及裁定，不维护第二套条款。

#### 责任与内容质量

贡献者承担获准范围内的逐篇全文核读、来源核实、具体语义判断、正文治理和自验。每篇须能解释目的、事实权与适用阶段/版本、状态与历史、关键结论、依赖/入口、合法输入与业务oracle、重复/冲突、counter/停止线和下一步；不适用项说明具体原因。保留既有机器字段、原始结论和日期，不以路径、标题、行数或通用封套代替内容审查。

Codex负责范围和合同设计、疑难归因、基于证据的独立接收/返工及中央集成。普通文档可据完整、一致的贡献者证据裁定，不要求再次全文阅读或重做自验。独立是核验和裁定责任独立；作者不能自行关闭，Codex也不能仅凭passed字段、哈希或包绿接受。记录如实区分“贡献者全文审阅”“Codex证据核验”“Codex定向抽核”，未读和未跑不冒称已完成。

#### 一份交付，按需展开

复用当前任务或评审入口。小改紧凑记录，批量工作提供可读摘要与机器索引；下列文件名是建议，不强制改写已有合法schema，也不要求每项复制一份源码、日志或新脚本。

| 层 | 贡献者交付 | Codex默认核验 |
|---|---|---|
| 短回执 | 实际base/candidate完整Git身份、白名单与真实增改删/移动、完成/blocked项、风险、请求裁定和快检入口 | 全读短回执，核授权、真实差异与剩余项 |
| 逐篇索引 | 稳定path/claim ID、具体结论与原文/primary锚点、实际全文读域、事实/推断/未知、docType/templateId/templateVersion、状态/阶段/历史、before→after、counter与限制 | 查缺项、矛盾及claim→证据映射；看关键结论与相关变更切片，不默认通读全部正文/依赖 |
| 身份与保全清单 | 每篇before/source/after SHA与原源revision/blob、候选提交、附件SHA/字节、精确quote/codec规则；链接/引用/supersedes、移动与删除去向，机器字段前后边界 | 核真实Git集合和指纹、精确保全、映射及消费者匹配；指纹只证明身份，不证明阅读或语义质量 |
| 执行原件 | 实际command/cwd/时间/exit/signal/spawn、工具版本和输入身份、完整raw/native、error/warning/info、失败/恢复与未跑项 | 读取原始结果及诊断，不信自填verified；匹配同一候选/相关输入的可靠结果直接复用 |
| 复验与失效 | 默认只读快检命令、预期结果、不能自动验证项；哪个正文/来源/caller/依赖/模板/consumer变化会影响哪个claim，必要定向命令 | 先快检，输出匹配/失败/过期/无法自动验证；只展开失效或有疑点部分，缺证据不算通过 |

base与候选头、原源revision和after blob分别记录；未提交树如实标注并固定输入，不能把迁移前sourceRevision写成已接受的候选头。原件按时点保存，纠正另附，不手改旧执行数字；不自嵌内容hash、不循环认证，也不对review无限生成review。

#### 默认验收路径与升级条件

1. 确认候选与白名单，核完整diff、附件身份、逐篇映射、原始诊断及实际consumer/模板合同。可组合现有工具；规则稳定后复用，不每批重新设计检查器，也不宣称已有一个能认证全部语义的通用脚本。
2. 阅读摘要、逐篇具体结论和相关差异。普通修订或已校准的同类迁移，证据完整一致且风险已覆盖即可逐篇作出接收裁定，不强制第二轮只读试审、固定抽核比例或Codex重复全文。
3. 新模板/原生格式合同、机器字段/consumer/schema改变、来源或跨阶段真值冲突、历史升格、路径/引用遗漏、证据矛盾/过期或重要未知，才升级受影响claim。展开前记录触发原因、核读/执行范围及停止条件；新增产品取舍或不可逆操作仍交用户裁决。
4. 先精准退回缺证据或失败项。证据造假或系统性不可靠才扩大相关复核、撤回对应信用；已支撑的无关成果保留，不默认把作者工作全部自己重做。
5. 记录accept/rework/review的具体文件/claim、依赖的作者原件、Codex实际核过的差异/命令/抽核、未核/未跑与剩余风险。正文语义、模板符合、中央接入和全量完成分别判断，不能互相代替。

#### 验证安排与滚动交接

贡献者运行获准目标的模板、保全、入出链/引用、索引、机器字段/真实consumer及必要lint/diff检查，完整保留结果。中央接入由单一Owner维护registry/review/routing/matrix与format后SHA；不是贡献者可顺手改写的共享域。

相同候选和相关输入已有可靠结果时复用；流程文字或附件整理变化不自动重跑未变的产品测试或整套文档工具测试。consumer/工具实现变更、真实失败、新风险或中央组合改变相关输入时，按影响补验。全仓门在稳定接入/封板窗口集中执行一次，不默认作者和Codex双跑；合并或全量完成前仍须实际满足所有必要门，error/warning/info为零，不新增ignore、排除或降低规则，未通过保持未完成。局部文档检查不授runtime/E2E/视觉/coverage信用。

每次接收或返工，Codex主动提供下一份可直接转发的提示词，引用本协议及版本，只列本批范围、Owner、分支/base、差异、证据入口、动作和停止线。已获准白名单内直接实施，不逐篇/逐批重复问用户许可；用户手动转发或既定执行入口不改变事实核验和裁定责任。

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

全量交付另运行 `node scripts/docs/report-governance-progress.mjs --require-complete`；它要求全部 1838 基线、当前新增候选和模板 pilot 都已闭合，局部 registry 绿色不算完成。

集成/封板前按上述协议确认 `pnpm check:docs`、`pnpm lint`、`git diff --check` 的有效结果；同候选及相关输入的可靠结果可复用，所有 error/warning/info 必须为零。隔离候选的未通过项保持 review/rework，不能冒称统一门或全量完成。发布另核对应产品与部署回执。

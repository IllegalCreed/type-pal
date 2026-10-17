# 测试文档治理与淘汰机制

Status: current
Owner: Codex（测试文档合同维护；测试作者与审查者分别署名）
Last reviewed: 2026-10-18
Template: guide-runbook-v1 / 1.0.0

## 目的

让维护者从一个稳定测试身份找到当前合同、报告、机器证据与原始输入，并按真实来源决定保留、返工或退役。本文定义文档发布流程；测试的业务质量按[协作流程的测试质量验收](../ops/agent-workflow.md#测试质量验收用户-2026-10-03-固化)独立核定，不能用模板、测试数或覆盖率代替。

## 前置条件

- 读[AGENTS操作路由](../../AGENTS.md#操作与必读)、当前任务卡、[文档模型](../ops/guides/documentation-model.md)及对应domain/report/contract/evidence。核真实caller、合法输入、business oracle、排重、source revision、content/save版本、状态与reviewBy；未知明确写缺失，不补造SHA或实跑。
- [catalog.json](catalog.json)是测试索引与发布状态事实源；目录名、作者名和标题不推断状态。任务状态归任务卡；某次执行的exit、失败、skip、诊断和raw归原回执；全docs迁移覆盖归document-registry，三者不互相代授信用。
- 先从[统一模板注册表](../phase-governance/templates/README.md)和[测试模板](./_templates/README.md)按实际内容选类型。导航用governance-index，catalog用JSON合同，runbook不是E2E报告；历史原生JSON按已批准变体核真实consumer，不能强套schema2或把业务对象搬进payload。
- 同一文件只有一位Coding Owner；作者自验和非作者验收分别记录。旧accept、旧counter和历史三签不自动构成今天准入。当前全量纠错与重审未结束，本文不宣称全testing已通过。

## 步骤

### 1. 固定唯一身份与位置

正式测试记录使用稳定`e2e-NNN`、`coverage-YYYYMMDD-slug`或既有任务ID，返工不换ID。目录按工程域、模块与功能命名，阶段使用`NNN-lower-kebab-case`（如`002-inn-guests-and-reward`）；`e56`/`s003`仅作sourceRefs、caller或正文锚点。canonical/index/evidence路径不用Agent名；原始历史路径和owner/provenance中的作者身份保留，不借命名规则静默删除证据。

| 位置 | 唯一职责 |
|---|---|
| `README.md`、`indexes/` | 人类总入口与由catalog生成的阶段/状态/标签/Owner及域/模块/phase/engine等投影 |
| `catalog.json` | 稳定记录、发布状态、依赖、来源与canonical/index/evidence路径 |
| `e2e/contract.md`、`route-proposal.md` | 共同合同与尚待批准的路线方案，proposal不授执行准入 |
| `e2e/stages/NNN-slug/README.md`、`report.md` | 稳定阶段入口与正式报告；不建report-r1/r2平行真相 |
| `e2e/cross-stage/`、`domains/<domain>/` | 共性问题族或工程域的合同/报告/evidence |
| `_templates/` | 模板示例，不能当执行报告 |
| 对应domain的`tools/`或任务专属证据目录 | judge/run等工具，与报告分开 |
| `archive/`、明确的history | 旧结论、迁移与退役材料；不能继续充当当前canonical或有效前驱 |
| `legacy-flat.json`及`legacy-flat-classification.json` | 冻结存量平面文件的active/retired身份、分类和去向，不准通过追加清单扩容 |

### 2. 配对catalog、正文与机器证据

每项catalog记录保留`id/kind/title/status/phase/engines/owner/provenance/domain/module/canonical/index/evidence/tags/lastVerified/reviewBy/dependsOn`以及`sourceRefs/publicCallers/legalInputs/businessOracle/dedupe/revision`。报告中的checkpoint、候选SHA及原始运行结果由配对报告/evidence持有，catalog不复制一整份运行日志。

当前catalog的schema2 canonical contract/report须同时有顶部front matter的`testingSchema: 2`、同一`id`与`evidence`路径，以及`<!-- testing-meta ... -->` JSON的`schemaVersion: 2`。metadata的来源、caller、输入、oracle、排重和revision必须与catalog相等；revision提供完整Git SHA（或合同允许的明确缺失声明）、content/save版本及历史。不能只有一个形状正确的注释而漏front matter。

配对evidence保持schema2/id、catalog发布status、候选SHA、content/save版本与history一致；sourceRefs的文件、数值行范围、范围内anchor和当前全文件SHA要可核。`source-backed`只能引用声明过的来源；`runtime-backed`还需`kind: runtime-execution`、`runtimeExecution.performed: true`及真实存在、SHA吻合的artifact。字段齐全与日志匹配仍不单独证明业务验收。已批准的历史原生格式保持原顶层字段、原诊断和原执行范围，不伪造catalog身份或本轮执行。

### 3. 分开发布状态、执行结果和审查状态

常见发布推进为`draft → active → verified | rework → superseded → archived`；当前consumer还接受`proposal`与`current`。依赖只可指向同catalog的`current`/`verified`，不得有未知ID或环。`current`/`verified`表示发布状态，不能让一次未跑命令变成成功。

每条catalog记录都保留合法`lastVerified`和`reviewBy`；当前checker会拒绝**所有未archived/superseded记录**的过期reviewBy，不能只为current/verified/rework三种状态查日期。脚本默认以UTC当日判过期。真正读完适用内容与配对证据后才决定续期；只改日期或排版不构成复核，Last verified不冒充新执行日期。

变更状态时同提交更新catalog与其发布投影（E2E阶段README的status/lastVerified/reviewBy），同步配对evidence的发布status与必要metadata；历史报告保留当时结论，追加勘误、revision和supersedes，不倒改旧stdout/hash。immutable执行原件不能承载可变发布字段时，按已批准合同用sidecar分离，先验证consumer，不能为了状态一致覆写原始执行。

### 4. 核业务质量后决定保留或精简

逐合同核公开typed caller、合法输入、可观察oracle、隔离、真实生命周期与既有用例排重。业务核心不以`as unknown as`/`as never`、核心mock、放宽timeout或ignore造输入与绿灯；坏输入只用于明确的IO/未知域。已证重复、恒真、无业务执行或非法业务输入的候选，按证据保留/合并/补强/撤信或删除；未知候选保持待核，不因“慢、老、全绿”单独淘汰或接受。

有效反控按协作流程保留执行身份、command/cwd、JSON/raw、exit/signal/spawn、file×fullName集合、恰一指定业务AssertionError、恢复绿、源/测试/mutant hash及精确清理。普通Error、收集失败、skip/todo/pending或重复红不算有效针。若精简涉及旧测试或官方基准，须另有该任务授权并真实重测；本文和文档治理卡不授权修改产品、旧测试或coverage。

### 5. 有映射地迁移、归档和退役

先读原文与真实consumer，决定唯一目标和保留理由；位置移动不是正文模板迁移的前提，也不因done自动搬目录。确需移动时，迁移计划列完整from→to、源SHA、链接/引用重算和consumer验证；按[文档维护流程](../ops/guides/documentation.md)审查后才用`scripts/docs/relocate.mjs`，不要无计划批量重命名。

移动后以同一计划运行`scripts/docs/finalize-testing-migration.mjs`核Markdown引用与legacy manifest收退，再核分类账：active entries去掉已迁项，retired和分类账保存旧路径、目标、原SHA与计划，原frozen census身份不扩容。迁移器只做机械改链/登记，不证明原文语义或完成质量。重复/低信息材料可用archive及supersedes提供后继；未独立核验保持retain-legacy/rework。删除前核catalog、卡、脚本、README和其他引用，无明确退出与替代映射不静默删raw或孤立材料。

### 6. 同提交验证与留存

1. 更新唯一canonical/report、配对evidence、catalog、任务和相关引用；用`node scripts/docs/generate-testing-index.mjs`重建stage/status/tag/owner/domain/module/phase/engine及legacy-domain九个视图，生成器不授reviewed。
2. 运行`pnpm check:testing-docs`、`pnpm check:docs`、`pnpm lint`、`git diff --check`；保留实际命令、cwd、候选/输入、时间、exit与全部诊断，任何error/warning/info均不算通过。暂存后另核`git diff --cached --check`，冻结候选核`git diff --check <受审基点>..HEAD`，不能用空的未暂存diff替代完整交付检查。当前全量门失败就如实保留失败。
3. 持久证据明确产生者、Owner、caller、任务、时间/版本、SHA、保留理由与退出条件。新临时截图/trace可留`artifacts/`并由回执定位；既有已承载验收的Git/raw不因“临时”标签删除或改写。只保留/tmp路径而未保全的旧输出不能继续授信。
4. 非作者从实际正文、source/after、consumer和反例独立复核；作者自验、静态绿或历史报告的independent字段不代签。完成状态仅按任务硬验收条件变更。

## 失败处理

- 缺canonical/index/evidence、metadata或配对值不等、sourceRef越界/anchor/SHA错、孤儿阶段/受管domain、依赖不合格、过期、Agent名污染发布路径或冻结legacy身份变化：保留失败输出，定位唯一源并修正；不追加ignore、降规则或假状态。
- 模板/原生格式/consumer不适配：记录具体counter，保持draft/rework/blocked；先冻结变体设计再pilot，不能自行放宽artifactOnly完成条件。
- 证据冲突或原raw缺失：区分缺证和已证错误，保留最强替代解释；撤回相应信用，另存当前勘误，不补造历史执行。旧回执、quote和counter保持可回读。
- 移动或删除有未解释引用、维护权或语义冲突：停止该项，保留原件和源SHA，由Owner补映射/一手证据；新产品取舍才交用户，不逐批重复请示既有授权。

## 完成定义

本项的唯一身份、真实内容、合法输入与oracle、配对evidence、当前状态/日期/依赖、原始历史和迁移映射一致；实际consumer及必要静态门零诊断，并有明确的非作者结论。全量治理还需固定1838 cohort与增量逐篇闭合，单篇或schema通过不能代替。

本页重审记录与实际来源范围见[S02逐篇记录](../phase-governance/reviews/20261018-semantic-rework.json)。原73行规范及R83机械封套由固定Git/SHA保留；本次重组进真实runbook步骤，未修改测试catalog状态、历史JSON、产品、旧测试或coverage，也不宣布runtime/E2E/视觉通过。

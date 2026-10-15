# ARCH-REGRESSION-LAB-GLM-1 r9 独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核G05-02与G08-05/06是否闭合八轮明确的假阳性，及接收范围是否仍被限制在候选窄合同。

## 范围与证据

本轮37/37、45账43/1/1、五针detected；新wait针朝向断言红、忽略根针ownership断言红，各exit1/目标执行/见证成立；类型/Biome/docs/diff原exit0，六图未重拍。

该篇一手文档为本页完整保留的23行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 06e54607bc3fb86b035e4e1c8fb35f794e315d29。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

G05先冲刷四个宏任务边界、确认流仍在wait再换源并推进1200ms；立即resolve会使朝向错误。G08以四命令-2全局表地址3形成独占global根，ownership从global0/unreachable3变1/2，根被剔除即红。

G08-05标题与回执收窄为预检拒绝后可重试。receipt/README和注释仍有“三针”与旧tick说明，正式接入前须同步，不借此重开已证明业务合同。

## 结论

accept本轮G05-02、G08-05/06三个候选窄合同；不是正式测试接入，也不等十二组/V矩阵完成，原主卡此时仍draft。37/37不计官方覆盖率。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：后继r10与正式转正前改正三针/五针和真实时序文字，继续核G06七递归入口及G08其余options、V操作矩阵。不能把本轮窄accept直接写成全包done。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 范围与执行

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 定点裁决

原文第12行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 非阻断的回执勘误

原文第19行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-26；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 97e21f34。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 r9 独立接收
>
> 2026-09-26；隔离候选 `97e21f34`。结论：**accept 本轮 G05-02、G08-05/06 的候选测试合同**；这不是正式测试接入，也不代表十二组全合同或 V01–V04 矩阵完成。任务保持 `draft`，候选不合 `main`、不计官方覆盖率。GLM 为测试贡献者，以下为 Codex 独立复核。
>
> ## 范围与执行
>
> - `e1857e66..97e21f34` 仅改本卡与 `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/**`；最终工作树干净，`packages/`、`scripts/` 零 diff。
> - 新鲜 `/tmp/codex-glm-r9-candidates.json` 为 37/37；`tools/verify.mjs` PASS，45 条机账为 43 candidate-green / 1 existing-proof / 1 blocked-environment，测试 fullName 双向映射成立。
> - `tools/red-control.mjs` 五针均 detected：新 `g05-immediate-wait` 在候选 G05-02 业务断言红 `expected 'right' to be 'up'`；新 `g08-ignore-roots` 在 G08-06 红 `expected 1 to be 2`。两针各恰 exit1、目标套件实际执行、注入见证命中，均未改产品源文件；旧三针保持 detected。
> - 独立 tsc、目录 Biome（含已提交执行 JSON）、`node scripts/docs/check.mjs`、`git diff --check` 均 exit0。六张未变截图不重拍；V01–V04 未证矩阵分类不变。
>
> ## 定点裁决
>
> - **G05-02 accept。** `g05-playback-scope.test.tsx:63-82` 先零 tick 冲刷四个宏任务边界，再断言旧源仍处于 `facing=up/mode=running`，继而 tick 100ms、换源、固定推进 1200ms。生产 `ScriptRunner.runBody` 在每条命令的 gate/exec 间存在 await；这个冲刷让“停在尚未执行 wait 前”的 r8 假阳性失效。对宿主 `wait` 做单点立即完成变异后，测试在旧源朝向上业务红，证明当前挂起判别有鉴别力。
> - **G08-06 accept。** `g08-conversion-isolation.test.ts:122-159` 使用四命令的 -2 表构造真实图地址空间；独占的全局根地址 3 使 `ownership` 从 `{scene:1,global:0,unreachable:3}` 变为 `{scene:1,global:1,unreachable:2}`。生产 `migrate-content.ts:2305` 把该根交给 `analyzeScriptGraph`；将其从图根剔除时，ownership 断言业务红，不再只是读取 `globalRoots.length` 的回显。
> - **G08-05 收窄 accept。** 标题、机账及本轮回执均明确这是 `worldSpriteFrameCounts` 的转换前预检拒绝及去掉非法选项后可重试，不再宣称转换中段异常隔离。该用例仅按预检层合同接收。
> - G01–G04、G05-04、G06、G07 的 r8 裁决不重开；G06 七入口完整矩阵、G08 其它 options 维度、V01–V04 操作矩阵仍未证。
>
> ## 非阻断的回执勘误
>
> 隔离回执的 r9 摘要和五针表正确，但 `receipt.md` 的启动小样行、G05 行、未证项末行及复算命令仍保留 r8 的“三针”/旧 tick 见证口径；`README.md` 交付登记仍标 r8 三针，`results.json` 的 red-control 命令注释也写三针。实际脚本、执行 JSON、机账测试映射与本轮业务结论一致，故不据此重开测试返工；**正式转正前必须把这些文字/命令注释改为五针与当前 G05 时序，再独立核对最终树**。`G08-05` 注释的“模块态无残留”也宜收窄为“预检拒绝后可重试”。
>
> 无下一位 Agent 提示词；候选转正、统一质量门与覆盖率并集仍由 Codex 另行核准。本轮不合候选、不代签、不标 done；Kimi 本队列豁免。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 06e54607bc3fb86b035e4e1c8fb35f794e315d29 / SHA256 06ba531dd6bc25087e25b525a613d59a76adfc9ee6088d1b54613422074e46ed。源中2026-09-26日期及 97e21f34 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-26候选的审查结论有效：accept本轮G05-02、G08-05/06三个候选窄合同；不是正式测试接入，也不等十二组/V矩阵完成，原主卡此时仍draft。37/37不计官方覆盖率。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r10-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。

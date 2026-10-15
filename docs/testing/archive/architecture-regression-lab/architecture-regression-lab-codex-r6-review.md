# ARCH-REGRESSION-LAB-GLM-1 · Codex 六轮独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核“逐条修了断言”的交付说法是否有真实测试diff，并核新类型门能否执行通过。

## 范围与证据

相对494f9b5d与b403efd3的candidates/fixtures均零diff；新增README/typecheck配置/receipt/results/verify不等测试语义变动。该轮32/32、39账及六图完整hash只按原窄范围保留。

该篇一手文档为本页完整保留的29行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 82ecfd793dcf9329b80140082f9c978244caf4a3。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

G04-04标题现已指到真实测试，但仍只数两行，未提交旧草稿观察零写回；三/五轮业务缺口继续。TypeScript6对tsconfig baseUrl报TS5101、tsc exit2，直接推翻“所有门通过”。

回执旧G04/G08/V04/36项仍在，verify未硬核命令/cwd/exit和候选总数；清走本席反控临时目录是该轮环境处理，不伪称源工具已修清理。

## 结论

counter，不转正式、不计覆盖率、不标done。标题勘误是证据修正，不能替代断言修复；类型门失败不得被32绿覆盖。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：七轮先交真实测试变动与最终树一致的类型/格式结果；无法补全的caller轴明确收窄。原baseUrl失败只作当时事实，不在文档任务修改产品配置来重跑旧门。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 复跑事实与新阻断

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 十二组裁决（相对三轮/五轮没有测试变更）

原文第12行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-25；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 33df93783accee4c6250eb27394758b008e824dd。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 · Codex 六轮独立接收
>
> 2026-09-25；候选 `33df93783accee4c6250eb27394758b008e824dd`。结论：**counter；不转正式测试、不计覆盖率、不标 done**。本轮承认机账 G04-04 标题与 V04 结构化备注的勘误，但用户转述的“逐条修正测试断言并补 entered/业务状态/真实 tick”与提交树不符：`git diff 494f9b5d..33df9378 -- candidates/ fixtures/` **零 diff**，同范围对上轮 `b403efd3` 亦零 diff。三轮[逐组反证](architecture-regression-lab-codex-r3-review.md)及[五轮审查](architecture-regression-lab-codex-r5-review.md)中的业务缺口不会因改账本而消失。
>
> ## 复跑事实与新阻断
>
> - 候选分支/远端 tip 一致、工作树干净；`b403efd3..33df9378` 仅改实验目录内 README、typecheck 配置、receipt、results、verify，产品/scripts 零 diff。
> - 新鲜执行 `/tmp/codex-glm-r6-candidates.json`：9 文件 32/32 绿；`verify.mjs` 对该 JSON 报 39 条、32 passed、PASS；`red-control.mjs` detected（exit1、一项执行/失败、AssertionError、产品 hash 不变）；六张既有截图重新计算完整 SHA 6/6 精确匹配。`node scripts/docs/check.mjs`、实验目录 Biome、diff 检查通过。本席将 red-control 产生的 `.tmp-red-*` 移出工作树至 `/tmp`，未改候选文件。
> - **独立类型门失败**：`pnpm exec tsc --project docs/testing/archive/legacy/batches/glm-architecture-regression-lab/configs/tsconfig.json --noEmit` exit2，`tsconfig.json:15` 的 `baseUrl` 在仓库 TypeScript 6 下报 TS5101（须消除或按本仓政策处理弃用，不靠跳过类型门）。故“所有门通过”不成立。
> - `results.json` 的 G04-04 `fullName` 现指向真实同名测试，消除了五轮的标题重复；但该测试 `g04-script-draft.test.tsx:113-125` 仍只数两行，没有提交旧草稿验证“不写回新对象”。`receipt.md:16,20,37,45,53` 仍写 G04 三项、G08 四项、V04 因已撤回的故障受阻及旧 verify SHA 命令；`results.json:808` 仍写“36 项”。`verify.mjs` 仍把主线合入后的白名单差异降成 INFO，不核命令/cwd/exit及候选执行总数的硬一致性；机械 PASS 仅为当前有限核验器的结果。
>
> ## 十二组裁决（相对三轮/五轮没有测试变更）
>
> | 组 | 本次决定与直接锚点 |
> |---|---|
> | G01 | 窄笔划取消例可留；选区实际状态与平移 view 取消结果仍未证（`g01-map-gesture.test.tsx:257-280`）。完整组 counter。 |
> | G02 | 双地图瓦片保真可留；选区换会话仍查通知/DOM而非新会话业务选区（`g02-map-scope.test.tsx:97-118`）。counter。 |
> | G03 | 挂载/重挂载窄例可留；Cmd+S 只发键后直接验证旧 session 改名抛错，未观察保存 IO（`g03-app-lifecycle.test.tsx:198-213`）。counter。 |
> | G04 | 弹层确认/关闭局部例可留；外部 body 替换后不确认旧草稿，`G04-04` 标题仍超出断言（`g04-script-draft.test.tsx:113-125`）。counter。 |
> | G05 | 单 Playback stop/tick 冻结可留；新源立刻再次 stop，手工解绑不等于工作区 unmount（`g05-playback-scope.test.tsx:58-99`）。counter。 |
> | G06 | enemy→author 的部分叶/错误 path 可留；仍用 `as unknown as`/`as never`，author→enemy 合法 caller 未证（`g06-validation-crosscalls.test.ts:16-17,32,48,81`）。counter。 |
> | G07 | 背包隔离与装备写/getter 可留；地图读写都在 scene-system，装备未进 battle opcode（`g07-core-boundaries.test.ts:19-43`）。counter。 |
> | G08 | 重复转换可留；sound 回调未被见证调用，非法 opcode 只是 gap 不抛（`g08-conversion-isolation.test.ts:49-71`）。counter。 |
> | V01 | 角色名三张截图可留；六类表单键盘/焦点矩阵未证。counter。 |
> | V02 | 720px 角色页和旧 PanelResizeHandle 测试分列保留；非空三工作区/实际分隔条未证。counter。 |
> | V03 | 无效 objectId 回退窄事实可留；读取失败→重试/A-B乱序未证。counter。 |
> | V04 | beforeunload 预期中止、资源缺席阻断分类可留；媒体 fit/1:1/替换与引用刷新未执行。counter。 |
>
> 本轮不要求重拍未变的六张截图，也不重做通过的窄正控。下一步应先让回执/账本/类型门与最终树一致，并在不能补实际调用链时把对应条目降为窄证据；不得再次以仅改文案宣称测试断言已修。GLM 贡献者不作自审终审，Kimi 本队列豁免。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 82ecfd793dcf9329b80140082f9c978244caf4a3 / SHA256 3c127bcde4927c4c00013bb2347772472c79fee23b854e13a2fcf48b962030fe。源中2026-09-25日期及 33df93783accee4c6250eb27394758b008e824dd 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-25候选的审查结论有效：counter，不转正式、不计覆盖率、不标done。标题勘误是证据修正，不能替代断言修复；类型门失败不得被32绿覆盖。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r7-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。

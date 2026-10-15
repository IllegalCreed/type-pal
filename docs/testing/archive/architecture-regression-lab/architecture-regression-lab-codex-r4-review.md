# ARCH-REGRESSION-LAB-GLM-1 — Codex 四轮独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核仅改receipt/results/verify能否关闭三轮业务counter，及核验器的PASS是否真要求执行JSON。

## 范围与证据

bc8613d1..候选的测试零diff；贡献范围按最近82e7aab8单独核。该轮32/32、39账37/1/1、六张完整SHA一致与启动单针成立，不混成测试断言已经返工。

该篇一手文档为本页完整保留的34行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob 8ddface0597928ef7a245386148849a2c0c973bf。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

verify取argv[3]而用法只写一个JSON参数；缺JSON仍可PASS，实际作第二参数则16个fullName失败，正规化后仍10个过时标题。主线带入差异被降INFO，不能称错误白名单命令通过。

人机回执仍写G04三项、G08四项、旧36/40/V04归因。目录Biome因verify格式exit1；格式化JSON不能代替目录门。

## 结论

整批counter；三轮业务反证继续有效，不能转正式或计覆盖率。完整hash和39账局部修正不使十二组完成。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：五轮先修参数、缺执行fail-closed、一对一映射及目录格式，真实未补的业务链不得由文案闭合。保留原INFO和格式失败，不降今天门槛。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 已核通过的事实

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 阻断的证据门

原文第11行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 十二组裁决（相对三轮无候选测试变更）

原文第17行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-25；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 494f9b5d194987b5e42cffbf8e43d8b1057fbd48。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 — Codex 四轮独立接收
>
> 2026-09-25；候选 `494f9b5d194987b5e42cffbf8e43d8b1057fbd48`。结论：**counter，不能把十二组按完整合同转正**。本轮 `bc8613d1..494f9b5d` 仅修改 `receipt.md`、`results.json`、`tools/verify.mjs`，候选测试文件零 diff；三轮[业务反证](architecture-regression-lab-codex-r3-review.md)仍适用。GLM 自验不算 Codex 独立证明；任务继续 draft，不合候选、不计官方覆盖率、不标 done。
>
> ## 已核通过的事实
>
> - GLM 自身增量用**最近主线合入点** `82e7aab8..HEAD` 算，仅 `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/**`，packages/scripts 零 diff；起点 `86e928b5..a3ceaf05` 的原始冻结亦零 diff。候选工作树和远端 tip 一致且干净。
> - 本席候选 Vitest JSON `/tmp/codex-glm-r4-vitest.json`：9 文件 **32/32 passed**；`node tools/red-control.mjs` detected，exit1/1执行/1失败/业务 AssertionError/注入见证1、磁盘产品 hash 不变。负控生成的本席临时目录已移到 `/tmp/type-pal-arch-lab-red-YJuqqE`，不污染候选。
> - 六张截图都存在；本席从实物重算完整 SHA-256，六项均与 `results.json` 的新增 `sha256_full` 精确相等。`results.json` 现有 **39 条，37 candidate-green / 1 existing-proof / 1 blocked-environment**，小计相加正确；V04-01 主条目已撤回产品缺陷误归因。`node scripts/docs/check.mjs` PASS，diff 检查 PASS。
>
> ## 阻断的证据门
>
> 1. **白名单与冻结命令的宣称仍不实。** 按交付要求直接跑 `git diff a2415868..HEAD --name-only`，有 20 个实验目录外文件（来自授权的 main 合入）；`git diff a3ceaf05..HEAD -- packages/ scripts/` 也非空。可以如上按起点冻结和最新合入点**分两栏**归因，不能把错误命令的失败在 `verify.mjs:26-34` 降成 INFO 后继续宣称“白名单 PASS”。
> 2. **verify 的 PASS 不证明执行。** `tools/verify.mjs:73` 读取 `process.argv[3]`，但用法只写 `[vitest-json-path]`；默认 `configs/candidates-exec.json` 缺席时不报错，`vitestJsonChecked:false` 且仍 `verdict:PASS`。本席以实际 JSON 作**第二**个参数重跑后 exit1，报告 16 条 fullName 失败（含视觉案不应比 Vitest 标题）；独立正规化账本 ` > ` 分隔符后，31 个候选引用中仍有 **10 个过时标题**。并未核执行数、命令/cwd/退出码，也没给错标题、零执行、普通 Error、超时的判据自测。
> 3. **最终回执和格式门未闭。** `receipt.md:12-37` 仍写 G04 三项、G08 四项、V04 reproduced-defect、总数“40=38/1/1”及已撤回深链归因；`results.json:807,828` 仍写“36 项”与 V04 reproduced-defect。实际候选是 32 项，G08 只有三项。全目录 `pnpm exec biome check docs/testing/archive/legacy/batches/glm-architecture-regression-lab` exit1：`tools/verify.mjs:34` 格式错误。格式化 JSON 不能替代整个目录门。
>
> ## 十二组裁决（相对三轮无候选测试变更）
>
> | 组 | 本轮归属 |
> |---|---|
> | G01 | 笔划三取消及取消平移后可再绘制的窄正控可保留；G01-05 仍只数通知，未证实际选区；平移 view 取消结果未证，整组 counter。 |
> | G02 | 双会话/双地图 tiles 保真可保留；G02-03 只查通知，不查新会话选区，整组 counter。 |
> | G03 | 挂载与旧会话 fail-loud 可保留；Cmd+S 仍没有实际保存 IO 见证，derivedStore/试玩 owner 未测，整组 counter。 |
> | G04 | 弹层 entered 后确认/关闭窄例可保留；旧草稿在外部 body 替换后能否写回、真实 session undo/redo 未证，整组 counter。 |
> | G05 | stop 局部状态可保留；换源后立即 stop，仅推进 fake timer 而非 Playback.tick；手工解绑不等于工作区 unmount，整组 counter。 |
> | G06 | enemy→author 的 `checkEnemyOnDefeatedCommands` helper 窄路径可保留；合法 typed hook caller/七臂跨面未证，整组 counter。 |
> | G07 | 背包实例隔离、生产装备写入口+getter 可保留；未实际从 event-system 读 map，也未调用 battle opcode 消费装备，整组 counter。 |
> | G08 | 重复调用与 gap 报告非空后再次调用可保留；无声效回调轨迹/产物差异，且所谓“异常”不抛，整组 counter。 |
> | V01 | 角色名三图事实可保留；键盘/焦点/六类表单矩阵未证，整组 counter。 |
> | V02 | 旧 PanelResizeHandle 三项可单列 existing-proof；720px 角色页不等于非空三工作区/实际分隔条矩阵，整组 counter。 |
> | V03 | 无效 objectId 深链回退窄事实可保留；读取失败→重试及 A/B 迟到三态未证，整组 counter。 |
> | V04 | beforeunload 预期中止与缺合法 sprite 资源的环境阻断分类方向正确；媒体 fit/1:1/替换未跑，README/receipt/notes 仍保留旧缺陷主张，整组 counter。 |
>
> 返工范围应是**先让机账、回执与执行 JSON 一致并恢复硬判据**，再对未达完整调用链的项主动收窄标题/分类或补真实反例；不要为保留 37 green 继续堆弱例。只准改 GLM 实验目录与自己的报告，不改产品/正式测试/基线或本席结论；Kimi 本队列豁免。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 8ddface0597928ef7a245386148849a2c0c973bf / SHA256 3a059c4b171c80affc137c774013b8e734cbc5fbd1cf122f2e5f12c0bbb07a61。源中2026-09-25日期及 494f9b5d194987b5e42cffbf8e43d8b1057fbd48 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-25候选的审查结论有效：整批counter；三轮业务反证继续有效，不能转正式或计覆盖率。完整hash和39账局部修正不使十二组完成。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r5-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。

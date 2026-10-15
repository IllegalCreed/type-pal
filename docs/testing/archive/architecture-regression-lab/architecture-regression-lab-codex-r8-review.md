# ARCH-REGRESSION-LAB-GLM-1 r8 独立接收

Governance Owner: Codex（history_cards_a；作者候选，待根与非作者独立接收）
Last reviewed: 2026-10-16
Template: audit-report-v1 / 1.0.0
History overlay: archive-record-v1 / 1.0.0

原文未设显式 Owner / Status 元数据字段；治理负责人不冒作原字段。原始标题、日期原句、候选身份与结论完整保留在历史层。

## 审计问题

核保存终态/卸载反控修复后，G05-02及G08-05/06是否真的观察目标语义。

## 范围与证据

本轮37/37、45账43/1/1，三针业务红，tsc/Biome/docs/diff原exit0。保留r7未变的窄接收与六旧图身份，不扩大V组操作矩阵。

该篇一手文档为本页完整保留的27行源；本轮sourceRevision为fd5042551af1170d99af93218aa6a43d7f645f69，Git blob dfbca98f257dc22078e33233bd2ffa3c24295d75。原执行结论仅由旧正文和其producer承载，本轮只作内容治理。

## 发现

G03 committed终态与G05卸载stop增量已补业务红；G06仅三入口合法组合、G07事件表→装备效果轴窄接收。

独立将wait立即resolve，G05-02仍1/1绿，未证明旧等待挂起。G08-05在预检已抛；G08-06删globalRoots图根仍1/1绿，仅回显根长度，没证明图消费。

## 结论

整批counter收窄至G05-02与G08-05/06。G03/G05-04接收，但不能将三针和37绿外推未被针覆盖的等待/图语义；G06不是七入口全矩阵。

## 整改与复核

当轮提出的后继返工要求（历史记录，不恢复当前执行）：九轮须见证真实wait阶段并让立即完成变异业务红；globalRoots断言ownership/可达性，剔除图根要红；G08-05收窄为非法options预检拒绝后可重试。

## 原标题入口

以下同名标题保留历史链接入口，均指向本页固定源；不恢复旧执行授权。

### 范围与机械复跑

原文第5行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 逐组裁决

原文第11行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

### 下一步

原文第23行标题；完整原结论见[原始结论](#原始结论)，按本篇原日期与候选解读。

## 历史范围

2026-09-26；2026-09-25/26 第二阶段跨 editor/content/migrate 与 G07 第一阶段消费者的隔离准备包；不是本轮产品审计。原候选 e1857e66。本页不是重新运行或新的产品build，旧命令/交接提示只供溯源。

## 原始结论

下列原文完整逐字节引用；去除每行引用前缀可回读固定Git blob，未改原数字、中文、状态、链接或指令。

<!-- I-SOURCE-BEGIN -->

> # ARCH-REGRESSION-LAB-GLM-1 r8 独立接收
>
> 2026-09-26；候选 `e1857e66`。结论：**counter（收窄至 G05-02、G08-05/06）**；隔离候选仍不合 `main`、不计官方覆盖率，任务保持 `draft`。G03-03、G05-04 与 G06/G07 新轴已有可接收的窄证据；GLM 是测试贡献者，非独立终审。
>
> ## 范围与机械复跑
>
> - `9a197825..e1857e66` 仅改本卡和 `docs/testing/archive/legacy/batches/glm-architecture-regression-lab/**`；工作树干净，`packages/`、`scripts/` 零 diff。
> - 新鲜执行 JSON `/tmp/codex-glm-r8-candidates.json`：37/37，通过 `tools/verify.mjs` 的 45 条双向对账（43 candidate-green / 1 existing-proof / 1 blocked-environment）。`tools/red-control.mjs` 三针均 detected，含 G03 的 `data-complete` 与 G05 卸载的 `2 > 2` 业务 AssertionError；产品源文件未改。
> - 独立 `tsc --project configs/tsconfig.json --noEmit`、目录 Biome（含已提交的 exec JSON）、`node scripts/docs/check.mjs`、`git diff --check` 均 exit0。本轮不重拍六张未变截图；V01–V04 完整操作矩阵仍按回执记未证。
>
> ## 逐组裁决
>
> | 组 | 结论与直接证据 |
> |---|---|
> | G01/G02/G04 | r7 已接收的窄结论不重开；本轮无候选测试语义改动。G01 平移 view 轴仍未证。 |
> | G03 | **accept 当前候选合同**。`g03-app-lifecycle.test.tsx:234-243` 除 manifest/content 写闭外，读取 `.type-pal/save-state.json` 并断言 `kind` 与 `phase=committed`。将生产最终 `publishState` 单点改为 `data-complete` 时，该断言业务红；修复了 r7 的终态缺口。 |
> | G05 | **G05-04 accept，G05-02 counter**。G05-04 在真实工作区点击播放后按同一 `Playback` 实例比较卸载前后 `stop` 调用数；删除卸载 cleanup 的隔离反控业务红。G05-02 虽固定 tick 1200ms，但 `:64-70` 的 `facing=up`、`mode=running` 不证明旧 `wait` 已进入。本人仅在隔离 Vite load 中把 `playback.ts` 宿主 `wait(ms)` 的 `timers.push` 改为立即 `resolve()`，`CODEX_G05_NO_WAIT_HIT` 命中，G05-02 **仍 1/1 绿**（`/tmp/codex-g05-r8-mutant.json`，产品源 hash `f411ae72…` 未变）。旧等待从未真正挂起时，所谓“旧源余量不复活”依然通过。 |
> | G06 | **accept 三入口代表组合，非七入口全矩阵**。`g06-validation-crosscalls.test.ts:156-195` 增加合法 typed choreography 与非法叶精确 path，生产 `validateEnemies` 在 `validate.ts:1469-1471` 确实调用 `checkBattleChoreography`；七入口未证已如实收窄。 |
> | G07 | **accept 装备脚本→事件表→效果层窄轴**。`g07-core-boundaries.test.ts:90-123` 以 `setGlobalEvents` 和 `scriptOnEquip` 触发真实 `updateAllEquipments`，生产 `equip-effect.ts:483-529,621-633` 读取全局命令并写派生效果，getter 从 base 到 base+7。与 G07-03 的 battle opcode 是分开的两项证据，不宣称同一测试的端到端闭环。 |
> | G08 | **counter 两项新增证据的扩大结论**。G08-05 在 `migrate-content.ts:2157-2158` 的输入预检即抛出，尚未进入转换；后续正常调用成功只证明预检拒绝后可重试，不能证明“转换中异常不污染模块态”。G08-06 的 `globalRoots` 报告计数在 `migrate-content.ts:2844` 直接取 `globalRoots.length`。本人仅在隔离加载中把 `:2305` 的图根从 `[...graphRoots, ...globalRoots]` 改为 `[...graphRoots]`，`CODEX_G08_IGNORE_ROOTS_HIT` 命中，G08-06 **仍 1/1 绿**（`/tmp/codex-g08-r8-mutant.json`，产品源未改）。当前测试没有证明根进入可达图，只证明输入长度被回显。G08-02 声音回调等旧窄证据保留；options 其余维度仍未证。 |
> | V01–V04 | 沿用 r7 的窄截图/环境分类；完整键盘、分隔条、错误恢复、媒体操作矩阵依旧未证，不转正。 |
>
> ## 下一步
>
> 只需收窄返工 G05-02 与 G08-05/06：G05 用真实可观测阶段确认旧 wait 已挂起，并让“wait 立即完成”单点反控业务红；G08 若要称可达图消费，选有效脚本根并断言图的 owner/edge/可达结果，在“从图根去掉 globalRoots”反控下业务红。G08-05 若只能取预检异常，则将标题/回执收窄为“非法 options 预检拒绝后可重试”，不要称转换中异常隔离。保留其余已通过项及 V01–V04 未证分类。
>
> 本次未改 GLM 候选、未代签、未标 done。Kimi 本队列豁免，无 Kimi 提示词。

<!-- I-SOURCE-END -->

## 当时证据

原文身份为 dfbca98f257dc22078e33233bd2ffa3c24295d75 / SHA256 19aa3adfe08e5e703ae0da8c999a2250d42b2e009edd8403203d25c793a052f7。源中2026-09-26日期及 e1857e66 为历史候选引用，具体原句以完整引用为准；不推测未提供的环境或SHA。原脚本、临时JSON和截图路径的当前可用性本轮未检查，保留unknown；没有新raw/浏览器/coverage执行。

GLM候选贡献与Codex当轮复核按原文分工。相邻轮与[最终回执](architecture-regression-lab-completion.md)是不同revision的producer，不能相加运行数或把后继修复倒写成这一轮已通过。

## 当前有效性

仅对原2026-09-26候选的审查结论有效：整批counter收窄至G05-02与G08-05/06。G03/G05-04接收，但不能将三针和37绿外推未被针覆盖的等待/图语义；G06不是七入口全矩阵。 本次只形成模板候选，未获独立accept，不标I14完成；机器JSON仍未迁移。历史警告、误归因撤回和未证轴均留原时点，静态治理不代替现行[测试质量合同](../../governance.md)。

## 继任文档

[直接继任](architecture-regression-lab-codex-r9-review.md)承接后续时点；[历史原文目录](README.md)与[合并索引](../architecture-regression-lab-history.md)只负责导航。历史授权/最终范围回到[原任务卡](../../../ops/archive/tasks/done/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，当前新工作依[现行工作流](../../../ops/agent-workflow.md)另核准入；无本次产品执行授权。

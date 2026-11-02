# TEST-CODEX-PLAYBACK-1 — 当前脚本预览控制与隔离态

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（控制器数据与时序合同；不冒称视觉验收）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是编辑器隔离预览（core/playback.ts 合同）六组纯测试历史记录（2026-09-26，起点 82863cf2）：controls/motion/entities/presentation/effects/queries 的控制进度、合法 leaf 组合与跨次输入隔离。

## 目标

为 SceneScriptWorkspace.tsx:178-194,245-265 与 PreviewCanvas.tsx 驱动的公开 playCanonical/tick/pause/resume/step 补当前入口合同测试；不复活无生产调用方的旧 play/退役命令域。

## 范围

- 范围内：六份新测试 playback.{controls,motion,entities,presentation,effects,queries}.test.ts、专属 playback-canonical-fixtures.ts 与 codex-playback/ 证据；真实 flow guard/compiler/runner/host，经公开 view/tick 观察。
- 范围外：产品/旧测试/配置/资产；旧 playback.test.ts 12 项与 architecture-lab/playback-scope.test.tsx 4 项已证域（map scratch、cut 入口、旧失败/淡幕/hold、confirm 两臂、旧 play 换源/wait/卸载）；不把预览战斗桩日志称为真实战斗、不声明 Canvas 像素已测。

## 前提与证据

当前合同锚点 core/playback.ts:1-7,284-654；最强替代解释（未覆盖臂只能从私有 host/旧 play 进入）成立则只登记不为比例强造输入。单步首次阶段门问题保留独立红诊断、归 EDITOR-PREVIEW-STEP-1 修复卡，不改绿预期掩盖。
- 当前状态：done（历史终态）

## 验收

原卡记录：六组 54 项（7/10/9/7/9/12）与旧 12+lab4+Canvas2 合计 72/72；六正控/六单点反控真实 AssertionError、源码 hash 不变；完整 check9326→官方 ratchet→保护 82863cf2 单次 strict8834 严格串行 exit0；+138B/+203S/+188L/+76F，全仓 45131/63178=71.43…%。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex 自验 accept/done（当前委派模式无固定他席门，纯测试无需用户 UI 验收）；单步 D1 不随本卡关闭、仍在独立 draft 修复卡；母卡剩 1446 分支继续。本页治理不重授。

## 历史范围

2026-09-26 定向接收与统一验收同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：六组预览控制/隔离态合同按纯测试批收口；单步阶段门缺陷移交 EDITOR-PREVIEW-STEP-1。原卡全文在下方 quote 保全。

## 当时证据

SceneScriptWorkspace/PreviewCanvas 消费锚点、独立红诊断、批回执。本页治理未新增执行。

## 当前有效性

historical。预览合同现行状态以当前测试与代码为准；单步缺陷当时未闭合。

## 继任文档

修复卡[EDITOR-PREVIEW-STEP-1](EDITOR-PREVIEW-STEP-1-command-gates.md)；队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `879495a639e1d9f1cb1d715f0e166d620b23154a4cb90b62403f931fedfb4dc0`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-PLAYBACK-1 — 当前脚本预览控制与隔离态
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（控制器数据与时序合同；不冒称视觉验收）
>
> ## 准入
>
> 2026-09-26 build allowed，起点 `82863cf2`，属于[覆盖率持续队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
> 只增测试和专属证据，不改产品/旧测试/全局配置/资产。与Cursor命令族、GLM内容guard、另一Codex架构不重叠。
>
> 真实消费者：`SceneScriptWorkspace.tsx:178-194,245-265` 创建Playback并调用playCanonical；
> `PreviewCanvas.tsx` 驱动公开tick/pause/resume/step。本文不复活无生产调用方的旧play/退役命令域。
> 一阶段/原版N/A：这是编辑器隔离预览，不测试玩法一致。当前合同见 `core/playback.ts:1-7,284-654`。
> 最强替代解释为“未覆盖臂只能从私有host/旧play进入”，该类只登记，不为比例强造输入。
>
> ## 六组与验收
>
> 新增 `packages/editor/src/core/playback.{controls,motion,entities,presentation,effects,queries}.test.ts`，
> 专属 `core/__tests__/playback-canonical-fixtures.ts` 与 `docs/testing/archive/legacy/batches/codex-playback/**`。
> 每例使用真实当前flow guard、真实compiler/runner/host，经公开view/tick观察；输入消费前深快照，消费后比实际实参。
> 闭环分为暂停/单步与对话、移动时钟、实体overlay、场景入场计时、日志桩结果、query/scratch隔离。
> 不把“预览战斗按胜利继续”等桩日志称为真实战斗，也不声明Canvas像素已测。
>
> 去重：`playback.test.ts` 12项涵盖map scratch、cut入口、旧失败/淡幕/hold、confirm两臂和shared调用；
> `architecture-lab/playback-scope.test.tsx` 4项涵盖旧play换源/wait/卸载。保留不重写。
> 本批重点是current入口的控制进度、合法leaf组合和跨次输入隔离，不重复既有token mismatch/简单confirm两臂。
> 整批定向/相邻/TC/Biome与六代表单点反控；随后串行check→ratchet→保护起点的单次strict-fast。
> done只在最终门禁、证据、提交推送完成后核定。产品缺陷另登记，不调预期掩盖。
>
> ## 交接
>
> Codex连续实施；无下一位Agent提示词，不等待他席。
>
> ## 2026-09-26 定向接收
>
> 六组54项（7/10/9/7/9/12）与旧12+lab4+Canvas2合计72/72；editor TC exit0。
> 六正控/六单点反控真实AssertionError通过，源码hash不变。单步首次阶段门问题保留
> [独立红诊断](../../../../testing/archive/legacy/batches/codex-playback/README.md)，归[后续修复卡](EDITOR-PREVIEW-STEP-1-command-gates.md)，
> 不改绿预期掩盖。
>
> ## 2026-09-26 统一验收与收口
>
> Codex自验accept：完整check9326→官方ratchet→保护82863cf2的单次strict8834严格串行exit0。
> 新增54测试/+138B/+203S/+188L/+76F，全仓45131/63178=71.4346766279401%；701生产文件与各分母不变，
> 其余六包baseline对象不变。改动Biome零警告，根lint62旧warning/6info，证据见批回执/机账。
> 当前委派模式无固定他席门，本卡纯测试无需用户UI验收；核定done并归档、提交推送。
> 首次单步D1不随本卡关闭，仍在独立draft修复卡。母卡+5pp目标未达，剩1446分支，继续推进。
<!-- original-source-quote:end -->

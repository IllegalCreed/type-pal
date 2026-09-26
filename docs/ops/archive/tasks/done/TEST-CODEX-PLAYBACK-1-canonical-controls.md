# TEST-CODEX-PLAYBACK-1 — 当前脚本预览控制与隔离态

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（控制器数据与时序合同；不冒称视觉验收）

## 准入

2026-09-26 build allowed，起点 `82863cf2`，属于[覆盖率持续队列](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
只增测试和专属证据，不改产品/旧测试/全局配置/资产。与Cursor命令族、GLM内容guard、另一Codex架构不重叠。

真实消费者：`SceneScriptWorkspace.tsx:178-194,245-265` 创建Playback并调用playCanonical；
`PreviewCanvas.tsx` 驱动公开tick/pause/resume/step。本文不复活无生产调用方的旧play/退役命令域。
一阶段/原版N/A：这是编辑器隔离预览，不测试玩法一致。当前合同见 `core/playback.ts:1-7,284-654`。
最强替代解释为“未覆盖臂只能从私有host/旧play进入”，该类只登记，不为比例强造输入。

## 六组与验收

新增 `packages/editor/src/core/playback.{controls,motion,entities,presentation,effects,queries}.test.ts`，
专属 `core/__tests__/playback-canonical-fixtures.ts` 与 `docs/testing/codex-playback/**`。
每例使用真实当前flow guard、真实compiler/runner/host，经公开view/tick观察；输入消费前深快照，消费后比实际实参。
闭环分为暂停/单步与对话、移动时钟、实体overlay、场景入场计时、日志桩结果、query/scratch隔离。
不把“预览战斗按胜利继续”等桩日志称为真实战斗，也不声明Canvas像素已测。

去重：`playback.test.ts` 12项涵盖map scratch、cut入口、旧失败/淡幕/hold、confirm两臂和shared调用；
`architecture-lab/playback-scope.test.tsx` 4项涵盖旧play换源/wait/卸载。保留不重写。
本批重点是current入口的控制进度、合法leaf组合和跨次输入隔离，不重复既有token mismatch/简单confirm两臂。
整批定向/相邻/TC/Biome与六代表单点反控；随后串行check→ratchet→保护起点的单次strict-fast。
done只在最终门禁、证据、提交推送完成后核定。产品缺陷另登记，不调预期掩盖。

## 交接

Codex连续实施；无下一位Agent提示词，不等待他席。

## 2026-09-26 定向接收

六组54项（7/10/9/7/9/12）与旧12+lab4+Canvas2合计72/72；editor TC exit0。
六正控/六单点反控真实AssertionError通过，源码hash不变。单步首次阶段门问题保留
[独立红诊断](../../../../testing/codex-playback/README.md)，归[后续修复卡](../../../tasks/EDITOR-PREVIEW-STEP-1-command-gates.md)，
不改绿预期掩盖。

## 2026-09-26 统一验收与收口

Codex自验accept：完整check9326→官方ratchet→保护82863cf2的单次strict8834严格串行exit0。
新增54测试/+138B/+203S/+188L/+76F，全仓45131/63178=71.4346766279401%；701生产文件与各分母不变，
其余六包baseline对象不变。改动Biome零警告，根lint62旧warning/6info，证据见批回执/机账。
当前委派模式无固定他席门，本卡纯测试无需用户UI验收；核定done并归档、提交推送。
首次单步D1不随本卡关闭，仍在独立draft修复卡。母卡+5pp目标未达，剩1446分支，继续推进。

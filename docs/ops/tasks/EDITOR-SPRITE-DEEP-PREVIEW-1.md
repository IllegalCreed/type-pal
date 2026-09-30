# EDITOR-SPRITE-DEEP-PREVIEW-1 — 深链自动脚本预览伪报帧 #0

Status: draft
Owner: Codex（待单独准入；不属 TEST-GLM-WAVE-L-1 测试 Owner 白名单）
Phase: phase2
Capability: editor-authoring / world-sprite-preview
Visual Verification Timing: dev-functional（实施时最小核预览文案）

## 已核前提与证据

当前公开 `describeSpriteReferenceBehavior` 对合法 15/16 层 `callScript` 链显示
真实帧 `#1 → #2`，17 层却显示脚本不存在的「检测到 #0」及 `cycle [#0]`。
GLM 隔离候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca` 的
`docs/testing/glm-next-triple/wave-L/defect-report.md` 有完整复现夹具和初次证据；
Codex 另用临时 Vitest 探针在该候选复现 15/16/17 层结果，探针已删除、未入库。
当前 main 的冻结产品源 hash 与候选一致，不是测试候选改出的行为。

源锚点：`packages/editor/src/core/world-sprite-behavior.ts:602` 的确定性扫描
`depth > 16` 回退；`:778,887` 的采样深度预算；`:966-974` 在预算中止且零
真实步骤时补默认帧；`:1024-1030` 单 variant 输出未保留截断说明。
真实 caller 为 `packages/editor/src/ui/WorldSpriteLibrary.tsx`；旧测已有分支不可解释
时保守回退及不伪装帧序的合同。

四向前提：原版/一阶段 N/A（这是二阶段作者预览的解释文案，不是原版机制）；
当前二阶段输入的脚本命令只有 `setEntityFrame #1/#2`；任务目标是不把安全预算
生成的默认采样帧声称为“检测到”的脚本帧。最强替代解释是 #0 被设计为预算耗尽时
的预览占位；即使如此，现行文案仍把占位误报为已检测的脚本结果。若能找到
明确文档或产品决定认为“检测到”可指非脚本占位，应重开此判断。

## 待定范围

用户可见 before → after：17 层链的「检测到 #0」→ 披露预算截断、且不声称
可证帧序。后续实现需先定具体表现：完全保守回退，或保留有明确“示例/截断”
标识的占位预览；不改变脚本运行时语义、资源模型或官方覆盖基线。仅登记缺陷，
未经 Codex 核实施范围与必要用户选择，不进入 build；L 波不得代修。

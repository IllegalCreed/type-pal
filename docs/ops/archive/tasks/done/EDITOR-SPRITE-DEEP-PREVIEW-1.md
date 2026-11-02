# EDITOR-SPRITE-DEEP-PREVIEW-1 — 深链自动脚本预览伪报帧 #0

Status: done
Owner: pre005_sprite_preview（实现）；Codex Root（独立验收）
Phase: phase2
Capability: editor-authoring / world-sprite-preview
Visual Verification Timing: dev-functional（实施时最小核预览文案）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是深链自动脚本预览伪报帧的窄修历史卡（2026-10-02，PRE-005-DEBT-1 准入）：world-sprite-behavior.ts:602 的 depth>16 确定性扫描回退令 17 层链显示脚本不存在的「检测到 #0」；修复为披露预算截断、不声称可证帧序。

## 目标

不把安全预算生成的默认采样帧声称为“检测到”的脚本帧：17 层 callScript 链显示无法推断或部分帧序，不说“安全预算/采样/截断”。

## 范围

- 范围内：describeSpriteReferenceBehavior 的预算截断披露（47d40c5a 逻辑+真实引用行、b3c5d5bb 直白文案，Root 直接审读接收）；WorldSpriteLibrary:254 过滤 auto 引用、:1243/:1271 两类引用行文案。
- 范围外：预览预算本身（不改）、运行时语义、资源模型、官方覆盖基线；点击定位旧入口缺陷分到 EDITOR-AUTO-LOCATOR-1。

## 前提与证据

发现链：GLM 隔离候选 e2b3f437 的 wave-L defect-report 完整复现夹具（15/16 层显示真实帧 #1→#2、17 层伪报 #0）；Codex 临时 Vitest 探针复现后删除未入库；冻结产品源 hash 与候选一致，非候选改出行为。最强替代解释（#0 为预算耗尽预览占位设计）即使成立，现行文案仍把占位误报为已检测脚本结果。Root 复核 main 实况：PAL 共享库为空、294 场景无 callScript——17 层是合成边界回归非剧情缺陷；早期测试工程 map 字符串二次 JSON 编码/directional 误用是 Root 夹具错误，修正后才取有效画面。
- 当前状态：done（历史终态）

## 验收

原卡记录：Root 独立 core/Library 66 项通过、预算不变；正常 15/16、真实 0 帧与六 chance 既有案例保持；实际 6014 两实体（17 层无帧/带前缀）分别显示无法推断与部分帧序，截图 build/pre005/sprite-bounded-reference-final.png；源帧浏览器仍可显示真实源帧 0（界面 0 帧源选择与脚本帧序解释是不同用途）。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

点击定位可达性缺陷归[EDITOR-AUTO-LOCATOR-1](EDITOR-AUTO-LOCATOR-1-current-script-target.md)；统一质量归母卡。本页治理不重开。

## 历史范围

2026-10-02 用户清边角窗口，Root premise verified/design agree/build allowed 后实施接收；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：预算截断披露化、伪报帧消除，经 Root 独立实测接收。原卡全文在下方 quote 保全。

## 当时证据

world-sprite-behavior.ts:602/:778,887/:966-974/:1024-1030 锚点、wave-L defect-report、Root 截图。本页治理未新增执行。

## 当前有效性

historical。预览文案现行形态以当前代码为准。

## 继任文档

同窗边角修见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)与[EDITOR-AUTO-LOCATOR-1](EDITOR-AUTO-LOCATOR-1-current-script-target.md)。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `e5e87cda50053db003c96962ccf8f260c286c4bee45cff7da143584c0a73606c`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # EDITOR-SPRITE-DEEP-PREVIEW-1 — 深链自动脚本预览伪报帧 #0
>
> Status: done
> Owner: pre005_sprite_preview（实现）；Codex Root（独立验收）
> Phase: phase2
> Capability: editor-authoring / world-sprite-preview
> Visual Verification Timing: dev-functional（实施时最小核预览文案）
>
> ## 已核前提与证据
>
> 2026-10-02用户清边角准入见[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)。
> Root与独立核验复读当前真实链：core:612/988/995/1057/1103。随后真实caller复核纠正：
> WorldSpriteLibrary:254过滤直接auto引用，:1243自动引用行仍硬编码通用说明；:1271普通引用行才消费detail。
> 需最小接通既有scene-entity引用的解释detail并测试真实引用页；不杜撰actor间接引用的帧序。
> SpriteResourceViewer已不消费旧测试mock的automaticBehaviors。预算截断应明确未能确定完整帧序，不能默认#0或伪报唯一cycle。
> 保留既有6种chance路径示例及部分证据的截断说明；不改运行时和预览预算。Root premise verified/design agree/build allowed。
>
> 当前公开 `describeSpriteReferenceBehavior` 对合法 15/16 层 `callScript` 链显示
> 真实帧 `#1 → #2`，17 层却显示脚本不存在的「检测到 #0」及 `cycle [#0]`。
> GLM 隔离候选 `e2b3f43770c9968d72b16a34f3d0173a271cc4ca` 的
> `docs/testing/archive/legacy/batches/glm-next-triple/wave-L/defect-report.md` 有完整复现夹具和初次证据；
> Codex 另用临时 Vitest 探针在该候选复现 15/16/17 层结果，探针已删除、未入库。
> 当前 main 的冻结产品源 hash 与候选一致，不是测试候选改出的行为。
>
> 源锚点：`packages/editor/src/core/world-sprite-behavior.ts:602` 的确定性扫描
> `depth > 16` 回退；`:778,887` 的采样深度预算；`:966-974` 在预算中止且零
> 真实步骤时补默认帧；`:1024-1030` 单 variant 输出未保留截断说明。
> 真实 caller 为 `packages/editor/src/ui/WorldSpriteLibrary.tsx`；旧测已有分支不可解释
> 时保守回退及不伪装帧序的合同。
>
> 四向前提：原版/一阶段 N/A（这是二阶段作者预览的解释文案，不是原版机制）；
> 当前二阶段输入的脚本命令只有 `setEntityFrame #1/#2`；任务目标是不把安全预算
> 生成的默认采样帧声称为“检测到”的脚本帧。最强替代解释是 #0 被设计为预算耗尽时
> 的预览占位；即使如此，现行文案仍把占位误报为已检测的脚本结果。若能找到
> 明确文档或产品决定认为“检测到”可指非脚本占位，应重开此判断。
>
> ## Root实测与独立接收
>
> `47d40c5a`逻辑与真实引用行、`b3c5d5bb`直白文案已由Root直接审读并接收候选。
> Root独立core/Library66项通过，预算不变；正常15/16、真实0帧与六chance既有案例保持。
> 实际6014独立合法static用途包含17层无帧/带前缀两实体，引用页分别显示无法推断与部分帧序，
> 不说“安全预算/采样/截断”，截图`build/pre005/sprite-bounded-reference-final.png`。
> 界面0帧源资源选择与脚本帧序解释是不同用途，源帧浏览器仍可以正常显示真实源帧0。
> 点击定位发现旧App入口只到实体却误选交互，已分到[EDITOR-AUTO-LOCATOR-1](EDITOR-AUTO-LOCATOR-1-current-script-target.md)，
> 不伪称mock callback证明完整定位；统一质量及该可达性修复归母卡。
>
> 用户询问真实内容后，Root实际核main的PAL共享库为空、294场景及全部content无callScript；
> 17层是合成边界回归，不是001–004剧情缺陷，也不要求作者拆步骤。早期测试工程map字符串二次JSON编码、
> 使用directional而非static用途导致不进入对应帧序分析，均是Root夹具错误，修正后才取上述有效画面。
>
> ## 初始登记范围（历史）
>
> 用户可见 before → after：17 层链的「检测到 #0」→ 披露预算截断、且不声称
> 可证帧序。后续实现需先定具体表现：完全保守回退，或保留有明确“示例/截断”
> 标识的占位预览；不改变脚本运行时语义、资源模型或官方覆盖基线。仅登记缺陷，
> 未经 Codex 核实施范围与必要用户选择，不进入 build；L 波不得代修。
<!-- original-source-quote:end -->

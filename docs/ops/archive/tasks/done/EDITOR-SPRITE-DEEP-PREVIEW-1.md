# EDITOR-SPRITE-DEEP-PREVIEW-1 — 深链自动脚本预览伪报帧 #0

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `e5e87cda50053db003c96962ccf8f260c286c4bee45cff7da143584c0a73606c`；下方 quote 可逆回原始 UTF-8 字节。
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

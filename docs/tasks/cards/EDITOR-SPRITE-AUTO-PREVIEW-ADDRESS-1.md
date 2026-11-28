# EDITOR-SPRITE-AUTO-PREVIEW-ADDRESS-1 — 精灵库自动行为预览保留完整场景地址

Status: done
Phase: phase2
Owner: Codex
Coding Owner: Codex
Last reviewed: 2026-11-29
Template: task-card-v1 / 1.0.0
Visual Verification Timing: functional

## 目标

引用面板在两个合法场景各有一个同名实体时，把另一场景的帧变化算成本场景的帧序。正式用例经过当前工程加载、作者引用和大世界精灵库。起始场景的实体应仅展示可证明的帧，实际细节显示“检测到 #1 → #3”，其中 #3 来自庭院场景。三项对照通过，失败发生在这个具体帧断言。

## 范围

大世界精灵库的作者态自动行为投影及其测试。

## 前提与证据

当前脚本宿主按完整场景与实体地址决定活动画面能否响应，见 `packages/reforge/src/script-host-adapter.ts:16–24,189–193,308–312`。精灵库的旧投影将显式目标缩成单一实体 ID，后续帧扫描无法区分两个场景。`packages/editor/src/ui/WorldSpriteLibrary.scripted-usage.test.tsx` 保留实页入口、正常筛选和深度边界；冻结时随父卡保留失败原件 `world-sprite-script-address-red`。本问题为二阶段作者工具专有的只读投影，第一阶段及 SDLPal 没有同一功能。

## 验收

检查本场景帧序、共享脚本目标及外场景绑定，保留正常筛选和打开脚本入口。

## 状态与交接

2026-11-29 用户批准按完整场景地址修复，并退役四个仅旧专测调用的汇总与包装出口。Codex build allowed，限精灵库只读预览、相邻测试及现行说明。直接目标与共享脚本目标两个正式反例先失败。进一步核实当共享脚本的自身绑定指向另一场景时，旧投影把无法解释的指令强当成投影命令，渲染引用页抛出读取 `chunk` 异常。三条路径现均按当前场景与实体地址判定，无法推断时保留提示及编辑入口。现行合同已更新到[编辑器架构](../../phase2/specs/editor-architecture.md#精灵导入与法术预览)。

正常识别本场景帧、深度截断和定位仍有实测。集中门随[治理父卡](QUALITY-EDITOR-SPRITE-AUTHORING-1.md#大世界精灵自动脚本预览)执行。工作区首跑发现 PAL 专测仍调用已退役的汇总。现用作者加载器、真实引用与实例预览覆盖 102 处旧素材，另核 035／072 的实际场景及 076 的预制动作引用。去除 072 实例反控得到一红一绿，恢复后定向及相邻 35 项通过，原件见父卡。

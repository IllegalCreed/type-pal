# EDITOR-PREVIEW-STEP-1 — canonical 预览单步的无可见阶段门

Status: draft
Owner: Codex
Phase: phase2
Visual Verification Timing: dev-functional（修复时最小按钮核验，当前仅控制器红诊断）

## 来源与证据

[补测批](../archive/tasks/done/TEST-CODEX-PLAYBACK-1-canonical-controls.md)从正式 `SceneScriptWorkspace.tsx:245`
调用域构造合法、单条setPartyFacing的current flow。`Playback.playCanonical(...,{paused:true})` 后，
公开step一次仍down；预期left的AssertionError已复现，非timeout。源码起点82863cf2。
复现命令/原始日志见[批回执](../../testing/codex-playback/README.md)。

根因锚：`script-runner-core.ts:165`阶段入口awaitGate、`:304`命令前awaitGate，
而`playback.ts:493-505`只释放gateQueue首项；第一次step被无onStep事件的阶段门消费。
末尾`:179`还有safe-point门。`PreviewCanvas.tsx:464-472`初次单步点击仅以paused启动，
后续才调用step，所以UI控制不能绕过此问题。`playback.ts:493`说明的是“一条命令”。

## 待定实施边界

仅修编辑器单步与真实runner阶段/命令边界适配；不得直接删除运行时生产safe-point门，
不得影响游戏取消/提交协调，不能为让测试绿擅改全局runner gate合同。
进入build前核阶段/分支/状态机/entry/confirm/共享调用的步进合同，明确命令高亮是否应
与已提交动作同步；至少一个隔离浏览器按钮闭环。当前没有产品改动，不算已修、不随补测卡done关闭。
三签退休，后续由Codex核准/实施/验证；不等待GLM。

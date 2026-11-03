# CODE-QUALITY-104 — editor M02 测试 act 生命周期诊断

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0

## 目标

清理CODE-QUALITY-103相邻回归中两个真实测试文件（ItemTab.glm-m.test.tsx、ItemUseEffectEditor.glm-m.test.tsx）的22条React act诊断：CODE-QUALITY-103的相邻22files/224tests exit0但22条act诊断来源集中于这两M02文件，定向两残余文件本身4/4、0诊断。

## 范围

只允许把原生点击、undo/redo等会触发useSyncExternalStore更新的测试事件包入现有act helper；不改生产组件、共享lint/config、断言语义或覆盖率范围。

## 前提与证据

固定源全文核读。2026-10-17原检查点：两白名单测试的原生click/undo/redo已包入act；修复前保留22条React诊断，修复后定向2/4、相邻24/228均PASS且零诊断，editor typecheck与全仓pnpm check exit0，lint/docs通过；当时official ratchet/protected因shared/pal-extract回退失败而保留review，失败原件不改写。退出码0但仍有stderr不算通过；本卡不改产品或baseline。

## 验收

若发现警告来自其它文件立即停止另开卡，不把stderr过滤成通过。

## 状态与交接

Status为done：两原测试由父52逐文件接受；后继[物品字段职责承接](../evidence/QUALITY-PENDING-100-3/organization-editor-item-fields.json)的旧输入SHA与当前输出SHA已核。仅收M02测试事件归属，不解决CODE103的P1产品取舍，不授整编辑器或新增运行信用。原回执见[README.md](../evidence/CODE-QUALITY-104/README.md)。

2026-11-03复核：原统一门与发布义务由[父52实际发布回执](QUALITY-REVIEW-52-CLOSEOUT-1.md#状态与交接)闭合；原件的待发布字段保留原时点。无下一位Agent提示词。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1989B / SHA-256 cc05fd532a3ff4e85bd904669e3db12cfde8ce0e01b195c50f20e9205bed2c26；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-104 — editor M02 测试 act 生命周期诊断

Status: review
Owner: Codex
Reviewer: Codex
Phase: phase2
Capability: editor / test-host lifecycle
Visual Verification Timing: N/A（仅测试宿主同步）

## 目标与白名单

清理 CODE-QUALITY-103 相邻回归中两个真实测试文件产生的 React `act(...)` 诊断，
保持业务断言、合法 fixture、caller 和 session oracle 不变：

- `packages/editor/src/ui/ItemTab.glm-m.test.tsx`
- `packages/editor/src/ui/ItemUseEffectEditor.glm-m.test.tsx`

只允许把原生点击、undo/redo 等会触发 `useSyncExternalStore` 更新的测试事件包入
现有 `act` helper；不改生产组件、共享 lint/config、断言语义或覆盖率范围。

## 证据与准入

CODE-QUALITY-103 的相邻 22 files / 224 tests exit 0，但出现 22 条 act 诊断，
来源集中于上述两个 M02 文件。定向两个残余文件本身 4/4、0 诊断。修复后要求
保留业务测试，定向和相邻均为零诊断；若发现警告来自其它文件，立即停止并另开
卡，不把 stderr 过滤成通过。

## 验收

先在当前树记录失败/诊断反例，再做最小测试宿主修复，运行：两个 M02 定向、
CODE-QUALITY-103 的 24 文件相邻回归、editor typecheck；批次收口时执行完整
`pnpm check`、official coverage ratchet、protected fast、lint-zero、docs、ledger。
退出码 0 但仍有 stderr 不算通过。纯测试宿主修复与产品行为无关，不调整 baseline。

## 2026-10-17 Codex 验收

两个白名单测试文件的原生 click/undo/redo 已包入 `act`。修复前保留 22 条 React 诊断；修复后定向 2/4、相邻 24/228 均 PASS 且零诊断，editor typecheck 与全仓 `pnpm check` exit 0，lint/docs 通过。official ratchet/protected fast 仍因既有 shared/pal-extract baseline 回退失败，账本登记为 review，不标 done。完整回执见 [CODE-QUALITY-104 evidence](../evidence/CODE-QUALITY-104/README.md)。
```
<!-- incremental-original-source:end -->

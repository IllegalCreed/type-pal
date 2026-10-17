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

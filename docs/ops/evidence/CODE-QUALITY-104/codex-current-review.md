# CODE-QUALITY-104 — Codex 当前验收（2026-10-17）

范围仅为两个测试文件：

- `packages/editor/src/ui/ItemTab.glm-m.test.tsx`
- `packages/editor/src/ui/ItemUseEffectEditor.glm-m.test.tsx`

## 修改与原因

修复前两个文件的业务测试都能通过，但原生 `button.click()`、`EditSession.undo()`
和 `redo()` 触发 `useSyncExternalStore` 更新时不在 `act` 内，React 报出 22 条
生命周期诊断。改动只把这些真实测试事件包入已存在的 React `act`，没有改变
fixture、输入、业务断言、undo/redo 顺序或生产组件。

这是可判别的诊断修复：修复前保留 22 条 stderr，修复后定向和相邻回归均为零
诊断；任何失败不会被过滤或 `silent` 掩盖。

## 验证结果

- 定向：2 files / 4 tests PASS，0 stderr。
- 相邻：24 files / 228 tests PASS，0 stderr；包含 CODE-QUALITY-103 的两个
  残余合同测试、ControlForm/ScriptEditor 合同和 ItemTab/ItemUseEffectEditor
  既有合同。
- editor typecheck：`tsc --noEmit` 与 author-check PASS。
- 全仓 `pnpm check`：exit 0；content 1490/1498、shared 126、game 316/3585、
  pal-extract 72/293、reforge 359/8964、editor 631/4781、migrate 96/739，
  根 lint 4962 文件 0/0/0。
- `pnpm lint`：4962 files，0 errors / 0 warnings / 0 infos。
- `pnpm check:docs`：PASS，1478 Markdown / 8747 links / 450 tasks / 0 issues。
- ledger：机器记录为 3307 tracked / 231 closed / 19 review / 3057 pending。
- official ratchet 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main` protected fast：
  两者均复现同一 shared/pal-extract 与 total baseline 回退；本批没有源实现和
  coverage scope 变化，没有降低阈值或更新 baseline。

## 结论

两个测试文件的 act 诊断根因已修复并完成相邻/全仓静态门；由于统一 coverage
门仍受既有 baseline 回退阻塞，本批登记为 `review`，不写成 `已验证` 或 `done`。
后续应先处理 shared/pal-extract baseline 证据与剩余全仓诊断，再复验本批。

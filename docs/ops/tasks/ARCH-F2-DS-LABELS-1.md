# ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 窄拆（后排）

Status: draft
Phase: phase2 editor / 架构治理 F2
Planned Coding Owner: Cursor
Review / Integration Owner: Codex
Build gate: **not opened**

当前 `controls.tsx:110-145` 的 `DsTag`、`DsReadonlyValue` 是两块相对独立的展示组件；可在不改 DOM、class、语义或导出路径下迁到专属模块。它们与 Grok 正在实施的 `ARCH-F2-DS-OVERFLOW-1` 修改同一原文件，故**不能并行开工**。Cursor 先完成 `CURSOR-WAVE-2-1` 文档/纯测试；等 Grok 候选经 Codex 接收并合入最新 main，Codex 再重核调用者、`controls.test.tsx`、`recipes.test.tsx`、design-system 边界门与 CSS 后签 build allowed。此前不创建候选分支、不编辑 `controls.tsx`。

若开工，范围拟仅 `controls.tsx`、新模块、对应测试与专属回执；旧 `controls.js`/design-system 出口、标签 tone、monospace、span/div、DOM/class/ARIA 保持同一语义。不得以清理为由改默认布局、颜色、宽度或已有 UI。最终验收由 Codex 独立完成，Cursor 自验不能替代。

# TEST-COVERAGE85-GLM-EDITOR-1 — editor workflow branch-contract closure

Status: build
Owner: GLM
Reviewer: Codex
Base: `b95a6947369bf5d32db5746df0c82acae27b3663`
Branch: `codex/coverage85-glm-editor-r1`
Capability: test-quality / coverage branch closure

## Codex build allowed

当前 fast 基线 editor 为 statements `29920/33513`、branches `23865/29058`、functions
`7570/8543`、lines `26795/29284`；达到 package branch 85% 至少需闭合约 835 个既有
未覆盖 edges。数字不是测试例数配额；必须以独立 UI/状态合同和可观察业务 oracle 证明。

## 独占范围与明确合同点

只允许写 `packages/editor` 的新专属测试、必要 typed fixture/隔离浏览器证据和本卡证据；
不得改产品、旧测试、共享配置、baseline、真实 PAL 数据或其它卡目录。优先逐分支核验：

- `src/ui/App.tsx:239-1147`：项目载入/空态/错误态、tab/route 选择、dirty/save/reload、
  command palette 与权限/禁用分支；必须走真实组件事件与公开 store/session。
- `src/ui/MapMode.tsx:171-1048`、`src/ui/ScriptEditor.tsx:135-1057`：选中/取消、拖拽/键盘、
  map/scene/script 编辑状态、撤销/重做/dirty、非法输入拒绝和保存恢复；断言序列化业务结果，
  不只断言 DOM 存在或 handler 被调用。
- `src/ui/ProjectWorkbenchTab.tsx`、`ItemTab.tsx`、`SkillTab.tsx`、`ActorMode.tsx`、
  `CutsceneTab.tsx`、`command-form-control.tsx`：表单合法/空/边界值、确认/取消、只读/禁用、
  collection validation 和错误回显；每个新增轴必须对照旧 fullName 排重。
- `src/core/world-sprite-behavior.ts`、`src/core/script-editor.ts`、`src/ui/PreviewCanvas.tsx`、
  `WorldSpriteLibrary.tsx`/`BattleSpriteLibrary.tsx`：真实 typed asset/session 输入、选择/预览/
  删除/恢复和资源缺失错误；视觉证据只用于功能性界面必要路径，不走剧情，不用 `__rfWorld` 或
  私有 DOM/state 后门。

每个 branch family 先写合同表：源行、触发事件、合法输入、状态转移、可观察 oracle、与已有
测试的 fullName 差异。宿主不可达或浏览器能力缺失必须做一手 existing-proof/blocked 记录，
不得用假 DOM、业务核心 mock、强转桥或扩大 timeout。

## 验收交付

用真实组件/公开 store 运行定向与相邻测试；每个 admitted 分支至少有能区分前后状态的断言，
拒收 snapshot-only、handler-only、零执行、重复身份和混入 collection/runtime 错误的用例。
反控不设数量：对每个实际注入点提供原始/变异/恢复三态、指定业务 AssertionError、执行集合、
最终源 hash；不得使用 `as unknown as`、`@ts-expect-error`、ignore/skip 或降质量规则。

回执必须带 fresh Vitest `file×fullName×status`、branch delta、截图/console 证据（仅必要时）、
未覆盖臂 proof，以及 test/typecheck/lint/docs/diff 结果。editor branch 达到 85% 或剩余分支
有一手不可达证明后才能交 Codex；不得合 main/标 done。

## 下一位 Agent 提示词

你是 GLM，负责本卡 editor workflow。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、
本卡和 fast baseline，再对 App/MapMode/ScriptEditor 的真实 caller 与旧 fullName 做排重。只写
本卡白名单的新测试/fixture/证据；交付时记录每个合同的事件、状态、oracle、fullName、三态反控
和 branch 变化，并输出 `accept` 或 `counter`；不得改产品、旧测、配置或标 done。

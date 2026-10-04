# TEST-GLM-EDITOR-AUTHORING-PANELS-1 — authoring panel state contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / authoring panels
Branch: `codex/glm-editor-authoring-panels-r1`
Visual Verification Timing: dev-functional

## 目标

为编辑器作者面板补充少而精的真实交互合同，覆盖 ProjectWorkbenchTab、ActorMode、CutsceneTab 中尚未被旧测、Kimi 工作流或已归档 GLM Editor 卡证明的状态转换；不以用例数量或覆盖率作为本卡指标。

## 独占范围

只允许新增 `packages/editor/src/ui/` 本卡专属测试、必要合法 fixture 和本卡证据。候选合同：

- `ProjectWorkbenchTab.tsx:269-296,630-672,703-1158`：issue 分组/资源定位、条件种子规范化、空值删除和 party/inventory/stats/resources 的序列化结果；
- `ProjectWorkbenchTab.tsx:1717-1928`：entrypoint focus/default-entry 选择、无效 focus 回退、默认入口切换的 session command oracle；
- `ActorMode.tsx:286-390,1088-1178,1394-1660`：新建/编辑合法性守卫、当前 actor 删除保护、battle sprite/sound 空值删除、NaN/非 battler no-op、initial magic 去重；
- `CutsceneTab.tsx:109-171,360-408,468-565,900-980`：字节/时长格式、视频扩展识别、stale selection、import/delete/discard confirmation 和 object URL 清理；
- 仅做功能性界面最小视觉证据；不重复跑已有剧情 E2E。

先对照 `ProjectWorkbenchTab.test.tsx`、`ProjectWorkbenchTab.glm-m.test.tsx`、`ProjectWorkbenchTab.kimi-workflows.test.tsx`、`ActorMode.test.tsx`、`ActorMode.glm-next-wave.test.tsx`、`CutsceneTab.test.tsx`、`CutsceneTab.glm-ui-wave.test.tsx`、`CutsceneTab.kimi-workflows.test.tsx` 和已归档 `TEST-COVERAGE85-GLM-EDITOR-1` 的 fullName 排重。

## 硬约束

- 走真实组件 caller、合法 typed project/session/asset 输入，断言 session patch、序列化值、确认态或可观察 DOM 业务结果；不只断言渲染存在或调用次数。
- React 更新全部在 act 内，afterEach 必须 unmount/清理 listener、object URL、session；不依赖固定临时路径或真实用户数据。
- 禁止 `as unknown as`、`as never`、`@ts-expect-error`、skip、ignore、扩大 timeout、业务核心 mock 和私有 debug state。
- 反控只接受精确业务 AssertionError；保存原始/变异/恢复三态、执行集、stdout/stderr、三态 hash 和清理证明。

## 验证与交付

交付逐合同 source/caller/input/oracle/fullName 排重账、fresh identity、反控证据、必要截图哈希、typecheck、定向/相邻测试、lint 0/0/0、docs/diff 结果。质量合同闭合后才可交 Codex；覆盖率只记录到整体 main。

## 当前模式推进记录

- Codex 范围/前提核验: verified（已点名旧测试与已归档 Editor 卡排重）
- Coding Owner / 隔离分支: GLM / `codex/glm-editor-authoring-panels-r1`
- build 准入: Codex build allowed（仅上述作者面板合同）
- Codex 独立验收: pending
- done 准入: blocked，须先完成独立验收

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-AUTHORING-PANELS-1 的 Coding Owner（GLM）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，以及已归档
docs/ops/archive/tasks/done/TEST-COVERAGE85-GLM-EDITOR-1.md。
只在分支 codex/glm-editor-authoring-panels-r1 的隔离工作树中工作。
先逐项读取并对照 ProjectWorkbenchTab.test.tsx/ProjectWorkbenchTab.glm-m.test.tsx/ProjectWorkbenchTab.kimi-workflows.test.tsx、ActorMode.test.tsx/ActorMode.glm-next-wave.test.tsx、CutsceneTab.test.tsx/CutsceneTab.glm-ui-wave.test.tsx/CutsceneTab.kimi-workflows.test.tsx 的旧 fullName 与业务断言，再实现本卡仍未证明的合同。
只写新测试、合法 fixture 和本卡证据；不得改产品、旧测、共享配置、baseline、真实项目数据或其它卡目录。
所有 React 更新在 act 内，严格清理 listener/object URL/session；禁止强转、ignore、skip、扩大 timeout、私有 debug state 或业务核心 mock。
反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；视觉只做功能性界面最小证据。
交付时跑定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check，提交完整 SHA。
输出 accept 或 counter；不得把覆盖率百分比或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```

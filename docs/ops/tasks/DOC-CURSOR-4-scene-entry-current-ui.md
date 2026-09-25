# DOC-CURSOR-4 — 场景入场指南当前 UI 事实核对

Status: draft
Phase: phase2 documentation
Capability: 只读事实核对，不改变产品或现行指南
Contribution Owner: Cursor
Review/Integration Owner: Codex
Branch: `codex/cursor-scene-entry-truth-r1`（独立 worktree）
Evidence freeze: `9540f059`（开卡时 main；交付以实际 main 起点记录）

## 目标与边界

上一轮 DOC-CURSOR-1 的 H7 因把**未被现行页面渲染的** `ScriptTree.tsx:673` 文案当成用户可见事实而改判待核；
五份指南修订卡没有触碰 [`scene-entry-authoring.md`](../../phase2/guides/scene-entry-authoring.md)。
本卡只核这份指南的六类用户可见/作者操作声明，交一份可用于 Codex 窄修订的事实表。
它不是产品 UI 修改准入；不可因旧文案存在就推断当前页面有同名按钮。

现行生产入口的一手锚点：`App.tsx:3200` 渲染 `CanonicalSceneScriptWorkspace`，
`SceneScriptWorkspace.tsx:295-321` 场景 owner 走 `ScriptSceneHookInspector`，
`ScriptSceneHookInspector.tsx:185` 走 `CanonicalScriptFlowEditor`，
`ScriptEditor.tsx:3699-3800` 控制“画面出现前 / 脚本正文”；
`ScriptTree.tsx:660-807` 是旧组件文本，须先证明有生产渲染路径才能当当前 UI 证据。
数据/校验参照 [`script-system.md:156-164`](../../phase2/specs/script-system.md#场景入场呈现) 与
`packages/content/src/author-script-core.ts` 的初始节点/`allowSceneEntry` 守卫；源码和指南冲突时只报告，
不由 Cursor 擅改产品或补造 UI。

## 六项逐句核对

| ID | 原指南待核事实 | 最低证据 |
|---|---|---|
| H7-1 | “进场脚本”的当前可达入口、是否真有 `prepare/reveal/body` 三块 | App 到实际渲染组件的调用链、现行可见标签；别引用未渲染 `ScriptTree` |
| H7-2 | 未显式契约时是否显示“默认场景淡变” | 无 entry 的合法流程输入及实际组件分支/渲染文案；若源码无法确定浏览器所见，标待实测 |
| H7-3 | “恢复默认”是否存在及动作是否删除初始 `entry` | 当前可达控件、事件→命令→状态的链；纯数据删除语义和按钮可见性分列 |
| H7-4 | 仅初始 onEnter 节点能编辑契约，其它 stage/实体/auto/传送/共享是否隐藏 | 生产 UI owner/slot 门、content guard 两层分证；别把静态 guard 冒充 UI |
| H7-5 | `prepare` 菜单安全目录与保存校验是否同源 | 实际命令选项生产者、正式 validator 接口和反例；不可只看文档规则 |
| H7-6 | PAL `s001` 开场样例是否为当前工程真实可读内容 | 有版本/路径/来源的当前内容证据；若 worktree 缺 gitignored 产物，标 `blocked-input`，不发明动作 |

报告逐条分类 `confirmed / wrong / pending-ui / blocked-input`，给 `file:line`、实际调用域、
可证伪反例、最窄替换句或不修改理由。既有 H7 的 `ScriptTree` 误归因是已知项，不重复计“新发现”。
文字建议不得扩大为“恢复旧组件”或新产品交互方案。

## 实施白名单与验收

- 唯一写入 `docs/testing/cursor-scene-entry-truth.md`。不改 `scene-entry-authoring.md`、
  `script-system.md`、packages、测试、配置、资产、基线、其它任务卡或看板；不运行迁移、保存、覆盖率或 E2E。
- 优先只读源码、现有测试和 `git show`；若当前工具能在**自有 demo/隔离环境**做一次最小浏览器检查，
  可附真实截图及可重建路径，但不得访问/修改 6010 用户正在编辑的项目或把没看过的图说成亲眼验过。
  没有隔离浏览器时把需视觉确认的项保持 `pending-ui`，由 Codex 后验。
- 报告须附源码/注册表版本 SHA、精确改动白名单、`node scripts/docs/check.mjs` 和 `git diff --check` 结果；
  不跑全仓 `check`/coverage。Cursor 提交推送候选后由 Codex 独立 accept/counter；若通过，Codex
  自行修改指南、提交推送并清理分支。当前委派模式不需 Kimi/GLM 固定签字，贡献者自验不作独立证明。

## 阶段门与交接

- Codex：已核该 H7 残项、现行调用链与排除项；**draft 只读取证 allowed**，不开放产品 build。
- done：材料与正式文案尚未接收；本卡不预签、不预宣称指南已修。

### 下一位 Cursor 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 DOC-CURSOR-4；先读 AGENTS.md、CLAUDE.md、
docs/phase2/READ-FIRST.md、本卡 docs/ops/tasks/DOC-CURSOR-4-scene-entry-current-ui.md、
docs/testing/cursor-docs-hygiene-review.md 的 H7 反证及 docs/phase2/guides/scene-entry-authoring.md。
从包含本卡的 origin/main 建独立 worktree /Users/zhangxu/illegal/type-pal-cursor-scene-entry，
分支 codex/cursor-scene-entry-truth-r1；接手前核干净工作树。
只做 H7-1～H7-6 逐句只读核对。以 App→SceneScriptWorkspace→ScriptSceneHookInspector→
CanonicalScriptFlowEditor 的真实渲染链为准，不能用未渲染 ScriptTree 的字符串证明当前 UI。
给每项一手 file:line、可证伪观察、confirmed/wrong/pending-ui/blocked-input 分类与最窄替换句；
缺合法当前 PAL 输入就明确待证，不编样例。唯一写入 docs/testing/cursor-scene-entry-truth.md；
不改正式指南、产品、测试、基线或其它共享文档，不碰用户 6010 工程、不跑覆盖率/E2E/迁移。
跑 node scripts/docs/check.mjs 与 git diff --check，提交推送精确候选 SHA 交 Codex 独立接收。
Cursor 不自行合 main、不标 done；Codex 通过后会直接修指南并集成推送，无需再请用户重复批准。
```

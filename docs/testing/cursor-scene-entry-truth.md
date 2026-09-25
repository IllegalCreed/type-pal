# DOC-CURSOR-4 — 场景入场指南当前 UI 事实表

状态：Cursor 只读取证完成；待 Codex 独立接收后自行窄修指南。未改正式指南、产品或测试。
任务：[DOC-CURSOR-4](../ops/archive/tasks/done/DOC-CURSOR-4-scene-entry-current-ui.md)。
工作树起点 / 源码 SHA：`dbf791067ef9c420c4462b1640eef025aa163fb1`。
未开 6010、未访问用户工程、未跑覆盖率/E2E/迁移。无隔离浏览器，凡需肉眼确认像素的项保持 `pending-ui`。
已知项：未渲染的 `ScriptTree` 文案不能证明当前 UI（[DOC-CURSOR-1 H7 反证](cursor-docs-hygiene-review.md:47-65)）；本回执不把它计作新发现。

## 现行生产渲染链（本卡指定）

1. `packages/editor/src/ui/App.tsx:1578`：脚本抽屉仅在 `module=scene` 且 `subpage=workspace`（场景编排）可用。
2. 同文件 `:3136-3144`：工具栏「📜 脚本」切换抽屉；`:3149` / `:3200` 抽屉打开后渲染 `CanonicalSceneScriptWorkspace`，关闭时是 `SceneCanvas`。
3. `SceneScriptWorkspace.tsx:202-212` 页签含「进场脚本」「传送出口」（选中实体时另有「交互脚本」「自动行为」）。
4. 同文件 `:316-320`：`owner === 'scene'` 时渲染 `ScriptSceneHookInspector`，`slot` 为 `onEnter` 或 `onTeleport`。
5. `ScriptSceneHookInspector.tsx:50-53` 把 `onEnter` 标成「进场脚本」；`:185-209` 渲染 `CanonicalScriptFlowEditor`。
6. `ScriptEditor.tsx:3986-4032` 把 `stage.entry?.prepare` 与 `stage.body` 交给 `CanonicalFlowBodyTabs`。
7. `ScriptEditor.tsx:3742-3753`：`prepare === undefined` 时**只**渲染正文编辑器，无页签。`:3755-3812`：有 prepare 时页签为「画面出现前 / 脚本正文」。

`ScriptEditor.tsx:66` 只从 `ScriptTree.js` 导入 `describeScriptCommand`。`SceneEntrySections` /「恢复默认」仅存在于 `ScriptTree.tsx:660-813`，生产页面不渲染该组件。

## 逐项核对

| ID | 指南原文 | 分类 | 一手锚点与可证伪观察 | 最窄替换句或不改理由 |
|---|---|---|---|---|
| H7-1 | 「选中场景的“进场脚本”时，流程的初始节点可用三个区域编辑入场契约」：入场准备 / 呈现 / 呈现后脚本（`scene-entry-authoring.md:7-12`） | **wrong** | 可达入口是场景编排 →「📜 脚本」→ 页签「进场脚本」，不是单独的“进场脚本模块”。当前编辑器只有两个页签「画面出现前 / 脚本正文」，且仅当 `stage.entry?.prepare` 已存在。全 `ScriptEditor.tsx` 无 `reveal` /「呈现」/ 逐像素毫秒控件。组件测试 `ScriptEditor.test.tsx:1336-1360`：有 entry 时默认看见「脚本正文」，点「画面出现前」才出现准备编辑器。 | 改为：「在场景编排打开脚本抽屉，选“进场脚本”。若该方案初始步骤已有 `entry`，用“画面出现前 / 脚本正文”两个页签编辑 `prepare` 与 `body`。呈现（`reveal`）没有独立编辑区。」不要写回三块 `ScriptTree` 分区名。 |
| H7-2 | 「未显式启用入场契约时，界面显示“默认场景淡变”」（`:16`） | **wrong** | 仓库内「默认场景淡变」只出现在本指南。现行链在 `prepare === undefined` 时直接出正文编辑器（`ScriptEditor.tsx:3742-3753`），无默认淡变提示。旧组件文案是「默认淡出 → 切场 → 淡入」（`ScriptTree.tsx:673`），不是指南用词，且未渲染。未跑浏览器；该结论来自当前渲染组件源码与测试，不是肉眼截图。 | 删掉“界面显示默认场景淡变”。可保留数据句：「未写 `entry` 时数据不放空对象；引擎走普通切场淡变。」不要用 ScriptTree 那句替换当前 UI。 |
| H7-3 | 「“恢复默认”会删除 `stage.entry`…」（`:18`） | **wrong**（可见性） / 数据语义未由当前 UI 暴露 | 「恢复默认」按钮只在 `ScriptTree.tsx:806-808`，`onChange(undefined)` 才会删 entry。`CanonicalScriptFlowEditor` 没有创建/删除 `entry` 或 `reveal` 的控件；`onPrepareChange` 仅在 `stage.entry` 已存在时改 `prepare`（`ScriptEditor.tsx:4011-4022`）。因此当前页面看不到、也点不到该动作。 | 删掉当前界面“恢复默认”操作说明。不要建议恢复旧按钮或新产品交互。数据层“去掉 `entry` = 恢复引擎默认淡变”可留在规格，不写成可见按钮。 |
| H7-4 | 显式契约只属于 onEnter 初始节点；实体/auto/传送/共享不展示三区（`:17,21`） | **confirmed**（校验） / **wrong**（“三区/仅此处可编辑”的 UI 说法） | 内容守卫：`author-script-core.ts:956-958,990-992` 仅 `allowSceneEntry && id===initial`；`author-script-core.ts:1108-1110` 只给 `hooks.onEnter` 开该旗标。反例见 `author-script-current.boundaries.test.ts:24-53`。共享脚本走 `CanonicalScriptBodyEditor` 正文（`SharedScriptTab.tsx:309-312`），无 entry 页签。实体/传送复用同一 `CanonicalScriptFlowEditor`：UI **不**按 owner/slot 隐藏“入场三区”（因为三区已不存在）；只要某 stage 带 `entry`，就会出现「画面出现前」。UI 也没有“设为显式入场”，作者不能从当前控件给非 onEnter 节点新加契约。 | 校验句保留。UI 句改为：「当前页面没有单独的入场三区。共享脚本只有正文。进场/传送/实体方案共用流程编辑器；准备页签只在该步骤已有 `entry.prepare` 时出现。」不要写成“只有进场页才画三块控件”。 |
| H7-5 | 「入场准备的命令菜单与 content 安全目录共用同一判定源。不安全命令既不出现在菜单，也会在保存校验时 fail-loud。」（`:19-20`） | **wrong** | 安全表是 `packages/content/src/script.ts:267-350` `SCENE_ENTRY_PREPARE_SAFETY`（`dialog`/`fade`/`loadScene`/`moveParty` 为 `blocked`，`playMusic`/`teleportParty` 为 `safe`）。现行作者 `checkSceneEntry`（`author-script-core.ts:793-796`）只跑 `checkBaseAuthorCommands`，**不**查该表。`packages/editor` 零引用该表。菜单生产者 `insertionGroups`（`ScriptEditor.tsx:2832-2918`）对 prepare/body 相同，常用项含对话、淡入/淡出、切换场景、队伍走到。可证伪：在「画面出现前」插入 `dialog` 仍会出现在菜单；当前作者校验不会因 kind 被表标 blocked 而单独 fail-loud。运行时旧 `checkStages`（`script.ts:729-739`）才会按该表拒绝。 | 改为：「准备命令的安全目录在 `SCENE_ENTRY_PREPARE_SAFETY`。当前作者保存校验与流程编辑器菜单都还没有接上这份表；菜单与正文共用 `insertionGroups`。」不要写成菜单已过滤或当前保存已 fail-loud。 |
| H7-6 | PAL `s001` 第一段在界面中应读作：准备 `音乐 31`→`队伍瞬移 (59,-23)`；呈现 `逐像素 2160ms`；正文从李大娘对话开始（`:25-29`） | **confirmed**（入库内容） / **pending-ui**（界面读法） | 跟踪文件 `projects/pal/content/scenes/s001.json`（本 SHA 树内）。`hooks.onEnter.initial=default`，「默认进场行为」初始 stage `initial` 有 `entry`：`prepare` = `playMusic music.pal.031` + `teleportParty {col:59,row:-23}`；`reveal` = `{kind:dither,ms:2160,source:previousPresentedFrame}`；`body[0]` 为 `dialog` 且 `actor=li-daniang`。与指南三个事实一致。其它 variants（`legacy-001` 等）无 entry，不能冒充“第一段”。界面上作者会在「画面出现前」看到两条准备指令、在「脚本正文」看到对话；**看不到**名为「呈现 / 逐像素 2160ms」的第三区。未做隔离浏览器打开 s001。 | 内容样例可留，但改口：「默认进场方案的数据是…；页面用画面出现前/脚本正文两页签呈现 prepare/body，reveal 只在数据里。」不要承诺界面三块分区。缺浏览器故不写“已亲眼验过”。 |

## 分类小计

| 分类 | ID |
|---|---|
| confirmed | H7-4 内容守卫；H7-6 入库 s001 默认方案数据 |
| wrong | H7-1 三区/入口；H7-2 默认场景淡变；H7-3 恢复默认可见可点；H7-4 三区 UI 门；H7-5 菜单=安全目录 |
| pending-ui | H7-6 在真实页面上如何“读作”三句（无隔离浏览器） |
| blocked-input | 无（s001.json 已跟踪） |

未猜产品应长成什么样。未建议恢复 `ScriptTree` 或新做呈现控件。

## 交付验证

- 相对 `dbf79106`：本回执 + `docs/testing/README.md` 一条索引（`check.mjs` 目录清单要求；未改指南正文）。
- 分支：`codex/cursor-scene-entry-truth-r1`（`/Users/zhangxu/illegal/type-pal-cursor-scene-entry`）。
- 文档检查与 `git diff --check` 见提交说明。

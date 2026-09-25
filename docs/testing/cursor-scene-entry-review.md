# DOC-CURSOR-4 — Codex 独立接收与 H7 窄修订

## 后续接入（2026-09-25）

用户明确要求通过后直接合并推送；Cursor 回执 `31618c0d` 已以 `b7b9df35` 选择性接入 main，Codex 现行指南窄修 `60aa0e1d` 沿用。任务卡归档 done。以下“候选仍隔离/任务 draft”是接入前历史状态；prepare 安全目录产品缺口仍另排，不借本卡关闭。

2026-09-25。Cursor 只读候选 `31618c0d2a92be69813acc73cdcd3a911c63214f`（对 `dbf79106` 仅一份回执和 `docs/testing/README.md` 导航一行）：**accept，H7-1～H7-6 无阻断 counter**。候选材料仍隔离，未整体合 main；本席独立修改现行指南，不把 Cursor 自验当作独立证明。任务按用户本轮要求暂留 draft、不标 done。

## 一手复核

- 可达链：`App.tsx:1577,3136-3144,3200` 仅场景编排可开脚本抽屉；`SceneScriptWorkspace.tsx:202-212,315-321` 的「进场脚本」进入 `ScriptSceneHookInspector.tsx:185-209`；后者渲染 `CanonicalScriptFlowEditor`。`ScriptEditor.tsx:3742-3753` 在 `prepare` 缺席时只出正文；`:3755-3812` 已有 prepare 时才出「画面出现前 / 脚本正文」两页签。现行组件测试 `ScriptEditor.test.tsx:1330-1360` 实际渲染/切换了这两页签；`ScriptTree` 仅作为 `describeScriptCommand` 导入，不是此页面的控件来源。未开用户 6010 页面，视觉像素仍非本席证据。
- 数据门：`author-script-core.ts:956-959,990-993,1108-1110` 只允许 `onEnter` 的初始 stage/state 带 `entry`；当前流程编辑器只会更新已有 `prepare`（`ScriptEditor.tsx:4011-4022`），没有 `reveal` 参数控件、创建/删除 entry 或「恢复默认」操作。`script-system.md:156-164` 的数据合同不等于这些操作已在 UI 上实现。
- 默认切场：Reforge 当前切场宿主 `main.ts:2256-2274,2299-2303` 在无 `onEnterEntry` 时执行常规 fade-out/in；因此数据上缺 `entry` 与普通淡变成立，但不能写成当前页面有“默认场景淡变”提示。
- 安全目录与作者守卫分离：`script.ts:267-350` 标记 `dialog/fade/loadScene/moveParty` 等为 `blocked`；当前 `ScriptEditor.tsx:2832-2918,3162` 的插入组不据 prepare 分流。`author-script-core.ts:793-796` 检查 prepare 的普通作者命令形状，**未按 safety 值筛选**；`project-io.ts:229` 的保存前诊断又走 `validateAuthorScenes`。本席从已跟踪 `s001` 默认方案复制其合法 `dialog` 到 `entry.prepare`，只读调用 `validateAuthorScenes([scene])` 得到 `accepted`。因此原指南“菜单不出现且保存 fail-loud”是确定错误。产品为何未连上安全目录是独立后续缺陷，不借文档卡修改产品，也不推断运行时结果。
- `projects/pal/content/scenes/s001.json` 已跟踪：`hooks.onEnter.initial=default`，其初始 stage 的 prepare 是 `playMusic music.pal.031` 与 `teleportParty(59,-23)`，reveal 是 dither 2160ms/previousPresentedFrame，body 首条为李大娘对话。数据样例可保留；“界面三块读作”不成立，浏览器显示细节因未开隔离实例不作肉眼结论。

候选 `node scripts/docs/check.mjs` PASS、`git diff --check dbf79106..31618c0d` exit0；本席正式修订仅 `docs/phase2/guides/scene-entry-authoring.md` 的现行 UI 描述及作者提示，保留数据合同与 s001 样例，不修改产品、测试、脚本、基线或 Cursor 报告。当前内容安全缺口需另行优先级裁定/修复，不能让错误指南掩盖它。

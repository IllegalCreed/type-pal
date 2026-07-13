# W7E-0 - 空白工程新场景地图引用止血

Status: draft
Owner: Codex
Reviewer: Opus + GLM
Phase: phase2
Capability: W3 / W7 / E1

## 目标

修复空白工程从自有地图场景新建场景时被错误写成 `{ reuseOriginalMap: 0 }` 的断链：新场景应完整保留当前场景的地图引用类型与参数，保存、重开和撤销后仍一致。

本卡是 W7E schema 改造前的最小止血，不引入 map index，也不改变当前公开内容 schema。

## 范围

- `AddSceneCommand` 不再只接收原版地图数字，而是接收并防御性复制完整 `SceneMap` 判别联合。
- `App.tsx` 新建场景时传入当前 `scene.map`，不再执行 `reuseMapNum(scene.map) ?? 0`。
- 自有地图场景新建场景后，两个场景暂时可以共享同一个 `{ ownMap: path }`；这是按钮现有“复用当前场景地图”语义，不复制地图文件。
- 原版复用地图继续保留 `reuseOriginalMap` 与可选 `room`，不得丢参数。
- 补 `apply / invert / save / reload` 测试，覆盖自有地图与原版复用地图两支。
- 范围外：独立地图库、稳定 map id、场景地图选择器、地图复制/删除；全部由 W7E 完成。

## 上下文锚点

- 必读：`AGENTS.md`、`docs/phase2/READ-FIRST.md`、`docs/ops/tasks/ED-1-editor-authoring-closure-audit.md`。
- 空白种子使用自有地图：`packages/editor/src/core/seed.ts:130`。
- 当前错误回退：`packages/editor/src/ui/App.tsx:580`。
- 当前命令固定生成原版地图引用：`packages/editor/src/core/commands.ts:1734`。
- `SceneMap` 真值：`packages/content/src/index.ts:121`；本卡只消费现有联合，不改 schema。
- 相关测试：`packages/editor/src/core/commands.test.ts`、`packages/editor/src/core/project-io.test.ts`、`packages/editor/src/core/seed.test.ts`。
- 不得重新引入：原版地图 0 兜底、根据字段缺失猜地图类型、直接 mutate `EditorState`、为本止血提前造第二套 map registry。
- 后续关系：W7E 会把 `{ ownMap: path }` 显式迁移为稳定 map id；本卡的完整联合传递仍可自然迁移，不应形成永久兼容分支。

## 验证

- 单测：空白种子从 `s000` 新建 `s001`，两者均保留同一 `{ ownMap: "content/maps/start.json" }`，不存在 `reuseOriginalMap: 0`。
- 单测：带 `room` 的原版复用地图新建场景后完整保留地图号与 room。
- 单测：undo 删除新场景，redo 恢复同一地图引用；原场景和地图数据不变。
- 工程 I/O：保存后由正式 loader 重开，新场景仍能解析其地图。
- 门禁：相关 editor 测试、editor typecheck、根 `pnpm check`。
- 浏览器：从空白工程新建第二场景，切换两场景均能显示地图；撤销/重做后无黑屏或报错。

## 推进签字

- build 准入: Codex **agree（2026-07-14）** | Opus pending | GLM pending | 用户豁免 N/A | 结论 blocked
- done 准入: Codex pending | Opus pending | GLM pending | 用户豁免 N/A | 结论 blocked

Codex 立场：完整传递现有 `SceneMap` 是最小且语义正确的修复；它不改 schema、不创建临时地图文件，也不会把 W7E 的 map-id 设计提前塞进止血卡。

## 交接

- 2026-07-14 Codex: 按 ED-1/Opus R3 拆出独立止血卡并给出完整联合传递方案。Evidence: ED-1 P0-1 与本卡验证矩阵。Next: Opus 设计审查；签字未齐，不得实现。

## 下一位 Agent 提示词

```text
接手任务: W7E-0 空白工程新场景地图引用止血（设计审查）
任务卡: docs/ops/tasks/W7E-0-blank-scene-map-reference.md
当前状态: draft；Codex agree，Opus/GLM pending，build blocked
你的角色: Opus，审最小修复的实现可行性、命令可逆性和是否会污染 W7E 正式 schema
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、docs/ops/tasks/ED-1-editor-authoring-closure-audit.md 的 P0-1/R3
请你做: 对“AddSceneCommand 接收并复制完整 SceneMap；App 直接传 scene.map；自有地图暂时共享同一路径”签 agree，或给 counter+可落地替代方案；检查测试是否覆盖 own/reuse+room/undo-redo/save-reload
不要做: 不改实现文件；不引入 map index；签字未齐不得推进 build
输出要求: 写回 Opus 签字、交接日志与下一位提示词，并提交文档
```

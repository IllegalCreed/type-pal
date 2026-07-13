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

- build 准入: Codex **agree（2026-07-14）** | Opus **agree（2026-07-14;最小语义正确修复——完整 SceneMap 联合传递+防御性复制,不改 schema、不提前 map index、own 共享同 path 是现有 loader 的 path 键控天然支持;测试矩阵 own/reuse+room/undo-redo/save-reload 四支齐;W7E 迁移路径自然(完整联合→id 化零兼容分支)。无必改）** | GLM pending | 用户豁免 N/A | 结论 blocked(待 GLM)
- done 准入: Codex pending | Opus pending | GLM pending | 用户豁免 N/A | 结论 blocked

Codex 立场：完整传递现有 `SceneMap` 是最小且语义正确的修复；它不改 schema、不创建临时地图文件，也不会把 W7E 的 map-id 设计提前塞进止血卡。

## 交接

- 2026-07-14 Codex: 按 ED-1/Opus R3 拆出独立止血卡并给出完整联合传递方案。Evidence: ED-1 P0-1 与本卡验证矩阵。Next: Opus 设计审查；签字未齐，不得实现。
- 2026-07-14 Opus: 设计签 **agree,无必改**。完整联合传递是唯一不猜类型的修法;防御性复制防命令间引用共享;范围外条款挡住 map index 提前混入。Next: GLM 复核;三签齐即可 build(独立于 ED-2/W7E)。

## 下一位 Agent 提示词

```text
接手任务: ED-1 done 复核 + W7E-0/ED-2/W7E 三子卡设计复核(GLM 四卡合并)
四卡: docs/ops/tasks/{ED-1-editor-authoring-closure-audit, W7E-0-blank-scene-map-reference, ED-2-editor-primary-modules, W7E-map-library-scene-binding}.md
当前状态: ED-1 review(Codex+Opus accept,GLM pending);W7E-0/ED-2 draft(Codex+Opus agree,无必改);W7E draft(Codex+Opus agree,附 M1/M2 必改待 Codex 落卡)
你的角色: GLM,覆盖/测试矩阵/一致性复核;只审文档,不改实现
Opus 已过: ED-1 收口忠实(capability 五格逐行对账/R1-R3+S1+S3 定位到子卡条文;唯一余项 S2 已补记 ED-1 后续任务行=ED-3 开卡必带);W7E-0 最小修复+四支测试齐;ED-2 注册表同源+typed 深链+objectId 不偷选第 0 项;W7E schema/升级边界/懒加载/MG2 双表全过,M1=纯 reuse 工程不升 v2 不注入空 index、M2=消费方表补 clone/zip(A5)。
请你复核: (1)ED-1:S2 补记文本与 GLM 自己首轮抽查结论仍一致,签 done accept/counter;(2)W7E-0:测试矩阵(own/reuse+room/undo-redo/save-reload)对 P0-1 复现路径的覆盖,签 agree/counter;(3)ED-2:15 旧页→八模块映射"恰好一次"可测性、跨模块跳转三例是否足够,签 agree/counter;(4)W7E:M1/M2 落卡后的消费方矩阵终版逐层对照实际代码面(content/reforge/editor core/editor UI/migrate/MG2/docs),给漏项差集;测试节对 D1-D5 分期的映射,签 agree/counter。各卡分别写 GLM 行+日志
不要做: 不改实现;子卡三签未齐不 build;ED-1 三方未齐不标 done
输出要求: 四项分别结论、W7E 消费方差集、提交 hash
```

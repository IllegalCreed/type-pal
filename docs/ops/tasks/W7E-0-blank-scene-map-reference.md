# W7E-0 - 空白工程新场景地图引用止血

Status: review
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

- 单测：空白种子从 `start` 新建 `s001`，两者均保留同一 `{ ownMap: "content/maps/start.json" }`，不存在 `reuseOriginalMap: 0`。
- 单测：带 `room` 的原版复用地图新建场景后完整保留地图号与 room。
- 单测：undo 删除新场景，redo 恢复同一地图引用；原场景和地图数据不变。
- 工程 I/O：保存后由正式 loader 重开，新场景仍能解析其地图。
- 门禁：相关 editor 测试、editor typecheck、根 `pnpm check`。
- 浏览器：从空白工程新建第二场景，切换两场景均能显示地图；撤销/重做后无黑屏或报错。

## 推进签字

- Codex: **agree**（2026-07-14）。完整传递现有 `SceneMap` 是最小且语义正确的修复；不改 schema、不创建临时地图文件，也不把 W7E 的 map-id 设计提前塞进止血卡。
- Opus: **agree**（2026-07-14）。完整联合传递是唯一不猜类型的修法；防御性复制防命令间引用共享；范围外条款挡住 map index 提前混入。
- GLM: **agree**（2026-07-14）。测试矩阵四支覆盖 P0-1 复现路径：(1) own 地图新建场景保留 `{ownMap:path}` 不退回 `reuseOriginalMap:0` ✅；(2) reuse+room 完整保留地图号与 room ✅；(3) undo/redo 删除/恢复地图引用一致 ✅；(4) save/reload loader 重开解析 ✅。P0-1 复现路径（App.tsx:580 `reuseMapNum??0` + commands.ts:1734 固定 `reuseOriginalMap`）与修复方案（完整 SceneMap 联合传递+防御性复制）对应。四支测试覆盖了"类型保留+参数保留+撤销一致+持久化一致"四维，无漏环。
- build 准入: **三签齐（Codex + Opus + GLM agree），build allowed。**
- done 准入: Codex **accept**（2026-07-14）| Opus **accept（2026-07-14;四项复验全过——①AddSceneCommand 收完整 SceneMap+structuredClone(测试断言含嵌套 room 深复制 not.toBe);②全 editor 扫描零残留 `?? 0` 回退;③79 项测试绿(ownMap 经 dispatch/undo/redo/防御复制、reuse+room、正式 loader 重开);④6012 实测:新建 opus-w7e0-check 场景→属性面板显示 content/maps/start.json、画布中心亮度 101 非黑→撤销消失→重做恢复(仍 101/仍 start.json)→验证后撤销还原未保存。无返工项）** | GLM **accept（2026-07-14;见下）** | 用户豁免 N/A | **结论：三方 done 前审查签字齐（Codex + Opus + GLM accept），交用户验收。**

### GLM done 前覆盖复验（2026-07-14）

增量范围：fb86b23a（实现）+ 1f677d19（Opus 复验签 accept，仅改任务卡）。未改实现文件，只做文档/测试复验。

**(1) ownMap 新场景引用不退回原版地图 0** ✅
- `commands.ts:1739` 构造签名 `AddSceneCommand(id, map: SceneMap, entry)` — 直接收完整 SceneMap 判别联合。
- `commands.ts:1742` `map: structuredClone(map)` — 防御性深复制，不与源场景共享引用。
- `App.tsx:580` `new AddSceneCommand(id, scene.map, scene.entry)` — 新建入口直接传 `scene.map`，`reuseMapNum(scene.map) ?? 0` 回退已彻底移除。
- AddScene 路径全 editor 扫描零残留 `?? 0` 回退：App.tsx 仅存的两处 `?? 0` 都是 `entry.pos.height` 默认值（:751/:1345），与地图引用无关；MapMode.tsx:384 的 `?? 1` 是"创建新 OwnMap 时借用原版 tileset 作底图"，不在新建场景路径上，属正常复用语义。

**(2) reuseOriginalMap + room 完整保留** ✅
- `structuredClone(map)` 对 `{ reuseOriginalMap, room }` 嵌套结构深复制；commands.test.ts:267-276 断言 `added.map.toEqual(sourceMap)` + `added.map.not.toBe(sourceMap)` + `added.map.room.not.toBe(sourceMap.room)` 三重钉死。

**(3) undo/redo 引用一致** ✅
- `AddSceneCommand.invert`（:1754）按 id filter 删回，不碰其他场景；commands.test.ts:245-258 经真实 `EditSession` dispatch → undo（仅 `['start']` 且 `scenes[0].map` 仍 `ownMap`）→ redo（`s001.map` 仍 `ownMap`）。源场景 `source.map` 未被 mutate（`:250 not.toBe + toEqual` 双断言）。

**(4) serializeProject → loadProjectFrom → loadSceneDef 重开一致** ✅
- project-io.test.ts:177-203 构造 `{ ownMap }` 场景 → `AddSceneCommand.apply` → `serializeProject` 产出文件 → mock source → `loadProjectFrom` → `loadSceneDef(reopened, 'new-room')` 断言 `map: { ownMap: 'content/maps/guijie-minju.json' }`。正式 loader 链全覆盖。

**(5) 未引入 schema/map index 变化** ✅
- fb86b23a `--name-only` 不含 content/schema/index 任何文件；commands.ts 只改 `AddSceneCommand` 消费方式（收 `SceneMap` 联合 + `structuredClone`），不改 `SceneMap` 类型定义（`packages/content/src/index.ts:121` 未触碰）。

**(6) 测试覆盖有效** ✅
- editor 全包 17 文件 144 tests pass（含新增 W7E-0 四支：own dispatch/undo/redo + reuse+room 深复制 + 正式 loader 重开）。
- 四支测试覆盖"类型保留 + 参数保留 + 撤销一致 + 持久化一致"四维，无漏环。

**总结**：四支验证全过，无 schema/map index 变化，测试覆盖有效。**accept**。

## Build：实现与自测

- Coding Owner：Codex。
- 实现：`AddSceneCommand` 改为接收完整 `SceneMap`，构造时用 `structuredClone` 防御性复制；新建按钮直接传 `scene.map`，彻底移除 `reuseMapNum(scene.map) ?? 0` 回退。
- 范围：只改既有联合的消费方式；没有修改 content schema、map index、地图文件复制或删除语义。
- 测试：
  - 空白种子 `start -> s001` 保持同一 `ownMap`，并通过真实 `EditSession` 验证 dispatch / undo / redo。
  - 原版复用地图完整保留 `reuseOriginalMap + room`，新旧对象及嵌套 `room` 不共享引用。
  - `serializeProject -> loadProjectFrom -> loadSceneDef` 正式链重开后，新场景仍解析为同一 `ownMap`。
- 自动门禁：`pnpm --filter @type-pal/editor check` 全绿（17 文件 / 144 tests）；根 `pnpm check` 全绿（654 个 Biome 文件无错误）。
- 浏览器：`6012` 载入 `projects/e2e-own`，确认 `content/maps/start.json`、canvas 和自有地图像素均正常，控制台无 warning/error。当前内置浏览器自动化明确不支持页面 `prompt()`，因此“点新建 -> 输入 id -> 切换两场景 -> undo/redo”未伪报完成，交 Opus 用可处理原生 prompt 的浏览器补验。

## 交接

- 2026-07-14 Codex: 按 ED-1/Opus R3 拆出独立止血卡并给出完整联合传递方案。Evidence: ED-1 P0-1 与本卡验证矩阵。Next: Opus 设计审查；签字未齐，不得实现。
- 2026-07-14 Opus: 设计签 **agree,无必改**。完整联合传递是唯一不猜类型的修法;防御性复制防命令间引用共享;范围外条款挡住 map index 提前混入。Next: GLM 复核;三签齐即可 build(独立于 ED-2/W7E)。
- 2026-07-14 Codex: 实现与自动门禁完成，状态转 `review`。Evidence: editor 144 tests、根 `pnpm check`、`6012` 自有地图像素验证；原生 prompt 自动化限制已明确。Next: Opus 实现复验并补浏览器新建/撤销/重做动作；不得标 done。

- 2026-07-14 Opus: 实现复验签 **accept**(fb86b23a)。structuredClone 防御复制+嵌套 room 深复制断言;回退零残留;79 测试绿;6012 全流程实测(新建→start.json 非黑屏 101→undo/redo→还原)。Evidence: done 准入行。Next: GLM 复验;三签齐后可 done。未改实现文件。
- 2026-07-14 GLM: done 前覆盖复验签 **accept**(fb86b23a + 1f677d19)。四支逐条：①AddSceneCommand 收完整 SceneMap + structuredClone，App.tsx:580 直传 scene.map，AddScene 路径零 `??0` 残留(两处 height 默认值无关)；②reuse+room 嵌套深复制三重 not.toBe 断言；③undo/redo 经真实 EditSession + 源场景 not.toBe+toEqual 双断言防 mutate；④serializeProject→loadProjectFrom→loadSceneDef 正式 loader 链重开 ownMap 一致；⑤fb86b23a --name-only 不含 content/schema/index，SceneMap 类型定义未触碰；⑥editor 17 文件 144 tests pass。Evidence: done 准入 GLM 复验段。Next: 交用户验收，用户点头方 done。未改实现文件。

## 下一位 Agent 提示词

```text
接手 W7E-0 实现复验。
任务卡: docs/ops/tasks/W7E-0-blank-scene-map-reference.md
当前状态: review；Coding Owner=Codex；三方设计 agree 已齐。
实现提交: 由用户随本提示词附上 Codex 最新 W7E-0 提交 hash。

先读 AGENTS.md、docs/phase2/READ-FIRST.md 和任务卡上下文锚点。请审查：
1. AddSceneCommand 是否完整、防御性复制 SceneMap，且没有引入 map index/schema 变化；
2. App 新建入口是否彻底移除 ownMap -> reuseOriginalMap:0 回退；
3. ownMap、reuse+room、undo/redo、serialize+正式 loader 重开四支测试是否有效；
4. 在 http://localhost:6012/ 实测：从 start 新建场景，输入唯一 id，确认新场景仍显示 content/maps/start.json 且地图非黑屏；再撤销/重做并复查。

通过请在任务卡 done 准入与交接日志写 Opus accept；不通过写 counter、文件位置和返工条件。
只审实现和补验证记录，不得另改实现文件，不得标 done。
```

# 编辑器 B1 · 逻辑层实现计划(给 GLM)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把历史实施计划接入 `plan-status-v1`，并追加 `archive-record-v1` 历史 overlay。原计划的日期、checkbox、执行分工、数字、结果词、未知和链接均在 quote 中保全；本页不授予当前待办、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：B1 逻辑层：布置命令集、EditSession 脏标记、工程 IO 序列化/FSA 写盘、pixel/grid 命中测试；纯 TS 与 React/UI 分工边界。
- 原始时间范围：原文未单列日期；固定 source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，source SHA `4a5bac7982d8d59a95a7b069272da3d100464ce3acdc7a5777e8644a5c3e98e7`。
- 当前时间状态：历史归档；本页只说明当时计划的目的和边界，不续写执行期限。

## 里程碑

- 原始章节/里程碑：全局约束；契约(Claude 照此搭 UI;签名钉死,别改名)；Task L1 · 布置命令集；Task L2 · EditSession 脏标记；Task L3 · 工程 IO:读入 ↔ 序列化落盘；Task L4 · 命中测试；总验收 / 分工；Self-Review。
- 计划步骤、Task 编号、分工和 checkbox 的原始含义均保留在下方 quote；它们不构成今天的 build 准入。
- 本次治理里程碑：完成具体语义分栏、历史 overlay、源/after SHA 和继任入口登记。

## 当前状态

- 当前文档状态：`historical` / `archive`；正文状态信号：3:> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。；4:> 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。；197:## Self-Review
- 历史结论：编辑器 B1 · 逻辑层实现计划(给 GLM)：这是 plan-status，当前文档状态为 historical。全文 203 行、9 个标题；摘要/首段为「> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。」。属于历史/归档材料，不能单独证明当前实现。
- 当前能力、实现结果和任务排序必须从继任规范、代码、看板/任务卡和新的独立证据读取。

## 阻塞与决策

- 历史冲突/未决：
- FSA 真写、UI、字段形状和依赖 B0 的契约是历史计划；需核当前 editor core 与 current specs。
- checkbox 和 Self-Review 不能证明命令/undo/save 已通过。
- 停止线：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；FSA 真写、UI、字段形状和依赖 B0 的契约是历史计划；需核当前 editor core 与 current specs。
- 旧计划中的 done/open/待审/浏览器验收词只保留为日期化证据，不能改写为 current。

## 下一步

- 继任入口：docs/phase2/specs/editor-architecture.md；当前 editor/src/core；project-lifecycle spec。
- 若需重新执行：先建立新的 task card，核对当前 primary source、合法输入、版本范围、business oracle、可证伪观察和独立验收；不得直接沿用本页步骤。
- 本次迁移完成后仍需候选独立接收；全量 1838 目标保持 active/build。

## 历史范围

- 原始范围：phase2 archive plan；日期/版本：原文未单列日期；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原文 202 行 / 12019 bytes。
- 归档原因：计划包含当时的执行分工、接口、checkbox 和验收步骤，当前合同已经由后继规范/代码承接。

## 原始结论

- 编辑器 B1 · 逻辑层实现计划(给 GLM)：这是 plan-status，当前文档状态为 historical。全文 203 行、9 个标题；摘要/首段为「> **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。」。属于历史/归档材料，不能单独证明当前实现。
- 保留原始结论的历史适用范围；新增章节不把计划结果提升为当前实现。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `4a5bac7982d8d59a95a7b069272da3d100464ce3acdc7a5777e8644a5c3e98e7`；标题锚点：1:编辑器 B1 · 逻辑层实现计划(给 GLM), 14:全局约束, 24:契约(Claude 照此搭 UI;签名钉死,别改名), 52:Task L1 · 布置命令集, 108:Task L2 · EditSession 脏标记, 133:Task L3 · 工程 IO:读入 ↔ 序列化落盘, 168:Task L4 · 命中测试, 191:总验收 / 分工, 197:Self-Review。
- 原始链接、代码、表格、checkbox 与状态词在下方逐行 quote 保留；本轮未运行计划中的 runtime/E2E/视觉/coverage。

## 当前有效性

historical。当前不把计划步骤、Self-Review、done/open 标签、浏览器 gate 或历史数字视为现行契约或执行证据。
- 当前不得外推：不得把历史计划、checkbox、Self-Review、done/待审标签或浏览器验收步骤提升为 current contract、runtime/E2E/visual/coverage 证据；FSA 真写、UI、字段形状和依赖 B0 的契约是历史计划；需核当前 editor core 与 current specs。

## 继任文档

- current canonical / 复核入口：docs/phase2/specs/editor-architecture.md；当前 editor/src/core；project-lifecycle spec。
- supersedes / superseded-by：本页替换旧的 governed-legacy 结构展示，但不替换原始历史语义；当前事实由继任规范/代码和独立 review 决定。
- 重新启用条件：新的源版本、适用范围、合法输入、oracle、可证伪观察和独立接收。

## 原文保全

固定源 SHA `4a5bac7982d8d59a95a7b069272da3d100464ce3acdc7a5777e8644a5c3e98e7`；以下只增加 quote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 编辑器 B1 · 逻辑层实现计划(给 GLM)
>
> > **历史设计/计划**：本页保存当时的接口、分工和实施步骤，不作为今天的待办或准入。
> > 当前能力见 [能力地图](../../capability-map.md)，实际工作从 [看板](../../../ops/archive/board-history/board-20261004.md) 进入。
>
> > **执行者**:GLM(全非视觉:命令集 / 会话脏标记 / 工程 IO / 命中测试,纯 TS,`pnpm check` 可验)。
> > **Claude 并行**:React 外壳 + 画布 + 交互(照下方**契约**接 GLM 这层)。**GLM 只碰 `editor/src/core/`,不碰任何 React/UI 文件**——两边靠契约汇合,不撞车。
> > 依据:[editor-design.md](../designs/editor-design.md)(§4 命令/undo · §11 布局)· [editor-b0-plan.md](editor-b0-plan.md)(B0 的 `EditSession`/`Command`/`MoveEntityCommand` 已在,照那套)。先读 [READ-FIRST](../../READ-FIRST.md)。
>
> **目标**:把布置模式背后的**逻辑/数据/落盘层**做出来——增删改实体/场景的命令、会话脏标记、工程读入↔序列化落盘、画布命中测试。UI(Claude)照契约调它们。
>
> **架构**:全部纯 TS 操作 B0 已有的 `EditorState`(= `ContentBundle & { manifest }`);一切改动走 `Command`(不可变、apply/invert),接 B0 的 `EditSession` → undo/redo 天生一致。
>
> ## 全局约束
>
> - **纯 TS、无 React/无 DOM**(除 FSA 写盘那一个 IO 壳);GLM **只改 `packages/editor/src/core/`**。
> - **不可变**:命令不得原地 mutate 传入 `EditorState`(展开/map 构造新对象;测里「源不变」钉死)。
> - **TS 严格**(base tsconfig):`noUncheckedIndexedAccess`(下标取值先守卫/`!`)、`verbatimModuleSyntax`(纯类型 `import type`)。
> - **最小 diff**;每任务 TDD:先写失败测 → 实现 → `pnpm --filter @type-pal/editor check` 绿 → 单独提交。
> - **需要浏览器的只有 FSA 真写**(L3 的 `writeProject`)——那步 Claude 验;其余纯逻辑 GLM 自验。
>
> ---
>
> ## 契约(Claude 照此搭 UI;签名钉死,别改名)
>
> ```ts
> // —— 命令(editor/src/core/commands.ts,加到现有文件,与 MoveEntityCommand 并列)——
> class AddEntityCommand    implements Command { constructor(sceneId: string, entity: EntityDef) }
> class DeleteEntityCommand implements Command { constructor(sceneId: string, entityId: string) }
> class UpdateEntityCommand implements Command { constructor(sceneId: string, entityId: string,
>                                                  patch: Partial<Pick<EntityDef,'sprite'|'collide'|'interact'>>) }
> class UpdateSceneCommand  implements Command { constructor(sceneId: string,
>                                                  patch: Partial<Pick<SceneDef,'paletteId'|'entry'>>) }
> // MoveEntityCommand(sceneId, entityId, to: GridPos) —— B0 已有,拖动/pos 输入复用它
>
> // —— 会话脏标记(editor/src/core/edit-session.ts 小改)——
> class EditSession { isDirty(): boolean; markSaved(): void /* + dispatch/undo/redo 置脏 */ }
>
> // —— 工程 IO(editor/src/core/project-io.ts 新建)——
> function toEditorState(project: LoadedProject): EditorState        // 只读工程 → 可变工作副本(map→array)
> function serializeProject(state: EditorState): Record<string, unknown>  // 相对路径 → JSON 值(含 manifest.json)
> function writeProject(dir: FileSystemDirectoryHandle,
>                       files: Record<string, unknown>): Promise<void>    // FSA 落盘(Claude 验)
>
> // —— 命中测试(editor/src/core/hit-test.ts 新建)——
> function entityAtCell(entities: EntityDef[], cell: { col: number; row: number }): EntityDef | null
> // 像素→格用 content 的 pixelToGrid(worldX,worldY)→{col,row},UI 直接调,不在本层
> ```
>
> ---
>
> ## Task L1 · 布置命令集
>
> **Files**:Modify `packages/editor/src/core/commands.ts`(加 4 个命令)
>
> **要点**:全部不可变;`invert(s)` 收「apply 后的态」还原成 apply 前。`Delete` 要**记住被删实体 + 其原索引**,invert 插回原位。`Update*` 要**记住被 patch 覆盖的旧值**,invert 还原。旧值/旧索引在**首次 apply 时捕获**(照 B0 `MoveEntityCommand` 那套)。
>
> - [ ] **Step 1**:写失败测 `commands.test.ts`(补到现有文件)。至少覆盖 Add/Delete 的不可变 + invert:
>
> ```ts
> import { describe, expect, test } from 'vitest'
> import { AddEntityCommand, DeleteEntityCommand, UpdateEntityCommand } from './commands.js'
> import type { EditorState } from './edit-session.js'
> import type { EntityDef } from '@type-pal/content'
>
> const ent = (id: string): EntityDef => ({ id, pos: { col: 1, row: 1, height: 0 }, sprite: 'ghost' })
> function st(): EditorState {
>   return { manifest: {} as any, scenes: [{ id: 's', map: {} as any, entry: {} as any,
>     entities: [ent('a'), ent('b')], dialogues: [] }], characters: [], skills: [], levelUp: {},
>     items: [], locale: {}, sprites: [], startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] } } as any
> }
> const ids = (s: EditorState) => s.scenes[0]!.entities.map((e) => e.id)
>
> test('AddEntity:追加 + 不可变;invert 移除', () => {
>   const s0 = st()
>   const cmd = new AddEntityCommand('s', ent('c'))
>   const s1 = cmd.apply(s0)
>   expect(ids(s1)).toEqual(['a', 'b', 'c'])
>   expect(ids(s0)).toEqual(['a', 'b']) // 源不变
>   expect(ids(cmd.invert(s1))).toEqual(['a', 'b'])
> })
> test('DeleteEntity:移除 + invert 插回原索引', () => {
>   const s0 = st()
>   const cmd = new DeleteEntityCommand('s', 'a') // 删索引 0
>   const s1 = cmd.apply(s0)
>   expect(ids(s1)).toEqual(['b'])
>   expect(ids(cmd.invert(s1))).toEqual(['a', 'b']) // a 回到索引 0,不是末尾
> })
> test('UpdateEntity:改 collide + invert 还原旧值', () => {
>   const s0 = st()
>   const cmd = new UpdateEntityCommand('s', 'a', { collide: true })
>   const s1 = cmd.apply(s0)
>   expect(s1.scenes[0]!.entities[0]!.collide).toBe(true)
>   expect(s0.scenes[0]!.entities[0]!.collide).toBeUndefined() // 源不变
>   expect(cmd.invert(s1).scenes[0]!.entities[0]!.collide).toBeUndefined()
> })
> ```
>
> - [ ] **Step 2**:跑 → 失败。
> - [ ] **Step 3**:实现 4 个命令(不可变更新工具函数可复用 B0 `withEntityPos` 的写法:展开 state → map scenes → map/filter entities)。`UpdateSceneCommand` 同理改 scene 的 paletteId/entry。
> - [ ] **Step 4**:跑 → 过;`pnpm --filter @type-pal/editor check` 绿。
> - [ ] **Step 5**:提交 `feat(editor): 布置命令集(Add/Delete/Update 实体·场景,TDD)`。
>
> **Gate**:`pnpm check` 绿。
>
> ---
>
> ## Task L2 · EditSession 脏标记
>
> **Files**:Modify `packages/editor/src/core/edit-session.ts`
>
> - [ ] **Step 1**:失败测:dispatch 后 `isDirty()===true`;`markSaved()` 后 `false`;markSaved 也触发订阅(保存按钮 ● 要刷新)。
>
> ```ts
> test('脏标记:dispatch 置脏、markSaved 清脏且通知', () => {
>   const sess = new EditSession(st())
>   expect(sess.isDirty()).toBe(false)
>   sess.dispatch(new AddEntityCommand('s', ent('c')))
>   expect(sess.isDirty()).toBe(true)
>   const fn = vi.fn(); sess.subscribe(fn); sess.markSaved()
>   expect(sess.isDirty()).toBe(false)
>   expect(fn).toHaveBeenCalledTimes(1)
> })
> ```
>
> - [ ] **Step 2-4**:加 `private dirtyFlag=false`;`dispatch/undo/redo` 里置 `true`;`isDirty()`/`markSaved()`(置 false + `notify()`)。跑绿。
> - [ ] **Step 5**:提交 `feat(editor): EditSession 脏标记(isDirty/markSaved)`。
>
> **Gate**:`pnpm check` 绿。
>
> ---
>
> ## Task L3 · 工程 IO:读入 ↔ 序列化落盘
>
> **Files**:Create `packages/editor/src/core/project-io.ts`, `packages/editor/src/core/project-io.test.ts`
>
> **⚠ 先核对** `reforge/src/loader.ts` 里 `LoadedProject` 的**实际字段名/形状**(哪些是 by-id 的 Record、哪些是数组),`toEditorState` 据此把 Record 反索引回数组(`Object.values`,保序)。`EditorState`/`ContentBundle` 用**数组**(对齐 JSON 文件)。
>
> - [ ] **Step 1**:失败测(**round-trip 钉真值**:读入→序列化应还原原 JSON):
>
> ```ts
> import { assembleProject } from '@type-pal/reforge' // 或深路径,按 B0 barrel
> import { toEditorState, serializeProject } from './project-io.js'
> // 用 B0 loader.test 里那套 fixture manifest + 5(或6)份 content JSON
> test('round-trip:toEditorState → serializeProject 还原各 content JSON', () => {
>   const project = assembleProject(MANIFEST, JSONS) // JSONS = {characters,scenes,skills,items,locale,sprites}
>   const state = toEditorState(project)
>   const out = serializeProject(state)
>   expect(out['content/scenes.json']).toEqual(JSONS.scenes)
>   expect(out['content/skills.json']).toEqual({ skills: JSONS.skills.skills, levelUp: JSONS.skills.levelUp })
>   expect(out['content/items.json']).toEqual(JSONS.items)
>   // …characters/locale/sprites 同理;manifest.json 的 startWorld 等于 MANIFEST.startWorld
> })
> ```
>
> - [ ] **Step 2**:跑 → 失败。
> - [ ] **Step 3**:实现:
>   - `toEditorState(project)`:`scenes`=project.scenes;`characters`=Object.values(charactersById);`skills`=Object.values(skills map);`levelUp`=project.levelUp;`items`=Object.values(items map);`sprites`=Object.values(spritesById);`locale`=project.locale;`startWorld`=project.manifest.startWorld;`manifest`=project.manifest。(具体字段名以 loader 为准。)
>   - `serializeProject(state)`:按 `state.manifest.content` 的路径映射 → 值:scenes→state.scenes;characters→state.characters;skills→`{skills:state.skills,levelUp:state.levelUp}`;items→state.items;locale→state.locale;sprites→state.sprites(若 manifest.content 有);外加 `'manifest.json'`→ 用 state.manifest 重建(startWorld=state.startWorld)。返回 `Record<路径, 值>`。
> - [ ] **Step 4**:跑 → 过。
> - [ ] **Step 5**:实现 `writeProject(dir, files)`(FSA IO 壳,无需单测,Claude 浏览器验):遍历 files,`rel.split('/')` 逐段 `dir.getDirectoryHandle(seg,{create:true})`,末段 `getFileHandle(name,{create:true})` → `createWritable()` → `write(JSON.stringify(value,null,2)+'\n')` → `close()`。类型用 `FileSystemDirectoryHandle`(DOM lib 已有,editor tsconfig 有 DOM)。
> - [ ] **Step 6**:`pnpm check` 绿;提交 `feat(editor): 工程 IO — toEditorState/serializeProject(round-trip TDD)+ FSA writeProject`。
>
> **Gate**:`pnpm check` 绿(纯核已测);`writeProject` 真写留 **Claude 浏览器实测**(B1 汇合时)。
>
> ---
>
> ## Task L4 · 命中测试
>
> **Files**:Create `packages/editor/src/core/hit-test.ts`, `packages/editor/src/core/hit-test.test.ts`
>
> - [ ] **Step 1**:失败测:
>
> ```ts
> import { entityAtCell } from './hit-test.js'
> const es = [{ id: 'a', pos: { col: 5, row: 6, height: 0 }, sprite: 'x' },
>             { id: 'b', pos: { col: 9, row: 9, height: 0 }, sprite: 'y' }] as any
> test('entityAtCell:命中同 col/row 的实体,否则 null', () => {
>   expect(entityAtCell(es, { col: 5, row: 6 })?.id).toBe('a')
>   expect(entityAtCell(es, { col: 0, row: 0 })).toBeNull()
> })
> ```
>
> - [ ] **Step 2-4**:实现 `entityAtCell` = `entities.find(e => e.pos.col===cell.col && e.pos.row===cell.row) ?? null`(多个同格时取最后一个/最上层可后续定,MVP 取 find 首个即可)。跑绿。
> - [ ] **Step 5**:提交 `feat(editor): 命中测试 entityAtCell(格 → 实体)`。
>
> **Gate**:`pnpm check` 绿。
>
> ---
>
> ## 总验收 / 分工
>
> - **GLM 交付**:L1–L4 全绿(`pnpm --filter @type-pal/editor check`),契约签名与上方一致。**只动 `editor/src/core/`**。
> - **汇合**:Claude 照契约搭 UI(工具栏发命令、Inspector 改字段发 Update*、保存调 serialize+writeProject、画布点选调 pixelToGrid+entityAtCell),`writeProject` 真写 + 全流程 Claude 浏览器实测。
> - **不在本计划**(Claude 做):任何 React 组件、画布视口/叠加层、鼠标交互、像素→屏幕变换、FSA 授权 UI、校验面板 UI。
>
> ## Self-Review
> 1. 覆盖:命令(L1)/脏标记(L2)/读入落盘(L3)/命中(L4)= UI 需要的全部逻辑接口。✅
> 2. 契约先钉:签名集中在「契约」块,Claude 照此接,不撞车。✅
> 3. 无占位:纯函数给了失败测代码;FSA 写盘签名 + 步骤明确。✅
> 4. 不可变/undo:命令走 B0 `Command`,测钉「源不变」+ invert;Delete 记原索引。✅
> 5. 边界:GLM 只 `core/`、纯 TS;需浏览器的(FSA 真写)明确留 Claude。✅
<!-- original-source-quote:end -->

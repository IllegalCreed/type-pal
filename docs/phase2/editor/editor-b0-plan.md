# 编辑器 B0 地基 · 实现计划(给 GLM 开工)

> **执行者**:GLM(全非视觉:补包出口 / schema / 校验 / 纯 TS 核 / 脚手架)。**Claude** 做每个动到引擎渲染或需启动验证的 gate 的**浏览器实测**,并逐任务审。步骤用 `- [ ]` 勾选跟踪。
> **设计依据**:[editor-design.md](editor-design.md)(先读);工程地基背景 [project-design.md](project-design.md);第二阶段铁律 [READ-FIRST](../READ-FIRST.md)。

**目标**:把编辑器要站的地基一次立稳——reforge 变成可被 import 的包 + 抽出可复用的「画一帧场景」;补齐 schema 两缺口(精灵注册表 / 场景调色板);加跨引用校验;起 React 脚手架;写 command/undo 纯核。做完 B1(布置模式)只需往上搭 UI,不返工。

**架构**:编辑器复用 reforge 的渲染(不重写),数据模型在 content 叶子。B0 全是**非视觉、可 pnpm check / 可浏览器烟测**的准备,不含任何编辑 UI 交互(那是 B1)。

**技术栈**:pnpm workspace;content/reforge = TS;editor 新增 React + Vite + `@vitejs/plugin-react`;vitest 测。

## 全局约束(每个任务都隐含)

- **零行为变化(动引擎的任务)**:Task 1/2/3 改到引擎渲染路径,demo **表现必须和现在逐一致**——Claude 浏览器实测钉死。
- **包边界**:editor 依赖 `content` + `reforge`;**不碰 game / pal-extract**;`shared` 只经 reforge 间接、只用冻结解码类型(接受的 D18 债)。
- **纯逻辑与视图分离**:`content` 的 schema/校验、editor `core/` 全是纯 TS(无 DOM、无 React),重度单测。
- **稳定 id**:一切引用走稳定 id/语义名,不用下标(READ-FIRST #5)。
- **最小 diff**:只改本计划列出的;顺手重构要在提交说明讲清。
- 每个任务结束 `pnpm check` 全绿再进下一个;动引擎的额外过 Claude 浏览器 gate。

## 文件结构(先看清边界)

```
packages/reforge/
├── package.json                 [改] 加 main/types/exports → ./src/index.ts
├── src/index.ts                 [新] barrel:导出渲染/资产/loader/collision/renderSceneFrame
├── src/render-scene.ts          [新] renderSceneFrame(纯:clear+scale+renderScene)
├── src/render-scene.test.ts     [新] 委托契约 smoke 测
├── src/main.ts                  [改] 用 renderSceneFrame 替 288-323 内联;精灵/调色板改走 schema
└── src/loader.ts                [改] 载 sprites.json,LoadedProject 加 spritesById

packages/content/
├── src/sprite.ts                [新] SpriteDef 类型
├── src/scene.ts 或 index.ts     [改] SceneDef 加 paletteId?
├── src/validate.ts              [改] 加 validateSprites;scenes 认 paletteId
├── src/validate-refs.ts         [新] validateReferences + ContentBundle + Issue
├── src/validate-refs.test.ts    [新] 跨引用校验测
└── src/index.ts                 [改] re-export sprite / validate-refs

projects/demo/
├── manifest.json                [改] content 加 "sprites"
├── content/sprites.json         [新] [{id,spriteNum,label}]
└── content/scenes.json          [改] scene 加 "paletteId": 0

packages/editor/                 (从占位壳变成 React vite app)
├── package.json                 [改] 加 react/vite 依赖 + dev/build/check 脚本;去掉 lib exports
├── index.html                   [新]
├── vite.config.ts               [新] react() + serveDir(/projects,/extracted) 中间件
├── tsconfig.json                [改] jsx: react-jsx
├── src/main.tsx                 [新] React root(占位壳)
└── src/core/                    [新] 纯 TS 编辑核
    ├── edit-session.ts          [新] EditSession + History
    ├── commands.ts              [新] Command 接口 + 一个示例命令
    └── edit-session.test.ts     [新] undo/redo/订阅测
```

---

## Task 1 · reforge 变可 import 的包 + 抽 renderSceneFrame

**Files**
- Create: `packages/reforge/src/render-scene.ts`, `packages/reforge/src/index.ts`, `packages/reforge/src/render-scene.test.ts`
- Modify: `packages/reforge/package.json`, `packages/reforge/src/main.ts`(288-323 段)

**Interfaces**
- Produces:
  - `renderSceneFrame(ctx: CanvasRenderingContext2D, renderer: Renderer, args: { map: Tilemap; room: CellRect; camera: Camera; sprites: readonly SpriteDraw[]; worldScale: number }): void`
  - barrel `@type-pal/reforge` 导出:`Canvas2DRenderer`, `type Renderer/Camera/CellRect/SpriteDraw`(render.ts);`loadTilemap/loadPalette/loadTileset/loadSprite/decompressGzip`, `type AssetBase/LoadedSprite`(assets.ts);`loadProject/assembleProject`, `type LoadedProject`(loader.ts);`isBlockedAt`(collision.ts);`renderSceneFrame`(render-scene.ts)。

- [ ] **Step 1**:`render-scene.ts` 写 `renderSceneFrame` —— 把 [main.ts:288-323](../../../packages/reforge/src/main.ts#L288) 的「clear → `ctx.save()`/`scale(worldScale)`/`imageSmoothingEnabled=false` → `renderer.renderScene(map, room, camera, sprites)` → `ctx.restore()`」抽成纯函数。**只搬绘制,不搬相机计算/精灵组装**(那两步是调用方的事:游戏走 walk-cycle,编辑器走 idle 帧)。
- [ ] **Step 2**:`render-scene.test.ts` 写委托契约测(canvas 难像素测,测「正确委托」即可):

```ts
import { describe, expect, test, vi } from 'vitest'
import { renderSceneFrame } from './render-scene.js'

test('renderSceneFrame:clear 后按 worldScale 缩放并把参数原样交给 renderScene', () => {
  const calls: string[] = []
  const ctx = { save: () => calls.push('save'), restore: () => calls.push('restore'),
    scale: (x: number) => calls.push(`scale${x}`), set imageSmoothingEnabled(v: boolean) {} } as unknown as CanvasRenderingContext2D
  const renderScene = vi.fn()
  const renderer = { clear: () => calls.push('clear'), renderScene } as any
  const map = {} as any, room = { col: 0, row: 0, cols: 1, rows: 1 }, camera = { x: 0, y: 0 }, sprites: any[] = []
  renderSceneFrame(ctx, renderer, { map, room, camera, sprites, worldScale: 4 })
  expect(calls).toEqual(['clear', 'save', 'scale4', 'renderScene-marker', 'restore'].filter(c => c !== 'renderScene-marker'))
  expect(renderScene).toHaveBeenCalledWith(map, room, camera, sprites)
})
```
> (若 `calls` 里想核 renderScene 的相对顺序,可在 `renderScene` mock 里 `calls.push('renderScene')`;上面用 `toHaveBeenCalledWith` 已够钉契约。)

- [ ] **Step 3**:跑 `pnpm --filter @type-pal/reforge exec vitest run src/render-scene.test.ts` → 失败(函数未定义)。
- [ ] **Step 4**:实现 `renderSceneFrame` 使测过。
- [ ] **Step 5**:`main.ts` 把 288-323 内联绘制替换成 `renderSceneFrame(ctx, renderer, { map, room, camera, sprites, worldScale: WORLD_SCALE })`(相机计算 `updateCamera()` 与精灵组装仍留 main.ts,只把绘制那截换掉)。
- [ ] **Step 6**:`package.json` 加:
```jsonc
"main": "./src/index.ts", "types": "./src/index.ts",
"exports": { ".": "./src/index.ts" }
```
- [ ] **Step 7**:`src/index.ts` barrel 按 Interfaces 的 Produces 列表 re-export(`export * from` 或具名;类型用 `export type`)。
- [ ] **Step 8**:`pnpm --filter @type-pal/reforge check` 全绿。
- [ ] **Step 9**:提交 `refactor(reforge): 抽 renderSceneFrame + 补包出口(barrel/exports),editor 可复用`。

**Gate**:`pnpm check` 绿;**Claude 浏览器实测 reforge demo 渲染逐一致**(main.ts 改绘制路径,须证零变化)。

---

## Task 2 · 精灵注册表 sprites.json(修实体精灵硬编码)

**背景**:`EntityDef.sprite`("ghost")现无解析表,[main.ts:180-183](../../../packages/reforge/src/main.ts#L180) 写死 `loadSprite(...,16)`。改成走注册表。**范围只到实体精灵**;玩家(队长)精灵号暂留原样(它是角色概念,需 `CharacterTemplate.sprite`,不在 B0,布置模式也不编玩家)。

**Files**
- Create: `packages/content/src/sprite.ts`, `projects/demo/content/sprites.json`
- Modify: `packages/content/src/validate.ts`, `packages/content/src/index.ts`, `packages/reforge/src/loader.ts`, `packages/reforge/src/main.ts`, `projects/demo/manifest.json`

**Interfaces**
- Produces:`interface SpriteDef { id: string; spriteNum: number; label: string }`;`validateSprites(json: unknown): SpriteDef[]`;`LoadedProject.spritesById: Record<string, SpriteDef>`。

- [ ] **Step 1**:`sprite.ts` 定义 `SpriteDef`;`index.ts` re-export。
- [ ] **Step 2**:`validate.ts` 加 `validateSprites`(形状:数组 + 每项 `id:string`/`spriteNum:number`/`label:string`),仿现有 `validateItems` 写法 + 一条测。
- [ ] **Step 3**:`projects/demo/content/sprites.json` 写 demo 注册表:
```json
[{ "id": "ghost", "spriteNum": 16, "label": "游魂(占位)" }]
```
- [ ] **Step 4**:`manifest.json` 的 `content` 加 `"sprites": "content/sprites.json"`。
- [ ] **Step 5**:`loader.ts` 的 `loadProject` fetch sprites.json;`assembleProject` 过 `validateSprites` → `spritesById`(按 id),挂到 `LoadedProject`。补 loader 单测(fixture sprites → spritesById['ghost'].spriteNum===16)。
- [ ] **Step 6**:`main.ts` 载鬼精灵改成:`const ghostSprite = await loadSprite(project.assetBase, project.spritesById[ghost.sprite]?.spriteNum ?? …)` —— 用 `ghost.sprite`("ghost")查注册表得 16。取不到就 throw(别静默回落)。玩家精灵 2 暂留(加注释「TODO: 玩家精灵待 CharacterTemplate.sprite」)。
- [ ] **Step 7**:`pnpm check` 绿。
- [ ] **Step 8**:提交 `feat(content+reforge): 精灵注册表 sprites.json — EntityDef.sprite 走注册表,去实体精灵硬编码`。

**Gate**:`pnpm check` 绿;**Claude 浏览器实测**:demo 里那个鬼仍是原精灵(16)、位置/朝向不变。

---

## Task 3 · SceneDef.paletteId(去 URL 调色板兜底)

**背景**:`SceneDef` 无调色板字段,[main.ts:123-124](../../../packages/reforge/src/main.ts#L123) 靠 `?pal=` 默认 0 兜。

**Files**:Modify `packages/content/src/index.ts`(SceneDef)、`packages/content/src/validate.ts`、`packages/reforge/src/main.ts`、`projects/demo/content/scenes.json`

- [ ] **Step 1**:`SceneDef` 加 `paletteId?: number`(可选,缺省 0 向后兼容)。
- [ ] **Step 2**:`validateScenes` 若在则须 number(可选字段不强制)。补一条测。
- [ ] **Step 3**:`scenes.json` 的场景加 `"paletteId": 0`。
- [ ] **Step 4**:`main.ts` `PALETTE_ID` 改成 `scene.paletteId ?? 0`,去掉 `?pal=` 读取(或留作 dev override,但默认走 scene 字段)。
- [ ] **Step 5**:`pnpm check` 绿。
- [ ] **Step 6**:提交 `feat(content+reforge): SceneDef.paletteId — 场景自带调色板号,去 URL 兜底`。

**Gate**:`pnpm check` 绿;**Claude 浏览器实测**:demo 配色不变。

---

## Task 4 · validateReferences 跨引用校验(content)

**背景**:`validate.ts` 只查形状;demo 数据已躺 2 个悬空引用(`levelUp` skillId `349…`、土灵珠 grantSkill `336` 都不在 skills[])。这些是**已知未迁全**的数据(非 bug),但校验须能**准确报出**它们——这正是编辑器的价值。

**Files**:Create `packages/content/src/validate-refs.ts`, `packages/content/src/validate-refs.test.ts`;Modify `packages/content/src/index.ts`(re-export)

**Interfaces**
- Produces:
```ts
interface Issue { severity: 'error' | 'warn'; where: string; message: string }
interface ContentBundle {
  scenes: SceneDef[]; characters: CharacterTemplate[]; skills: SkillData[]
  levelUp: Record<string, LevelUpSkill[]>; items: ItemData[]; locale: Locale
  sprites: SpriteDef[]; startWorld: StartWorld
}
function validateReferences(b: ContentBundle): Issue[]
```

- [ ] **Step 1**:写失败测 `validate-refs.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { validateReferences, type ContentBundle } from './validate-refs.js'

const base: ContentBundle = {
  scenes: [{ id: 's', map: { reuseOriginalMap: 1, room: { col: 0, row: 0, cols: 1, rows: 1 } },
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, sprite: 'ghost', interact: 'talk' }],
    dialogues: [{ id: 'talk', lines: [{ text: 'dlg.talk.0' }] }] }],
  characters: [{ id: 'hero', name: 'name.hero', baseStats: {} as any, initialEquipment: {}, initialMagic: [] }],
  skills: [{ id: '1' } as any], levelUp: {}, items: [{ id: 'i1' } as any],
  locale: { 'dlg.talk.0': '…', 'name.hero': '主角' },
  sprites: [{ id: 'ghost', spriteNum: 16, label: 'g' }],
  startWorld: { party: ['hero'], money: 0, learnedSkills: {}, inventory: [] },
}

test('干净 bundle → 无 issue', () => {
  expect(validateReferences(base)).toEqual([])
})
test('entity.interact 指向不存在对话 → 报 error', () => {
  const b = structuredClone(base); b.scenes[0]!.entities[0]!.interact = 'nope'
  const iss = validateReferences(b)
  expect(iss.some((i) => i.severity === 'error' && /interact.*nope/.test(i.where + i.message))).toBe(true)
})
test('DialogueLine.text 不在 locale → 报 warn', () => {
  const b = structuredClone(base); b.scenes[0]!.dialogues[0]!.lines[0]!.text = 'dlg.missing'
  expect(validateReferences(b).some((i) => /locale/.test(i.message) && /dlg\.missing/.test(i.where + i.message))).toBe(true)
})
test('levelUp.skillId 不在 skills → 报 warn(demo 已知未迁全)', () => {
  const b = structuredClone(base); b.levelUp = { hero: [{ level: 7, skillId: '349' }] }
  expect(validateReferences(b).some((i) => /349/.test(i.where + i.message))).toBe(true)
})
test('entity.sprite 不在 sprites 注册表 → 报 error', () => {
  const b = structuredClone(base); b.scenes[0]!.entities[0]!.sprite = 'unknown'
  expect(validateReferences(b).some((i) => i.severity === 'error' && /unknown/.test(i.where + i.message))).toBe(true)
})
```

- [ ] **Step 2**:跑 → 失败。
- [ ] **Step 3**:实现 `validateReferences`。逐项查(每条 `where` 定位到具体路径如 `scenes[0].entities[0].interact`):
  - entity.interact → 同场景 dialogues 有该 id(缺=error);entity.sprite → sprites 注册表有该 id(缺=error)。
  - 每条 DialogueLine.text/.speaker(若有)→ locale 有键(缺=warn,因 lookupText 会回落显 id 不崩)。
  - startWorld.party → characters 有(缺=error);learnedSkills 值 / inventory.itemId → skills/items 有(缺=warn);
  - EquipSpec.equipableBy → characters;EquipEffect.grantSkill.skillId / LevelUpSkill.skillId / SkillCost.items[].itemId → skills/items(缺=warn)。
  - **跳过**系统未落地字段(`applyPoison/curePoison.poisonId`、`triggerScript.scriptId`、`teleport.target`)——不报(注释说明:待对应系统落地)。
- [ ] **Step 4**:跑 → 过。
- [ ] **Step 5**:`index.ts` re-export;`pnpm --filter @type-pal/content check` 绿。
- [ ] **Step 6**:提交 `feat(content): validateReferences 跨引用完整性校验(编辑器/loader 共用)`。

**Gate**:`pnpm check` 绿(纯逻辑,无需浏览器)。

---

## Task 5 · editor React 脚手架(boots + 能 import reforge)

**Files**:Modify `packages/editor/package.json`, `packages/editor/tsconfig.json`;Create `index.html`, `src/main.tsx`, `vite.config.ts`;删 `src/index.ts` 占位(editor 从 lib 变 app)

- [ ] **Step 1**:`package.json`:deps 加 `@type-pal/content`(已有)+ `@type-pal/reforge`(workspace:*)+ `react`/`react-dom`;devDeps 加 `@types/react`/`@types/react-dom`/`vite`/`@vitejs/plugin-react`;scripts 改 `dev: vite` / `build: vite build` / `typecheck: tsc --noEmit` / `test: vitest run --passWithNoTests` / `check`。**去掉** `main`/`types`/`exports`(app 不需被 import)。
- [ ] **Step 2**:`tsconfig.json` 加 `"jsx": "react-jsx"`、`"lib": ["ES2022","DOM","DOM.Iterable"]`。
- [ ] **Step 3**:`vite.config.ts` = `react()` 插件 + `serveDir('/projects', repoRoot/projects)` + `serveDir('/extracted', repoRoot/data/extracted)` 中间件。**直接照 [reforge/vite.config.ts](../../../packages/reforge/vite.config.ts) 抄** `serveDir`(含已修的**去前导斜杠** `.replace(/^\/+/, '')`,别漏)。
- [ ] **Step 4**:`index.html` + `src/main.tsx`:React 根渲染占位壳(如 `<div>编辑器地基就位</div>`),并**在 main.tsx 里 `import { loadProject } from '@type-pal/reforge'` 调 `loadProject('demo')` 打印场景 id 到 console**(证 import + serveDir + loader 整条链通;此步不画 canvas,画布是 B1)。
- [ ] **Step 5**:`pnpm --filter @type-pal/editor check` 绿(空测通过 + typecheck)。
- [ ] **Step 6**:提交 `feat(editor): React+Vite 脚手架 + serveDir + 复用 reforge loader(地基 boot)`。

**Gate**:`pnpm check` 绿;**Claude 浏览器实测**:`pnpm --filter @type-pal/editor dev` 起,页面出占位,console 打出 demo 场景 id(如 `guijie-minju`)、**0 报错**——证明「editor→reforge import + /projects serveDir + loadProject」整条复用链通。

---

## Task 6 · EditSession + command/undo 纯核(TDD)

**Files**:Create `packages/editor/src/core/commands.ts`, `packages/editor/src/core/edit-session.ts`, `packages/editor/src/core/edit-session.test.ts`

**Interfaces**
- Produces:
```ts
// EditorState = 被编辑的内容工作副本(不可变;命令返回新态)
type EditorState = ContentBundle & { manifest: LoadedManifest }
interface Command { readonly label: string; apply(s: EditorState): EditorState; invert(s: EditorState): EditorState }
class EditSession {
  constructor(initial: EditorState)
  getState(): EditorState
  dispatch(cmd: Command): void        // apply→入 past→清 future→通知
  undo(): void; redo(): void
  canUndo(): boolean; canRedo(): boolean
  subscribe(fn: () => void): () => void  // React 用;返回退订
}
// 示例命令(证明引擎;真正各模式命令 B1 建)
class MoveEntityCommand implements Command  // (sceneId, entityId, to: GridPos)
```

- [ ] **Step 1**:写失败测 `edit-session.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest'
import { EditSession, MoveEntityCommand } from './edit-session.js'

function mkState() {
  return { manifest: {} as any, scenes: [{ id: 's', map: {} as any, entry: {} as any,
    entities: [{ id: 'e', pos: { col: 1, row: 1, height: 0 }, sprite: 'ghost' }], dialogues: [] }],
    characters: [], skills: [], levelUp: {}, items: [], locale: {}, sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] } } as any
}
const entPos = (s: any) => s.scenes[0].entities[0].pos

test('dispatch 改状态;原状态不被 mutate(不可变)', () => {
  const s0 = mkState(); const sess = new EditSession(s0)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
  expect(entPos(s0)).toEqual({ col: 1, row: 1, height: 0 }) // 源不变
})
test('undo 回退、redo 重做', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo(); expect(entPos(sess.getState())).toEqual({ col: 1, row: 1, height: 0 })
  sess.redo(); expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
})
test('undo 后 dispatch 清空 redo 分支', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 9, row: 9, height: 0 }))
  expect(sess.canRedo()).toBe(false)
  expect(entPos(sess.getState())).toEqual({ col: 9, row: 9, height: 0 })
})
test('subscribe 在每次状态变化时触发,退订后不再触发', () => {
  const sess = new EditSession(mkState()); const fn = vi.fn()
  const off = sess.subscribe(fn)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(fn).toHaveBeenCalledTimes(2)
  off(); sess.redo(); expect(fn).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2**:跑 → 失败。
- [ ] **Step 3**:实现:
  - `MoveEntityCommand`:`apply` = 返回新 state,其中目标 entity.pos 换成 `to`(不可变更新:map scenes→map entities→改中的那个);`invert` = 换回 apply 前该 entity 的 pos(构造时或 apply 时**捕获旧 pos** 存起来供 invert 用)。
  - `EditSession`:`past/future: Command[]`;`dispatch` = `state=cmd.apply(state)`; `past.push(cmd)`; `future=[]`; `notify()`。`undo` = `cmd=past.pop()`; `state=cmd.invert(state)`; `future.push(cmd)`; `notify()`。`redo` 反之。`subscribe` 存 listener set,`notify` 全调。
  - **不可变**:命令不得原地改传入 state;用展开/map 构造新对象(测里「源不变」钉这条)。
- [ ] **Step 4**:跑 → 过。
- [ ] **Step 5**:`pnpm --filter @type-pal/editor check` 绿。
- [ ] **Step 6**:提交 `feat(editor): EditSession + command/undo 纯核(TDD)`。

**Gate**:`pnpm check` 绿。这是最大防返工点——B1 各模式的编辑一律发 Command 走这个引擎,不得直接 mutate。

---

## B0 总验收 gate

- [ ] `pnpm check` 全绿(含新增 render-scene / validate-refs / edit-session 测)。
- [ ] `@type-pal/reforge` 可被 import(barrel 出口);`@type-pal/editor` 起得来。
- [ ] **Claude 浏览器实测**:① reforge demo(Task 1/2/3 后)渲染 / 精灵 / 配色**逐一致**;② editor dev 起、console 打出 demo 场景 id、0 报错。
- [ ] `EntityDef.sprite` 走注册表、`SceneDef.paletteId` 生效,引擎两处硬编码已去(玩家精灵除外,已注释 TODO)。
- [ ] `validateReferences` 能报出 demo 已知的悬空引用(levelUp/grantSkill)——证校验有效。

## 分工与不做

- **GLM**:Task 1–6 全部(纯 TS/schema/脚手架)。**Claude**:逐任务审 + 动引擎/启动的 gate 浏览器实测。
- **不在 B0**(留 B1+):任何编辑 UI 交互、画布视口(平移缩放/网格/禁入叠加/选中手柄)、布置模式、Inspector 面板、File System Access 保存、校验面板 UI、玩家角色精灵字段、嵌 reforge 实跑预览。

## Self-Review

1. **spec 覆盖**:design §3(补出口+renderSceneFrame)→T1;§7 精灵/调色板→T2/T3;§6 校验→T4;§2 脚手架→T5;§4 command/undo→T6。✅
2. **无占位**:每任务有确切文件/签名/测代码/gate;纯逻辑任务给了完整失败测。✅
3. **类型一致**:`SpriteDef`/`Issue`/`ContentBundle`/`Command`/`EditSession` 签名跨任务一致;`renderSceneFrame` 参数与 render.ts 的 `renderScene(map,room,camera,sprites)` 对齐。✅
4. **边界**:动引擎的 T1/2/3 都挂 Claude 浏览器 gate 钉零变化;editor 不碰 game/pal-extract。✅
5. **防返工**:T6 命令/undo 核第一天就立,B1 只往上加命令与 UI。✅

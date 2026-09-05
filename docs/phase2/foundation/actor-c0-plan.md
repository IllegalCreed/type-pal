> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# 角色模型 C0 · 实现计划(给 GLM)

> 设计依据 [actor-model-design.md](actor-model-design.md)(先读,尤其 §2 决策/§3 schema/§4 引擎/§7 迁移);铁律 [READ-FIRST](../READ-FIRST.md)。
> **执行者**:GLM(全非视觉:schema / 数据迁移 / loader / 引擎与编辑器编译修)。**Claude**:逐任务审 + 动引擎/编辑器渲染的 gate 浏览器实测。
> **状态**:待 GLM 对抗复核 → 开工。

**目标**:统一 ActorDef(名字/精灵/可选 battler)+ SpriteLayout(帧布局数据化)落进 content/工程/引擎/编辑器,**全程零行为变化**(demo 渲染/菜单/存读档逐一致)。C1(角色模式 UI,Claude)在此之上搭。

## 总则

1. **零行为变化**:demo(李逍遥+游魂)每个 gate 后表现必须和现在一模一样。布局/朝向的缺省值就是为此设计的(directional×3 + facing 缺省 down → 帧下标不变)。
2. **TDD**:纯函数(resolver/sprite-anim/validate/buildWorld)先写失败测;fidelity oracle 钉迁移(migrate/demo-project.test.ts 的具体数值断言**不许改值**,只改取数方式)。
3. **最小 diff**:菜单取名的 `` `name.${c.template}` `` 约定(4 处:main.ts:239 / equip-box:123 / use-box:116 / menu-box:514)**不动**;`CharacterInstance.template` 字段**不改名**(动它 = 破存档 + 牵 4 处菜单,零收益;加注释「= actor id」即可)。
4. **poses 字段只定义不消费**(设计已标 provisional:方向相对性 B2 定稿)。**不要**写任何读 poses 的代码。
5. 每任务 `pnpm check` 全绿 + 单独提交;动引擎/编辑器渲染的过 Claude 浏览器 gate。

## 契约(签名钉死;Claude 的 C1 照此接)

```ts
// ── content:sprite.ts ──
type SpriteLayout =
  | { kind: 'directional'; framesPerDir: number }
  | { kind: 'static' }
  | { kind: 'loop'; frameCount: number; ticksPerFrame?: number }
interface SpriteDef { id: string; spriteNum: number; label: string; layout: SpriteLayout; poses?: Record<string, number> }

// ── content:actor.ts(新;character.ts 的模板部分迁入)──
interface BattlerSpec {
  baseStats: { level: number; hp: number; maxHP: number; mp: number; maxMP: number;
               attack: number; defense: number; magicAttack: number; speed: number; luck: number }
  initialEquipment: Record<string, string>
  initialMagic: string[]
  leveling?: { expTable: number[] }     // 槽位;C0 不消费
  battleSpriteNum?: number              // 槽位;C0 不消费
}
interface ActorDef { id: string; name: TextId; spriteId: string; portrait?: number; battler?: BattlerSpec }

// ── content:index.ts(EntityDef 演进)──
type EntityRef = { actor: string } | { sprite: string }
type EntityDef = { id: string; pos: GridPos; facing?: Facing; collide?: boolean; interact?: string } & EntityRef
function isActorEntity(e: EntityDef): e is EntityDef & { actor: string }
/** 实体 → 精灵表 id(actor 实体经 actorsById 解析;prop 实体直取)。解析不到 undefined。 */
function resolveEntitySpriteId(e: EntityDef, actorsById: Record<string, ActorDef>): string | undefined

// ── content:character.ts(签名改)──
function instantiate(actor: ActorDef): CharacterInstance          // 读 actor.battler;无 battler → throw
function buildWorld(startWorld: StartWorld, actorsById: Record<string, ActorDef>): WorldState
// CharacterTemplate 类型删除(被 ActorDef 取代)

// ── content:validate ──
function validateActors(json: unknown): ActorDef[]   // id/name/spriteId 必为 string;battler 若在,查 baseStats/initialEquipment/initialMagic 在
// validateSprites:加 layout 必在(kind 合法);validateScenes:每实体 actor⊕sprite 恰一(都无/都有 → throw)
// validate-refs:ContentBundle.characters → actors: ActorDef[];新查:entity.actor→actors(error)、
//   actor.spriteId→sprites(error)、actor.name→locale(warn)、startWorld.party→actors 且必有 battler(error)

// ── reforge:sprite-anim.ts(新;main/SceneCanvas/C1 走路预览共用)──
const FACING_TO_DIR: Record<Facing, number>            // { down:0, left:1, up:2, right:3 }(格式约定,留引擎)
function deriveStepCycle(framesPerDir: number): number[]  // 3→[0,1,0,2];4→[0,1,2,3];其余→[0..n-1]
function idleFrameIndex(layout: SpriteLayout, facing: Facing): number   // directional→dir*framesPerDir;static/loop→0
function walkFrameIndex(layout: SpriteLayout, facing: Facing, step: number): number
  // directional→dir*framesPerDir + stepCycle[step % stepCycle.length];非 directional→idleFrameIndex

// ── reforge:loader.ts(改名)──
interface ContentJsons { actors: unknown; scenes; skills; items; locale; sprites? }   // characters→actors
interface LoadedProject { actorsById: Record<string, ActorDef>; /* charactersById 删 */ … }
```

---

## T1 · content schema + 纯函数(TDD)

**Files**:Create `packages/content/src/actor.ts`;Modify `sprite.ts`、`index.ts`(EntityDef 联合 + facing + resolver)、`character.ts`(instantiate/buildWorld 改签名,删 CharacterTemplate)、`validate.ts`、`validate-refs.ts` + 各 `.test.ts`

- [ ] 失败测(要点;完整由你补):
  - `resolveEntitySpriteId`:actor 实体经表解析 / prop 实体直取 / actor 不在表 → undefined。
  - `deriveStepCycle` 归 T3(reforge)。
  - `instantiate(actorWithBattler)` 产出与旧 `instantiate(template)` 等价的 CharacterInstance;`instantiate(actorNoBattler)` throw(信息含 actor id)。
  - `buildWorld`:现 character.test 的断言全保留,fixture 从 CharacterTemplate 改造成 ActorDef(battler 包住)。
  - `validateActors` 合法过/缺键抛;`validateSprites` 缺 layout 抛;`validateScenes` 实体 actor+sprite 都有/都无 → 抛。
  - `validateReferences`:entity.actor 悬空→error;actor.spriteId 悬空→error;party 引无 battler 的 actor→error。
- [ ] 实现;tsc 当向导把 content 内引用清干净。**editor/reforge 这步还没改会红——本任务只保 `pnpm --filter @type-pal/content check` 绿**(workspace 全绿在 T4 末)。
- [ ] 提交 `feat(content): ActorDef/BattlerSpec + SpriteLayout + EntityDef(actor⊕sprite)+facing(TDD)`。

## T2 · demo 工程数据迁移

**Files**:`projects/demo/{manifest.json, content/actors.json(新), content/characters.json(删), content/sprites.json, content/scenes.json}`

- [ ] `actors.json`:
  - `li-xiaoyao`:name `name.li-xiaoyao`,spriteId `li-xiaoyao`,battler = 现 characters.json 的 baseStats/initialEquipment/initialMagic 原封搬入。
  - `youhun`:name `name.youhun`(locale 已有),spriteId `ghost`,无 battler。
- [ ] `sprites.json`:ghost 加 `"layout": {"kind":"directional","framesPerDir":3}`;新增 `{"id":"li-xiaoyao","spriteNum":2,"label":"李逍遥(大世界)","layout":{"kind":"directional","framesPerDir":3}}`。
- [ ] `scenes.json`:鬼实体 `"sprite":"ghost"` → `"actor":"youhun", "facing":"down"`。
- [ ] `manifest.json`:content 键 `characters` → `"actors": "content/actors.json"`;删 characters.json。
- [ ] 提交 `feat(demo): characters→actors 迁移 + 精灵布局 + 实体 actor 引用`。

## T3 · reforge:loader 改名 + sprite-anim + main 去硬编码

**Files**:Create `packages/reforge/src/sprite-anim.ts`(+test);Modify `loader.ts`(+test)、`main.ts`、`index.ts`(barrel 补导出 sprite-anim 全部 + `type ActorDef` 透传不必——editor 从 content 拿)

- [ ] `sprite-anim.ts` TDD:

```ts
test('deriveStepCycle:3→[0,1,0,2](原版站/迈左/站/迈右);4→[0,1,2,3]', () => {
  expect(deriveStepCycle(3)).toEqual([0, 1, 0, 2])
  expect(deriveStepCycle(4)).toEqual([0, 1, 2, 3])
})
test('idle/walk 帧下标:directional 按 dir*framesPerDir(+步序);static/loop 恒 0', () => {
  const d3 = { kind: 'directional', framesPerDir: 3 } as const
  expect(idleFrameIndex(d3, 'down')).toBe(0)
  expect(idleFrameIndex(d3, 'left')).toBe(3)
  expect(walkFrameIndex(d3, 'down', 1)).toBe(1)
  expect(walkFrameIndex(d3, 'down', 3)).toBe(2)   // STEP_CYCLE[3]=2
  expect(idleFrameIndex({ kind: 'static' }, 'up')).toBe(0)
})
```

- [ ] `loader.ts`:`ContentJsons.characters`→`actors`(过 `validateActors`);`LoadedProject.charactersById`→`actorsById`;loadProject fetch `content.actors`。loader.test fixtures 同步。
- [ ] `main.ts`:
  - 删 95-97 三常量,import sprite-anim。
  - 玩家精灵:`const leaderActor = project.actorsById[project.manifest.startWorld.party[0] ?? '']`(缺 throw)→ `spritesById[leaderActor.spriteId]` → `loadSprite(…, def.spriteNum)`;走路帧 `walkFrameIndex(leaderLayout, facing, stepFrame)`、站立 `idleFrameIndex(leaderLayout, facing)`(替 307-309 手算)。**TODO 注释清掉。**
  - 鬼:`resolveEntitySpriteId(ghost, project.actorsById)` → spritesById → loadSprite;渲染帧 `idleFrameIndex(ghostLayout, ghost.facing ?? 'down')`(替 `frames[0]`——布局×3 + down 下值仍为 0,零行为)。
  - `buildWorld(startWorld, project.actorsById)`。
- [ ] `pnpm --filter @type-pal/reforge check` 绿;提交 `feat(reforge): actorsById + sprite-anim(帧布局数据化,去 WALK_FRAMES 硬编码)`。

**Gate(Claude 浏览器)**:demo 渲染/走路手感/对话/菜单/存读档逐一致;`?collision` 正常。

## T4 · editor 编译修(C0 只修通,不建 UI)

**Files**:Modify `packages/editor/src/core/{project-io.ts, commands.ts, test-fixtures.ts}`、`src/ui/{App.tsx, SceneCanvas.tsx}` + 相关 test

- [ ] `project-io.ts`:`toEditorState` 的 characters→`actors: Object.values(project.actorsById)`;`serializeProject` byKey `characters`→`actors`;round-trip 测 fixtures 同步。
- [ ] `commands.ts`:`UpdateEntityCommand` patch 收窄为 `Partial<Pick<EntityDef,'collide'|'interact'|'facing'>>`(**去掉 'sprite'**——实体引用切换是 C1 的事,C0 没 UI 消费它;测试同步)。
- [ ] `SceneCanvas.tsx`:删 29-31 复制的常量,import reforge 的 sprite-anim + content 的 `resolveEntitySpriteId`;实体帧 = `idleFrameIndex(layout, e.facing ?? 'down')`;玩家预览 = party[0]→actor→spriteId(同 T3 路径)。
- [ ] `App.tsx`:Inspector 实体区最小修——actor 实体显只读「角色:youhun」行;**精灵下拉整体改只读文本**(展示 `resolveEntitySpriteId` 结果;编辑实体引用/朝向 = C1 的 UI。⚠ patch 已无 'sprite',留着下拉会 dispatch 编译不过——别试图保住它)。`addAt` 新实体改为 `{ sprite: state.sprites[0]?.id ?? '' }` prop 形态(行为同前)。
- [ ] `pnpm check`(全 workspace)绿;提交 `refactor(editor): actors 改名跟随 + sprite-anim 复用(C0 编译修,UI 归 C1)`。

**Gate(Claude 浏览器)**:编辑器载 demo 渲染逐一致;点选游魂/undo/保存链路仍通;校验面板无新增误报。

## T5 · migrate fidelity + 总验收

- [ ] `packages/migrate/src/demo-project.test.ts`:`validateCharacters`→`validateActors`,`buildWorld(manifest.startWorld, actorsById)`;**所有数值断言(hp100/mp30/防御41/武术35/inventory…)原样保留必须过**——这就是迁移零行为的 oracle。
- [ ] 总 gate:`pnpm check` 全绿;`grep -rn "WALK_FRAMES\|CharacterTemplate\|charactersById" packages --include="*.ts"` 为空(仅 sprite-anim 内部实现与注释可含步序说明);Claude 双端(reforge + editor)浏览器实测逐一致。
- [ ] 提交 `test(migrate): fidelity oracle 迁 actors(数值断言不变)`。

## 不做(C1/B2 的)

- 角色模式 UI / 帧标注 / 走路预览 / 精灵选择器 / Inspector 朝向与角色下拉(**C1,Claude**)。
- poses 消费、loop 布局的自循环动画播放、leveling/battleSpriteNum 消费、立绘搬工程、`name.${template}` 4 处改读 actor.name(账已记)。

# 角色(Actor)与精灵动画模型设计

> 第二阶段 Reforge。2026-07-02 设计(用户提出 + 两份代码投查 + Claude 综合)。**设计,非实现**。
> 先读 [READ-FIRST](../READ-FIRST.md)。编辑器架构见 [editor-design.md](../editor/editor-design.md)(本设计填它的「角色/数据」模式 + §7 精灵缺口的完整版)。
> 状态:设计(待用户审 → GLM 对抗复核 → 出实现计划)。

## 0. 为什么(用户点破的三层问题)

1. **表层**:实体没有朝向——场景里 NPC 不能转向(`EntityDef` 无 facing 字段)。
2. **里层**:精灵只有「号 + 标签」(`SpriteDef {id,spriteNum,label}`),**没有帧结构模型**——「4 朝向 / 走路序列 / 站立帧 / 特殊动作」这套知识**硬编码在引擎里**([main.ts:95-97](../../../packages/reforge/src/main.ts#L95) `WALK_FRAMES=3`/`FACING_TO_DIR`/`STEP_CYCLE`),数据里根本没有可编的东西。
3. **模型层**:名字 / 头像立绘 / 行动帧 / 属性 散落各处(sprites.json / characters.json / 引擎硬编码),没有「NPC 是一个东西」的统一定义;场景布置直接引精灵 = 摆的是图,不是角色。

**用户拍板的方向**:做一个**统一的「角色定义」模块**(名字/头像/动画帧/可选战斗数据一处编);场景布置**选角色放实例**;Inspector 调的是**实例**(位置/朝向/交互),不动共享定义。NPC 与可入队角色**同一类型**(灵儿既是 NPC 又是队员)。

## 1. 投查结论(设计的地面)

**动画词汇(sdlpal + 一阶段 game 全量核过)**:
- 大世界通式 = `dir * nSpriteFrames + frame`(sdlpal scene.c:262-280);`nSpriteFrames==3` → 行走者(4 向 × 3 帧,步序 `[0,1,0,2]`,**站立 = 当前朝向第 0 帧**,非独立 idle);`nSpriteFrames==0` → **无方向**(单帧静物,或多帧环境自循环 `nSpriteFramesAuto`:血池冒泡 24 帧/血柱 11 帧)。引擎还留有 `walkFrames==4` 分支(4×4=16,原版数据未用但真实代码路径)→ **每向帧数必须是数据字段,不是常量**。
- 特殊姿势(坐/卧/演出帧)= **同一张图内的命名帧下标**(scriptedFrame 覆盖),不是独立片段类型 → 用「命名姿势表」建模即可。
- **战斗是另一套**(词汇已录,本期不建 schema):玩家战斗图 = 固定 11 槽姿势枚举(站/濒死/死/防/伤/施法×2/攻×3/偷);敌人 = 参数化区段(idleFrames+magicFrames+attackFrames+节奏);片段 = 声明式时间线;还有**整精灵替换**(召唤/变身)与**像素溶解**(死亡)两种非帧序机制。→ 布局模型必须**开放可扩**,战斗落地时加 kind,不改已有。
- **帧布局逐精灵五花八门**(627 号 4 姿势、爬行图各帧高 31~73、仙鹤 8 帧),**连锚点都可能逐帧不同** → 无法通用推导,**人工标注是必须的**(编辑器标注 UI 的立论依据)。

**资产管线**:精灵共 **636 个**(`data/extracted/data/sprite/1..636.rle`,MGO 全量 dump),**无清单文件**(对比 battle-sprites.json/fire-sprites.json 都有);编辑器可直接复用 `loadSprite`(取全帧)+ `bakeFrame`(帧→canvas,**需加进 reforge barrel**);预览统一 **palette 0**(资产标准色板,精灵本身不带色板信息——这是格式固有属性)。

## 2. 决策记录

| 决策点 | 选择 | 理由 |
|---|---|---|
| 角色统一性 | **一个 `ActorDef`**,可战斗的多带 `battler` 块(**用户拍板**) | 灵儿=NPC 又=队员;拆两种=身份分裂重复维护 |
| **帧布局挂哪** | **挂精灵表(`SpriteDef.layout`)**,不挂角色 | 布局是那张图的结构;原版放 per-object 是「没有精灵元数据概念」的历史包袱。角色/静物共用同一张图时布局天然共享。**逃生口**(迁移器用):`SpriteDef.id` 是语义 id、`spriteNum` 可重复——原版若有同 chunk 不同 nSpriteFrames 的极端例,建两条 SpriteDef 指同 spriteNum 即可,schema 不用改 |
| 布局模型 | **开放联合** `SpriteLayout`(directional / static / loop,后加 battle-kind) | 覆盖投查全部大世界词汇;战斗留形不实现(reforge 无战斗系统,现建=过度设计) |
| 每向帧数 | `framesPerDir: number`(数据字段,通常 3) | sdlpal 有活的 4 帧分支;硬编码 3 已被投查证伪为「约定非真值」 |
| 步序 | 引擎按 framesPerDir **推导**(3→`[0,1,0,2]`,4→`[0,1,2,3]`),暂不进数据 | 别过度设计;要自定义步序时再加字段(加法) |
| 特殊姿势 | `poses?: Record<name, frameIndex>`(编辑器标注) | 投查:姿势=同图命名帧,非独立类型 |
| 实体引用 | `EntityDef` = 基础字段 & (`{actor}` ⊕ `{sprite}`) 二选一 | 角色(NPC/队员)引 actor;纯静物(花瓶/装饰)直接引 sprite,不逼着建假角色 |
| 实体朝向 | `facing?: Facing`(缺省 down),实例级 | 表层缺口;directional 布局才有意义 |
| 升级曲线 | `battler.leveling`(**用户点名的真缺口**):`expTable` 先落,成长表迁移一阶段时定形 | 表驱动(原版即表);槽位现在留对,内容后填 |
| 头像立绘 | `ActorDef.portrait?: number`,MVP 沿用引擎现有预烘 PNG 路径 | 立绘搬进工程资产=后续迁移,不阻塞本期 |
| characters.json | **改名 actors.json**,`CharacterTemplate` → `ActorDef`(battler 包住 baseStats/装备/技能) | 趁只有 1 个工程,词汇一次改对;fidelity 测钉零行为 |
| 精灵清单 | MVP 编辑器**懒加载探测**(1..636,404 跳过);提取期清单(带 frameCount,照 fire-sprites.json)列为优化 | 不为选择器先动 pal-extract;要快再加 |

## 3. Schema(content 包)

```ts
// ── sprite.ts(演进)──────────────────────────────
/** 帧布局 = 这张精灵图的结构(开放联合;战斗类 kind 留待战斗系统落地时加)。 */
export type SpriteLayout =
  | { kind: 'directional'; framesPerDir: number } // 4 向固定序 down/left/up/right;站立=dir*framesPerDir
  | { kind: 'static' }                            // 单帧静物(frame 0)
  | { kind: 'loop'; frameCount: number; ticksPerFrame?: number } // 无方向环境自循环(血池/火盆)

export interface SpriteDef {
  id: string
  spriteNum: number
  label: string
  layout: SpriteLayout                    // 新:帧结构(编辑器标注的产物)
  poses?: Record<string, number>          // 新:命名姿势帧(坐/卧/演出…→ 帧下标)
                                          // ⚠ provisional(Fable5 复审):原版姿势帧常是**朝向内偏移**
                                          // (0x15: wFrame=dir*3+n),绝对帧号表达不了"坐·朝左/坐·朝右"。
                                          // C0 先留字段不消费;B2 事件+迁移器落地时定稿(或改
                                          // { frame; perDirection? })。别提前消费此字段。
}

// ── actor.ts(新;吸收 character.ts 的模板部分)────
/** 可战斗数据(可入队/可参战的角色带;普通 NPC 不带)。 */
export interface BattlerSpec {
  baseStats: { level; hp; maxHP; mp; maxMP; attack; defense; magicAttack; speed; luck }
  initialEquipment: Record<string, string>
  initialMagic: string[]
  /** 升级曲线(用户点名缺口):expTable[i] = 从 level i 升 i+1 所需 exp。
   *  属性成长表:迁移一阶段升级逻辑时定形(此处留槽)。 */
  leveling?: { expTable: number[] }
  /** 战斗精灵号(F.MKF 系;战斗系统落地时启用)。 */
  battleSpriteNum?: number
}

/** 统一角色定义:NPC 与可入队角色同一类型;名字/头像/精灵一处定义,处处引用。 */
export interface ActorDef {
  id: string
  name: TextId
  spriteId: string          // → sprites.json(大世界行走/站立图)
  portrait?: number         // 头像立绘号(现引擎预烘 PNG;搬工程资产=后续)
  battler?: BattlerSpec     // 有 = 可入队/可参战
}

// ── index.ts:EntityDef(演进)────────────────────
/** 实体引用:角色实例(actor)⊕ 纯静物(sprite),二选一。 */
export type EntityRef = { actor: string } | { sprite: string }
export type EntityDef = {
  id: string
  pos: GridPos
  facing?: Facing           // 新:实例朝向(缺省 down;directional 布局生效)
  collide?: boolean
  interact?: string
} & EntityRef
```

- `WorldState`/`CharacterInstance` **不变**(运行态);`instantiate`/`buildWorld` 改吃 `ActorDef`(读 `actor.battler`,无 battler 的 actor 不可入队 → buildWorld throw)。
- 文件/manifest:`content.characters` → `content.actors`(`actors.json` = `ActorDef[]`);`sprites.json` 条目加 `layout`(既有条目迁移时补)。
- **与 [content-schema §9](content-schema.md)「外观解耦」的对齐**(Fable5 复审注):§9 的终态是「外观 = 基础造型 + 装备覆盖算出来」。本设计的 `spriteId`/`battleSpriteNum` = **基础造型**(复刻原版只需这层——原版外观本就不随装备变);装备驱动的外观覆盖层 = 将来在 ActorDef 上**加字段**(如 `appearanceRules`),纯加法,不冲突。身份=实例 id ✓、状态=实例组件 ✓ 两条 §9 原则本设计已满足。

## 4. 引擎(reforge)去硬编码

| 现状 | 改成 |
|---|---|
| `WALK_FRAMES=3` / `FACING_TO_DIR` / `STEP_CYCLE` 常量([main.ts:95-97](../../../packages/reforge/src/main.ts#L95)) | 从 `SpriteDef.layout` 读;步序按 framesPerDir 推导(`FACING_TO_DIR` 的向序是格式约定,留引擎) |
| 玩家精灵写死 `loadSprite(…, 2)` + TODO([main.ts:186](../../../packages/reforge/src/main.ts#L186)) | `startWorld.party[0]` → `actorsById` → `spriteId` → `spritesById` → spriteNum(**TODO 清掉**) |
| 鬼实体 `entity.sprite` 直引精灵 | `entity.actor`("youhun")→ actor → sprite;对话名可显 `actor.name` |
| 实体一律画 frame 0 | 按 layout + `facing` 画站立帧(`dir*framesPerDir`);static 画 0;loop 先画 0(自循环动画=后续小片,demo 无 loop 精灵,零行为) |

**零行为验收**:demo(李逍遥 + 游魂)渲染逐一致——两者布局都是 directional×3、facing 缺省 down → 帧下标不变。

## 5. 编辑器:「角色」模式(新 rail 项)+ 布置模式集成

**角色模式**(rail 第二位:布置 / **角色** / 地图 / 事件 / 数据):
- **左**:角色列表(+ 新建)。
- **中**:预览区——头像 + **精灵帧网格**(bakeFrame × palette 0,全帧铺开)+ **走路循环实况预览**(选中方向按步序播,标注对错一眼看穿——本模块的验收器)。
- **右**:属性——名字(locale 双写)/ 头像选择 / 精灵选择(改 spriteId)/ `battler` 折叠区(属性/初始装备/初始技能/升级曲线表)。
- **帧标注子视图**(编辑的是 `SpriteDef.layout`/`poses`,随精灵走):布局 kind 选择 + framesPerDir 步进 → 网格按方向分组着色(down: 0-2 / left: 3-5 / …)+ 点帧命名姿势。
- **精灵选择器**:懒加载浏览 extracted 1..636(缩略图=frame 0 × palette 0,404 跳过);选中未登记的 → 自动建 sprites.json 条目(进入标注)。
- 复用面:`loadSprite` + `bakeFrame`(**reforge barrel 补导出 bakeFrame**)+ palette 0。

**布置模式集成**:Inspector 实体区分两类——actor 实体:角色下拉(显 `actor.name`)+ **朝向下拉**(down/up/left/right,画布即时转向);sprite 实体(静物):精灵下拉(现状)。画布站立帧按 facing 渲染。

**与 §10.5 实体多状态的关系**:互不冲突、正交组合——Actor 提供共享身份/图形,实体实例(将来)的每个「状态」覆盖 位置/朝向/姿势/交互(实例级,B2 和事件/变量一起设计)。

## 6. 内容模型全景(用户要的「心里有底」图)

| 域 | 状态 | 归属 |
|---|---|---|
| 角色(名字/头像/动画/属性/技能/装备) | 🔶 本设计统一成 ActorDef | **C0/C1(本轮)** |
| 升级曲线 | 🔶 槽位本设计落(`battler.leveling`),成长表迁移时填 | C0 留槽,数据后填 |
| 精灵帧布局/姿势 | 🔶 本设计(SpriteLayout + poses + 标注 UI) | **C0/C1(本轮)** |
| 场景/实体/对话/物品/技能/文本 | ✅ 已有(A 期迁完,B1 可视化编) | — |
| 事件/全局变量/实体多状态/巡逻 | ❌ | B2(单独深设计) |
| 敌人表/战斗(含战斗动画 schema)/商店/掉落 | ❌ | 战斗系统期(布局联合留了口) |
| 多场景/工程选单/立绘进工程资产 | ❌ | 后续小片 |

## 7. 迁移(照 A 期打法:分步零行为 + fidelity oracle)

1. **C0a schema**(content):SpriteLayout/ActorDef/BattlerSpec/EntityDef 联合 + facing;validate 升级(actors 必查 id/name/spriteId;entity 查 actor⊕sprite 恰一;party→actor 须有 battler);validateReferences 补 actor 链(entity.actor→actors、actor.spriteId→sprites、actor.name→locale)。
2. **C0b demo 数据**:characters.json→actors.json(李逍遥包进 battler + spriteId 新条目 spriteNum 2);sprites.json 补 layout;scenes.json 鬼实体 → `{actor:"youhun", facing:"down"}` + actors 加 youhun;manifest key 改 actors。
3. **C0c loader/engine**:loader 出 `actorsById`;buildWorld 吃 ActorDef(**fidelity oracle:迁移前后 buildWorld 结果 toEqual**);main.ts 去硬编码(§4);editor core/UI 随 EntityDef 联合编译修(UpdateEntityCommand patch 扩 facing/actor)。
4. **验收 gate**:`pnpm check` 全绿(含 migrate 保真测更新);**Claude 浏览器实测 demo 渲染/对话/菜单/存读档逐一致**;grep 无 `WALK_FRAMES` 常量残留。

## 8. 分期

- **C0 · schema + 迁移 + 引擎去硬编码**(非视觉 → GLM;上面 7 的 1-4)。
- **C1 · 角色模式 UI**(canvas 视觉 → Claude):角色列表/属性/帧标注/走路预览/精灵选择器 + 布置模式 actor/facing 集成。**验收**:改游魂朝向存盘→游戏刷新可见;新建一个 NPC(选精灵→标布局→放进场景)全流程走通。
- **后**:环境 loop 动画播放、战斗动画 schema(随战斗系统)、立绘进工程、提取期精灵清单(优化)、多状态实体(B2)。

## 9. Self-Review

1. **三层问题全应答**:朝向(facing)/ 帧模型(SpriteLayout+标注)/ 统一定义(ActorDef+模块)。✅
2. **投查落地**:通式/步序/站立约定/静物/loop/姿势 全进模型;战斗词汇录案留口不实现(内容先于系统);636 无清单 → 懒加载 + 优化项。✅
3. **def/实例分明**:ActorDef 共享,EntityDef 实例(pos/facing/interact);与 §10.5 多状态正交。✅
4. **零返工路径**:布局开放联合(战斗=加 kind);leveling 留槽;迁移分步 + fidelity oracle + 浏览器 gate。✅
5. **范围克制**:不建战斗 schema、不搬立绘、不先做提取清单、步序不进数据。✅
6. **id 约定沿用**:actor/sprite 语义 id;spriteNum/portrait 号是资产号非下标。✅

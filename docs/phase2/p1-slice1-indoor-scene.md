# P1 · 切片 1：室内场景跑通（slice 1 spec）

> 状态：草案（2026-06-24）。第二阶段铁律见 [READ-FIRST](READ-FIRST.md)；总纲 [00-roadmap](00-roadmap.md)；已拍决策 [decisions](decisions.md)（D1–D9）；内容模型 [p0-content-schema](p0-content-schema.md)；架构债反面输入 [engine-debt-audit](2026-06-22-phase1-engine-debt-audit.md)。
>
> 本文是 roadmap §5「骨架先行 + 垂直切片」的**第一刀**。范围与架构红线由 [D2](decisions.md) 定；本文把它落成**可照着实现**的设计。实现步骤拆解见配套 plan（writing-plans 产出）。
>
> **本刀是技术验证刀**：目标是用一段能跑的真实内容，给「拆掉 sdlpal 真值锚后的新架构」当第一把标尺（[D1](decisions.md)）。不是内容完整度、不是画面还原度。

## 0. 目标与范围

**一句话**：手写一个 ~20×15 的室内房，新引擎 `@type-pal/reforge` 跑通**走路 + 撞墙 + NPC 对话翻页**——第一个看得见摸得着的 milestone。

| 做 | 不做（[D2](decisions.md) 排除 + YAGNI） |
|---|---|
| 起 `@type-pal/content` + `@type-pal/reforge` 两个包 | 编辑器、迁移器 |
| 手写一个室内场景（地图 + 实体 + 一段对话） | 战斗、菜单、存档落盘 |
| 连续/像素移动 + 撞墙 + 撞实体 | opcode 兼容层（手写内容不需要） |
| NPC 交互 → 对话框翻页 | 昼夜/天气/光照（只留 identity 后处理插入点） |
| WebGL2 渲染 + Canvas2D 文字叠层 | 音频、多场景切换、跟随队员渲染 |
| 复用原版提取资产（运行期 indexed→RGBA 解码） | 构建期资产烘焙（后续优化） |

## 1. 决策映射（本刀如何兑现 D1–D9）

| 决策 | 在本刀的落地 |
|---|---|
| **D1** 垂直切片先行 | 本文即第一刀 spec，用能跑的真实内容验证架构 |
| **D2** 切片边界 + 红线 | 三层状态(§5)/零模块单例(§6,§12)/action handler 注册表(§8)/统一 entity+稳定 id(§6)/移动=意图→纯函数→结果(§7) |
| **D3** 地图尺寸可变 | TileMap 自带 width/height（§3），手写场景按真实小尺寸 ~20×15 |
| **D4** RGBA + GPU | WebGL2 textured-quad；后处理 pass 一等公民（本刀 identity 占位）；palette 仅作解码资产（§4,§9） |
| **D5** MMO 碰撞留口 | 移动纯函数判定 + 稳定 id + uniform-grid 空间索引 + 碰撞分世界几何/实体两类（§7） |
| **D6** 回合制/身法 | 不涉及（无战斗）。 |
| **D7** 多难度/AI | 不涉及（无战斗）。 |
| **D8** 仙术熟练度 | 不涉及（无成长系统）。 |
| **D9** i18n | 所有面向玩家文本走 **text id + 查表**（§3 TextTable），本刀只填 zh，但形状即 i18n 形状 |

## 2. 包与目录

```
packages/
  content/                       @type-pal/content —— 内容数据模型 + 加载 + 解码（GPU 无关，可 node 测）
    src/
      schema/                    TS 类型（P0 schema 的切片子集）
        ids.ts                   branded 稳定 id 类型
        scene.ts  map.ts  entity.ts  cutscene.ts  trigger.ts  text.ts  asset-ref.ts
      load/
        load-scene.ts            读 + 校验 → 验证过的 Scene
        validate.ts              校验（坏引用/越界/缺资产 → 抛错带 id）
        decode-indexed.ts        indexed PNG + palette → RGBA 缓冲（纯函数）
      index.ts
    assets/                      vendored 真实提取资产（手动放，不走迁移器）
      index.json                 资产 id → 文件 + 元数据
      tiles/  sprites/  palettes/
    scenes/slice1-inn/
      scene.json                 手写场景（L2 定义）
      text.json                  文本表（text id → {zh}）
    package.json  tsconfig.json  vitest.config.ts

  reforge/                       @type-pal/reforge —— 运行时引擎
    src/
      engine/
        engine-context.ts        可实例化根（零模块单例），createEngine(deps)
        world-state.ts           L1：队伍位置 + 世界变量表（仅内存）
        scene-runtime.ts         L3：L2+L1 合出的活实体 + 空间索引 + 演出/对话态
      entity/
        entity.ts  components.ts 轻量组件袋
      systems/
        movement.ts              resolveMove 纯函数 + applier
        collision.ts             纯碰撞查询
        spatial-index.ts         uniform grid
        interaction.ts           面朝判定 → 起演出
        cutscene-runner.ts       action handler 注册表 + dialog handler
      render/
        renderer.ts              WebGL2 batch（Renderer 接口，可打桩）
        gpu-texture.ts           RGBA 缓冲 → 纹理
        post-process.ts          后处理 pass（本刀 identity）
        text-overlay.ts          Canvas2D 文字/对话框层
        camera.ts                跟随 + 夹边界
      input/input.ts             键盘 → 高层意图（映射表）
      loop/main-loop.ts          rAF + 固定步长 + 注入时钟
      index.ts                   createEngine + 启动一个场景
    dev/                         vite dev 入口（pnpm --filter @type-pal/reforge dev 跑起来）
      index.html  main.ts
    package.json  tsconfig.json  vitest.config.ts  vite.config.ts
```

**边界铁律**：content 产出「解码好的 RGBA 缓冲」，**reforge 才上传 GPU**。content 与 GPU/WebGL 无关 → 可在 node 里跑解码/校验单测。

## 3. 内容数据模型（content schema 切片子集）

> P0 schema 的最小可跑子集。字段**留长大形状**（union/可选字段），但本刀只实现列出的成员。

```ts
// ids.ts —— 稳定身份，杜绝下标（D2 铁律5）
type SceneId = string & { __b: 'SceneId' }
type EntityId = string & { __b: 'EntityId' }
type CutsceneId = string & { __b: 'CutsceneId' }
type TextId = string & { __b: 'TextId' }
type TilesetRef = string & { __b: 'TilesetRef' }
type SpriteRef = string & { __b: 'SpriteRef' }

// map.ts —— 尺寸可变（D3）+ 干净方格（见 §9 瓦片几何决策）
interface TileMap {
  width: number; height: number          // 单位：格（本刀 ~20×15，非全局常量）
  tileSize: number                       // reforge 自定方格边长（px，如 32），非 PAL 几何
  tileset: TilesetRef
  layers: VisualLayer[]                  // 本刀 1–2 层
  collision: CollisionLayer
}
interface VisualLayer {
  id: string; zOrder: number
  occludesActors: boolean                // 原版 upper 语义的泛化
  tiles: Int16Array                      // 长度 w*h，-1 = 空
}
interface CollisionLayer {
  width: number; height: number
  blocked: Uint8Array                    // 长度 w*h，0=可走 1=挡。形状留长大成 per-cell 地形记录
}

// entity.ts —— 统一实体 = 稳定 id + 可选组件袋（D2 / P0§4§9；轻量，非 ECS 框架）
interface EntityDef {
  id: EntityId
  components: {
    transform?: TransformComponent
    sprite?: SpriteComponent
    collision?: CollisionComponent
    interaction?: InteractionComponent
  }
}
type Facing = 'up' | 'down' | 'left' | 'right'
interface TransformComponent { x: number; y: number; facing: Facing }  // 像素坐标，锚点在脚（遮挡基线）
interface SpriteComponent { sprite: SpriteRef }                          // 外观引用（外观与 id 解耦，P0§9）
interface CollisionComponent { box: { w: number; h: number; offX: number; offY: number }; solid: boolean }
interface InteractionComponent { cutscene: CutsceneId }

// cutscene.ts —— 迷你声明式演出（§8）
interface Cutscene { id: CutsceneId; actions: CutsceneAction[] }
type CutsceneAction = DialogAction                                        // 本刀只此一种，留 union 长大
interface DialogAction { type: 'dialog'; speaker?: TextId; pages: TextId[] }  // 每个 TextId = 一页

// trigger.ts —— 只管「何时」（§8）
interface Trigger { id: string; when: TriggerCondition; run: CutsceneId }
type TriggerCondition = InteractCondition                                 // 留 union 长大（proximity/onEnter）
interface InteractCondition { type: 'interact'; target: EntityId }

// text.ts —— D9 i18n：一律 text id 查表
type TextTable = Record<TextId, { zh: string /* en?, ja? 后续 */ }>

// scene.ts —— 自包含场景包（P0§4）
interface Scene {
  id: SceneId; name: TextId
  map: TileMap
  entities: EntityDef[]
  cutscenes: Cutscene[]
  triggers: Trigger[]
  entry: { x: number; y: number; facing: Facing }
}
```

> 磁盘 `scene.json` 用 `number[]` 存 tiles/blocked，载入时转 typed array（`Int16Array`/`Uint8Array`）；`CollisionLayer` 宽高 = `TileMap` 宽高，`validate` 校验一致。

## 4. 资产与解码（复用原版 / 运行期解码）

- **vendored 清单**（手动放进 `content/assets/`，**不走迁移器**，[D2](decisions.md) 排除）：
  - 1 套室内瓦片（能当方格用的，见 §9）+ 调色板
  - 李逍遥行走精灵（四向行走帧）
  - 1 个 NPC 精灵
  - 1–2 件 solid 家具精灵（桌/瓶，用来演示**实体碰撞**区别于**瓦片碰撞**）
- **运行期解码**：载入时 indexed PNG（像素值 = 调色板索引）+ 调色板 → RGBA 缓冲。解码数学从 phase-1 `assets/png.ts` + present 着色**移植知识**（[铁律3](READ-FIRST.md)，不照搬模块）。构建期烘焙留后续优化。
- **来源/选择标准**：实现时翻 `data/raw` 提取出的 `data/extracted/` 选定确切资产 id；标准 = 室内观感 + 有行走帧。`assets/index.json` 把稳定资产 id 映射到文件 + 元数据（帧布局、原图尺寸）。

## 5. 三层状态（[P0§1](p0-content-schema.md) / [D2](decisions.md)）

- **L2 场景定义**（只读、可版本化）= 手写 `scene.json`。
- **L3 场景运行态** = 进场把 L2 实例化出的活实体 + 空间索引 + 当前演出/对话状态；出场即弃（本刀单场景，不切换，但 scene-runtime 设计成可弃）。
- **L1 世界态** = **仅内存**的队伍（受控实体 id + 位置）+ 世界变量表（本刀近乎空，但表立着，[P0§3](p0-content-schema.md)）。**不序列化、不落盘**（存档排除）。

原则：加载只碰这个场景包 + 它引用的资产；跨场景影响走 L1（本刀用不到，但边界立住）。

## 6. 实体 + 子系统（轻量组件袋，非 ECS 框架）

- 实体 = `{ id, components: {...} }`（§3）。稳定 id（branded），杜绝下标身份（[D2](decisions.md)）。
- **显式子系统**各读所需组件，对**不持有该组件**的实体不动手：
  - `movement`（读 transform + collision）
  - `render`（读 transform + sprite）
  - `interaction`（读 transform + interaction）
- **明确不做通用 ECS**（无组件存储/查询/archetype/调度框架）——一个房 + 几个对象造框架 = [D1](decisions.md) 警告的「架构空转」。轻量已拿到「数据与行为分离、组件可选」的解耦；将来实体爆量再升级，稳定 id 边界让迁移局部。

## 7. 移动管线（连续/像素 · [D2](decisions.md)/[D5](decisions.md) 红线本体）

```
键盘 → MoveIntent { entityId, dx, dy }            // 本帧像素位移 = 方向 × 速度 × dt（输入产）
     → resolveMove(intent, collisionSnapshot, spatialIndex): MoveResult   // 纯函数，不 mutate
          · 角色 AABB vs 碰撞层格子            ← 世界几何碰撞（静态共享，客户端可本地预测）
          · 角色 AABB vs solid 实体碰撞框      ← 实体碰撞（动态，经 uniform-grid 查「周围有谁」）
          · 贴墙滑行（分轴判定：x、y 各自尝试）
     → MoveResult { x, y, facing }            // facing 由 intent 方向导出
     → applier 写回 transform                  // 唯一 mutate 处
```

- **`resolveMove` 是纯函数**：吃快照、吐结果，不碰全局——这是 [D5](decisions.md) 的 MMO 留口本体（同一套逻辑单机本地跑、将来服务器跑 + 客户端预测/校正）。**本刀头号被测对象。**
- **碰撞两类分开**（[D5](decisions.md)）：世界几何（CollisionLayer.blocked）/ 实体（CollisionComponent.solid，经 spatial-index）。
- **空间索引** = uniform grid（格→实体 id 集）；本刀实体除玩家外静止，更新极廉价。

## 8. 事件 / 演出（迷你声明式版 · [P0§6](p0-content-schema.md)）

- **触发器只管「何时」**：`InteractCondition{ target }` = 玩家面朝该实体且按交互键。
- **演出 = 一串 action**：本刀只有 `dialog`（显示对话框、逐页、按键翻页/推进、结束）。
- **action 走 handler 注册表**（`type → handler`），**不是 switch**——这是 [D2](decisions.md)「OpcodeHandler 注册表」红线在本刀的真实形态（本刀无 opcode，但同一反 switch 模式用在 action 派发上；避开 audit 的双解释器 switch 债）。本刀注册一个 `dialog` handler，留好长大形状。
- 演出播放期间挂 mode 标志，**暂停移动输入**；翻页/推进键由 cutscene-runner 消费。

## 9. 渲染（[D4](decisions.md)）

- **WebGL2 textured-quad 批渲染**。绘制序：瓦片层(below) → 实体/角色按**遮挡基线**(脚部 y / zOrder)排序 → 瓦片层(occludesActors=true，above)。
- **后处理 pass 一等公民**：本刀 = 单个 **identity pass**（兑现 D4「第一刀就留插入点」；昼夜/天气/光照后续接这里）。
- **Canvas2D 文字叠层**：对话框 + 中文画在叠层（本刀不做 WebGL 字形图集，YAGNI）。
- **相机**：跟随受控角色、夹到地图边界（reforge 干净实现，不背 phase-1 camera 坍缩债）。

**瓦片几何决策（本刀已定：干净方格 + 真精灵）**：已核实原版瓦片为 **32×16 偏移砖缝拼贴**（1995 省显存的 VGA 遗产，phase-1 `draw-tilemap.ts:108-138`）。本刀**不移植**该偏移几何——reforge 用自定**方格** tilemap（`tileSize`），地板/墙选「能当方块用」的原版或简单瓦片；**角色/NPC/家具全用真原版精灵**（无几何问题，最出彩的部分都真）。理由：[铁律2](READ-FIRST.md) reforge 本就不对齐 PAL，把新引擎地图几何绑死到 VGA 遗产违背「架构第一/不照搬旧引擎」，且首刀省一坨几何移植。代价：地板观感非 100% 原版客栈——本刀可接受。
> ⚠ 此条是「可以」放行时按推荐采纳的假设。若要 100% 原版地板观感，改为移植 32×16 偏移拼贴，其余设计不变。

## 10. 主循环 / 输入 / 时钟

- **rAF 循环**；**固定步长**更新逻辑（确定性 → 喂 [D5](decisions.md) 预测 + [议题13](design-backlog.md) 时间旅行调试），渲染每 rAF。
- **注入时钟**（不直接 `Date.now()`）——可测 + 议题13 地基。
- 键盘 → 高层意图（移动方向 / 交互 / 翻页）；**映射表**（[议题11](design-backlog.md) 重映射留口，本刀给默认键位）。

## 11. 错误处理（绕开 phase-1 静默回填债）

- **load 期 fail-loud**：`validate.ts` 校验场景 JSON——坏引用（指向不存在的 cutscene/entity/asset id）、越界瓦片索引、缺资产 → **抛错并点名出错的稳定 id**，不静默回填。
- **运行期不崩**：子系统只对持有相应组件的实体动手；悬空 cutsceneRef 在 load 期已被拦下。

## 12. 模块边界（做什么 / 怎么用 / 依赖谁）

> 每个单元都该能一句话回答三问；改内部不破坏消费方。

| 模块 | 做什么 | 怎么用 | 依赖 |
|---|---|---|---|
| `content/load-scene` | 读+校验场景 → 验证过的 Scene | `loadScene(dir)` | validate, decode-indexed, schema |
| `content/decode-indexed` | indexed+palette → RGBA 缓冲 | `decode(png, palette)`，纯 | （无 GPU） |
| `reforge/engine-context` | 拥有引擎生命周期，零单例 | `createEngine(deps)` | 全部子系统 |
| `reforge/systems/movement` | 算移动结果 | `resolveMove(intent, snap, idx)`，纯 | collision, spatial-index |
| `reforge/render/renderer` | 画一帧 | `Renderer` **接口**（可打桩 → headless 测；可换 WebGL2→WebGPU，D4 留口） | gpu-texture, post-process |
| `reforge/cutscene-runner` | 跑演出 action | `run(cutscene)` | action handler 注册表 |

## 13. 测试与验收

- **单测（node/vitest）**：
  - `resolveMove`：自由走 / 撞墙 / 贴墙滑行 / 撞 solid 实体 —— [D2](decisions.md)/[D5](decisions.md) 红线测。
  - 碰撞查询（isBlocked / 实体重叠）、spatial-index 增删查。
  - content 加载+校验：合法场景过；坏引用抛错且**带出错 id**；越界瓦片抛错。
  - `decode-indexed`：小 fixture（已知索引+调色板）→ 期望 RGBA。
  - cutscene-runner：dialog 多页推进到尾、结束后释放输入 mode。
  - interaction：面朝 NPC+交互 → 起对应演出；面朝墙 → 无事。
- **集成**：headless 引擎驱动（Renderer 打桩）跑「走→撞→对话」脚本序列，断言 L1/L3 状态。
- **验收**（亲自在浏览器跑过再说 done，不拿用户当测试员）：键盘走动、撞墙过不去、走到 NPC 按键 → 对话框出+翻页+关闭。

## 14. 构建顺序（给 plan）

0. 接好两个包到 pnpm workspace（package.json/tsconfig/vitest/vite）。
1. content schema 类型 + 手写 `scene.json`/`text.json` + `validate`。
2. `decode-indexed` + vendored 资产 + `assets/index.json`。
3. reforge 引擎骨架：engine-context / 三层状态 / 实体 + 组件。
4. 移动子系统 + 碰撞 + 空间索引（先把 §13 单测写出来）。
5. 渲染：WebGL2 batch + gpu-texture + identity 后处理 + 文字叠层 + 相机。
6. 演出/对话（cutscene-runner + action 注册表）+ 交互子系统。
7. 主循环 + 输入接通 + dev 入口跑起来。
8. 集成测 + 浏览器验收。

## 15. 留给后续（不在本刀拍死）

- 完整演出模型（[议题5](design-backlog.md)：冻结×遮罩两维正交、完整 action 词汇表、opcode 兼容层）—— 切片后单独立题。
- 存档格式 + L1 字段全集（序列化/持久化）—— 单独设计题。
- 迁移器（extracted→content 批量）、编辑器 —— P0 末 / P2。
- 多层地图角色跨层行走、构建期资产烘焙、昼夜天气光照（接 identity 后处理口）。

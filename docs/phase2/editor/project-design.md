# 工程化架构设计(engine project / 「一工程一游戏」)

> 第二阶段 Reforge。2026-06-30 设计(用户 + 助手)→ Claude 复审纠正(包拓扑 / 地基决策 / 范围)。
> **本文件是设计(架构与决策的记录),非实现。** GLM 开工照 [project-foundation-plan.md](project-foundation-plan.md)。
> 状态:设计(已复审,待 GLM 再审)。先读 [READ-FIRST](../READ-FIRST.md)——本阶段无「真值锚 / 对齐原版」,只要架构干净、好扩展、迁来的内容能正确跑。

## 0. 为什么要做(现状痛点)

当前引擎与游戏内容是**编译期绑死**的:
- `main.ts` 直接 `import { guijieMinjuScene } from '@type-pal/content'` —— 唯一场景写死在 import([main.ts:7](../../../packages/reforge/src/main.ts#L7))。
- `SCENE_ID = 'guijie-minju'` / `MAP_NAME = '鬼界·民居'` 是局部常量([main.ts:202-204](../../../packages/reforge/src/main.ts#L202-L204))。
- 资源根 `BASE = '/extracted'` 写死在 [assets.ts:8](../../../packages/reforge/src/assets.ts#L8)。
- content 包把场景/角色/技能**数据**作为具名导出,引擎编译时吃进去。

→ **换游戏 = 改源码重编译。** 没有「工程」概念,编辑器也无从产出(产出物喂不进一个写死的引擎)。

**目标**:把「游戏内容」从编译期依赖变成**运行期加载的数据**。引擎是壳(固定),工程是肉(可换)。换工程文件夹 = 换一个完整游戏。编辑器 = 写工程 JSON 的工具。

## 1. 决策记录(已拍板 + 复审纠正)

| 决策点 | 选择 | 理由 |
|---|---|---|
| 工程粒度 | **一工程 = 一整套游戏**(仙剑DLC / 换皮 / 新作) | 壳/肉分离最干净;像 RPG Maker 的 .rpgproject |
| 资源归属 | **工程自包含**(map/tileset/sprite 在工程文件夹);**引擎 chrome(字模/菜单皮/光标)留引擎** | 工程可独立分发;UI 皮是跨游戏不变的引擎件,塞进每个工程 = 每游戏重发引擎皮 |
| content **数据**形态 | **纯 JSON**(运行期 fetch) | 引擎与内容彻底解耦;编辑器产 JSON 最自然 |
| **schema + 纯逻辑落点** | **留在 `@type-pal/content` 叶子包**(不搬进 reforge;只把**数据**搬走) | ⚠**复审纠正**:见 §2。搬进 reforge 会逼 editor 依赖整台引擎换几个类型 |
| 校验策略 | **A 期手写轻量 guard(单 `validate*()` 接缝);zod 留后**(编辑器产大量手改 JSON 时再上) | 不给零依赖叶子加 runtime dep;类型当真值源;接缝隔离,换 zod 局部化 |
| 工程选择 | dev `--project=<id>` 命令行 / env 注入;打包后选单(留后) | dev 体验先足;选单依赖工程发现机制(§9),A 期不做 |
| 现状 content | **数据全部迁走**(现在就拆干净);**包保留**为 schema+ops 叶子 | 避免引擎混用(import 老 + loader 新)的过渡债;但别把叶子删了 |
| 编辑器起点 | **场景编辑器优先**(B 期,canvas 视觉 → Claude 做) | 最大头/最依赖可视化;依赖工程地基(A 期)先就位 |

## 2. 目标架构

### 2.1 包拓扑(复审的核心纠正)

现状已经是干净的:`content` 是**零依赖叶子**(类型 + 纯逻辑 + 数据),`reforge` 和 `editor` **都只依赖它**;连存档层都从它取类型([save/types.ts:1](../../../packages/reforge/src/save/types.ts#L1))。editor 自己写明边界([editor/src/index.ts](../../../packages/editor/src/index.ts)):「依赖 content 数据模型,将来**嵌** reforge 预览,不碰 shared/game」。

```
现状(干净):                           ❌ 初版计划(把 schema 搬进 reforge):
   content ← 叶子(类型+逻辑+数据)          reforge(引擎 + schema + ops)  ← 重
   ↑       ↑                                ↑
reforge   editor                          editor ← 拿个类型得依赖整台引擎(canvas/菜单/IDB/vite)
                                          content 删除

✅ 本设计(只把数据搬走,叶子保留):
   content ← 叶子,只剩 schema + content-ops + 跨工程常量(数据已搬去 projects JSON)
   ↑       ↑
reforge   editor          projects/<id>/*.json  ← 纯数据
(loader)  (产 JSON / 嵌 reforge 预览)
```

**铁律对照**:搬 schema 进 reforge 会制造 `editor → reforge`(整台引擎)的新耦合,违反 READ-FIRST #3「别把旧/重模块结构的耦合带进来」与 #4「解耦」。保留 content 叶子是**更省事**的——只删数据 const、不动 33 处 `import from '@type-pal/content'`。包名保持 `content`(零改名 churn;嫌「content 却无数据」别扭,纯属命名,留后可选改名 `@type-pal/model`)。

### 2.2 目录

```
type-pal/
├── packages/
│   ├── content/             ← 叶子(保留):schema(类型)+ content-ops(纯逻辑)+ 跨工程常量
│   │   └── src/             ← 删掉所有数据 const(§5-A);types/ops/常量留下(§5-B)
│   ├── reforge/             ← 引擎壳(固定;不再认识任何具体游戏)
│   │   └── src/
│   │       ├── loader.ts    ← 新增:运行期 fetch manifest + content JSON + 校验 + 组装
│   │       ├── assets.ts    ← 改:BASE 从写死 '/extracted' → 由 manifest.assets 注入(§5-C)
│   │       └── (现有渲染/菜单/存档/输入/main.ts 全保留,main.ts 去硬编码)
│   └── editor/              ← 网页版编辑器(B 期;依赖 content,嵌 reforge 预览)
│
├── projects/                ← 新增:工程根(一个文件夹 = 一个游戏)
│   └── demo/          ← demo 工程(由现有 content 数据迁移而来)
│       ├── manifest.json    ← 工程清单(§3)
│       ├── content/         ← 纯 JSON 数据(§4)
│       └── assets/          ← 工程自有资源(map/tileset/sprite/palette;不含引擎 UI 皮)
│
└── data/extracted/          ← 原始提取(migrate/编辑器的素材源;A2 后不再被引擎直接 fetch)
```

**引擎启动流程**(壳/肉分离):
1. 选工程:dev `pnpm dev --project=demo`(vite define 注入 `VITE_PROJECT_ID`);打包后选单(留后)。
2. `loader.loadProject(id)` → fetch `projects/<id>/manifest.json`。
3. 按 manifest 逐个 fetch content JSON → 轻量 guard 校验 → 组装内存对象。
4. content-ops `buildWorld(manifest.startWorld, characters)` 造初始世界态。
5. 注入引擎跑;`main.ts` 不再 `import` 任何具体游戏,`SCENE_ID/MAP_NAME` ← manifest 字段。
6. 资源:map/tileset/sprite/palette 按 `manifest.assets` 路径加载(A2);引擎 UI 皮/字模仍走引擎自有路径。

## 3. manifest.json(工程清单)

```jsonc
{
  "id": "demo",              // 工程 id(= 文件夹名;稳定身份,非下标)
  "name": "鬼界·民居(DLC-01)",    // 显示名(选单/标题用 → 替代 MAP_NAME 常量)
  "contentVersion": 1,             // ⚠ 工程内容数据版本(迁移用)。与存档 SAVE_VERSION 是**两个轴**,别共用
  "entryScene": "guijie-minju",    // 入口场景 id(= content/scenes.json 里的 scene.id)
  "content": {                     // content 文件清单(loader 按此 fetch + 校验)
    "scenes": "content/scenes.json",
    "characters": "content/characters.json",
    "skills": "content/skills.json",
    "items": "content/items.json",
    "locale": "content/locale.json"
  },
  "assets": {                      // 工程自有资源根 + 命名规则(loader/assets.ts 据此解析,A2)
    "root": "assets",
    "maps": "maps",                // reuseOriginalMap=N → assets/maps/<N>.json
    "tilesets": "tilesets",        // → assets/tilesets/<N>.rle
    "sprites": "sprites",          // → assets/sprites/<N>.rle
    "palettes": "palettes"         // → assets/palettes/<N>.json
  },
  "startWorld": {                  // initialWorld() 的数据化(替代函数;§5-A)
    "party": ["li-xiaoyao"],       // 角色模板 id 列表(顺序 = 入队顺序)
    "money": 0,
    "learnedSkills": { "li-xiaoyao": ["296", "298", "299"] },
    "inventory": [{ "itemId": "267", "count": 1 }, { "itemId": "61", "count": 2 }, { "itemId": "78", "count": 1 }],
    "seedStats": { "li-xiaoyao": { "hp": 100, "mp": 30 } }  // demo 低 HP/MP 播种(覆盖模板 baseStats)
  }
}
```

> 跨工程不变的常量(`EQUIP_SLOT_IDS` / `HALF_W` / `HALF_H` / `SAVE_VERSION` 等)**不进 JSON**,留 content/引擎——它们是引擎常量,不是工程数据。

## 4. content JSON 结构(数据形态)

content 现有数据 const → 序列化文件(去向见 §5-A):

- **`scenes.json`**:`SceneDef[]`(`guijieMinjuScene` 装进数组;含 map.reuseOriginalMap / room / entry / entities / dialogues)。
- **`characters.json`**:`CharacterTemplate[]`(`LI_XIAOYAO`,**去 demo 种子**——hp/mp 种子移到 manifest.startWorld.seedStats)。
- **`skills.json`**:`{ skills: SkillData[]; levelUp: Record<string, LevelUpSkill[]> }`(`DEMO_SKILLS` 值数组 + `LEVEL_UP_SKILLS`)。
- **`items.json`**:`ItemData[]`(`DEMO_ITEMS` 值数组)。
- **`locale.json`**:`Record<TextId, string>`(`zhLocale`)。

> id 约定(写进 [decisions.md](../decisions.md)):**authored 内容**(角色/场景)用语义 id(`li-xiaoyao` / `guijie-minju`);**bulk 迁移内容**(技能/物品)保留原版 oid 字符串(`"296"`/`"267"`)——原版 oid 是稳定 id 非下标,不违 READ-FIRST #5,但**当不透明 string,勿 hardcode 语义/算偏移**。

## 5. 迁移清单(content 包:数据搬走,类型+逻辑留下)

content 里的东西分两类,**必须分开处理**(这是迁移的关键):

### A. 纯数据 → 序列化进工程 JSON,然后从 content **删除**
| 现状(content) | 去向 |
|---|---|
| `guijieMinjuScene` (index.ts) | `projects/demo/content/scenes.json`(装进 `SceneDef[]`) |
| `DEMO_SKILLS` (skill.ts) | `content/skills.json` 的 `skills`(取值数组) |
| `LEVEL_UP_SKILLS` (skill.ts) | 同上的 `levelUp` |
| `DEMO_ITEMS` (item.ts) | `content/items.json`(取值数组) |
| `LI_XIAOYAO` (character.ts) | `content/characters.json`(去 demo 种子) |
| `initialWorld()` (character.ts) | `manifest.startWorld`(数据化)+ content-op `buildWorld`(见下) |
| `zhLocale` (locale.ts) | `content/locale.json` |

`initialWorld()` 数据化:现 `initialWorld()` = `instantiate(LI_XIAOYAO)` + 种子 hp=100/mp=30 + 组装 party/money/learnedSkills/inventory([character.ts:92-106](../../../packages/content/src/character.ts#L92-L106))。拆成:
- **数据** → `manifest.startWorld`(§3:party 模板 id / money / learnedSkills / inventory / seedStats)。
- **逻辑** → 新 content-op `buildWorld(startWorld, templatesById): WorldState`:对每个 `party` id `instantiate(template)` → 应用 `seedStats` 覆盖 hp/mp → 组装。`learnedSkills`/`inventory` 直接取 startWorld(demo 模板:实例 id === 模板 id,1:1)。
  > ⚠ **复核补注**:`learnedSkills` 的 key 是**实例 id**(`[li.id]`,character.ts:99),不是模板 id。demo 单人时实例 id === 模板 id === `'li-xiaoyao'`,所以 startWorld 用模板 id 当 key 恰好对。但这是 demo 巧合——多人工程下实例 id 会带实例化区分(loader 按入队顺序生成),届时 startWorld 的 key 约定需调整。A 期单人 demo 不受影响,但 buildWorld 注释 + design 此处须写明"key = 实例 id",免得后人误用模板 id。

### B. 类型 + 纯逻辑 + 常量 → **留在 content**(不进 JSON,不搬 reforge)
| 现状 | 处理 |
|---|---|
| 所有 `interface`/`type`:`SceneDef`/`EntityDef`/`Dialogue`/`DialogueLine`/`Facing`/`TextId`/`DialogColor`/`TextSpan`/`Vec2`(index.ts);`WorldState`/`CharacterInstance`/`CharacterTemplate`(character.ts);`SkillData`/`SkillEffect`/`SkillCost`/`SkillTarget`/`StatusId`/`SkillAnimation`/`LevelUpSkill`(skill.ts);`ItemData`/`EquipSpec`/`UseSpec`/`ThrowSpec`/`EquipEffect`/`ItemUseEffect`/`CombatStat`/`EquipSlot`(item.ts);`Locale`(locale.ts);`GridPos`(grid.ts) | **留 content**(schema) |
| 纯逻辑:`effectiveStat`/`equippableItems`/`equipItem`/`equippedItemIds`/`usableItems`/`useItem`(item.ts);`instantiate`(character.ts);`lookupText`(locale.ts);`parseRichText`(rich-text.ts);`gridToPixel`/`pixelToGrid`/`spriteScreenY`(grid.ts) | **留 content**(content-ops) |
| 新增:`buildWorld`(§5-A) | content-ops |
| 新增:per-file 轻量 guard `validateScenes/Characters/Skills/Items/Locale`(zod 接缝) | content(模型自校验,editor 也复用) |
| 常量:`EQUIP_SLOT_IDS`(item.ts)/ `HALF_W`/`HALF_H`(grid.ts) | 留 content(跨工程不变) |

> content 包**不删**;迁移后它 = schema + ops + 常量 + guard。包名 `@type-pal/content` 不变(33 处 import 不动)。

### C. reforge 改动点
| 现状 | 改成 |
|---|---|
| `main.ts: import { guijieMinjuScene, initialWorld }`([:7](../../../packages/reforge/src/main.ts#L7)) | `const project = await loader.loadProject(PROJECT_ID)` |
| `SCENE_ID/MAP_NAME` 局部常量([:202-204](../../../packages/reforge/src/main.ts#L202-L204)) | `project.manifest.entryScene` / `.name`;入口场景 = `project.scenes.find(s => s.id === entryScene)` |
| `initialWorld()`([:181](../../../packages/reforge/src/main.ts#L181)) | `buildWorld(project.manifest.startWorld, project.charactersById)` |
| `assets.ts: BASE = '/extracted'`([:8](../../../packages/reforge/src/assets.ts#L8));`loadTilemap/loadTileset/loadSprite/loadPalette` 只收 `N` | 注入工程 assets root:`loadTilemap(root, N)` 等,root 来自 manifest.assets(A2)。引擎 UI 皮/字模(menu/dialog/glyph)**不动**,仍走引擎路径 |
| 新增 `loader.ts` | fetch manifest + 5 个 content JSON + guard + 组装 `LoadedProject { manifest, scenes, charactersById, skills, items, locale }` |
| 存档 `SavePayload`([save/types.ts:33](../../../packages/reforge/src/save/types.ts#L33))无 projectId | 加 `projectId` + `contentVersion`(存档绑工程:读档时校验工程匹配,防把 A 工程存档读进 B 工程) |

## 6. 工程选择(A 期:dev 命令行;选单留后)

- **dev**:`pnpm dev --project=<id>` → vite config 读 env → `define` 注入 `VITE_PROJECT_ID`。loader fetch `projects/<id>/`。无参时默认 `demo`。
- **打包选单(留后)**:浏览器列不了服务端目录 → 需构建期生成 `projects/index.json`(vite 插件 / `import.meta.glob`)→ 选单 UI。A 期不做(§9)。

## 7. 编辑器(B 期,网页版,场景编辑器起步 —— Claude 做)

> 编辑器依赖 §2-§5 工程地基(loader/schema/projects/JSON)先就位,且是 **canvas 视觉**工作 → 归 Claude(非 GLM)。本设计只占位,B 期单独出 plan + mockup。

- **形态**:独立 vite app(`packages/editor/`),依赖 `@type-pal/content`(schema)+ 嵌 `reforge` 预览。Chromium 跑。
- **落本地**:File System Access API 授权读写 `projects/<id>/`;Firefox/Safari 降级拖拽/导出 zip。
- **场景编辑器 MVP**:加载工程 scenes.json + assets tilemap → 画布可视化;摆 NPC/物件/触发区(菱形轴 `GridPos`,D16);编辑 entry/碰撞/交互对话 id;产出改写 `scenes.json`。
- 后续:剧情/对话编辑器、数值表编辑器。

## 8. 范围 / 分期

**A 期 = 工程地基 + 迁移(非视觉 → GLM)**,拆两个可独立验收的检查点:

- **A1 · 内容解耦**(架构核心):content 去数据化(§5-A/B)+ `buildWorld` op + `loader.ts`(content JSON)+ `main.ts` 去硬编码 import + 存档加 projectId。**资源仍暂走 `/extracted`**(loader 对二进制资源 root 暂默认 `/extracted`)。
- **A2 · 资源自包含**:把 demo 引用到的 map/tileset/sprite/palette 拷进 `projects/demo/assets/`;`assets.ts` 改吃 manifest.assets root;引擎 UI 皮/字模留引擎。

**A 期验收 gate**(必须全过):
1. `main.ts` **零具体游戏 import / 零 `SCENE_ID`/`MAP_NAME` 字面量常量**(全来自 manifest)。
2. `pnpm check` 全绿(含新 `buildWorld` / loader / guard 测 + 迁移 fidelity 测,见 plan)。
3. **鬼界民居 demo 浏览器实测行为与现状逐一致**(进场/对话/仙术回血/物品/装备/存读档)—— Claude 真机验,不拿用户当测试员。
4. A2 后:把 `/extracted` 指走(或删 symlink)demo 仍跑(证明真自包含)。

**B 期(Claude)**:场景编辑器 MVP(单独 plan + mockup)。
**再后**:打包选单(工程发现)、剧情/数值编辑器、多场景还原、工程版本迁移。

## 9. 待定细节(已决的标✅;留后的标⏳)

- ✅ **校验选型**:A 期手写轻量 guard,封单 `validate*()` 接缝;zod 留到编辑器产大量手改 JSON 时再上(局部替换)。类型当真值源。
- ✅ **version 轴**:`manifest.contentVersion`(工程数据) vs `SAVE_VERSION`(存档格式)**分开**;存档记 `projectId + contentVersion`。
- ✅ **assets 引用解析**:`reuseOriginalMap=N` → `<assets.root>/<assets.maps>/<N>.json` 等,规则固化在 loader/assets.ts(A2)。
- ✅ **引擎 chrome vs 工程资源**:字模/菜单皮/光标 = 引擎件留引擎;map/tileset/sprite/palette = 工程件进 projects。
- ⏳ **打包选单的工程发现**:浏览器无法列目录 → 构建期 `projects/index.json`。留 B 期后。
- ⏳ **File System Access 在 localhost 的权限模型**:B 期编辑器再定。

## 10. Self-Review
1. **壳/肉分离**:引擎不认识具体游戏;工程 = 自包含 JSON + assets;换工程不重编译。✅
2. **包拓扑干净(复审纠正)**:schema/ops 留 content 叶子,reforge/editor 各自依赖它、互不耦合;editor 不被迫吃整台引擎。✅
3. **数据/逻辑分清**:§5 把 content 严格拆成「进 JSON 的数据」vs「留 content 的类型+逻辑+常量」,逐符号列明。✅
4. **现状可迁 + 可证不变**:数据全有 JSON 去向;迁移用「旧 const 当 fidelity 测试 oracle」钉死无行为变化;main.ts/assets.ts 硬编码点全列(§5-C)。✅
5. **范围克制 + gate 可验**:A1/A2 各自可验收;B 期编辑器拆出;A 期完成线 = demo 浏览器实测逐一致 + main.ts 零硬编码。✅
6. **稳定 id + 版本/存档绑工程**:工程 id=文件夹名;id 约定成文;存档绑 projectId;version 双轴分离。✅

## 11. A7-2 静态图与 engine chrome 落地更新（2026-07-18）

本文件最初拍板的“工程内容资产 / 引擎 chrome”边界继续有效，现行实现进一步明确为两条互斥链：

```text
工程内容图像：AssetId -> assets/index.json -> AssetResolver -> FileSource
引擎默认界面：typed engine-chrome slot -> bundler URL
```

- PAL 的 `portrait`、`face`、`item-icon`、`battle-background` 已全部进入工程 catalog：共 379 条记录、
  5,464,181 B、2,656 条 typed 引用；0 missing、0 kind mismatch。内容模型和编辑器不再保存数字号或路径。
- 默认标题、Unifont、对话光标和 85 个默认 UI slot 属于 Reforge 引擎壳；统一由
  `packages/reforge/src/engine-chrome/registry.ts` 交给 bundler，UI/标题/许可与来源记录位于其 `assets/**`，
  已跟踪的 BDF build asset 也会进入构建产物。它们不进入工程 catalog，也不进入 A5 工程 ZIP。
- PAL ignored 二进制由
  `pnpm --filter @type-pal/migrate run migrate:content -- --write` 物化到 `projects/pal/assets/**`；
  `data/baked` 已退役，`pnpm bake` 只重建引擎 chrome。
- `data/extracted` 只保留为迁移输入和 A7-4 尚未退出的 legacy family 过渡源。当前仍有
  `tileset`、`sprite`、`battle-sprite`、`effect-sprite`、`image` 五族，故 A7/R7 仍是进行中，不能把
  A7-2 的静态图闭包写成整个 PAL 工程已经 catalog-only。
- A5 只备份/交换工程目录；A8 独立发行包才组合“引擎壳（含 chrome）+ 工程”。

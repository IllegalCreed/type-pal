# 工程化架构设计(engine project / 「一工程一游戏」)

> 第二阶段 Reforge。2026-06-30 讨论(用户 + 助手)。**本文件是设计,非实现**——按下方「迁移/实施」落地。
> 状态:设计(待审)。先读 [READ-FIRST](../READ-FIRST.md)。背景:大世界菜单系统已闭环,下一块是工程化 + 编辑器。

## 0. 为什么要做(现状痛点)

当前引擎与游戏内容是**编译期绑死**的:
- `main.ts` 直接 `import { guijieMinjuScene } from '@type-pal/content'` —— 唯一场景写死在 import。
- `SCENE_ID = 'guijie-minju'` / `MAP_NAME = '鬼界·民居'` 是局部常量。
- content 包把场景/角色/技能作为具名导出,引擎编译时吃进去。

→ **换游戏 = 改源码重编译。** 没有"工程"概念,编辑器也无从产出(产出物喂不进一个写死的引擎)。

**目标**:把"游戏内容"从编译期依赖变成**运行期加载的数据**。引擎是壳(固定),工程是肉(可换)。换工程文件夹 = 换一个完整游戏。编辑器 = 写工程 JSON 的工具。

## 1. 决策记录(已拍板)

| 决策点 | 选择 | 理由 |
|---|---|---|
| 工程粒度 | **一工程 = 一整套游戏**(仙剑DLC / 换皮 / 新作) | 壳/肉分离最干净;像 RPG Maker 的 .rpgproject |
| 资源归属 | **工程自包含**(map/tileset/sprite 都在工程文件夹) | 工程可独立分发;接受资源跨工程重复(原版图就那一批) |
| content 形态 | **纯 JSON**(运行期 fetch) | 引擎与内容彻底解耦;编辑器产 JSON 最自然;丢 TS 类型→用 schema 校验补 |
| 工程选择 | **两者都要**:dev 命令行指定 + 打包后选单 | dev 体验 + 分发展示两全 |
| 现状 content | **全部迁**(现在就拆干净) | 避免引擎混用(import 老 + loader 新)的过渡债 |
| 编辑器起点 | **场景编辑器优先** | 最大头/最依赖可视化;依赖工程地基先就位 |

## 2. 目标架构

```
type-pal/
├── packages/
│   ├── reforge/              ← 引擎壳(固定;不再认识任何具体游戏)
│   │   └── src/
│   │       ├── schema/       ← 新增:content 的 TS 类型定义(ItemData/SkillData/SceneDef/...)
│   │       │                    引擎 + 编辑器 + 工程共享(从 content 包搬来)
│   │       ├── content-ops/  ← 新增:纯逻辑(equipItem/useItem/effectiveStat/instantiate/
│   │       │                    lookupText/gridToPixel ...)从 content 包搬来,操作 JSON 数据
│   │       ├── loader.ts     ← 新增:运行期 fetch 工程 manifest + content JSON + 校验 + 注入
│   │       └── (现有渲染/菜单/存档/输入 全保留)
│   └── editor/               ← 新增包(网页版编辑器,产出工程 JSON)
│
├── projects/                 ← 新增:工程根(一个文件夹 = 一个游戏)
│   └── guijie-dlc/           ← demo 工程(由现有 content 数据迁移而来)
│       ├── manifest.json     ← 工程清单(见 §3)
│       ├── content/          ← 纯 JSON 数据(见 §4)
│       └── assets/           ← 资源(自包含)
│           ├── maps/         ← 原版 map/tileset(从 data/extracted 搬)
│           ├── sprites/
│           └── ui/
│
└── data/extracted/           ← 原始提取(编辑器/migrate 的素材源;不直接被引擎用)
```

**引擎启动流程**(壳/肉分离):
1. 选工程:dev 期 `pnpm dev --project=guijie-dlc`(或 env);打包后选单列 `projects/*`。
2. `loader.fetch('projects/<id>/manifest.json')` → 读清单。
3. 按 manifest 逐个 `fetch` content JSON → 用 schema(`type` 校验 / zod 待定)校验 → 装成内存对象。
4. assets 按 manifest 声明路径加载(map/tileset/sprite/ui)。
5. 注入引擎跑(`main.ts` 不再 `import` 任何具体游戏)。

**核心转变**:`main.ts` 的 `import { guijieMinjuScene }` → `const project = await loader.load(manifest)`;`SCENE_ID/MAP_NAME` 常量 → manifest 字段。

## 3. manifest.json(工程清单)

```jsonc
{
  "id": "guijie-dlc",              // 工程 id(= 文件夹名;稳定身份,非下标)
  "name": "鬼界·民居(DLC-01)",    // 显示名(选单/标题用)
  "version": 1,                    // 工程数据版本(迁移用,同 SavePayload.version)
  "entryScene": "guijie-minju",    // 入口场景 id(= content/scenes.json 里的 scene.id)
  "content": {                     // content 文件清单(loader 按此 fetch)
    "scenes": "content/scenes.json",
    "characters": "content/characters.json",
    "skills": "content/skills.json",
    "items": "content/items.json",
    "locale": "content/locale.json"
  },
  "assets": {                      // 资源根 + 命名规则(loader 据此解析引用)
    "root": "assets",
    "maps": "maps",                // SceneDef.map.reuseOriginalMap=N → assets/maps/<N>.json
    "tilesets": "tilesets",
    "sprites": "sprites",
    "ui": "ui"
  },
  "startWorld": {                  // initialWorld 的数据化(替代 initialWorld() 函数)
    "party": ["li-xiaoyao"],       // 角色模板 id 列表
    "money": 0,
    "learnedSkills": { "li-xiaoyao": ["296", "298", "299"] },
    "inventory": [{ "itemId": "267", "count": 1 }, { "itemId": "61", "count": 2 }, { "itemId": "78", "count": 1 }],
    "seedStats": { "li-xiaoyao": { "hp": 100, "mp": 30 } }  // demo 低 HP/MP 播种
  }
}
```

## 4. content JSON 结构(数据形态)

content 包现有数据 → 序列化规则(见 §5 迁移清单):

- **`scenes.json`**:`SceneDef[]`(含 map 引用 reuseOriginalMap / room / entry / entities / dialogues)。
- **`characters.json`**:`CharacterTemplate[]`(LI_XIAOYAO 去 demo 种子 hp/mp 后的模板)。
- **`skills.json`**:`{ skills: SkillData[]; levelUp: Record<string, LevelUpSkill[]> }`。
- **`items.json`**:`ItemData[]`。
- **`locale.json`**:`Record<TextId, string>`(现 zhLocale 表)。

> 常量(`EQUIP_SLOT_IDS` / `HALF_W` / `HALF_H` / `SAVE_VERSION` 等)随 schema/引擎走(不进 JSON,它们是跨工程不变的引擎常量)。

## 5. 迁移清单(content 包 → schema + JSON)

content 包里的东西分两类,**必须分开处理**(这是迁移的关键):

### A. 纯数据 → 序列化进工程 JSON
| 现状(content 包) | 去向 |
|---|---|
| `DEMO_SKILLS` (skill.ts) | `projects/<id>/content/skills.json` 的 `skills` |
| `LEVEL_UP_SKILLS` (skill.ts) | 同上的 `levelUp` |
| `DEMO_ITEMS` (item.ts) | `content/items.json` |
| `LI_XIAOYAO` (character.ts) | `content/characters.json`(去 demo 种子) |
| `initialWorld()` 逻辑 (character.ts) | `manifest.json` 的 `startWorld`(数据化) |
| `guijieMinjuScene` (index.ts) | `content/scenes.json` |
| `zhLocale` (locale.ts) | `content/locale.json` |
| `EQUIP_SLOT_IDS` | schema 常量(跨工程不变,留 schema) |

### B. 类型 + 纯逻辑 → 留引擎/schema(不进 JSON)
| 现状 | 去向 |
|---|---|
| 所有 `interface`/`type`(SkillData/ItemData/SceneDef/WorldState/CharacterInstance/...) | `reforge/src/schema/` |
| `effectiveStat`/`equippableItems`/`equipItem`/`useItem`/`equippedItemIds` (item.ts) | `reforge/src/content-ops/`(操作 JSON 装载后的对象) |
| `instantiate`/`initialWorld`(构建用,数据化后简化) | content-ops |
| `lookupText`/`parseRichText` | content-ops(纯函数) |
| grid 数学(`gridToPixel`/`pixelToGrid`/`spriteScreenY`)+ `GridPos` | schema/引擎常量 |
| `StatusId`/`SkillEffect`/`EquipEffect` 联合类型 | schema |

→ **迁移后 content 包可删除**(或只剩 re-export schema 给老测试过渡,迁移完删)。

### C. reforge 改动点
| 现状 | 改成 |
|---|---|
| `main.ts: import { guijieMinjuScene }` | `loader.loadScenes()` |
| `SCENE_ID/MAP_NAME` 局部常量 | `manifest.entryScene` / `manifest.name` |
| `initialWorld()` | `loader.buildWorld(manifest.startWorld)` |
| `import { ... } from '@type-pal/content'` | `from './schema'` + `from './content-ops'` + loader 结果 |

## 6. 工程选择(dev 选单 + 打包选单)

- **dev**:启动参数指定 `--project=<id>`(vite 配置读 env → 注入 `PROJECT_ID`)。loader fetch `projects/<id>/`。
- **打包选单**:引擎 build 后,启动先 `fetch('projects/')` 列目录(vite 的 `import.meta.glob` 或服务端列目录)→ 渲染选单 → 选定后 load 该工程 manifest。
- dev 期也支持选单(默认进选单,`--project` 跳过直接进)。

## 7. 编辑器(网页版,场景编辑器起步)

> 编辑器依赖 §2-§5 工程地基先就位(loader/schema/projects 结构)。本期先做地基 + 场景编辑器 MVP。

- **形态**:独立 vite app(`packages/editor/`)。Chromium 浏览器跑。
- **落本地**:File System Access API(`showDirectoryHandle`)—— 授权一次后直接读写 `projects/<id>/` 文件夹(增删改 content JSON + assets)。Firefox/Safari 降级:拖拽目录或导出 zip。
- **场景编辑器 MVP**(起点):
  - 加载工程的 `scenes.json` + `assets/maps/<N>` tilemap → 画布上可视化编辑。
  - 摆放 NPC/物件/触发区(菱形轴 `GridPos` 坐标,符合 D16)。
  - 编辑 entry 点 / 碰撞 / 交互对话 id。
  - 产出:改写 `content/scenes.json`(File System Access 落盘)。
- 后续:剧情/对话编辑器(对话树/分支/触发)、数值表编辑器(角色/技能/物品)。

## 8. 范围 / 分期

**本期(工程地基 + 迁移 + 场景编辑器 MVP)**:
1. `reforge/src/schema/`(类型从 content 搬)+ `content-ops/`(逻辑搬)。
2. `loader.ts`(manifest + JSON fetch + 校验)+ dev `--project` 参数。
3. `projects/guijie-dlc/` 工程(现有 content 数据序列化迁移)+ assets 自包含。
4. reforge main.ts 改用 loader(去硬编码 import)。
5. 删 content 包(或留过渡 re-export)。
6. 场景编辑器 MVP(`packages/editor/`,File System Access 落 JSON)。

**后**:
- 打包选单(工程列表 UI)。
- 剧情/对话编辑器、数值表编辑器。
- 多场景还原(现 `position.sceneId` 单场景占位 → 多场景)。
- 工程版本迁移(payload version 机制已有雏形)。

## 9. 待定细节(实施时定,非阻塞)
- JSON schema 校验选型:TS 类型 + 手写 guard vs zod(zod 加依赖,但校验更稳)。
- assets 引用解析:`SceneDef.map.reuseOriginalMap=56` → `assets/maps/56.json` 的映射规则固化在 loader。
- File System Access 在 dev(localhost)的权限模型(需 HTTPS 或 localhost 例外)。
- 选单 UI 的工程发现机制(浏览器无法列服务端目录 → 需 vite 插件/glob 预编译工程列表)。

## 10. Self-Review
1. **壳/肉分离**:引擎不认识具体游戏;工程 = 自包含 JSON + assets;换工程不重编译。✅
2. **数据/逻辑分清**:§5 把 content 包严格拆成「进 JSON 的数据」vs「留引擎的逻辑+类型」,迁移路径明确。✅
3. **现状可迁**:现有 DEMO_SKILLS/ITEMS/角色/场景 全有明确 JSON 去向;main.ts 硬编码点全列出(§5-C)。✅
4. **编辑器通了**:网页版 + File System Access 写工程文件夹 = "产出落本地";场景编辑器作起点(最大头/最可视化)。✅
5. **范围克制**:本期地基 + 迁移 + 场景编辑器 MVP;选单/剧情编辑器/多场景留后。✅
6. **稳定 id 贯彻**:工程 id = 文件夹名;场景/角色/技能/物品 id 跨 JSON 引用(非下标)。✅

# 工程地基实施计划(A 期)—— 给 GLM 开工

> 设计依据 [project-design.md](project-design.md);开工前先读 [READ-FIRST](../READ-FIRST.md)。
> **分工**:A 期(本计划,纯逻辑/数据/loader,**非视觉**)= GLM。B 期(场景编辑器,canvas 视觉)+ A 期验收的**浏览器实测** = Claude。
> **状态**:待 GLM 再审 → 开工。

## 总则(先看,别违反)

1. **目标只有一个**:把游戏内容从编译期 `import` 变成运行期加载的 JSON 数据,**且全程零行为变化**。每个检查点跑完,鬼界民居 demo 表现必须和现在一模一样。
2. **包拓扑**:schema + 纯逻辑**留在 `@type-pal/content` 叶子包**(只删数据 const)。**不要**把类型/逻辑搬进 reforge。**不要**删 content 包。包名不改(33 处 import 不动)。
3. **⚠ 头号陷阱 —— 别拿新全局换旧全局**:现在数据是「环境全局」(`DEMO_ITEMS`/`DEMO_SKILLS` 经默认参数 `= DEMO_ITEMS` 和直接 import 漏进 ~10 个文件)。本期就是要**消灭**这种环境全局。删默认参数后,**数据表必须从「加载好的工程对象」当显式参数往下传**;**严禁**新建一个模块级 `let loadedItems` 再 `= loadedItems` 当默认值 —— 那只是把全局换了个名字,等于没做。
4. **TDD**:纯函数(buildWorld / loader 的组装核 / guard)先写测试。`main.ts` 是 vite 入口(集成),靠 Claude 浏览器实测,不强求单测。
5. **最小 diff**:除了「去全局化」必需的签名改动,别顺手重构无关代码、别改公式/数值/交互。改动范围 = 本计划列出的;多出来的要在 PR 说明里讲清为什么。
6. 每个检查点结束跑 `pnpm check`(typecheck + test)必须全绿,再进下一个。

## 现状耦合地图(为什么 A1 是大头)

`DEMO_ITEMS` / `DEMO_SKILLS` 不是只在 main.ts —— 它们经默认参数和直接 import 渗进:
- **content ops**(`item.ts`):`equippableItems`/`equipItem`/`usableItems`/`useItem` 都有 `items: Record<string, ItemData> = DEMO_ITEMS` 默认值([item.ts:245/282/315/336](../../../packages/content/src/item.ts#L245));`effectiveStat` 已是必传(无默认)。
- **state 机**:`magic-menu-state.ts` 直接 `DEMO_SKILLS[id]`([:21](../../../packages/reforge/src/magic-menu-state.ts#L21));`equip-menu-state.ts` 直接 `DEMO_ITEMS[...]`([:81](../../../packages/reforge/src/equip-menu-state.ts#L81))+ 调 `equippableItems`/`equipItem` 吃默认。
- **render box**:`menu-box.ts`(状态板 5 属性 + 图标预载 `Object.values(DEMO_ITEMS)` [:388](../../../packages/reforge/src/menu/menu-box.ts#L388))、`equip-box.ts`、`use-box.ts` 都 import `DEMO_ITEMS` + `effectiveStat`。
- **main.ts**:`initialWorld()`([:181](../../../packages/reforge/src/main.ts#L181))、`resolveOutdoorSkills(world, caster.id)`([:637](../../../packages/reforge/src/main.ts#L637))。

⚠ **locale 渗透(复核补漏,易漏)**:`zhLocale`(要删的数据 const)不只 menu 在用 —— **`dialog/dialog-box.ts` 直接 `import { zhLocale }`([:6](../../../packages/reforge/src/dialog/dialog-box.ts#L6)),3 处用([:84/226](../../../packages/reforge/src/dialog/dialog-box.ts#L84))**。它和 menu-box 一样要改吃 locale 参(由 main.ts 从 loader 注入)。漏这处 = 删 `zhLocale` 时编译炸。`main.ts` 自身也 `import { zhLocale }`([:12](../../../packages/reforge/src/main.ts#L12)),多处 lookupText 喂它。

→ 所以迁移分两步:**先去全局化(A1a,数据还在 const,只是改成显式传参)**,**再换数据源(A1b,const→JSON)**。这样每步都零行为变化、独立可验。

---

## 任务 A1a · 去全局化(纯重构,数据 const 暂不动)

**目标**:把所有对 `DEMO_ITEMS`/`DEMO_SKILLS` 的环境式访问,改成从调用链顶端(main.ts)显式传入。做完后,全仓 `grep DEMO_ITEMS|DEMO_SKILLS` 只应剩:① 它们在 content 的定义;② main.ts `import` 它们去喂参数;③ 测试。**const 还在 content,行为零变化。**

步骤(让 tsc 当向导):
1. **content `item.ts`**:删掉 4 个 `= DEMO_ITEMS` 默认值([:245/282/315/336](../../../packages/content/src/item.ts#L245)),`items` 变必传参。`magic` 侧 `resolveOutdoorSkills` 加 `skills: Record<string, SkillData>` 必传参,内部 `skills[id]` 取代 `DEMO_SKILLS[id]`。
2. `pnpm --filter @type-pal/reforge run typecheck` → tsc 报出所有缺参调用点(就是上面耦合地图那些)。逐个补:
   - `magic-menu-state.resolveOutdoorSkills(world, casterId, skills)`。
   - `equip-menu-state`:`openEquipMenu`/`equipApply` 等加 `items` 参(`equippableItems(world, casterId, items)`、`equipItem(..., items)`、第 81 行 `items[s.selectedItemId]`)。
   - `use-menu-state`:`usableItems(world, items)`、`useItem(..., items)`。
   - render box(`menu-box`/`equip-box`/`use-box`):给需要的 draw 函数加 `items` 参,删掉它们的 `import { DEMO_ITEMS }`;`effectiveStat(c, stat, items)` 的 items 来自参数。
   - **`dialog/dialog-box.ts`(复核补漏)**:它 `import { zhLocale }` 当 lookupText 的 locale 参([:6/84/226](../../../packages/reforge/src/dialog/dialog-box.ts#L6))。改成接 `locale` 参(由 main.ts 注入 loader 加载的 locale),删 `zhLocale` import。
3. **main.ts** 是数据进入点:这一步它仍 `import { DEMO_ITEMS, DEMO_SKILLS }`,把它们作为实参往下传(`resolveOutdoorSkills(world, id, DEMO_SKILLS)`、各 draw/menu 调用补 `DEMO_ITEMS`)。
4. 测试:state 机的单测(`magic/use/equip-menu-state.test.ts`)补传 fixture 表(可用真 `DEMO_*` 或最小内联表)。

**A1a 验收**:`pnpm check` 全绿;`grep -rn "DEMO_ITEMS\|DEMO_SKILLS" packages` 只剩定义/ main.ts import / 测试;Claude 浏览器实测 demo 行为不变(状态板属性、装备、使用、仙术列表均同)。

> 这一步是整个地基的骨头:数据一旦「可注入」,换数据源(A1b)就只是改 main.ts 一处取数。

---

## 任务 A1b · 数据外置为 JSON + loader(删 const)

**目标**:数据从 content const 搬到 `projects/guijie-dlc/`,reforge 经 loader 运行期 fetch + 校验 + 组装,main.ts 不再 import 任何具体游戏数据。

1. **建工程目录** `projects/guijie-dlc/`:
   - `manifest.json`(照 design §3:id/name/contentVersion/entryScene/content/assets/startWorld)。
   - `content/{scenes,characters,skills,items,locale}.json`(照 design §4 序列化现有 const;§5-A 的去向表)。
   - `startWorld`:把 `initialWorld()` 的种子拆出来 —— `seedStats.li-xiaoyao = {hp:100, mp:30}`(现 [character.ts:94-95](../../../packages/content/src/character.ts#L94));party/money/learnedSkills/inventory 照现值。
   - `characters.json` 里 `LI_XIAOYAO` **去掉** demo 种子(种子已进 manifest)。
2. **content 新增 `buildWorld`**(content-op,在 character.ts 或新 world.ts):
   ```
   buildWorld(startWorld, templatesById): WorldState
     party = startWorld.party.map(id => applySeed(instantiate(templatesById[id]), startWorld.seedStats?.[id]))
     return { party, money, learnedSkills: startWorld.learnedSkills, inventory: startWorld.inventory }
   ```
   **先写测试(fidelity oracle)**:`buildWorld(MANIFEST.startWorld, {'li-xiaoyao': LI_XIAOYAO})` `toEqual` 现 `initialWorld()`(趁 const 还在,拿旧函数当真值钉死)。
3. **content 新增轻量 guard**(zod 接缝,各一个纯函数):`validateScenes/Characters/Skills/Items/Locale(json): T`,只查「是数组/对象 + 必需键在 + id 是 string」,不齐就 `throw new Error(具体哪条缺啥)`。写测试:合法过、缺键抛。
4. **reforge `loader.ts`**:
   - 纯组装核 `assembleProject(manifestJson, contentJsons): LoadedProject`(过 guard + 组 `{ manifest, scenes, charactersById, skills, items, locale }`)—— **可单测**(喂 fixture JSON)。
   - IO 壳 `loadProject(projectId): Promise<LoadedProject>` = fetch manifest + 5 个 content JSON → `assembleProject`。
   - `skills`/`items` 组成 `Record<id, T>`(state/render 要按 id 查),`scenes` 留数组 + `charactersById`。
5. **main.ts 改造**(design §5-C):
   - `const PROJECT_ID = import.meta.env.VITE_PROJECT_ID ?? 'guijie-dlc'`;`const project = await loadProject(PROJECT_ID)`。
   - 删 `import { guijieMinjuScene, initialWorld }`;入口场景 `const scene = project.scenes.find(s => s.id === project.manifest.entryScene)`(取不到 throw)。
   - `SCENE_ID`→`project.manifest.entryScene`;`MAP_NAME`→`project.manifest.name`(删那两个字面量常量)。
   - `world = buildWorld(project.manifest.startWorld, project.charactersById)`。
   - A1a 已让数据可注入 → 这里把 `project.items`/`project.skills` 喂给原来传 `DEMO_*` 的地方。
   - **vite 配置**:`--project=<id>` / env → `define` 注入 `VITE_PROJECT_ID`(无参默认 guijie-dlc)。
6. **删 content 数据 const**:`guijieMinjuScene`/`DEMO_SKILLS`/`LEVEL_UP_SKILLS`/`DEMO_ITEMS`/`LI_XIAOYAO`/`zhLocale`/`initialWorld`。保留所有 type/op/常量。
7. **修测试**(删 const 后必然红):
   - content 的 op 单测(item/skill/character/locale/content.test.ts)改用**最小内联 fixture**(测逻辑不需要真数据),别再 import 已删的 const。
   - reforge 用 `initialWorld()` 当 fixture 的测(**magic/use/equip-menu-state.test.ts + save/ops.test.ts + save/store.test.ts** —— 复核补漏:save 的两个 test 也拿 initialWorld 当 world fixture)改用共享 helper `makeTestWorld()`(buildWorld 套内联 fixture)——**一个** helper,别散落。
   - **别为了变绿删测试覆盖**;真删不掉的(如「scenes 文案都在 locale」content.test.ts)迁成「读工程 JSON 跑同样断言」。

**A1b 验收**:`pnpm check` 全绿;`main.ts` 零具体游戏 import、零 `SCENE_ID`/`MAP_NAME` 字面量;`grep guijieMinjuScene|DEMO_SKILLS|DEMO_ITEMS|initialWorld packages` 为空(只剩工程 JSON 与新 helper);Claude 浏览器实测 demo 全流程(进场/对话/仙术/物品/装备/存读档)逐一致。

---

## 任务 A1c · 存档绑工程

`SavePayload`([save/types.ts:33](../../../packages/reforge/src/save/types.ts#L33))加 `projectId: string` + `contentVersion: number`;`buildPayload`/`buildMeta`([save/ops.ts](../../../packages/reforge/src/save/ops.ts))注入 `project.manifest.id` / `.contentVersion`。读档时校验 `payload.projectId === 当前 project.id`,不匹配则拒绝(防把 A 工程存档读进 B 工程)。`SAVE_VERSION` 与 `contentVersion` **分开**两个轴。写测试:payload 含 projectId;跨工程读档被拒。

**验收**:`pnpm check` 绿;Claude 实测存读档正常 + 跨工程拒绝生效。

---

## 任务 A2 · 资源自包含

**目标**:demo 引用的资源进工程文件夹,引擎按 manifest 路径加载,不再 fetch `/extracted`。引擎 UI 皮/字模留引擎。

1. **枚举 demo 实际 fetch 的工程资源**(照 [main.ts:133-177](../../../packages/reforge/src/main.ts#L133)):tilemap 56、tileset 56、palette `PALETTE_ID`(默认 0)、sprite 2(李逍遥)+ sprite 16(鬼)。把这些从 `data/extracted/data/...` 拷进 `projects/guijie-dlc/assets/{maps,tilesets,sprites,palettes}/`。
   - **引擎件留引擎**(别拷进工程):glyph 字模、`loadMenuAssets`、`loadCursorFrames`、`loadPortraits`。
2. **`assets.ts` 改吃工程根**:`loadTilemap/loadTileset/loadSprite/loadPalette` 现写死 `BASE='/extracted'`([:8](../../../packages/reforge/src/assets.ts#L8))→ 接收 root 参(来自 `manifest.assets`,loader 解析)。main.ts 传 `project` 的资源根。
3. portraits(`dialog-assets`)目前算 demo 内容头像还是引擎件?**本期归引擎**(占位头像),留注释「将来工程可覆盖」,先不动。
4. **验收**:把 `public/extracted` symlink 改名/指走,`pnpm --filter reforge dev --project=guijie-dlc` demo 仍正常(证明真自包含);`pnpm check` 绿;Claude 浏览器实测画面/精灵/调色板不变。

---

## A 期总验收 gate(design §8)

- [ ] `main.ts` 零具体游戏 import、零 `SCENE_ID`/`MAP_NAME` 字面量(全来自 manifest)。
- [ ] 全仓无环境式 `DEMO_ITEMS`/`DEMO_SKILLS`/`initialWorld`/`guijieMinjuScene` 残留。
- [ ] `pnpm check` 全绿(含 buildWorld fidelity 测、loader/guard 测、迁移后 op/state 测)。
- [ ] **Claude 浏览器实测**:鬼界民居 demo 全流程与现状逐一致(不拿用户当测试员)。
- [ ] A2 后:`/extracted` 指走 demo 仍跑。
- [ ] decisions.md 记下:包拓扑(schema 留 content 叶子)、id 约定(authored 语义 / 迁移保留 oid)、version 双轴 + 存档绑工程。

## 不在本期(别做)

- 打包选单 / 工程发现(`projects/index.json`)——留 B 期后。
- 场景编辑器、剧情/数值编辑器 —— B 期,**Claude 做(canvas 视觉)**。
- zod —— 用轻量 guard 占位,留到编辑器产大量手改 JSON 时再上。
- 多场景还原、全量技能/物品 migrate、工程版本迁移逻辑。
- 改任何公式/数值/交互/渲染外观 —— 本期纯搬运,零行为变化。

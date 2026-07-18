# A7-2 - 静态内容图像闭包与引擎 chrome 自包含

Status: draft
Phase: phase2
Capability: A7 / R3 / R7 / A4 / C1 / C4
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + Kimi
Unavailable Agents: none
Branch: main

## 目标

把“工程内容图像”和“引擎默认界面”彻底分开并分别闭环：PAL 工程的立绘、战斗小头像、物品图标和
战场背景全部使用稳定 `AssetId`，经 `assets/index.json -> AssetResolver -> FileSource` 读取，并在编辑器中
可导入、替换、选择、预览、定位引用和安全删除；默认菜单皮、默认字形、对话光标和当前默认标题界面
作为引擎 chrome 随 Reforge/编辑器试玩壳分发，不进入每个工程 catalog/ZIP，也不再依赖仓库级
`/extracted`、`/baked` 或站点根 `/ui`。A7-2 只退出 `portrait`、`face`、`item-icon`、
`battle-background` 四个项目 legacy family，不冒充 A7 总体完成。

## 用户裁决与边界勘误（2026-07-18）

- 用户明确指出：**默认 UI 在引擎，不在工程**。这与
  `docs/phase2/editor/project-design.md:21-25,68-83,162-168,186-207` 的早期拍板一致。
- “工程自包含”指**工程拥有的内容资源全部位于工程内**，不是把引擎运行壳的默认 UI、字形和光标
  复制进每个工程。A5 工程 ZIP 只打工程；A8 独立发行包由“引擎壳 + 工程”共同闭包。
- `docs/phase2/foundation/a7-resource-closure-audit.md:35-50` 后来声称项目生命周期/路线图覆盖了早期
  chrome 边界，但没有一条明确决策逐项推翻原拍板；本卡把该段视为待纠正的过度推导。
- `visual.standardColorTable` 继续是**工程资产**：它给工程的索引美术解码/量化，不给默认 UI 上色；
  不得借此复活用户可见的 `paletteId` 或调色板选择器。
- 本卡把当前 WIN95 FBP 2 作为**引擎默认标题界面**处理：它从战场背景加载链拆出并进入 engine chrome。
  “每工程自定义标题画面”若以后需要，必须另开显式能力与 schema；不能在 A7-2 暗塞一个通用路径字段。
- 当前 `legacy.ui` / `uiOverride` 是没有终态 descriptor、slot 契约、编辑 UI 和保存闭环的半能力。
  本卡不保留工程 UI 主题；若未来需要主题/自定义字形，另开能力卡设计。已有真实工程若使用该旧字段，
  升级边界必须 actionable fail，不得静默丢数据。

## 范围

- 范围内:
  - 项目内容图像四族：`portrait`、`face`、`item-icon`、`battle-background`。
  - 上述四族的 content schema、guard、typed asset walker、PAL 迁移、旧工程打开升级、存档升级、
    MG2 作者接管、runtime resolver、编辑器工作台/picker、HTTP/FSA 保存重开和闭包诊断。
  - 引擎 chrome 的单一资源入口：默认字形、默认菜单/状态/战斗 UI、默认对话光标、当前默认标题界面及
    相应许可证；Reforge standalone 与 editor play 共用同一份构建资产。
  - 删除项目 schema 中幽灵 `glyph-table` / `ui-image` kind 和 legacy family，以及
    `root => glyph-table/ui-image` 的无依据升级推断；删除 runtime 的 `legacy.ui`/目录式 fallback。
  - 保留并回归 `visual.standardColorTable` 的 catalog role；战场背景导入在内部量化为工程标准色彩，
    创作者不接触调色板概念。
  - 修正 A7 审计、project lifecycle、roadmap/capability-map 中混淆 project 与 engine chrome 的文字；
    A7/R7 总状态继续保持进行中。
- 范围外:
  - 瓦片、地图精灵、敌我战斗精灵、法术/命中特效等动态/索引 sprite family；归 A7-3 后续切片。
  - FBP 59-77 等尚无 `showImage/scrollImage/ending` 干净内容模型的全屏图/结局素材；当前不能为清账
    硬塞进 `battle-background`。`legacy image` 继续如实保留给后续有消费者的切片。
  - 工程 UI 主题、自定义字形、主题 slot descriptor、UI theme 市场；若立项必须另开高风险能力卡。
  - A7-4 的全 legacy family 归零、contentVersion 4、catalog-only clone/另存/ZIP 和最终断外链总门禁。
  - A8 独立发行、R8 版权替代/AI 资源生成、ED-3 全对象通用引用图。
  - 新的标题画面作者能力；本卡只把现有默认标题界面从错误的 battle-background 链移回引擎 chrome。
- 明确不做:
  - 不把默认 UI、字形或光标登记为每个工程的 AssetRecord，不让 A5 工程 ZIP 重复携带它们。
  - 不保留 `number | AssetId`、数字号 + 目录、`bg?: string`、404 静默 fallback 或按 AssetId 反推路径。
  - 不生成 `item-icon.pal.000` 假资产；原物品 277 的 `icon=0` 必须变为显式无图。
  - 不把 18 个未被物品表引用的 BALL 图标、FBP 59-77 或其他“源里存在但无当前内容引用”的文件
    无条件塞进工程；未引用的已登记项只报 warning，不用 allowlist 假装闭包。
  - 不手改 `projects/pal` 或把 `data/baked` 当迁移真值；上游提取/迁移/生成器修正后确定性重生成。
  - 不向作者暴露 palette、索引号、R 通道协议或“选择调色板”控件。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`:本卡触碰 schema/save/migration/asset pipeline/跨包接口；进入 build 和 done 前均须
    Codex/Kimi/GLM 三签，且 build 只有 Codex 一个 Coding Owner。
  - `docs/phase2/READ-FIRST.md:9-20`:运行时只保留一套干净模型；旧格式只在边界升级；稳定 id 不靠下标；
    迁移缺陷先修上游并重生成。
  - `docs/phase2/editor/project-design.md:21-25,68-83,162-168,186-207`:工程内容资产与引擎
    chrome 的原始边界真值。
  - `docs/phase2/decisions.md:332-355`（D25）：创作者上传真彩内容可在导入边界自动量化到工程标准色；
    不让作者配置调色板。头像/UI 等小图可保留 RGBA PNG。
  - `docs/phase2/roadmap.md:173-194,245-256`:A7/R3 统一 FileSource 与工程资源闭包；A8 才是独立发行包。
  - `docs/phase2/editor/project-lifecycle-design.md`:FSA/HTTP/保存/克隆使用同一工程文件模型；其中把默认 UI/字形
    算工程素材的文字按本卡用户裁决勘误。
- 一阶段真值:
  - `CLAUDE.md` 忠实还原纪律；第二阶段 schema 可清洁重写，但战场背景索引染色/召唤换色行为不能凭感觉改。
  - `docs/phase1/status/resource-status.md:102-112,145-151`:FBP 78 槽/76 非空与 RGM 88 立绘的源事实。
  - `packages/reforge/src/battle/battle-session.ts:338-371`、`packages/reforge/src/assets.ts:199-259`:
    背景 R 通道索引与召唤期间低 nibble shift 的当前一阶段真值实现。
  - `packages/migrate/scripts/bake-assets.mts:146-160,163-207`:物品、默认 UI 和六张 face 的现生成来源；
    输出目录恰好反证了“内容图像”和“引擎 UI”不是一类。
- 代码锚点(`file:line`):
  - `packages/content/src/asset.ts:11-29,91-133,205-262,305-550`:四个 kind 已有，但
    `glyph-table/ui-image` 幽灵 kind/family、旧目录配置和 walker 缺口仍在。
  - `packages/content/src/actor.ts:68-88`:头像组仍是 number；Actor 没有显式 battle face AssetId。
  - `packages/content/src/index.ts:40-53`:对话头像仍是 `{icon:number}`。
  - `packages/content/src/script.ts:117-125`:持久形象命令仍保存数字 portrait。
  - `packages/content/src/character.ts:119-125`:存档世界态的 appearance portrait 仍是 number。
  - `packages/content/src/item.ts:146-158`:物品 icon 仍是 number。
  - `packages/content/src/enemy.ts:119-129`:战场 `bg?:string` 且运行时可按 id 猜路径。
  - `packages/content/src/project-upgrade.ts:32-53`:只因旧 root 存在就凭空声明 glyph/ui/image legacy。
  - `packages/reforge/src/loader.ts:257-266`:AssetBase 仍暴露 portraits/faces/itemIcons/uiOverride 目录。
  - `packages/reforge/src/main.ts:274-299,451-472,1638-1712`:字形/立绘全量预载、FBP2 借战场加载、
    face 和 battle icon 路径拼接。
  - `packages/reforge/src/text/glyph.ts:38-58`、`dialog/dialog-assets.ts:46-88`、
    `menu/menu-box.ts:349-430`:默认 chrome 与内容图像都还有裸 fetch/静默 fallback。
  - `packages/reforge/src/assets.ts:178-235`:战场背景路径双轨及索引读取；必须保留索引语义但改由 resolver 取 bytes。
  - `packages/editor/src/ui/PortraitEditor.tsx:1-159`、`ItemTab.tsx:301-388`、
    `BattleFieldTab.tsx:14-49,60-65,139-147`、`BattleFieldPicker.tsx`:数字/路径输入、`/baked`
    fallback、预览不吃显式 bg 与裸 fetch 旁路。
  - `packages/reforge/vite.config.ts:13-18,69-74`、`packages/editor/vite.config.ts:82-97`:
    当前 `/ui` 只天然属于 Reforge public；editor production play 和非根 base path 无共享 chrome 保证。
  - `packages/migrate/src/pal-assets.ts`、`pal-migration.ts`、`pal-migration-io.ts`:唯一 catalog 生成、物化、
    作者接管与 MG2 入口；四静态族必须接进这里。
- 已知坑 / 审计文档:
  - `docs/phase2/foundation/a7-resource-closure-audit.md`:catalog/resolver/MG2 总设计可复用，但 §2.1 和 A7-2
    分片边界需按本卡纠正。
  - `docs/ops/tasks/A7-0-resource-closure-registry.md`、`A7-1-sfx-asset-closure.md`、
    `A7-3-cutscene-asset-workbench.md`:稳定 AssetId、author takeover、pending blob、删除保护、HTTP/FSA 和
    双跑零计划先例。
  - 当前 `loadPortraits` 全量预载 88 张且依赖额外 `portraits.json`；终态应按 AssetId 惰性缓存。
  - 当前 battle-background loader 把任何 PNG 的 R 通道当索引；作者真彩上传若不先量化会错误着色。
  - 当前 `main.ts` 对引用到但加载失败的战斗背景 catch 后黑底；终态“字段缺席 = 刻意黑底”，
    “字段存在但 id/kind/file 坏 = fail-loud”，二者不得混淆。
  - face 按 actor id 拼文件名不是稳定资源引用；`gai-luojiao.png` 68B 透明图仍是有效源记录，不能因体积小丢弃。
  - 旧存档可能持有 `appearance.portrait:number`；只改项目 JSON 会导致读档后重新污染核心模型。
- 不得重新引入:
  - `/baked/portraits`、`/baked/ui/items`、`/baked/ui/face`、`/extracted/data/portraits.json`、
    `/extracted/data/font/glyphs.json`、`/extracted/data/dialog-icons-raw.json`、站点根 `/ui`。
  - `AssetBase.portraits/faces/itemIcons/uiOverride`、`legacy.ui`、`legacy glyph-table/ui-image`。
  - number/path/filename 双轨、按 actor/template/id 推文件名、每个编辑页自己扫描引用或自己管理 object URL。
  - content/editor 中的 paletteId、调色板选择器或“上传图必须懂 R 通道索引”的用户协议。
- 相关测试:
  - `packages/content/src/asset.test.ts`:kind/role/family 排他、walker、missing/kind mismatch/unused。
  - `packages/migrate/src/pal-migration-integration.test.ts`、`migration-merge.test.ts`:全量计数、hash、
    authored takeover、事务与双跑零计划。
  - `packages/editor/src/core/project-io.test.ts`、`project-diagnostics.test.ts`、资源工作台现有测试:
    pending blob、保存重开、引用跳转、删除保护。
  - `packages/reforge/src/assets.test.ts`、battle 背景/召唤染色测试、菜单/对话截图基线。

## 设计期数据基线

| 资源族 | 源/现有物理文件 | 当前内容引用 | A7-2 迁移终态 |
|---|---:|---:|---:|
| `portrait` | 88 PNG / 768,841 B | 2,356 dialogue + 3 appearance + 6 actor = **2,365 edges**；84 unique | 88 records；4 unused warning（50/68/72/89） |
| `face` | 6 PNG / 10,392 B | 当前 schema 0，runtime 按 6 个 actor id 猜路径 | 6 records / 6 actor refs |
| `item-icon` | 233 PNG / 262,667 B | 234 items；233 非零 unique + item 277 的 0 sentinel | 233 records / 233 refs；277 无字段 |
| `battle-background` | FBP 6-57：52 PNG / 4,422,281 B | battle-fields 58 条但 0-5 是非战场占位；52 个真实场 | 52 records / 52 field refs |
| engine UI | 85 PNG / 48,629 B | 应由 engine chrome slot 使用 | 0 project records |
| engine glyph | glyphs JSON 8,229,249 B | 运行时当前裸 fetch | 0 project records；随 engine bundle |

派生基线：当前 PAL catalog 469 条；四族新增 **379** 条后应为 **848** 条（若设计审查没有改变资源集合）。
新增 typed 静态图引用边为 **2,656**，新增 unused warning 为 **4**。GLM 必须用可复现脚本独立冻结
`records/edges/unique/unused/missing/kind-mismatch/bytes` 口径，不能把源文件数、引用 occurrence 和唯一资产混写。

FBP 源共 78 槽、76 非空：本卡只把 6-57 的 52 个真实战场收进项目；当前实际使用的 FBP2 默认标题界面
进入 engine chrome；其他无干净消费者的 FBP 不借 `battle-background` 清账。若 Kimi 认为 FBP2 应改为工程标题
资源，必须签 `counter` 并给出相应 kind/role/editor/空白工程 fallback 的完整闭环，不能只把它改成路径字段。

只读审计中出现了一个必须公开交给三贤人复核的反方案：把 76 个非空 FBP 全登记、给 0-57 中除空 5 外的
57 个 battle-field 填背景、把 FBP2 绑定 `visual.openingMenuBackground`，从而得到新增 403 / 总 872 records。
Codex 当前**不采纳**，原因是 0-5 已被现编辑器和源用途识别为非战场、59-77 没有干净内容消费者，且用户刚
重申默认 UI 属引擎；无条件物化会把源素材池冒充工程引用闭包。Kimi 必须审归属，GLM 必须用实际 consumer
与源用途独立复算；任何一方证明 379/848 不成立即签 `counter`，不得在 build 中临时改口径。

## 终态设计

### 1. 归属与单一路径

```text
工程内容图像
  content AssetId
    -> assets/index.json
    -> AssetResolver(expected kind)
    -> project FileSource
    -> bytes / managed URL

引擎默认界面
  typed EngineChrome slot
    -> bundler-owned URL/bytes registry
    -> Reforge standalone 与 editor play 共用
```

- 工程内容图像进入 catalog；引擎 chrome 永远不伪装成工程 AssetId。
- engine chrome 使用有限、具名的 slot/registry；不得继续让调用点自由拼 `/ui/<path>`。实现可采用构建期生成
  registry 或 `import.meta.glob(...?url)`，但 URL 必须由 bundler 产生并支持非根 base path。
- 默认 chrome 缺失是构建/发行错误，应 fail-loud 并包含 slot；不是 404 后静默换文字/黑底。
- Reforge 与 editor 不各复制维护一份 UI；同一 registry、同一版本、同一许可证。

### 2. 内容 schema

- `PortraitSet.default: AssetId`；`expressions?: Record<string, AssetId>`。
- `DialogueCue.portrait?: { asset: AssetId; side:'left'|'right' }`，删除 `icon`。
- `setActorAppearance.portrait?: AssetId`；`CharacterInstance.appearance.portrait?: AssetId`。
- `ActorDef.face?: AssetId`；缺席表示该角色刻意无战斗小头像，不以 404 判定。
- `ItemData.icon?: AssetId`；缺席表示无图，item 277 正式从 `0` 变缺席。
- `BattleFieldDef.background?: AssetId`；缺席表示刻意黑底，删除 `bg?:string` 和 id 路径惯例。
- `AssetReferenceSource` 增加 `battleFields`；walker 覆盖 actor portraits/face、dialogue cue、
  appearance command/world、item icon、battle field background。删除保护、诊断、保存门禁、deep link 共用同一边表。
- 旧内容数字只在项目打开/迁移边界一次性改写；validator/runtime/editor 核心拒绝数字和路径。

### 3. 稳定 ID、所有权与升级

- PAL 稳定 ID：`portrait.pal.NNN`、`face.pal.<actor-id>`、`item-icon.pal.NNN`、
  `battle-background.pal.NNN`。AssetId 只表示身份，不参与物理路径推导。
- PAL 迁移只登记实际集合：88 portraits、6 faces、233 non-zero item icons、52 real battle backgrounds。
  18 个未引用 BALL 原图不迁；FBP 0-5/59-77 不伪装战场。
- PNG 物理文件进入 `assets/migrated/**`；作者同 AssetId 替换进入 `assets/authored/<sha>.png`，整条
  AssetRecord + bytes 由 MG2 保护，迁移器不得逐字段抢回。
- `data/baked` 只可作为旧生成产物/对照，不是输入真值。迁移器从已提取源 + 标准色表确定性生成
  portrait/face/item RGBA PNG，battle background 保留索引 PNG；生成、hash、catalog、内容 JSON 和 manifest
  以计划/预检/manifest-last 事务提交。
- 旧 v3 工程按四个 legacy family 逐族升级并退出；升级先完成文件读取/转换/hash/AssetRecord/内容改写预检，
  最后删除 family/目录字段。HTTP 只读工程不能半升级，需给出“另存为/克隆到可写工程”的行动提示。
- 旧存档的 `appearance.portrait:number` 在 save-load 边界通过本次项目升级生成的确定性
  `legacy portrait number -> AssetId` 映射一次性转换；缺失或歧义 fail-loud。runtime world 永不接受 number。
- MG2 合并前必须对 `base/ours/theirs` 三侧做同一、幂等的静态图引用规范化，再比较作者差异；否则
  `2` 与 `portrait.pal.001` 会产生伪冲突或错误覆盖。规范化只存在于迁移边界，不能变成 runtime 双格式。

### 4. 战场背景索引语义

- `battle-background` 仍保存 320×200 索引 PNG；kind 契约要求每像素 `R=G=B=index`、alpha 255。
  `AssetResolver` 读取 bytes 后校验尺寸/通道契约，再用 `visual.standardColorTable` 上色。
- 作者可上传普通 PNG；编辑器导入边界按工程标准色表做确定性最近色量化，保存索引 PNG，并并排预览
  “原图/工程内效果”。UI 只说“已适配工程色彩”，不显示 palette/index/R 通道。
- 召唤背景换色继续对索引做原版低 nibble shift；不得为了方便把背景烘成固定 RGBA 后丢掉 indices。
- PAL 6-57 必须逐项保留 bytes/hash 与索引值；battle preview、正式战斗、召唤换色共用同一 loader。

### 5. 编辑器工作台

- 资源模块新增统一“图像”工作台，顶层用语义筛选：立绘 / 战斗头像 / 物品图标 / 战场背景。
  左列过滤与缩略图，中间像素预览，右侧属性、来源、引用和删除；布局/控件复用现有蓝色资源工作台。
- CRUD：导入、同 ID 替换、改名、引用列表、受引用删除阻止、未引用删除、undo/redo、pending blob、保存重开。
  battle background 导入额外显示量化预览；其他三族保留 RGBA。
- Actor/Portrait、Dialogue/Command、Actor face、Item、BattleField 全部使用按 expected kind 过滤的 AssetPicker，
  可预览并跳转 `module=asset&page=image&kind=<kind>&object=<AssetId>`；不再给用户填数字或路径。
- 引擎 chrome 不出现在工程资源页，不提供 UI/font 工程配置控件。

### 6. 分段实现与退出门禁

1. **A7-2A · 边界与契约**：修正文档口径；落 schema/guard/walker/engine chrome registry 契约、
   battle background codec/量化纯核和测试。阶段结束不得留下 public schema 数字/路径双格式。
2. **A7-2B · PAL 迁移与旧工程/存档升级**：379 records、2,656 refs、MG2、事务、双跑零计划；
   不手改 `projects/pal`。
3. **A7-2C · Runtime 与 engine chrome**：四族只走 resolver；默认 UI/glyph/cursor/title 只走 bundler registry；
   standalone/editor play 同源，非根 base path 正常。
4. **A7-2D · 编辑器工作台**：图像 CRUD/picker/diagnostic/deep link、HTTP/FSA pending blobs、保存重开。
5. **A7-2E · 断旁路与文档收口**：定向断开 baked/字体/光标/FBP 外部源，静态扫描、视觉矩阵、报告与
   capability-map 记账；A7/R7 仍保持进行中。

## 验收条件

- 功能:
  - 四个项目静态图 family 只有 AssetId/catalog/resolver/FileSource 一条链；PAL catalog 精确新增 379 条，
    内容精确新增 2,656 条 typed edges，0 missing、0 kind mismatch。
  - 88 portrait 中 84 unique 被引用，4 unused warning；6 face 全有 actor ref；233 icon 全有 item ref，
    item 277 无图；52 background 对应 field 6-57，field 0-5 不再伪装真战场。
  - 对话/状态页/持久换形象、战斗/仙术菜单小头像、全部物品菜单/战斗详情、战场预览/正式战斗/召唤换色
    都经同一 AssetId 读取，替换后立即一致。
  - engine default UI/glyph/cursor/title 在空白工程、PAL 工程中均无需任何 UI/font manifest 字段；工程 ZIP
    不携带默认 chrome，Reforge 与 editor play 都能显示。
  - `visual.standardColorTable` 继续可从全局资源与启动 UI 编辑/替换并被 battle import/runtime 使用；
    作者界面无 palette 概念。
  - 已声明 AssetId 的坏 id/kind/path/file fail-loud；只有字段缺席才走“无图/黑底/引擎默认”的显式语义。
- 测试:
  - content：所有字段 validator、旧数字/path 拒绝、walker 精确 site/expectedKind/edge count、family 排他、
    glyph/ui ghost family 退出与 standard color role 回归。
  - migrate：88/6/233/52、各族 bytes/hash、4 unused、item 277、18 raw item 排除、FBP 分桶、
    379/848 records、2,656 refs、0 missing/mismatch；generated plan 与正式产物一致。
  - upgrade/save：v2、旧 v3 四族、已闭包 v3；旧 appearance portrait number；缺源/坏图/歧义映射；
    HTTP 只读、FSA 可写、manifest-last、失败零半提交、重复打开幂等。
  - MG2：四族各至少一个同 AssetId authored replacement；重迁保留整条记录和 bytes；二跑
    `writes=0 deletes=0 conflicts=0`。
  - runtime：resolver kind/path 错误、portrait 惰性缓存、face/icon keyed by AssetId、battle indexed codec、
    量化确定性、召唤 shift golden、字段缺席与损坏字段分界。
  - engine chrome：slot 完整性、glyph/license、dialog cursor、85 UI 文件、default title；standalone/editor
    production build 同版本；非根 base path 不请求站点根 `/ui`。
  - editor：四筛选 CRUD、picker、引用禁删、未引用删除/撤销、替换、battle 量化预览、pending blob、
    保存重开、diagnostic/deep link、窄视口零溢出。
  - 静态扫描：四族 runtime/editor 中 `/baked`、portrait manifest、数字/path 拼接为 0；engine glyph/cursor
    `/extracted` 为 0；正式 UI 调用点根 `/ui` 为 0。
  - 全仓 `pnpm check`、content/reforge/editor/migrate 定向套件与 production builds 全绿。
- 文档:
  - 更新 A7 审计、project lifecycle/project design、asset pipeline、编辑器帮助、roadmap、capability-map 和
    A7-2 结果报告，明确 A5 project zip / A8 distribution / engine chrome 三者边界。
  - A7/R7 不标 done；报告保留 `tileset/sprite/battle-sprite/effect-sprite/image` 等剩余 legacy 真缺口。
- 视觉 / 手工验证:
  - HTTP PAL + 真实 FSA PAL：四类资源列表、替换、引用禁删、未引用删/撤销、保存重开；控制台 0 404/HTML
    fallback/静默 decode。
  - 6051：一段带头像对话、状态页、物品/装备/商店、仙术菜单、普通战斗与一次召唤背景换色逐项实测。
  - 空白工程与 PAL 工程 × Reforge standalone / editor play × root / non-root base：中文、默认菜单、对话光标、
    状态页、战斗四按钮和默认标题正常，工程目录无 chrome/glyph 副本。
  - 临时断开 `data/baked/{portraits,ui/face,ui/items}`、外部 battle bg、glyph 与 dialog cursor 源后，
    A7-2 四族和 engine chrome 仍正常；其他未迁 legacy family 可继续存在，不用扩大断链范围伪造失败。
  - Kimi 独立复验 engine/project 归属、默认 chrome 与内容图像视觉、battle 量化/召唤换色、窄视口和 base path。

## 推进签字

本卡触碰 schema、save、migration、asset pipeline、跨包公共接口与 capability-map。三方设计签字未齐前，
不得修改实现文件、生成 PAL 产物或把状态改成 `build`。

### 进入 build 前:设计签字

- Codex: **agree（2026-07-18）**。两路独立只读普查与本地复核证明，默认 UI/字形归 engine chrome 是用户
  原裁决；真正的项目静态债是 portrait/face/item-icon/battle-background 四族。Codex 采纳单 AssetId 链、
  379 records/2,656 edges 基线、item 0=缺席、battle indexed import、project-aware save upgrade、engine
  bundler registry、统一图像工作台，并明确排除 UI theme/glyph customization/generic FBP image。设计可实现，
  但 build 必须等待 Kimi/GLM 独立复核。
- Kimi: **agree（2026-07-18;附 R1-R3 build 必改 + S1-S4 建议,见「主审立场」）**。七问逐项核对
  并抽查代码/数据锚点:幽灵 kind 实证(asset.ts:19-26/:99-106 双列表)、root 推断实证
  (project-upgrade.ts:32-45)、`bg?:string`(enemy.ts:126)、AssetBase 目录(loader.ts:262-265)、
  FBP2 借道(main.ts:451)、schema 无既有标题字段;baked 计数 88/6/233 与基线一致。归属、退役、
  单 AssetId 链、battle 索引语义、registry、工作台闭环与 A7-4/A8 分界均成立,无架构 counter。
- GLM: **agree（2026-07-18;附 G1-G4 build 必落,见下）**。独立复算全部基线数字 + 代码逻辑审查。

  **权威冻结计数** ✅：portrait 88/768,841B/2,365 edges(2,356 dlg+3 appearance+6 actor)/84 unique/4 unused(50,68,72,89)；face 6/10,392B/6 refs；item-icon 233/262,667B/233 refs/item277 icon=0 sentinel；battle-bg 52/4,422,281B(FBP 6-57)/52 field refs；合计 379 records/2,656 edges/4 unused/0 missing/0 mismatch；PAL catalog 469→848。逐项精确匹配卡内基线。

  **口径验证** ✅：2,356 dialogue + 3 appearance + 6 actor = 2,365 精确；18 raw item 排除(extracted 251 - referenced 233)；FBP 0-5 占位/6-57 真实/58 空/59-77 不迁/FBP2 归 engine chrome；gai-luojiao 68B 有效透明 stub；field 0-5 无真实 bg 引用。

  **代码逻辑审查** ✅：walker 7 个新消费方缺口定位(actors portraits/face + dialogue cue portrait + setActorAppearance + item icon + battle field bg)；schema 全数字待迁(PortraitSet.default=number / DialogueCue.portrait.icon=number / ItemData.icon=number / BattleFieldDef.bg=string)；MG2 走 catalog authored pattern(不需 arrayMode 条目，同 A7-1 sound WAV)。

  **G1-G4 build 必落**：
  - G1 battle-background legacy family 有名称但**无路径映射**(manifest legacy 无 battleBackgrounds key, LegacyAssetConfigV3 也缺)——build 须确认迁移器从 extracted source 直读 FBP PNG，不依赖 legacy path。
  - G2 `battle-bgs.json count:78` 是槽位上限(0-77)非文件数——实际 76 非空(ids 5/58 缺失)；审计脚本须数 ids 数组而非信 count 字段。
  - G3 walker 扩展 `AssetReferenceSource` 须增加 `battleFields` 槽并遍历 `background` 字段(当前 startBattle.fieldId 只 resolve 到 field id 不穿透到 bg)。
  - G4 旧存档 `appearance.portrait:number` 升级——迁移器须产出确定性 `palPortraitAssetId(n)→portrait.pal.NNN` map，save-load 边界注入转换。

- counter / 分歧处理:当前无未决分歧。GLM agree 附 G1-G4 build 必落。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Kimi agree + GLM agree），build allowed。** G1-G4 纳入 build 范围。

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending（done 前审查：独立复算 379/2,656/4unused/0missing/0mismatch + walker 覆盖 + MG2 双跑）
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

本卡以“**项目内容 AssetId 链**”和“**引擎 chrome typed slot 链**”两条互斥路径收口，拒绝把默认 UI
复制到工程，也拒绝让项目内容继续借引擎/仓库根路径。四静态族纵向一次迁净；engine chrome 同时从
`public`/`extracted` 偶然可见资源改为两个应用都能构建携带的受管 registry。任何未来 UI theme/custom font
都必须另有公开契约、编辑 UI、保存和分发闭环，不在 legacy 目录字段上续命。

### 已知风险

- 风险:把 engine chrome 和 project content 再次混写，导致工程重复携带默认 UI 或 PAL 内容继续藏在引擎路径。
  - 缓解:typed slot 与 AssetId 两条类型/加载链互斥；任务卡逐项归属表；Kimi 主审；A5/A8 发行测试分开。
- 风险:旧存档 appearance portrait 数字在项目升级后无法解释。
  - 缓解:打开升级产出确定性 legacy-number map，save-load 边界注入转换；缺失/歧义 fail-loud，核心拒绝 number。
- 风险:作者真彩 battle bg 被当 R 通道索引，画面变色；或改成 RGBA 后召唤换色失真。
  - 缓解:导入量化 + 索引 PNG codec validation + 标准色预览 + nibble-shift golden，用户不接触 palette。
- 风险:迁移器继续依赖手动 `data/baked`，重迁覆盖作者替换或 fresh clone 不可复现。
  - 缓解:生成核收编 migrate，source/hash/bytes 预检，origin 整条所有权，MG2 双跑与源断开测试。
- 风险:MG2 在旧 number/path 与新 AssetId 之间比较，产生伪冲突或吞作者修改。
  - 缓解:base/ours/theirs 三侧先过同一幂等规范化；四族各做作者修改/作者二进制接管/上游同改冲突测试。
- 风险:四族一次改动面大，出现半迁移双轨。
  - 缓解:A-E 分段记录证据但同一卡单 Owner；每段结束都跑静态 schema/路径断言，任何族不得同时在 catalog/legacy。
- 风险:移除 undocumented `uiOverride` 误伤真实作者工程。
  - 缓解:普查已知工程/fixture；发现真实使用即 Kimi counter 并单独设计主题迁移；不能静默丢弃。
- 风险:把所有 FBP 都当 battle background，掩盖 ending/show-image 能力缺失。
  - 缓解:只迁 6-57；FBP 分桶报告；`legacy image` 保留为后续真实消费者缺口。

### 主审立场

- Reviewer: Kimi
- 结论: **agree（2026-07-18）**——七问逐项成立,无阻塞;附 R1-R3 build 必改、S1-S4 建议。
  1. **engine/project 归属及 FBP2**:成立。project-design.md:24,83,168,207 的原始拍板与 user 2026-07-18
     「UI 在引擎」一致;audit §2.1 的“后续口径覆盖”属过度推导,本卡勘误正确。FBP2 当前经
     main.ts:451 借战场链渲染标题,A7-2C 收进 bundler registry;schema 无既有标题字段(grep 实证
     只有 `audio.openingMenuMusic`),不暗塞通用路径字段正确;反方案(872 records)把无消费者源素材
     冒充引用闭包,拒绝正确。
  2. **退役 uiOverride/glyph-table/ui-image**:成立。幽灵 kind 双列表(asset.ts:19-26/:99-106)与
     `assets.root` 无依据推断(project-upgrade.ts:32-45)实证;半能力不留第二资源路径,符合 A7 单链铁律。
  3. **AssetId 与旧存档 number 升级**:单一可行。新 schema 全 AssetId + 缺席语义(无图/黑底);旧存档
     只在 save-load 边界过一次确定性映射,核心模型拒 number,不形成 runtime 双格式。
  4. **battle indexed/量化**:成立且忠实 D25。索引 PNG + 标准色表上色 + 召唤 nibble shift golden;
     作者上传在导入边界量化,UI 零 palette 词汇;item icon 保留 RGBA 与 D25 补² 实测结论一致。
  5. **engine chrome registry**:成立。typed slot + bundler 产 URL(import.meta.glob `?url` 或构建期
     registry)天然支持非根 base;两应用同源、缺 slot fail-loud、静态扫描根 `/ui` 归零。
  6. **工作台/picker/删除保护**:闭环,沿用 A7-0/A7-1 先例(pending blob、引用禁删、deep link、
     受引用扫描失败禁删),四族筛选与 battle 量化预览增量合理。
  7. **A7-4/A8 分界**:诚实。A7-2 只退四 legacy family;A5 zip 只打工程(不含 chrome);A8 =
     引擎壳(含 chrome)+工程;v4 与全 legacy 归零留 A7-4;R8 版权替换不冒充。
- 必改项(R,build 必落):
  - **R1 退役必须 actionable**:删除 `uiOverride`/`glyph-table`/`ui-image` 前,build 先输出已知工程
    (pal/demo/e2e-own)使用普查并写进任务卡;升级错误必须列出冒犯字段、路径和补救动作,禁止静默丢弃。
  - **R2 旧存档映射单一来源**:legacy portrait number → AssetId 的映射规则必须是 upgrade 与
    save-load 共用的同一纯函数(无随机/时间输入);越界或歧义 fail-loud 须含冒犯 number 与存档路径。
  - **R3 零哨兵与 expressions 覆盖口径**:dialogue/appearance 若存在 `icon/portrait=0` 哨兵,与
    item 277 同规(0=字段缺席);walker 必须覆盖 `PortraitSet.expressions` 的值;GLM 冻结基线时须
    显式声明这些包含/排除项。
- 建议项(S,不阻塞):
  - **S1** 引擎标题 slot 命名保持中立(如 `default-title`),并在 project-design/roadmap 登记
    “每工程标题画面”为未来能力,避免把 PAL 标题美术误读为引擎固有资产。
  - **S2** 量化色彩度量与平局规则在 build 钉死(跨平台确定),并加 golden 测试。
  - **S3** registry 做成可被 editor 独立 import 的叶子模块,单一真源;不要 reforge/editor 各拷一份。
  - **S4** 断链验收必须专项验证标题屏在 `/extracted`+`/baked` 断开后仍从 bundled registry 渲染
    (它当前借战场链,最易漏)。
- 是否建议进入 build: **是,待 GLM 数据复核签字后三签齐 build allowed;三签未齐不得开始实现。**

### 三方争议记录(按需)

- Codex:默认 UI/glyph/cursor/title 属 engine chrome；四内容图像属 project catalog；不保留 undocumented UI override。
- Kimi: **agree**。七问逐项成立(归属/FBP2/退役/单链升级/索引量化/registry/工作台/A7-4-A8 分界);
  audit §2.1 过度推导勘误正确;反方案 872 拒绝正确;R1(actionable 退役普查)/R2(单一映射函数)/
  R3(零哨兵与 expressions 口径)build 必改,S1-S4 建议不阻塞。无用户待拍板项。
- GLM: **agree**。独立复算全部基线数字精确匹配(portrait 88/2,365/84/4unused + face 6/6 + item-icon 233/233/item277 + battle-bg 52/52 FBP6-57 = 379 records/2,656 edges/4 unused/0 missing/0 mismatch；catalog 469→848)；代码逻辑审查确认 walker 7 新消费方缺口 + schema 全数字 + MG2 catalog authored pattern。G1(battle-bg legacy 无路径映射)/G2(count:78 槽位非文件)/G3(walker battleFields 槽)/G4(旧存档 portrait 映射) build 必落。
- 用户拍板:2026-07-18 已明确”UI 在引擎”。如审查仅对标题画面/未来 theme 的细分归属有分歧，再单独请用户裁决。

## 额度 / 代班记录(如适用)

- 缺席 Agent:none
- 缺席原因:N/A
- 代班 Agent:N/A
- 代班范围:N/A
- 风险:N/A
- 是否需要补审:N/A
- 用户裁决:N/A

## Build: 实现与自测

- Coding Owner:Codex（设计三签齐后才可开始）
- 修改文件:pending
- 实现摘要:pending
- 运行命令:pending
- 浏览器 / 手工检查:pending
- 跳过的检查及原因:pending

## 资源生成记录(如适用)

- Generation Owner:N/A（本卡是确定性迁移/量化，不是 AI 生图）
- 生成目的 / 替换对象:pending
- 提示词要点 / 风格约束:N/A
- 输出路径:pending
- 尺寸 / 格式 / 透明背景 / 调色约束:见 battle indexed codec 与 RGBA 三族设计
- 资源登记位置:projects/*/assets/index.json
- 验证方式:bytes/hash/visual/MG2

## 视觉验证记录(如适用)

- Visual Verification Owner:Codex + Kimi
- 验证方式:pending
- 截图 / 像素检查路径:pending
- 结论:pending
- 未完成项:全部 build 后验证

## Review: 审查与返工

- Reviewer:Kimi + GLM
- 审查结论:pending
- 必须返工项:pending
- Accept / rework:pending

## 用户验收

- 用户结论:pending
- 后续任务:A7-3 剩余动态资源族或 A7-4 总闭包，按 capability-map 再选。

## 交接日志

- 2026-07-18 User:纠正 A7-2 边界：默认 UI 属引擎。Evidence:本轮对话。Next:Codex 只读普查并开卡。
- 2026-07-18 Codex:完成边界、四族资产、runtime/editor 旁路、迁移/存档风险只读审计；建立 draft 卡并签
  design agree。Evidence:本卡数据基线与代码锚点。Next:Kimi 架构主审 + GLM 数据/覆盖复核；三签齐前不得实现。
- 2026-07-18 Kimi:架构主审完成,签 **agree**(R1-R3 build 必改,S1-S4 建议,无用户待拍板项)。
  七问逐项核对:归属/FBP2(engine chrome+未来每工程标题能力另卡)、uiOverride/glyph-table/ui-image
  全退役、单 AssetId 链+旧存档 number 边界一次性映射、battle 索引 PNG+导入量化+召唤 nibble shift、
  typed slot bundler registry(非根 base/两应用同源)、工作台/picker/删除保护闭环、A7-4/A8 分界——
  全部成立。锚点实证:幽灵 kind 双列表(asset.ts:19-26/:99-106)、root 无依据推断
  (project-upgrade.ts:32-45)、`bg?:string`(enemy.ts:126)、AssetBase 目录(loader.ts:262-265)、
  FBP2 借战场链(main.ts:451)、schema 无既有标题字段;baked 抽点 88/6/233 与基线一致。
  audit §2.1“后续口径覆盖”属过度推导,本卡勘误正确;反方案 872 把源素材冒充引用闭包,拒绝正确。
  Evidence:本卡主审立场、签字区、争议记录。Next:GLM 数据/覆盖复核(提示词沿用卡内「给 GLM」,
  请其冻结计数时一并核对 R3 口径);三签齐前不得开始实现。未改实现文件。
- 2026-07-18 GLM: 数据/覆盖/测试矩阵复核签 **agree**。独立复算全部基线数字：portrait 88 PNG/768,841B/2,365 edges(2,356 dlg+3 appearance+6 actor)/84 unique/4 unused(50,68,72,89)；face 6/10,392B/gai-luojiao 68B 透明有效；item-icon 233/262,667B/233 refs/item277 icon=0 唯一 sentinel/18 未引用 BALL 排除；battle-bg FBP 6-57=52/4,422,281B/52 field refs/0-5 占位/58 空/59-77 不迁/FBP2 归 engine chrome。合计 379 records/2,656 edges/4 unused/0 missing/0 mismatch，PAL catalog 469→848 全精确匹配卡内基线。代码逻辑审查（读源码逐路径推演）：walker 7 个新消费方缺口定位（actors portraits/face + dialogue cue + appearance + item icon + battle field bg）；schema 全数字待迁（PortraitSet.default=number/DialogueCue.icon=number/ItemData.icon=number/BattleFieldDef.bg=string）；MG2 走 catalog authored pattern 不需 arrayMode 条目（同 A7-1 sound WAV）。G1(battle-bg legacy family 有名无路径映射)/G2(battle-bgs.json count:78 是槽位非文件数,实际76)/G3(walker battleFields 槽扩展)/G4(旧存档 portrait number→AssetId 确定性映射) build 必落。Evidence: 设计签字 GLM 行。Next: 三签齐 build allowed，交 Codex 按 A7-2A→E 分段 build。未改实现文件。

## 下一位 Agent 提示词

### 给 Kimi

```text
接手任务:A7-2 静态内容图像闭包与引擎 chrome 自包含——架构/交互设计主审
任务卡:docs/ops/tasks/A7-2-static-images-engine-chrome.md
当前状态:draft；Codex design=agree，Kimi/GLM=pending，build blocked
你的角色:Kimi 架构主审；只读压力测试归属、schema、save/migration、engine packaging 与编辑器闭环
先读:AGENTS.md；docs/phase2/READ-FIRST.md；任务卡全文；docs/phase2/editor/project-design.md:21-25,68-83,162-168,186-207；docs/phase2/foundation/a7-resource-closure-audit.md:35-50,431-439；docs/phase2/decisions.md:D25；docs/ops/tasks/A7-0-resource-closure-registry.md 与 A7-1/A7-3 资源卡先例
已完成:Codex/只读普查已冻结草案——默认 UI/glyph/cursor/title 走 engine chrome typed registry；project 只迁 portrait/face/item-icon/battle-background；基线 379 records、2,656 refs；item 0=无图；battle upload 内部量化并保留索引用于召唤换色；UI theme/custom glyph/generic FBP image 明确不在本卡
请你做:独立核代码与数据；重点回答 1) engine/project 归属及 FBP2 是否成立 2) 是否应彻底退役 uiOverride/glyph-table/ui-image 3) AssetId 字段与旧存档 number 升级是否单一可行 4) battle indexed PNG/量化是否保留原版换色且作者友好 5) shared engine chrome registry 如何同时服务 reforge/editor/non-root base 6) 图像工作台/picker/删除保护是否闭环 7) A7-4/A8 分界是否诚实。把结论和必改项写回任务卡 Kimi 签字、主审立场、争议记录和交接日志
不要做:不得修改实现、生成 projects/pal、改 capability 状态或标 build/done；若不同意必须签 counter 并给可执行替代，不要只留评论
输出要求:明确签 agree 或 counter；列 R1... 必改、S1... 建议、需用户拍板项；给下一位 GLM/Codex 的可复制提示词。三签未齐必须写“不得开始实现”
```

### 给 GLM

```text
接手任务:A7-2 静态内容图像闭包与引擎 chrome 自包含——数据/覆盖/测试矩阵复核
任务卡:docs/ops/tasks/A7-2-static-images-engine-chrome.md
当前状态:draft；Codex design=agree，Kimi/GLM=pending，build blocked
你的角色:GLM 覆盖与数据审查；只读独立复算资产/引用/迁移/MG2/测试矩阵
先读:AGENTS.md；docs/phase2/READ-FIRST.md；任务卡全文；docs/phase1/status/resource-status.md:102-112,145-151；docs/phase2/foundation/a7-resource-closure-audit.md；packages/content/src/asset.ts/actor.ts/index.ts/character.ts/item.ts/enemy.ts；packages/migrate/src/pal-assets.ts 与现 PAL 产物
已完成:草案基线为 portrait 88 records/2,365 edges/84 unique/4 unused，face 6/6，item-icon 233/233 + item277无图，battle-background 52/52(field6-57)，合计新增 379 records/2,656 edges，PAL catalog 469→848；默认 UI/glyph/cursor/title 不进 project catalog
请你做:用独立可复现脚本冻结 records/bytes/edges/unique/unused/missing/mismatch；核 2,356 dialogue + 3 appearance + 6 actor 的口径、18 raw item 排除、FBP 0-5/6-57/59-77 分桶、gai-luojiao 透明 face、field 0-5 无真实引用；检查 walker 输入、旧工程/save 升级、MG2 authored takeover、事务顺序、HTTP/FSA、static scan 与视觉矩阵是否无漏项。把结果写回任务卡 GLM 签字、数据基线修正、测试矩阵和交接日志
不要做:不得修改实现、生成产物、改 capability 状态或标 build/done；数字不一致或消费者漏项就签 counter，不能用 allowlist 消音
输出要求:明确签 agree 或 counter；给权威计数与复现方法、G1... 必改/S1... 建议、下一位 Codex 提示词。三签未齐必须写“不得开始实现”
```

# MIG-PAL-MAP-NAME-1 - PAL 一阶段考据地图名迁入二阶段

Status: done（2026-08-31 三方当前实现 accept + 用户最终验收齐）
Phase: phase2
Capability: W7F
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

让二阶段 PAL 工程的 221 张第一阶段已命名地图直接复用用户考据完成的中文地图名，同时保持
`map-XXX` 稳定 ID、场景到物理地图的映射和地图正文完全不变；名称缺证据的物理地图继续使用中性编号占位，
不得猜名，也不得直接手改 `projects/pal`。

## 范围

- 范围内:
  - 把第一阶段 `SCENE.mapNum -> 中文地名` 用户考据表提升为一份可被 phase1 工具与 PAL 迁移共同消费的唯一 authored fixture。
  - 迁移器按同一个 `mapNum` 为 `content/maps/index.json` 生成中文 `name`。
  - 完整重迁 current project 与 migration baseline，并证明二次运行零计划。
  - 为名称覆盖、直接映射、未知回退和生成产物增加自动化门禁。
- 范围外:
  - 不改 `MapAssetDefV1` schema、`map-XXX` ID、scene `mapId`、tilemap 正文或 tileset。
  - 不改一阶段已经考据出的任何名称文本。
  - 不把同名地图合并；同名只表示人读标题相同，不表示二进制身份相同。
  - 不顺手修改存档槽的“当前地点”文案；现状仍使用 project manifest name，若要显示 current map name 必须另卡处理。
- 明确不做:
  - 不直接手改 `projects/pal/content/maps/index.json` 或 baseline 生成物。
  - 不按 sceneId 偏移、数组位置、文件排序或相邻地图猜名称。
  - 不给缺少一阶段证据的 map 104 / 164 发明名称。
  - 不让二阶段 content/runtime/editor 依赖 `packages/game` 或 authored fixture；共享 fixture 只允许 phase1 wrapper 与 migrate producer/test 消费。

## 前提真值门

### 一句话行为 / 工程前提

第一阶段的地图名称表以 PAL `mapNum` 为键，是用户人工考据的人读标题；二阶段物理地图 ID 也由同一
`mapNum` 直接生成，因此可无偏移复用名称，但名称不能替代稳定 ID，也不能补写没有证据的槽位。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 提取数据只给 scene 的数值 `mapNum` 和 tilemap 物理内容，不自带中文人读地图名 | `data/extracted/data/scene/0.json:2-5`；`data/extracted/data/tilemap/1.json:1-4`；`packages/migrate/src/pal-migration-io.ts:73-85` |
| 第一阶段 | `MAP_NAMES` 是 tools 层硬编码派生而非原版 extracted resource，键明确为 `SCENE.mapNum`；其 222 条是用户考据从 `61490823`、`442ed43f`、`aa8153a8` 到 `637d0925` 累积修订后的 authored truth。294 个可玩 scene 的静态 `mapNum` 覆盖 221 张且全部有名。缺名物理图仅 104、164：104 无引用；164 没有静态 scene owner，但由 s230 的 opcode 0x99 动态换图引用 | `packages/game/src/tools/map-names.ts:1-5,230-237`；`packages/game/src/tools/map-names.test.ts:4-20`；`docs/phase1/engineering-notes.md:185`；`data/extracted/events/scene-230.json:71-78`；`projects/pal/content/scenes/s230.json:2117-2123`；`docs/ops/archive/tasks/done/W7F-canonical-map-pipeline.md:70-74,95-101`；git `61490823`、`442ed43f`、`aa8153a8`、`637d0925` |
| 当前二阶段 | 迁移器对 223 张物理图无条件生成 `PAL 地图 N`；`mapIdFromSourceNumber` 与名称所需键都是原始 `mapNum`，不存在 offset | `packages/migrate/src/pal-migration.ts:632-638`；`packages/migrate/src/project-map-converter.ts:12-16`；`projects/pal/content/maps/index.json:5-7` |
| 本任务目标 | 221 张有考据名的物理图写入相同中文名；map 104 / 164 保持 `PAL 地图 104/164`；所有 `map-XXX` ID、path、scene 引用与地图正文零变化 | 2026-08-28 用户裁决：“地图名字你可以用我一阶段的已经命名过的名字” |

### 反证与替代解释

- 最强替代解释: `map-names.ts` 只是第一阶段 dev panel 的临时 scene 标签，不能代表物理地图名称；或者
  phase1 `mapNum` 与 phase2 `map-XXX` 存在偏移，直接套用会错名。
- 什么观察会推翻当前前提:
  - 任一一阶段名称实际以 `sceneId` 而非 `mapNum` 为键；
  - 任一代表地图在 extracted scene、tilemap 文件名和 `map-XXX` 之间出现非恒等编号映射；
  - 任一可玩 scene 的静态 `mapNum` 使用 104 / 164 或其他没有考据名的物理图；
  - 除已核 s230 动态换图到 164 外，又发现未登记的脚本动态地图引用；
  - git 历史或用户裁决表明该表只用于调试占位、并非认可的人读名称。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 本任务只改 index 的显示名，不进入 runtime 行为或脚本命令。
  - 原版 / 第一阶段理解: 表头、工具调用、测试与用户补名提交共同证明键语义为 `mapNum`。
  - extractor / 地图 / 数据解码: `pal-migration-io` 从 tilemap 文件名直接解析 `mapNum`，不参与名称推断。
  - audit / test model: 需要新增双向集合门禁，防止只抽查少量代表地图造成假绿。

### 用户可见偏离

- 是否主动偏离已核真值: yes（主动替换二阶段编号占位，但沿用已核第一阶段人读真值）
- `before -> after` 一句话: `map-001 / PAL 地图 1` -> `map-001 / 盛渔村`；`map-104`、`map-164` 不变。
- 代表场景: map 1（盛渔村）、map 23（苏州城）、map 174（女娲神庙外雨季）、map 225（试炼窟遗迹）。
- 用户裁决: 2026-08-28 用户已批准复用第一阶段已命名地图。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：迁移缺陷先修上游并重生成，禁止只改 `projects/pal`；开卡任务三签前不得 build。
  - `docs/phase2/READ-FIRST.md`：二阶段只消费 canonical current project，ID 与人读标签职责分离。
  - `docs/phase2/decisions.md:167-187`：phase1 知识进入 phase2 的合法桥是 migrate -> content/shared；runtime/editor 不反向依赖 game。
  - 2026-08-28 用户裁决：二阶段使用第一阶段已命名地图。
- 代码锚点(`file:line`):
  - `packages/game/src/tools/map-names.ts:1-237`
  - `packages/game/src/dev/dev-panel.ts:1159,1257-1259`
  - `packages/game/src/tools/tools-panel.ts:553,699`
  - `packages/migrate/src/pal-migration-io.ts:73-85`
  - `packages/migrate/src/pal-migration.ts:632-638`
  - `packages/migrate/src/project-map-converter.ts:12-16`
  - `packages/migrate/src/index.ts:4-9`
  - `packages/content/src/map-index.ts:1-10`
  - `packages/editor/src/ui/MapMode.tsx:2503-2510,2842-2900,3410-3427`
  - `packages/reforge/src/scene-map.ts:12-28`
  - `projects/pal/content/maps/index.json:3-8`
- 已知坑 / 审计文档:
  - 第一阶段表含 map 0“梦境”，但 current physical tilemap 集合不含 0；迁移不得伪造 map-000。
  - 223 张物理 tilemap 中 104 / 164 无考据名；104 无引用，164 被 s230 动态换图使用，二者都必须保留；物理集合本身缺 168 / 171。
  - 6 组重复名称对应不同 mapNum；不得据名称去重或合并地图。
  - 当前工作树有 ED-CATALOG/ED-FIELD 等未提交实现，迁移卡必须保持独立文件与独立提交。
  - 不得重新引入:
  - phase2 对 `packages/game` 的反向依赖、复制两份名称表、编号 offset、开放式 silent fallback、直接修改生成物。
- 相关测试:
  - `packages/game/src/tools/map-names.test.ts`
  - `packages/migrate/src/pal-project.test.ts`
  - `packages/migrate/src/pal-current-publication.pal.test.ts`
  - `packages/migrate/src/migration-baseline.test.ts`

## 验收条件

- 功能:
  - PAL 地图目录的 221 个有证据条目显示第一阶段中文名，第二行仍显示稳定 `map-XXX` ID。
  - 搜索可同时按中文名和 `map-XXX` 命中；104 / 164 仍显示中性占位。
  - scene 引用、地图数量、ID/path、地图正文与 tileset 零变化。
- 测试:
  - 唯一名称源包含当前 222 条 phase1 数据（含 map 0），无空值、无重复 key。
  - 当前 294 个可玩 scene 的静态 `mapNum` 覆盖 221 张且全部有考据名；脚本动态地图引用域必须单独审计，至少钉住 s230 -> map-164。
  - 223 张物理地图的名称集合精确为 221 个考据名 + 显式未命名 allowlist `{104,164}` 两个占位；除这两项外任一缺名必须由 producer 直接 throw，而不是静默 fallback。
  - 代表映射 1/23/174/225 与 fallback 104/164 均有断言；ID/path 和 map 正文 hash 不变。
  - 三方合并专测钉住：上游从占位改中文名时正常接受；作者后来改名且上游未再变化时保留作者值；双方同改时 conflict fail-loud。
  - 聚焦测试先行；最终仅跑一次 `@type-pal/shared`、`@type-pal/game`、`@type-pal/migrate` 受影响包全量。
  - 首次 dry-run 预期只报告 `content/maps/index.json` 一项 project write；`--write` 只更新 current/baseline map index 与 baseline `_state.json` hash。
  - 完整重迁后独立第二进程再次运行迁移，结果必须 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。
- 文档:
  - 看板、Build/Review 证据、三方签字和生成 diff 计数写回本卡。
- 视觉 / 手工验证:
  - 仅做一次编辑器功能性最小验证：地图目录首/中/尾代表项、中文搜索、窄高窗口滚动与选中态。
- E2E 用例登记: N/A（非剧情/演出变化；地图内容和运行时行为不变）。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified** — `map-names.ts:1-5` 明示 `SCENE.mapNum -> 地名`；`pal-migration-io.ts:73-85` 与 `project-map-converter.ts:12-16` 证明 phase2 直接沿用同一编号；git `442ed43f` 明示用户考据补全。
  - design: **agree** — 推荐把纯名称表提升到双方已依赖的共享数据边界；phase1 保持原调用 API，migration 仅允许显式未命名 `{104,164}` 生成占位，其余 miss fail-loud，不改 schema/ID/runtime。
- Kimi:
  - premise: **verified（2026-08-28，本人独立直读包依赖 / schema / 迁移生成点 / 反向依赖扫描，
    非复述 Codex / GLM）**:
    1. **键语义与无 offset**: `map-names.ts:1-4` 表头注释实锤"SCENE.mapNum → 地名、按 mapNum 而非
       wNumScene、用户考据、宁缺毋滥";`mapIdFromSourceNumber`(project-map-converter.ts:12-16)
       正整数校验 + `map-${padStart(3,'0')}` 纯恒等;`pal-migration-io.ts:73-85` mapNum 直接
       parseInt 自 tilemap 文件名,且 :85 `tilemaps.length !== 223 throw` 既有硬门禁同风格。
    2. **schema / ID / runtime / 正文零变化成立**: `MapAssetDefV1 { id, name, path }` 的 `name`
       字段已存在(map-index.ts:2-6)——本卡只改生成值;`pal-migration.ts:632-638` 当前无条件
       `PAL 地图 ${mapNum}` 占位是根因,id / path 行由同一 mapNum 恒等生成、不动;map body 是
       独立 tilemap JSON,不在 diff 域。
    3. **包边界现状**: `packages/game/package.json` deps = {@type-pal/shared};`packages/migrate`
       deps = {content, shared};editor deps = {content, reforge}——**game 与 migrate 已共同依赖
       shared,fixture 放 shared 零新增依赖边**;editor 不直接依赖 shared。grep 扫描 content /
       reforge / editor / migrate src 对 `@type-pal/game` 或 `packages/game` 的 import **零命中**
       (命中全是移植溯源注释)——phase2 -> game 反向依赖现状为零,本卡不引入新反向边。
    4. GLM 的 222 / 294 / 221 / 223 / [104,164] / 6 组同名复算与 `{s230→164, s243→165}` 动态
       引用域增量发现,本席抽查锚点(pal-migration-io:70-71,85;scene-230 产物 s230.json:
       2117-2123 setSceneMapOverride map-164)一致,背书为验收域。
  - design: **agree(2026-08-28，附 K-N1-K-N4 必落钉)**:
    - **K-N1(边界味道钉)**: shared 现内容(mkf/rle/rng/tables/yj2)是引擎级通用数据,地图名表
      是首个 PAL 业务语义数据——新模块必须 PAL 专用命名(`pal-` 前缀)+ 文件头声明"PAL 考据
      数据、非引擎通用",只读导出(as const + 查询函数);消费方静态门禁须覆盖 **import 语句与
      package.json 依赖声明两层**(content/reforge 已有 shared 依赖边,只能靠 import 门禁拦;
      editor 直接 import 会因无依赖边 typecheck 失败,双保险)。没有这层,shared 会滑向杂物间。
    - **K-N2(表完整性钉)**: fixture 原样搬迁 222 条(含 map 0"梦境"——phase1 仍查询 map 0,
      migrate 物化集合不含 map-000);phase1 wrapper 不复制表,222 条数断言由 shared 单测承载,
      wrapper 保持 `getMapName/hasMapName` API 不变。
    - **K-N3(占位文案不变钉)**: 104/164 继续生成 `PAL 地图 104/164`(与现状逐字一致,不发明
      "未命名地图"新文案);其余 miss throw 的错误消息必须含 mapNum。
    - **K-N4(提交卫生钉)**: 当前工作树有 ED-CATALOG 等未提交 WIP——本卡独立提交,只暂存卡面
      列出文件;重迁前记录路径级基线,生成 diff 混入 WIP 即停线。
    - 架构结论: 放 shared 是最小正确边界——放 migrate 则 game 无法同向 import(game 无 migrate
      依赖且会引入 phase2 环),放 content 则是 phase1 -> phase2 反向 + 新依赖边,复制两表是
      双真值源;三个替代均更差。背书 GLM GM-M1(红先行)/ GM-M2(双向集合)/ GM-M3(diff scope)/
      GM-M4(动态域两处全钉,修正卡面"至少钉 s230"的不完整枚举)。
- GLM:
  - premise: **verified（2026-08-28，本人独立脚本复算全部指定数字 + git/迁移器/事件直读，非代理）**：
    1. **222 条 phase1 名称** ✓：正则解析 `MAP_NAMES` 恰 222 条，key 0-225、零重复、含 map 0“梦境”；
       代表值 1=盛渔村、23=苏州城、174=女娲神庙外雨季、225=试炼窟遗迹对照（174/225 见下）、
       **104/164 确无条目**。表头注释明示“SCENE.mapNum → 地名、用户考据、宁缺毋滥”。
    2. **294 scenes / 221 静态 mapNum 全覆盖** ✓：本席扫 295 个 extracted scene 文件——恰一个
       （scene 294.json）mapNum=0（梦境，无物理图），其余 **294 个可玩 scene** 的静态 mapNum
       去重 = 222-1(map 0) = **221 张**，且**全部有名**（static 缺名集为空）。295/294/222/221
       算术逐项闭合。
    3. **223 physical / 仅 104、164 缺名** ✓：tilemap 文件 223 张（1-225，缺口恰 {168,171}
       与卡面已知坑一致）；缺名物理图**精确为 [104, 164]**；有考据名物理图恰 221。map 0 不在
       物理集合（不得物化 map-000）。
    4. **s230 → map-164** ✓：extracted `scene-230.json` segments[0].commands[7] opcode 153
       （`OP_CHANGE_MAP = 0x99`，event-system.ts:398 注释“op0==0xFFFF 当前换图+reload”）operands
       [65535, 164, 0]；迁移产物 `s230.json:2117-2123` 已是 `setSceneMapOverride mapId:"map-164"`。
    5. **无 offset** ✓：`mapIdFromSourceNumber` = `map-${padStart(3,'0')}` 纯恒等
       （project-map-converter.ts:12-16）；migration index 生成消费同一 mapNum（pal-migration.ts:632-638）。
    6. **同名组** ✓：6 组重复名（盛渔村民居 11/13、比武招亲 31/50、苏州城客栈房间 36/37、
       刘晋元住所 112/113、南诏皇宫外 178/211、南诏皇宫 179/194）——同名不同 mapNum，不得合并。
    7. **本席增量发现（premise 域补正，非 counter）**：全事件扫 opcode 153 得动态换图（op0=0xFFFF）
       **两处**：`s230→164`（卡面已核）与 **`s243→165`（卡面未登记）**。165 有静态 scene owner
       且已有考据名（在 221 内），故 221/223 算术不受影响；但“脚本动态地图引用域”的完整域是
       `{s230→164, s243→165}`，验收测试必须**两处都钉**（卡面“至少钉住 s230”的域枚举不完整）。
  - design: **agree（2026-08-28，附 GM-M1-GM-M4 必落钉）**：
    - **GM-M1（fixture 边界红先行）**：authored fixture 放 `@type-pal/shared` 仅导出只读数据/查询；
      静态门禁限制消费方恰为 phase1 `map-names.ts` wrapper 与 migrate producer/test——**先对
      content/reforge/editor 任一 import 红测**，再实现；phase1 wrapper 不复制表（`MAP_NAMES`
      条数断言 222 由 shared 单一来源承载）。
    - **GM-M2（fail-loud + 双向集合断言）**：producer 仅 `{104,164}` 可占位、其余 miss throw；
      测试双向钉死 222 名称 / 294 可玩 scene / 221 named / 223 physical / 2 fallback 计数与
      集合相等（未来增删地图破坏算术即红）；map 0 不得物化（physical 集不含 map-000 断言）。
    - **GM-M3（diff scope 门禁）**：首次 dry-run 恰一项 project write（`content/maps/index.json`）；
      `--write` 仅更新 current/baseline map index 与 baseline `_state.json`；map body/tileset/scene
      逐文件 hash 不变断言；独立第二进程 replay `writes=0 deletes=0 conflicts=0`；s230 `setSceneMapOverride
      map-164` 原样保留；**s243 的 `setSceneMapOverride map-165` 同样原样保留**（见 GM-M4）；
      6 组同名保持 12 个独立 ID。
    - **GM-M4（动态引用域两处全钉）**：动态换图域 = `{s230→map-164, s243→map-165}`，测试断言
      全事件扫描恰这两处 0xFFFF changeMap（防未来第三处静默出现）；165 因静态 owner 已有名，
      该钉同时防止“164 无静态 owner 可删”类推理扩散到任何动态可达图。
  - 独立可证伪观察：①若任一代表图（1/23/174/225）在 extracted scene mapNum / tilemap 文件名 /
    `map-XXX` 三者间出现非恒等编号——本席已验恒等，出现即推翻无 offset 前提；②若未来出现
    第三处 0xFFFF changeMap 而测试未红——GM-M4 失效；③若 shared fixture 被 runtime/editor
    import 而门禁未拦——GM-M1 失效返工；④若重迁 diff 出现 map index 以外的任何文件变化——
    GM-M3 停线。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-28，见上——七路一手复算 + s243 增量发现；锚点：map-names.ts:1-8,230-237；
    data/extracted/data/scene/*.json 295 文件、tilemap/*.json 223 文件全扫；events/scene-230.json
    segments[0].commands[7] 与 scene-243.json；project-map-converter.ts:12-16；
    pal-migration.ts:632-638；event-system.ts:398；projects/pal/content/scenes/s230.json:2117-2123）。
  - 独立证据锚点: 见上。
  - 可证伪观察: 见 GLM 签节①-④。
- counter / 分歧处理: 无；若 reviewer 发现编号非恒等或名称表并非用户认可真值，立即 blocked。
- 缺签豁免: N/A
- build 准入结论: **allowed（三方签字齐：Codex / GLM / Kimi 均 2026-08-28 verified + agree，无
  counter）**。实现期落实 GLM GM-M1-GM-M4 与 Kimi K-N1-K-N4 钉子;done accept 另行计算。
  Branch: main（卡面既定）,本卡独立提交,不得混入 ED-CATALOG 等 WIP。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-28）** — 唯一 authored fixture、专用 subpath、严格 104/164 fallback、
  repo-wide 消费边界、222/294/221/223/2 双向集合、动态换图两处、三方 merge、完整发布与独立 replay
  均已实现并验证；生成域精确三文件，map/scene/tileset 正文 hash 零变化，浏览器矩阵通过。
- Kimi: **accept（2026-08-28，当前实现只读终审，本人独立直读 / 复算 / 复跑，非复述 Codex）**:
  1. **fixture 与边界 ✓(K-N1/K-N2)**:`pal-authored-map-names.ts` 头声明"PAL 专用数据、非引擎
     通用"、`Object.freeze` 只读;本人 node 逐值比对 HEAD 原表——**222 条、0 mismatch、0 extra、
     含 map 0、无 104/164、零重复 key**;`shared/package.json` 新增专用 subpath 导出,根 barrel
     不暴露(boundary 测试机检);phase1 wrapper 11 行薄层,`getMapName/hasMapName` API 不变、
     不复制表、`地图N` 展示 fallback 保留。
  2. **producer fail-loud ✓(K-N3)**:`pal-map-names.ts:6-13`——非正整数 throw(含值)、authored
     命中直返、仅 `{104,164}` 逐字 `PAL 地图 N`、其余 miss throw 且消息含 mapNum;`pal-migration.ts`
     diff 精确一行替换(name),id/path 生成行不动。
  3. **消费边界双层门禁 ✓(GM-M1)**:`pal-map-name-boundary.test.ts` repo-wide 扫描——consumers
     精确 = phase1 wrapper + migrate producer + pal test 三处;依赖图单向(game/migrate 有 shared
     dep、editor 无、任何非 game 包无 @type-pal/game 依赖 + import 字符串零命中);本人 grep 复核
     生产消费方恰 2 处一致。
  4. **双向集合与动态域 ✓(GM-M2/GM-M4)**:PAL 门禁测试钉死 294 scenes / 221 playable / 223
     physical / 无 map-000 / unnamed 精确 [104,164] / 104、164 无静态 owner、165 owner=[244];
     allJson + eventsByScene **双路径**扫描 0x99 动态换图恰 `[s230→164, s243→165]`(防第三处
     静默出现);6 组同名 12 个独立 ID;代表映射 1/23/174/225 与 104/164 占位逐字断言。
  5. **生成 diff 精确 ✓(GM-M3)**:git diff 统计算术闭合——current + baseline index.json 各 221
     条 name 替换(442/442)+ `_state.json` 1 hash;**map-104/164 零 diff**;id/path 行不变;
     git status 无 scene / tileset / map body / 其他 content 变更。
  6. **幂等 ✓(本人独立复跑)**:`pnpm --filter @type-pal/migrate migrate:content`(只读 dry-run,
     独立第二进程)——**`managed=537 writes=0 deletes=0 conflicts=0 asset-deletes=0`**,
     closure scenes=294 maps=223 assets=1934 与卡面一致。
  7. **测试复跑**: shared pal-map-names 2/2、game map-names 3/3、migrate 5 文件(boundary /
     pal / converter / merge / plan)**44/44 全绿**(含 14s PAL 真值门禁)。
  - 无返工项。提醒(非 counter,收口动作):K-N4 提交卫生——本卡文件(shared/migrate/game/
    projects/baselines/任务卡/board)与 ED-CATALOG WIP 同在工作树,提交时只暂存本卡清单文件。
    GLM accept 齐前不得标记 done。
- GLM: **accept（2026-08-28，只读终审，本人独立复算 fixture/边界/fail-loud/产物/diff + 复跑聚焦，非代理）**：
  1. **GM-M1 fixture 边界** ✓：`shared/src/pal-authored-map-names.ts` 恰 222 条（0=梦境、
     1=盛渔村、23=苏州城、174/225 正确、104/164 无条目）；专用 subpath
     `./pal-authored-map-names`（package.json:10），根 barrel 不暴露；**repo-wide grep 实际消费
     恰五个文件** = shared 自测 + phase1 wrapper + migrate producer/PAL 测试/边界测试——与允许集
     精确一致；phase1 wrapper 零表拷贝（`MAP_NAMES` 出现 0 次，仅
     `getPalAuthoredMapName ?? 地图N` 薄层）。
  2. **GM-M2 fail-loud + 集合钉** ✓：producer `PAL_UNNAMED_MAP_NUMBERS={104,164}`
     （pal-map-names.ts:3），非整数 throw（:8）、allowlist 外缺名 throw 且错误含 mapNum（:12）；
     PAL truth test 钉 294 scenes / 221 playable / 223 physical / unnamed=[104,164] /
     staticOwners(164)=[]、(165)=[244] / index 223。
  3. **GM-M3 diff scope** ✓：`git status projects/` **恰一个文件**
     `content/maps/index.json`（+221/-221，每行一次名称置换）；map body / scene / tileset 零文件
     变化；产物抽检 map-001=盛渔村、map-023=苏州城、map-174=女娲神庙外雨季、map-225=试炼窟遗迹，
     **map-104/map-164 精确保留 `PAL 地图 N`，占位集合恰两例**；Codex dry-run writes=1 / 独立
     replay 全 0 / 三域聚合 hash 不变证据与产物一致。
  4. **GM-M4 动态域两处全钉** ✓：truth test 以 sceneId 键值对钉死
     `{s230:[0xffff,164,0], s243:[0xffff,165,0]}`（:55-56）——本席设计审查的增量发现
     （s243→165）已按钉落地，且 165=s244 静态 owner 在册。
  5. **独立复跑**：`shared/pal-map-names.test` **2/2**；migrate
     `pal-map-names.pal.test + pal-map-name-boundary.test` **3/3** 全绿。
  - 无返工项。未修改实现/生成物，未代签 Kimi。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: complete（2026-08-31 Codex + GLM + Kimi 三方 accept 与用户最终验收全部到位；无 counter）

## Draft: 设计与风险

### 设计结论

1. **唯一 authored fixture**：把现有 222 条 `mapNum -> name` 数据原样提升到 `@type-pal/shared` 的 PAL 专用只读数据模块；
   `packages/game/src/tools/map-names.ts` 变为 phase1 展示策略薄层，继续提供 `getMapName/hasMapName`，不复制表。
2. **迁移消费**：`pal-migration.ts` 用相同 mapNum 查询考据名；命中则写中文名，未命中继续写
   `PAL 地图 N` 仅限显式 allowlist `{104,164}`；其他 miss 立即 throw。不读取 current project，不根据 scene 或相邻编号推断。
3. **fail-loud 覆盖**：测试同时钉死 phase1 数据条数、scene 使用集合全覆盖、physical tilemap 仅 104/164
   未命名，防止未来新增/删除地图时静默回退。
4. **受控生成**：只允许名称真源、phase1 薄层、迁移逻辑/测试、current/baseline 的 map index 与生成状态哈希变化；
   scene、map body、tileset 或其他 content diff 均为停线信号。
5. **不引入版本兼容层**：这是 current canonical 数据更正，不新增旧版本 upgrader、fallback 分支或产品升级入口。
6. **消费边界门禁**：只允许 phase1 `map-names.ts` wrapper 与 migrate producer/test 导入 authored fixture；
   `packages/content`、`packages/reforge`、`packages/editor` 只能读取迁移烘焙后的 `MapIndexV1.name`。

### 已知风险

- 风险: 把 PAL 专用考据表放入 shared 会扩大跨包公共接口并可能被 runtime/editor 误用。
  - 缓解: 只导出只读数据/查询函数，不导出 editor/runtime 模型；静态门禁限制消费方，Kimi 必须审边界与命名。
- 风险: 同名地图被误认为同一地图。
  - 缓解: ID/path 始终由 mapNum 生成，测试明确允许同名但禁止 ID 合并。
- 风险: 迁移把无静态 scene owner 的 104/164 当作可删除垃圾，或把 map 0 物化。
  - 缓解: 双向集合断言钉死 223 physical / 221 named / 2 fallback，并单测 s230 动态引用 map-164；map 0 只供 phase1 查询。
- 风险: 现有 dirty WIP 与生成 diff 混在一个提交。
  - 缓解: 实施前记录路径级基线，本卡独立提交，只暂存本卡明确列出的文件。
- 风险: 用户把“地图名”理解成存档槽当前地点；本卡生成 `MapIndexV1.name`，而存档槽现状仍显示 project manifest name。
  - 缓解: 明确列为范围外；如需 current mapId -> mapIndex.name，另开 runtime/UI 卡，不偷塞进迁移。

### 主审立场

- Reviewer: Kimi（公共数据边界/迁移架构）+ GLM（221/223 覆盖与生成 diff）
- 结论: Kimi 主审——前提与设计成立，premise verified + design agree（2026-08-28）。放 `@type-pal/shared`
  是零新增依赖边的唯一合法共享点（game / migrate 已共同依赖；migrate / content / 复制三替代均更差）；
  无 phase2 -> game 反向依赖现状与新边；schema / map ID / runtime / 地图正文零变化成立。
- 必改项: 无 counter 级必改项；K-N1-K-N4 与 GM-M1-GM-M4 为 build 期必落钉（fixture PAL 专用命名 +
  双层消费门禁、222 条含 map 0 完整性、104/164 占位文案逐字不变、独立提交卫生、动态域两处全钉）。
- 是否建议进入 build: 建议——三方签字已齐，按钉 build。

### 三方争议记录(按需)

- Codex: 建议唯一 authored fixture 位于 `@type-pal/shared`，phase1 与 migrate 同向依赖，避免反向依赖和复制；producer 对非 104/164 的缺名 fail-loud。
- Kimi: 同意 Codex 方向。压力测试过三个替代落点（migrate / content / 复制两表）均更差，shared 是
  零新增依赖边的唯一合法共享点；唯一保留意见是 PAL 业务数据首次进入引擎级 shared 的边界味道，
  以 K-N1（专用命名 + import / package.json 双层消费门禁）收敛，不构成 counter。无分歧。
- GLM: 已在签字节签 verified + agree 并附 GM-M1-GM-M4；无补充争议。
- 用户拍板: 2026-08-28 已拍板采用第一阶段已命名地图；未知槽位仍须遵守“宁缺毋滥”。

## 额度 / 代班记录(如适用)

- N/A

## Build: 实现与自测

- Coding Owner: Codex（单一 Owner，2026-08-28 build 完成）
- 修改文件:
  - 真值与边界：`packages/shared/package.json`、`packages/shared/src/pal-authored-map-names.ts`、
    `packages/shared/src/pal-map-names.test.ts`、`packages/game/src/tools/map-names.ts`。
  - 迁移与门禁：`packages/migrate/src/pal-map-names.ts`、`pal-migration.ts`、
    `pal-map-name-boundary.test.ts`、`pal-map-names.pal.test.ts`、`project-map-converter.test.ts`、
    `migration-merge.test.ts`、`migration-plan.test.ts`。
  - 受控生成：current / baseline 的 `content/maps/index.json` 与 baseline `_state.json`。
  - 运维：本卡与 `docs/ops/board.md`；未混入 ED-CATALOG 实现。
- 实现摘要:
  - 222 条一阶段考据表逐项原样迁到冻结的 `@type-pal/shared/pal-authored-map-names` 专用 subpath；
    shared 根 barrel 不暴露该 API，phase1 wrapper 保留 `地图N` 既有展示 fallback。
  - migrate 独立 owner 仅允许 104 / 164 生成逐字 `PAL 地图 N`；map 0、负数、小数和其他缺名均
    fail-loud，错误包含 mapNum。`MapAssetDefV1`、map ID/path、scene 引用、地图正文和 tileset 零改。
  - repo-wide 静态门禁扫描所有 package 代码（排除生成目录），消费 subpath 精确锁定 phase1 wrapper、
    migrate producer 与 PAL truth test；同时验证 package.json 四类依赖区及 phase2 -> game 反向边为零。
  - PAL truth test 精确钉住 authored 222、playable 294/221、physical 223、fallback 2、六组同名独立 ID、
    static owners(104/164 空、165=s244)与全事件 opcode 153 两处 `{s230→164,s243→165}`。
- 红先行证据:
  - shared：缺 `./pal-map-names.js`，suite 失败；migrate unit：`mapNameFromSourceNumber` 不存在且
    consumer 集不符，2 failed / 26 passed；PAL：fixture export 不存在，1 failed。实现后均转绿。
- 聚焦验证:
  - shared fixture 2/2；phase1 wrapper 3/3；migrate unit 3 files / 28 tests；PAL truth 1/1；
    boundary + merge-plan guard 2 files / 17 tests；shared/game/migrate typecheck 全绿；`git diff --check` 绿。
- 全量验证（按纪律仅一轮）:
  - `@type-pal/shared`：14 files / 123 tests；`@type-pal/game`：123 files / 2306 tests；
    `@type-pal/migrate`：45 files / 361 tests；全部通过。
- 发布 / replay 证据:
  - 首次 CLI dry-run：managed=537, writes=1, deletes=0, conflicts=0, asset-deletes=0；独立计划复算
    write key 精确为 `content/maps/index.json`。
  - `migrate:content --write`：transaction-changes=3，1934 资产 written=0；同进程 replay 四项全 0。
  - 独立第二进程：writes=0, deletes=0, conflicts=0, asset-deletes=0。
  - 写前后聚合 hash：223 map body `7c2b5052…db02`、294 scene `57d085b3…8925`、tileset
    `c70a743c…8bc3` 均不变；生成 diff 精确为 current/baseline map index + baseline state，state
    仅更新 index hash；current 与 baseline index 字节一致。
- 浏览器 / 手工检查: 见下方视觉记录。
- 跳过的检查及原因: 无。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 本地 PAL editor + in-app browser，默认窗口核目录全量消费，再临时切到 900×600。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: 本轮浏览器会话截图（未写入仓库）；结构化证据如下。
- 结论:
  - 目录计数 223；首项 `盛渔村 / map-001`、中部 `女娲神庙外雨季 / map-174`、末项
    `试炼窟遗迹 / map-225` 均显示正确；104 / 164 精确保留 `PAL 地图 N`。
  - 中文搜索 `女娲神庙外雨季` 精确一项；ID 搜索 `map-225` 与 `map-164` 各精确一项，稳定 ID
    保持第二行；选中态与中央地图未发生非预期保存。
  - 900×600 下 `.map-asset-list` 为唯一纵向 owner：clientHeight=190、scrollHeight=15171、
    overflowY=auto；滚动 1172→2072 时目录标题 top/bottom 始终 41/128；无浏览器 console error。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex / Kimi / GLM 已对 2026-08-28 当前实现分别签 accept，无 counter；用户最终验收已通过。
- 必须返工项: 无。
- Accept / rework: done（三方当前实现 accept + 用户最终验收齐）。

## 用户验收

- 用户结论: **accept（2026-08-31）**——用户明确“以上 review 卡验收通过”。
- 后续任务: N/A

## 交接日志

- 2026-08-31 User: 对当前 review 卡统一验收通过；本卡三方 accept 早已齐，状态收口 done。
  Next: N/A。

- 2026-08-28 User: 批准二阶段使用第一阶段已经命名的地图。Evidence: 本轮用户消息。Next: Codex 开卡并送三方设计审查。
- 2026-08-28 Codex: 独立核清 phase1 222 条名称、静态 scene 地图 221/221 覆盖、physical 221/223 名称覆盖及 migration 全量占位根因；进一步更正 map-164 为 s230 动态换图目标而非 unused，未改实现。Evidence: `map-names.ts`、git `442ed43f`、`pal-migration.ts:632-638`、`scene-230.json:71-78`。Next: Kimi / GLM 合并审查，三签齐后 Codex build。
- 2026-08-28 Codex: 架构复核确认 game 与 migrate 已共同依赖 shared，直接 import game 会违反包边界；current/baseline map index 当前字节一致，首迁预期仅一项 project write。将 producer 收紧为仅 `{104,164}` 可占位，其他 miss fail-loud，并登记三方 merge 语义与独立 replay。Evidence: `packages/game/package.json:13-15`、`packages/migrate/package.json:18-21`、`packages/migrate/README.md:21-54`。Next: Kimi / GLM 合并审查。
- 2026-08-28 Kimi: 独立直读包依赖(game deps={shared} / migrate deps={content,shared} / editor
  无 shared 直依)、`map-index.ts:2-6`(name 字段已存在,schema 零变化)、`pal-migration.ts:632-638`
  (占位根因)、`project-map-converter.ts:12-16`(恒等无 offset)、`pal-migration-io.ts:70-85`(mapNum
  文件名解析 + 223 硬门禁)、`map-names.ts:1-4`(表头考据注释);grep 扫描 phase2 四包对 game 的
  import 零命中(反向依赖现状为零)。签 premise verified + design agree,附 K-N1(PAL 专用命名 +
  import/package.json 双层消费门禁)/ K-N2(222 条含 map 0 完整性)/ K-N3(104/164 占位文案逐字
  不变)/ K-N4(独立提交卫生)四钉;背书 GLM GM-M1-GM-M4 与 s243→165 增量发现。三方签字齐、无
  counter,build 准入 allowed;未修改实现、未重迁、未改 projects/pal。Next: Codex 按钉 build ->
  三方 done 终审。
- 2026-08-28 Codex: 完成唯一 fixture、strict fallback、repo-wide boundary、双向集合与动态换图门禁，
  完整发布 current/baseline；首次 writes=1，写后同进程与独立 replay 全 0，map/scene/tileset hash
  不变。三包全量 2790 tests 全绿，900×600 浏览器验证通过，任务转 review并签 accept。Next: Kimi /
  GLM done 前只读终审；双签前不得 done。
- 2026-08-28 Kimi: done 前只读终审。fixture 逐值比对 HEAD 原表(222 条 0 mismatch、含 0、无
  104/164、Object.freeze、专用 subpath、根 barrel 不暴露);wrapper 11 行薄层 API 不变;producer
  fail-loud 含 mapNum;boundary 双层门禁 + 本人 grep 消费方恰 2 处;PAL 门禁双路径钉动态域
  [s230→164, s243→165];生成 diff 算术闭合(221×2 name 行 + 1 hash,104/164 零 diff,id/path
  不动);**本人独立 dry-run `writes=0 deletes=0 conflicts=0 asset-deletes=0`**;复跑 shared 2/2、
  game 3/3、migrate 5 文件 44/44 全绿。签 **accept**,无返工项;提醒收口提交只暂存本卡文件
  (K-N4)。三方 accept 齐,准入更新为待用户验收。Next: 用户最终验收后收口。

## 当前执行说明（2026-08-28）

无下一位 Agent 提示词：Codex / Kimi / GLM 当前实现 accept 与用户最终验收均已到位，任务已 done。

## 历史下一位 Agent 提示词（build）

```text
接手 MIG-PAL-MAP-NAME-1 build。

任务卡：docs/ops/archive/tasks/done/MIG-PAL-MAP-NAME-1-phase1-map-name-adoption.md
当前状态：draft；build 前三方签字已齐（Codex / GLM / Kimi 均 2026-08-28 verified + agree），无 counter。
你的角色：Codex，Coding Owner；Branch: main，本卡独立提交。

先完整阅读：AGENTS.md、docs/phase2/READ-FIRST.md、本任务卡全文（四向真值、设计结论、验收条件、
GLM GM-M1-GM-M4 与 Kimi K-N1-K-N4 钉子），再按锚点复核一手代码。

build 必须落实的钉子（review 期两席逐条复核）：
1. GM-M1 + K-N1：authored fixture 放 @type-pal/shared，PAL 专用命名 + 只读导出；静态门禁覆盖
   import 语句与 package.json 依赖声明两层，消费方恰为 phase1 map-names.ts wrapper 与 migrate
   producer/test——先对 content/reforge/editor 任一 import 红测再实现；wrapper 不复制表。
2. GM-M2 + K-N2：producer 仅 {104,164} 可生成 `PAL 地图 104/164`（文案逐字不变，K-N3），其余
   miss throw 且消息含 mapNum；fixture 222 条含 map 0；physical 集不含 map-000 断言；222/294/221/
   223/2 双向集合计数。
3. GM-M3：首次 dry-run 恰一项 project write（content/maps/index.json）；map body/tileset/scene
   逐文件 hash 不变；独立第二进程 replay writes=0 deletes=0 conflicts=0；6 组同名保持 12 个
   独立 ID；三方 merge 语义（上游改名接受/作者值保留/双改 conflict fail-loud）专测。
4. GM-M4：动态换图域 {s230→map-164, s243→map-165} 两处全钉，全事件扫描恰两处 0xFFFF
   changeMap 的防扩散断言。
5. K-N4：工作树有 ED-CATALOG 等 WIP——重迁前记录路径级基线，本卡独立提交，只暂存卡面列出文件。

边界提醒：不改 MapAssetDefV1 schema、map-XXX ID、scene mapId、tilemap 正文、tileset；不改一阶段
任何名称文本；不顺手改存档槽“当前地点”；完整重迁 current + baseline 并证明二次运行零计划。
验证：聚焦先行；最终仅跑一次 @type-pal/shared、@type-pal/game、@type-pal/migrate 受影响包全量；
编辑器功能性最小视觉验证一次（目录首/中/尾代表项、中文搜索、窄高滚动与选中态）。

输出：build 完成后自测 + 登记证据，送 Kimi / GLM done 前终审；两席 accept 齐前不得标记 done。
```

# ED-4A - 实体类型边界与精灵/触发区创建闭环

Status: done
Phase: phase2
Capability: E1 / MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

纠正当前把通用精灵资源误命名、误展示为 `npc-*` 的类型混淆，并让编辑器可以直接创建可见精灵实体和触发区，不再依赖迁移产物或手改 JSON。实体的“表现形态”和“玩法职责”必须分开：本卡先闭环场景容器、可见实体、触发区三类作者认知；NPC、敌人、物件、宝箱等职责保留为后续可扩展的独立分类，禁止继续编码进精灵资源 ID。

## 用户裁决

- 2026-07-15：编辑器中的对象认知应分为场景、sprite、zone；当前把 sprite 泛称为 NPC 不正确，因为门板、火炬、流水等也都是可见精灵实体。
- 2026-07-15：sprite 后续还要继续区分 NPC、敌人、物件、宝箱等职责。
- 2026-07-15：`door` 不作为与 `object` 平级的职责；门是物件的一种，开关、传送、阻挡等机制由物件模板、结构化组件或脚本表达。
- 本卡据此把两个维度拆开：
  - **表现形态**：`scene` 是容器；可见实体由 actor 或 sprite 资源提供外观；`zone` 是无外观触发区。
  - **玩法职责**：NPC、敌人、物件、宝箱、装饰、特效等；不得由 SpriteDef 的 ID、文件名或图片内容隐式推断。门属于物件的模板/子类，不单列一级职责。

## 范围

- 范围内:
  - 将 PAL 迁移器生成的通用精灵资源 ID 从 `npc-<num>` / `npc-<num>-f<n>` 改为中性的 `sprite-<num>` / `sprite-<num>-f<n>`。
  - 同步更新由迁移器生成的场景实体引用、换装指令引用、脚本分片、测试和 MG2 baseline；只通过上游迁移与安全写盘更新 `projects/pal`。
  - 编辑器“添加实体”提供明确的 `精灵` / `触发区` 两种放置模式。
  - 精灵模式支持选择“角色外观”或“精灵资源”作为可见实体来源；触发区模式创建后立即可编辑触发方式、范围和脚本。
  - 实体树显示稳定的形态标签，不再把原始 SpriteDef ID 当作类型名称。
  - 为后续 NPC、敌人、物件、宝箱等职责分类留下明确扩展边界。
- 范围外:
  - 场景复制、重命名、删除与引用处置；仍归 ED-4 后续分片。
  - 本卡不一次性实现 NPC、敌人、物件、宝箱、装饰、特效的完整分类系统。
  - 本卡不改变现有敌对行为、拾取模板、宝箱脚本或 ActorDef 的运行时语义。
  - 本卡不处理通用删除守卫和全工程反向引用图；仍归 ED-3。
- 明确不做:
  - 不用 UI 文案遮住 `npc-*` 后就宣称完成。
  - 不对 `projects/pal` 或 baseline 做脱离迁移器的批量替换。
  - 不把职责重新编码成 `enemy-*`、`chest-*` 等 SpriteDef ID 前缀。
  - 不把 `scene` 塞进 `EntityRef`；scene 是实体所在容器，不是可放置实体。
  - 不删除现有 actor 引用；actor 是可见实体的语义外观来源，不是与 sprite/zone 平级的新画布形态。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：迁移缺陷必须先修上游并重新生成；migration/schema/跨包任务必须三签，build 只能由一个 Coding Owner 修改实现文件。
  - `docs/phase2/READ-FIRST.md`：二阶段工程必须保持 clean schema 和上游真源，禁止只补生成产物。
  - `docs/ops/tasks/MG2-incremental-migration-merge.md`：PAL 重迁必须走纯生成、结构化三方合并、事务写盘和二次严格零计划。
  - 用户本卡裁决：表现形态和玩法职责分离；职责后续可扩展。
- 代码锚点(`file:line`):
  - `packages/content/src/index.ts:71-76,117-118`：当前 EntityRef 为 actor / sprite / zone 三选一；scene 是外层 SceneDef。
  - `packages/content/src/index.ts:95-114`：敌人运行时职责已有 `hostile` 明确数据，不能再靠精灵 ID 推断。
  - `packages/migrate/src/migrate-content.ts:1219-1224,1518-1560`：迁移器集中生成 `npc-*` 通用精灵 ID，并给 0x65 换装补登记引用。
  - `packages/migrate/src/translate-events.ts:124-129`：事件翻译通过 sprite id 回调写入换装命令。
  - `packages/migrate/src/migrate-content.test.ts:616-624`、`packages/migrate/src/translate-events.test.ts:57-68,448-463`：当前测试把 `npc-*` 固化成契约，必须同步改为中性 ID 并补全引用扫描。
  - `packages/editor/src/ui/App.tsx:525-538`：当前 addAt 无条件创建 `{ sprite }`，无法创建 zone 或 actor 来源实体。
  - `packages/editor/src/ui/App.tsx:858-877`：实体树把 `e.sprite` 原始 ID 显示在类型位置，造成 `npc-*` 被理解成实体职责。
  - `packages/editor/src/ui/App.tsx:1189-1246`：当前添加检查器只有“放置精灵”palette。
  - `packages/editor/src/ui/ScriptDrawer.tsx:870-906,960-1008`：实体创建后已有触发脚本补建、触发方式与范围编辑能力，可复用而不另造脚本模型。
- 已知坑 / 审计文档:
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md:124-132,256-276`：E1 已降为 ⚠️，明确记录 actor/zone 无正式创建工具，ED-4 才能恢复。
  - `docs/phase2/capability-map.md:62-70`：E1 当前只闭环 prop 放置；E3/E5 等行为能力已存在，不能因新增分类重复造运行时机制。
  - MG2 按稳定 id 合并；重命名等价于删除旧 ID + 新增新 ID，必须审查 current/base/theirs，不能假设所有 `npc-*` 都可全局替换。
  - 工程中可能存在作者手写的语义 ID，例如实体 ID 或自有资源 ID 含 `npc-`；扫描和重写必须限定为 PAL 迁移器生成的通用 SpriteDef 及其真实引用。
- 不得重新引入:
  - 以 SpriteDef ID 或 label 推断 NPC/敌人/宝箱职责。
  - 两套实体模型、运行时兼容分支、编辑器专属私有 JSON 形状。
  - 新的内联脚本模型；触发区继续使用现有 EntityPage / ScriptRef / ScriptDrawer。
  - 只改生成产物、跳过 baseline、跳过 MG2 二次零计划。
- 相关测试:
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/translate-events.test.ts`
  - `packages/migrate/src/migration-plan.test.ts`
  - `packages/migrate/src/pal-migration-integration.test.ts`
  - `packages/content/src/validate-refs.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/project-io.test.ts`

## 验收条件

### 功能

- PAL 纯生成结果中的通用精灵定义使用 `sprite-<num>` / `sprite-<num>-f<n>`；角色语义资源 ID 如 `li-xiaoyao` 保持不变。
- 所有由迁移器生成的实体、`setActorSprite` / `setActorAppearance` 等脚本命令都引用新 ID；引用校验无悬空。
- 编辑器添加实体时可在 `精灵` 与 `触发区` 间明确选择：
  - 精灵实体可选择 ActorDef 或 SpriteDef 来源，并在画布点击后创建、选中、拖动和编辑。
  - 触发区创建时至少可选择 `触碰` / `交互` 和范围；创建结果自带合法空脚本源，立即能在脚本抽屉编辑。
- 新建 zone 沿用现有黄色选中框、范围预览和拖动交互；不出现不可见、不可选或只能改 JSON 的状态。
- 实体树的主分类只显示 `精灵` / `触发区` 等稳定形态；详细处可显示“角色：李逍遥”或“资源：原精灵 55”，但不得把 `sprite-55` 当作 NPC 等职责。
- 保存并重开后，新增 actor 来源精灵、sprite 来源精灵、touch zone、interact zone 的数据和脚本都保持一致。

### 职责扩展边界

- 本卡文档和代码命名必须明确：`sprite` 是表现资源/可见形态，不等于 NPC。
- NPC、敌人、物件、宝箱、装饰、特效属于独立职责轴；后续可由实体模板或显式 authoring 字段承载。门归入物件，不得另造平级 `door` 职责。
- 后续职责字段不得复制既有运行时权威：例如敌人仍以 `hostile` 为行为真值，宝箱/拾取仍以结构化模板或脚本为真值。职责分类首先服务创建模板、筛选和检查器组织；若要改变运行时，必须另开 schema 卡三签。
- 本卡 build 不新增未经三方确认的 `role: string` schema，也不通过 ID 前缀临时模拟职责。

### 测试

- 迁移单测覆盖：普通静态精灵、directional 精灵、同 spriteNum 不同布局冲突、0x65 换装补登记、角色本体语义 ID 优先。
- 增加结构化产物扫描：只检查 SpriteDef 注册表和已知 sprite 引用字段，断言 PAL 纯生成结果不存在 `^npc-\d+(?:-f\d+)?$`，且每个 sprite 引用都能解析。
- 增加反向保护用例：作者自定义的语义 ID 或实体 ID 含 `npc-` 时不被误改。
- 编辑器命令/组件测试覆盖 actor 来源精灵、sprite 来源精灵、touch zone、interact zone 的创建、撤销/重做和保存重开。
- 运行 `pnpm --filter @type-pal/migrate run check`、`pnpm --filter @type-pal/content run check`、`pnpm --filter @type-pal/editor run check` 和 `pnpm check`。
- 真实写盘前先运行默认 dry-run 并审查 plan；写盘使用 `pnpm --filter @type-pal/migrate run migrate:content -- --write`，命令内二次迁移必须严格 `writes=0 deletes=0 conflicts=0`；随后独立再跑默认 dry-run仍为零计划。
- 写盘后 `git diff` 只能出现已审计的通用精灵 ID、真实引用、baseline 和本卡实现/测试改动；不得出现无关人工内容丢失。

### 文档

- 更新迁移器注释/README 中 `npc-*` 的旧契约描述。
- 更新编辑器审计中 E1 的真实状态；只有 actor/sprite/zone 创建、保存重开和三方审查都完成后，才讨论 capability-map 是否恢复，不能在 build 中抢跑改状态。
- 将 NPC/敌人/物件/宝箱职责分类登记为 ED-4 后续子任务，不在本卡虚报完成。

### 视觉 / 手工验证

- 6010 打开真实 PAL 工程，在同一场景依次创建 actor 来源精灵、普通 sprite、touch zone、interact zone；确认树标签、缩略图/检查器、黄色 zone 框、范围、拖动和脚本跳转正确。
- 保存到 OPFS/目录后重开，四类新增对象及脚本均存在；撤销/重做不产生幽灵实体或丢失选择。
- 6051 用重迁后的 PAL 工程验证开场、一个跨场景入口、一个敌人、一个宝箱/拾取点；仅资源 ID 变化，表现与行为不变。

## 推进签字

签字是阶段门禁。本卡同时触碰 migration、跨包数据契约和编辑器 E1，三方设计签不齐不得修改实现文件。

### 进入 build 前:设计签字

- Codex: **agree**（2026-07-15；实现可行。必须把表现形态与玩法职责正交拆分，先从上游将通用资源 ID 中性化，再用现有 EntityRef/ScriptDrawer 闭环 actor/sprite/zone 创建；本卡不抢跑新增 role schema）
- Opus: **agree（2026-07-15,附 R1-R3 必改 + S1-S2 建议,见主审立场）**。设计压力测试全过,独立地面重验:
  1. **两轴正交裁定成立**:EntityRef 现状已是 actor⊕sprite⊕zone 三选一判别(index.ts:71-76),本卡是
     UI 认知 + 上游改名,零 schema 改动;role 轴延后且 `hostile`/脚本/模板行为真值不动 = 正确防住
     "第二真值"陷阱;`scene` 不进 EntityRef、职责不编码进 ID 前缀两条"明确不做"与铁律一致。
  2. **actor 归属正确**:actor 是可见实体的语义外观来源(与 sprite 并列为来源、不与 zone 并列为形态),
     UI 归入"精灵"模式下的来源选择,与 schema 判别(isActorEntity/resolveEntitySpriteId)同构。
  3. **改名面全量实测(基线数据,供 build/GLM 对账)**:sprites.json 通用定义 **574 个**(含 16 个 `-f<n>`
     布局逃生变体),语义 ID 恰六主角;引用 = EntityDef.sprite **3,695** + setActorSprite.sprite **69** +
     setActorAppearance.spriteId **2**,全部位于生成文件;actors.json 六角色 sprite 字段全为空(不在
     改名面)、locale/music/demo 工程/资产路径(spriteNum 键控,非 id)零涉及;现存 `sprite-*` 前缀
     **零冲突**;命名生成单点(migrate-content.ts spriteRef 两处模板字面量,:1524/:1528),"集中命名函数"
     主张实证成立。reforge/content/editor 源码零 `npc-` 硬编码。
  4. **MG2 改名风险裁定**:当前 dry-run 零计划 = 零作者漂移,本次合并干净是**构造性的**;scenes 合并按
     实体 id 锚定,sprite 字段值变化不扰动 orderedIds;sprites.json 全量 delete+add 发生在 theirs 权威的
     纯生成文件内,安全。**真正的风险在未来**:ours 侧作者实体若引用旧 `npc-*`,结构化合并会成功但引用
     悬空——必须以 R1 的合并后闭包门禁钉死。
  5. **zone 创建闭环可行性实证**:touch 缺省 0/interact 缺省 1 与 TriggerSpec schema 缺省一致
     (script.ts:206-210);"创建自带合法脚本源"可直接复用既有 `CreateScriptSourceCommand`
     (ScriptDrawer.tsx:878-884 已有 ＋触发/＋巡逻 补建路径),无需新脚本模型——与"不得重新引入"清单自洽;
     zone 渲染(黄框/选中/拖动)对迁移产 zone 已存在,本卡只补创建缺口,范围判断准确。
- GLM: **agree（2026-07-15;附 G1-G3 build 必落范围澄清,见下）**。六项独立实测逐条：

  **(1) R3 对账（独立重扫 projects/pal 全产物）** ✅：
  - sprites.json 通用定义 **574 个 npc-***（含 16 个 `-f<n>` 变体）+ 6 个语义 ID（li-xiaoyao/zhao-linger/lin-yueru/wu-hou/anu/gai-luojiao）= 580 总。✅
  - EntityDef.sprite **3,695** ✅；setActorSprite.sprite npc-* **69** ✅；setActorAppearance.spriteId npc-* **2** ✅。
  - **⚠️ G1（build 必落范围澄清，非阻塞）**：setActorSprite 总引用 = **116**（69 npc + **47 semantic** 指向六主角）；setActorAppearance 总引用 = **3**（2 npc + **1 semantic** zhao-linger）。47+1 semantic 引用指向**不改名**的六主角，**不在改名面**——但 R3 基线"69/2"口径仅计 npc-*，build 时审计报告应注明"69/2 = npc-* 子集；47+1 semantic 不改名故不在改名面"。
  - **⚠️ G2（build 必落范围澄清，非阻塞）**：`actors.json.spriteId` 有 **6 个 semantic 引用**（六主角），是独立于四处脚本/实体引用字段的**第五个 id 引用通道**——但全指向不改名的 semantic ID，不在改名面。R3"四处引用字段"应补注 actors.json.spriteId = semantic-only 不涉及。
  - **结论：id 引用通道恰五处，但改名面仍限四处**（npc-* 引用只在 sprites[].id / EntityDef.sprite / setActorSprite.sprite / setActorAppearance.spriteId）。enemies.json `spriteNum` 是数字索引非 id；skills effectSprite 数字；items 零；portraits 数字。✅

  **(2) 不在改名面反证** ✅：
  - actors.json 六角色 `sprite` 字段不存在（`spriteId` 仅 semantic 六主角）✅
  - locale.json npc- 引用 **0** ✅；music **0** ✅
  - 资产路径按 `spriteNum`（数字）键控，非 id ✅
  - projects/demo npc- **0** ✅
  - 源码 npc- 硬编码：content/reforge/editor 零命中；migrate 是生成方（6 处字面量）；game/present.ts 2 处是运行时渲染排序键 `npc-${npcId}` 非内容 id。✅

  **(3) 测试矩阵完备性** ✅（方向完整，逐条可落）：
  - §104 普通静态/directional/同号布局冲突/0x65 换装补登记/语义 ID 优先——每条有 migrate 单测落点。✅
  - §105 结构化扫描断言 `^npc-\d+(-f\d+)?$` 为零 + 每个 sprite 引用可解析。✅
  - §106 反向保护（作者含 npc- 的 id 不误改）。✅
  - **R1 模拟测试形态可落**：构造 ours 引用 `npc-55` × theirs 改名 `sprite-55` → 三方合并 → 断言事务阻断并报告悬空引用。✅ 形态清晰。
  - **⚠️ G3（build 必落，关键）**：实测 `validate-refs.ts` **不校验脚本命令中的 sprite 引用**（setActorSprite.sprite / setActorAppearance.spriteId）——只校验 EntityDef.sprite（:106-113）和 actors.spriteId（:176-181）。**R1 合并后引用闭包门禁必须显式扫描全部四处引用字段含脚本命令，不能只依赖 validate-refs.ts。** 这是本卡改名安全的真正兜底。

  **(4) 夹具面全仓扫** ✅：
  - 实测 `grep -rln "npc-" packages/ --include="*.test.*"` = **5 个测试文件**：
    - `packages/game/src/present/present.test.ts`（11 hits，z-sort 排序测试）— 一阶段语境
    - `packages/game/src/core/scene-system.test.ts`（1 hit，注释 `npc->x` C 指针语法误报）
    - `packages/migrate/src/translate-events.test.ts`（4 hits，非"2 已知"）
    - `packages/migrate/src/migrate-content.test.ts`（3 hits）
    - `packages/reforge/src/script-runner.test.ts`（2 hits = R2 夹具）
  - **R2 同步清单 = migrate(2 文件 7 hits) + reforge(1 文件 2 hits)；game(2 文件) 一阶段冻结不动。** 卡内"migrate 两个已知"少计（translate-events 实际 4 非 2），build 时以全量清单为准。

  **(5) MG2 语义** ✅：
  - sprites.json 走 **id-mode 结构化合并**（migration-merge.ts:46 `/content/(actors|items|sprites|...)\.json$/` → `'id'`），非 atomic。改名 = 旧 id delete + 新 id add，base/theirs 一致时零冲突。✅
  - scenes 按实体 id 锚定（:53 scenes 也 id-mode），EntityDef.sprite 字段值变化不扰动 orderedIds。✅
  - dry-run `writes=0 deletes=0 conflicts=0` = 零作者漂移，合并干净构造性成立。✅
  - migration-plan/pal-migration-integration 测试能表达"574 delete + 574 add in sprites.json + 字段值变化 in scenes"形状。✅

  **(6) 编辑器测试面** ✅：
  - AddEntityCommand（commands.ts:167-196）签名为 `(sceneId, entity: EntityDef)`——**已接受任意 EntityRef（actor/sprite/zone），命令本身无需改动**。✅
  - 当前 addAt（App.tsx:525-538）只创建 `{ sprite }`；需扩展为四模式（actor/sprite/touch-zone/interact-zone）+ Tool 类型扩展 + palette 分支。✅ 方向清晰。
  - 四类创建 × undo/redo × 保存重开用例矩阵齐：AddEntityCommand invert 已有（filter by id），zone 需补 trigger source 创建（复用 CreateScriptSourceCommand）。✅

  **总结**：R3 核心数字全确认（574/3695/69/2）；改名面限四处 npc-* 引用（G1/G2 semantic 不改名）；测试矩阵逐条可落（G3 validate-refs 缺口需 R1 显式覆盖）；夹具 5 文件全量清单；MG2 id-mode 结构化合并语义正确；AddEntityCommand 已 zone-agnostic。**agree**。

  **G1-G3 build 必落范围澄清（非阻塞，纳入 build 范围）**：
  - **G1**：审计报告注明 69/2 = npc-* 子集，47+1 semantic 不改名。
  - **G2**：R3 四处引用字段补注 actors.json.spriteId = semantic-only 不涉及。
  - **G3**：**R1 合并后闭包门禁必须显式扫描全部四处引用字段含脚本命令 setActorSprite/setActorAppearance——validate-refs.ts 当前不覆盖脚本命令 sprite 引用，R1 不能依赖它。**

- counter / 分歧处理: Opus 无架构 counter;R1-R3 为设计必补,GLM 无 counter(标 G1-G3 build 必落范围澄清)。actors.json.spriteId 是第五 id 通道但 semantic-only 不在改名面;validate-refs.ts 脚本命令 sprite 引用缺口由 R1 显式闭包门禁覆盖。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed。** R1-R3 必改 + G1(69/2口径注明)/G2(actors.spriteId semantic注)/G3(**R1闭包门禁显式扫四处含脚本命令,不依赖validate-refs.ts**)纳入 build 范围。

### 进入 done 前:审查签字

- Codex: **accept**（2026-07-15；实现、自测、MG2 写盘与 6010/6051 视觉回归均完成；用户新增裁决“门归入物件”已同步，未新增 role schema）
- Opus: **accept（2026-07-15,实现/架构/视觉主审,零返工项）**。五项重点全过:
  1. **R1/G3 闭包门禁**:`auditSpriteReferenceClosure`(migration-validate.ts:59-139)五通道齐——definitions/
     actors(G2 semantic 第五通道纳入)/entities/setActorSprite/setActorAppearance,`walkCommands` 递归覆盖
     全部文件含脚本分片与敌人编舞,不依赖 validate-refs.ts(G3 落地);`assertSpriteReferenceClosure` 对
     旧 id 或悬空引用 fail-loud 抛错;调用位序实证 = createMigrationPlan(合并)→ 冲突检查 → **在
     plan.target(合并后最终结果)上验证** → 事务(migrate-content.mts:256-278),dry-run/写盘两路同门禁。
     **漂移模拟测试精确落地**(migration-validate.test.ts:83-138):ours 实体引 npc-55 × theirs 改名 →
     `plan.conflicts=[]`(结构化合并成功)→ 闭包审计捕获悬空 → 断言抛错;**反向保护**(同文件:40-81):
     作者资源 `npc-merchant` 五通道全放行、实体 id 字面 `npc-55` 不被扫描。dry-run 报告内联通道口径
     `580/574 · 3695/3695 · 6/0 · 116/69 · 3/2`,与我设计期基线及 G1/G2 语义逐项吻合。
  2. **四形态统一命令路**:entity-placement.ts 55 行纯模块——四模式收口现有 EntityRef、zone 自带
     pages[0].trigger(on/range/空 stages,`createEmptyScriptStages` 与 CreateScriptSourceCommand 共用,
     无第二套内联模型)、缺省 touch 0/interact 1 与 TriggerSpec 一致;App addAt 四分支全走
     `AddEntityCommand`(App.tsx:553-556);树 `entityShapeLabel` 仅 精灵/触发区,来源细节归 tooltip。
  3. **6010 临时工程手验(OPFS 目录句柄,831 JSON+14 二进制)**:四类创建 32→36(📦entity-1 sprite 源/
     👤entity-2 actor 源 李逍遥/⬚entity-3 touch/⬚entity-4 interact);**zone 原生拖动补验通过**——渲染画布上
     指针拖 entity-4 (9,1)→(13,1),撤销回 (9,1)、重做回 (13,1);保存 → 整页重载 → 最近工程重连:36 实体
     全数持久,OPFS 字节级复核四实体 canonical 形状(sprite:li-xiaoyao / actor:li-xiaoyao / zone touch
     range 0 stages 1 / zone interact range 1 stages 1),无幽灵实体无编辑器私有形状。附带发现:资产缺失
     致场景渲染失败时放置仍可用(add 分支不依赖命中矩形)而选中/拖动不可用(entityAt 依赖渲染),
     属既有 SceneCanvas 行为、非本卡引入,不阻塞。
  4. **6051 改名产物四点抽验**:新游戏开场立绘/家具/换装(s000 `setActorSprite sprite-193`)全渲染;
     s001→s003 房门真实步行落地 (143,46);`battle=0` 战场+敌我+战斗 UI 正常;s074 宝箱 e1415(sprite-10)
     交互开启 + 横向"获得赤蝎粉"卷轴。console 0 error/warning。
  5. **door 边界**:卡内职责枚举已改(object 含门等,无平级 door);editor/content 源码零 `'door'` 职责
     字符串;检查器文案同步。
  门禁独立重跑:migrate 183+1skip/content 170/editor 172/reforge 343/migration-validate 3;dry-run
  `writes=0 deletes=0 conflicts=0` 含通道报告。
- GLM: **accept（2026-07-15;见下）**。六项独立实测 + 四包 868 tests pass + 1 skip。G1-G3 全落地。

  **(1) G1-G3 落地验收** ✅：
  - **G1（dry-run 通道口径注明）**：实测 dry-run 输出 `sprite-defs=580/574 sprite-refs=entities:3695/3695,actors:6/0,setActorSprite:116/69,setActorAppearance:3/2`——116/69 与 3/2 的 total/migrated 口径与设计期基线逐项吻合。✅
  - **G2（actors.spriteId 第五通道入闭包）**：`auditSpriteReferenceClosure`（migration-validate.ts:59-139）五通道全扫——definitions(:73-83)/actors(:96-102 **G2 第五通道**)/entities(:104-117)/setActorSprite+setActorAppearance(:119-135 walkCommands 递归)。`assertSpriteReferenceClosure`（:142-154）对 legacy/unresolved fail-loud throw。✅
  - **G3（闭包门禁显式扫脚本命令不依赖 validate-refs.ts）**：调用位序实证——`createMigrationPlan`→冲突检查→**`plan.target`（合并后最终结果）上 `validatePalMigrationTarget`→`assertSpriteReferenceClosure`**（migrate-content.mts:256-273），dry-run 和 `--write` 两路同门禁。walkCommands 递归覆盖场景脚本分片 + 敌人编舞。✅ **不依赖 validate-refs.ts（它只覆盖 EntityDef.sprite + actors.spriteId）。**

  **(2) 通道口径全量对账（改名后独立重扫）** ✅：
  - sprites.json **580 总 = 574 sprite-***（含 16 `-f`）+ 6 semantic + **0 npc-***。✅
  - EntityDef.sprite **3,695 全 sprite-***。✅
  - `grep '"npc-[0-9]' projects/pal/content/` = **0**。✅ 产物零 `^npc-\d+(-f\d+)?$`。

  **(3) 测试矩阵完备性** ✅：
  - **§105 结构化扫描**：migrate-content.test.ts:627 `expect(.../^npc-\d+(?:-f\d+)?$/.test(def.id)).toBe(false)` 零 legacy 断言。✅
  - **§106 反向保护**：migration-validate.test.ts:36-81 作者 `npc-merchant`（semantic）五通道全放行 + 实体 id 字面 `npc-55` 不被扫描。✅
  - **R1 漂移模拟**：migration-validate.test.ts:83-138 ours 引 `npc-55` × theirs 改名 `sprite-55` → `plan.conflicts=[]`（结构化合并成功）→ 闭包审计捕获悬空 → `assertSpriteReferenceClosure` throw `/精灵引用闭包门禁失败.*npc-55/`。与 R1 规格精确一致。✅
  - **§107 四形态创建 × 撤销重做**：commands.test.ts:126-146 `test.each` 四模式（actor/sprite/touch-zone/interact-zone）× AddEntityCommand apply/invert。✅
  - **§107 保存重开**：project-io.test.ts:185-245 四类 `createPlacedEntity` → serialize → assemble → toEditorState → `toEqual(placements)` + zone trigger `{on,range,stages:[{body:[]}]}`。✅
  - **entity-placement.ts**：55 行纯模块，四模式收口 EntityRef，zone 自带 `pages[0].trigger` + `createEmptyScriptStages`，缺省 touch 0/interact 1。✅
  - **O1 非阻塞**：§104 "同号布局冲突 `-f` 逃生口"无专用单测——实现存在（migrate-content.ts:1255 layoutConflicts），§105 测试容忍 `-f` id 但不主动构造冲突；结构保证已足够。

  **(4) 夹具同步复核** ✅：
  - **migrate 测试**：translate-events.test.ts npc- **0 残留**（原 4 hits 全改 sprite-*）；migrate-content.test.ts 仅 1 处（:627 负向断言"npc- 不存在"，正确保留）。✅
  - **reforge**：script-runner.test.ts npc- **0 残留**（R2 夹具已同步）。✅
  - **game**：present.test.ts 11 hits + scene-system.test.ts 1 hit（注释 `npc->x` C 指针）——**一阶段冻结未改**，正确。✅

  **(5) MG2 事务面** ✅：
  - 首次 dry-run `writes=315 deletes=0 conflicts=0` → `--write` 事务提交 631 项 → 命令内二跑 `0/0/0` → 独立 dry-run `0/0/0`。链路与 MG2 卡"结构化三方合并 + 事务写盘 + 二次严格零计划"口径一致。✅
  - sprites.json id-mode 结构化合并（574 del + 574 add），scenes 按实体 id 锚定不扰动。✅
  - baseline 同步完整（当前 dry-run 稳态零计划确认）。✅

  **(6) door 边界（文档面）** ✅：
  - 卡内职责枚举 `object` 含门（line 21/99/233/366/419），无平级 `door` 职责。
  - editor/content/reforge 源码零 `'door'` 职责字符串。✅
  - phase2 docs 零 `door` 平级职责命中（`outdoor`/`resolveOutdoorSkills` 等无关子串除外）。✅

  **总结**：G1-G3 全落地（闭包门禁五通道 + plan.target 位序 + walkCommands 脚本命令）；改名后产物 580/574sprite/3695/0 npc- 全确认；测试矩阵 §105-108 + R1 漂移模拟精确一致；夹具零残留 + game 冻结；MG2 事务链路一致；door 归入 object 无平级。四包 183+1skip/170/172/343 = **868 pass**。**accept**。

  **O1 非阻塞（不影响 accept）**：§104 同号布局冲突 `-f` 逃生口无专用单测（实现存在 + §105 容忍，结构保证已足够）。

- counter / 返工处理: 无(Opus 零返工项,GLM 无 counter;O1 布局冲突无专用单测非阻塞)。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex + Opus + GLM accept）。交用户验收，用户点头方 done。**

## Draft: 设计与风险

### A. 两条正交轴

编辑器作者认知采用以下边界，不要求本卡立刻重写底层 schema：

```text
场景 Scene（容器）
├── 可见精灵实体
│   ├── 外观来源：ActorDef
│   └── 外观来源：SpriteDef
└── 触发区 Zone（无外观）

玩法职责（后续独立轴）
NPC / 敌人 / 物件（门等）/ 宝箱 / 装饰 / 特效 / ...
```

- `actor` 和 `sprite` 是可见实体的两种外观/身份来源；`zone` 是无外观实体。
- `scene` 是容器和树根，不参与 EntityRef 判别。
- 玩法职责不能从外观来源推导：同一 sprite 可以既用于 NPC，也用于机关、门板或特效；同一 ActorDef 也可能用于剧情演出或队伍成员。
- 现有 `hostile`、触发脚本、自动脚本和模板继续承担行为真值。后续职责分类只在有明确作者工作流后单独设计，避免再造与行为字段冲突的第二真值。

### B. 中性 SpriteDef 身份

- PAL 迁移器通用命名统一为 `sprite-<spriteNum>`；同号不同布局逃生口为 `sprite-<spriteNum>-f<frames>`。
- 六主角等已有语义资源 ID 保持不变。
- 改名函数集中在迁移器，不在事件翻译器、编辑器或生成产物中各写一份字符串规则。
- 只重写实际解析到这些 SpriteDef 的引用；不得运行全仓文本替换。
- MG2 把改名视为受控的稳定身份迁移。写盘前报告必须能解释旧条目删除、新条目新增和脚本/场景引用变化；出现作者双改冲突时停止，由用户裁决，不能 prefer theirs 强压。

### C. 编辑器创建闭环

- “添加实体”进入专门 inspector，顶部用分段控件选择 `精灵` / `触发区`。
- 精灵模式再选择来源：
  - `角色`：从 ActorDef 列表选取，创建 `{ actor }` 实体。
  - `精灵资源`：从 SpriteDef palette 选取，创建 `{ sprite }` 实体。
- 触发区模式提供触发方式和范围：
  - `touch` 缺省范围 0。
  - `interact` 缺省范围 1。
  - 创建时写入合法的第一页 trigger 和空 stage/script；不得造第二套 inline-only 结构。
- 新实体仍由 AddEntityCommand 进入不可变命令栈，创建、撤销、重做和 dirty 状态走统一路径。
- 树节点显示“实体 id + 形态/来源摘要”，资源 ID 只作为详情，不承担分类。

### D. 后续职责分类

- ED-4 后续单独决定职责载体是实体模板、显式 authoring 字段，还是二者组合。
- 建议职责枚举至少预留：`npc`、`enemy`、`object`、`chest`、`decoration`、`effect`，并允许项目自定义标签；门、火炬、机关等作为 `object` 的模板/子类，不占一级职责。最终集合必须由真实创作流程和现有行为字段审计后定案。
- “职责”应驱动创建模板、默认字段、palette 筛选和检查器分组，而不是替代 `hostile`、脚本或资源注册表。
- 树、搜索和筛选未来可显示职责，但渲染器永远只读取明确外观和行为字段，不解析职责名字猜机制。

### 已知风险

- 风险: `npc-*` 已进入 sprites、295 场景、脚本分片和 baseline，改名漏一处就会产生悬空引用。
  - 缓解: 集中命名函数 + 结构化全产物引用扫描 + MG2 写盘前 plan + 双跑严格零计划。
- 风险: 全局替换误伤作者自定义 NPC 语义 ID、实体 ID 或文案。
  - 缓解: 只遍历 SpriteDef 注册表及 schema 已知引用字段；加入反向保护测试。
- 风险: 新增职责字段会与 `hostile`、脚本模板形成第二真值。
  - 缓解: 本卡不新增 role schema；后续另卡先审行为权威矩阵。
- 风险: zone 创建后没有脚本源，仍然无法使用。
  - 缓解: 创建事务同时生成合法 trigger source，并用保存重开 E2E 验证。
- 风险: 将 actor 排除在“精灵实体”之外会继续让作者困惑。
  - 缓解: UI 把 actor/sprite 统一放在可见精灵实体下，再明确外观来源。

### 主审立场

- Reviewer: Opus（架构/MG2 改名主审）+ GLM（迁移覆盖/测试矩阵主审）
- 结论(Opus,2026-07-15): **agree — 两轴拆分、上游中性化改名、actor/sprite/zone 创建闭环三件事全部成立**。
  压测未发现架构 counter:两轴与现有 EntityRef 判别同构(零 schema 改动);role 轴延后且行为真值不动;
  改名面全在生成文件、命名单点、零撞名、零硬编码;MG2 合并干净当前是构造性的(零作者漂移),
  风险收敛为"未来 ours 引用旧 id"一条,由 R1 门禁封死。
- 必改项(R,设计层面补明,build 必落):
  - **R1 合并后引用闭包门禁 + 漂移模拟测试**:改名事务的引用闭包检查必须作用在**三方合并后的最终结果**
    (而非纯生成中间态),且为 fail-loud 硬门禁(闭包违例 = 拒绝写盘,不是 warning 计数);新增一条模拟测试:
    构造 ours 侧实体引用 `npc-55` × theirs 侧改名为 `sprite-55` 的合并,断言事务**阻断并报告悬空引用**,
    交用户裁决而非静默保留或强改。这是本卡 MG2 风险的唯一真实敞口(当前零漂移,门禁保护的是未来作者内容)。
  - **R2 夹具覆盖补点**:`packages/reforge/src/script-runner.test.ts` 夹具含 `npc-*` ID,须随改名同步,
    补进"相关测试"清单;`packages/game` 两处 npc- 命中属一阶段自有语境(一阶段冻结、不用二阶段迁移契约),
    build 期确认不受影响即可、不改。
  - **R3 引用字段清单在卡内钉死**:结构化扫描的"已知 sprite 引用字段"明确为四处——`sprites[].id`、
    `EntityDef.sprite`、`setActorSprite.sprite`、`setActorAppearance.spriteId`;对账基线 = 574 定义
    (含 16 个 -f 变体)/ 3,695 / 69 / 2(Opus 2026-07-15 全产物实测)。同时明确**不在**改名面的:
    actors.json(六角色 sprite 字段全空)、locale/music、资产路径(spriteNum 键控)、demo 工程。
    防止 build 期误扩面或漏点。
- 建议项(S,不阻塞):
  - S1 文档级声明 `sprite-*` 为迁移器保留 ID 前缀(与 npc-* 同样的作者撞名风险本来就存在,
    非本卡引入;编辑器资源新建沿用既有重复 id 校验即可)。
  - S2 放置模式文案裁量:模式名"精灵"下含来源"角色"读起来略绕(放一个精灵→来源:角色),build 时可斟酌
    模式标签用"可见实体";顶层三分类(场景/精灵/触发区)按用户 2026-07-15 裁决不动。
- 是否建议进入 build: **待 GLM 覆盖复核(引用扫描口径 + 测试矩阵);R1-R3 纳入 build 范围后 build**。

### 三方争议记录(按需)

- Codex: 两轴拆分；本卡完成中性 ID 和 actor/sprite/zone 创建，不新增职责 schema。
- Opus: **agree**。两轴与现有 EntityRef 判别同构,零 schema 改动;role 延后 + 行为真值不动 = 防第二真值;
  改名面实测(574 定义/3,695+69+2 引用,全在生成文件,命名单点,零撞名)后 MG2 风险收敛为"未来 ours
  引用旧 id"一条,R1 合并后闭包门禁封死;zone 创建复用 CreateScriptSourceCommand 实证可行。
  附 R1-R3 + S1-S2。
- GLM: **agree**。R3 核心数字全确认(574 npc-*/16-f/6 semantic/3695/69/2)；改名面限四处 npc-* 引用(actors.spriteId 第五通道 semantic-only 不改名)；测试矩阵逐条可落；夹具 5 文件全量清单(migrate 7 hits + reforge 2 + game 一阶段冻结)；MG2 id-mode 结构化合并语义正确(dry-run 零计划)；AddEntityCommand 已 EntityRef-agnostic。**G3 关键**：validate-refs.ts 不校验脚本命令 sprite 引用,R1 闭包门禁必须显式扫四处含 setActorSprite/setActorAppearance。G1(69/2=npc子集)/G2(actors.spriteId semantic注)非阻塞。Evidence: 设计签字 GLM 行。
- 用户拍板: 表现形态与职责分开；职责后续可细分。

## 额度 / 代班记录(如适用)

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- build 开始: 2026-07-15（三方设计签字齐，用户确认推进）
- 修改文件:
  - 上游与门禁：`packages/migrate/src/migrate-content.ts`、`migration-validate.ts`、`scripts/migrate-content.mts` 及对应测试/夹具。
  - 编辑器：新增 `packages/editor/src/core/entity-placement.ts`，更新 `App.tsx`、`editor.css`、命令与工程保存重开测试。
  - 契约说明/夹具：`packages/content/src/{index,actor}.ts`、`packages/reforge/src/script-runner.test.ts`。
  - 生成结果：`projects/pal` 与 `packages/migrate/baselines/pal` 中受影响的 sprites、场景、脚本索引/分片和 MG2 state。
  - 文档：本卡与 `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`。
- 实现摘要:
  - 集中 `migratedSpriteId()`，PAL 通用资源统一生成 `sprite-<num>` / `sprite-<num>-f<n>`；六个语义角色资源保持不变。
  - 在 MG2 三方合并后的最终目标上新增 fail-loud 引用闭包门禁，扫描 SpriteDef、ActorDef、EntityDef、`setActorSprite`、`setActorAppearance` 五个通道；补 ours 旧引用 × theirs 改名漂移模拟与语义 `npc-*` 反向保护。
  - 编辑器新增 actor 来源精灵、SpriteDef 来源精灵、touch zone、interact zone 四种放置形状；zone 创建即带合法空脚本段，统一走 `AddEntityCommand`、撤销/重做和工程序列化。
  - 实体树只显示“精灵/触发区”；检查器明确 zone 无外观。用户裁决同步为：门属于 `object` 的模板/子类，传送、阻挡、开关由组件/脚本表达，不新增平级 `door` 职责。
- 运行命令:
  - 定向测试：migrate 87、editor 91、reforge 33 项通过；四个相关包 typecheck 通过；受影响文件 Biome check 通过。
  - MG2 首次 dry-run：`writes=315 deletes=0 conflicts=0`；写前门禁 `580/574`、实体 `3695/3695`、actor `6/0`、setActorSprite `116/69`、setActorAppearance `3/2`。
  - `migrate:content -- --write`：事务提交 631 项操作，命令内二跑 `0/0/0`；独立 dry-run 再次 `0/0/0`；两套生成目录精确旧数字型 `npc-*` 扫描为零。
  - 包门禁：migrate 183（1 skipped）、content 170、editor 172、reforge 343 项通过。
  - 全仓 `pnpm check`：3,524 tests passed、1 skipped；Biome 676 files clean。
- 浏览器 / 手工检查:
  - 6010：真实 PAL `s001` 依次创建普通 SpriteDef、ActorDef、touch zone、interact zone；默认范围分别 0/1，树标签、检查器、黄色单格/3×3 范围和合法脚本段正确；undo/redo 实体数 `36→35→36`，最后重载恢复 32 个原实体。
  - 6051：默认开场进入 `s001` 后李大娘/李逍遥资源正常；`?scene=s001&battle=0` 敌我资源可载；`s074` 宝箱打开并显示横向“获得赤蝎粉”卷轴；真实 touch 出口触发切场景过渡。两页 warn/error 均为 0。
- 跳过的检查及原因:
  - 未把四个测试实体保存进用户真实 PAL 目录，避免污染工程；四形状的目录保存/重开由 `project-io.test.ts` 的 FileSource roundtrip 自动测试覆盖，交 Opus 用临时工程独立手验。
  - 浏览器控制面不提供原生 canvas pointer drag；新 zone 的黄色选中/范围已实测，拖动继续复用未改动的 `SceneCanvas` + `MoveEntityCommand` 通路（既有移动/invert 单测通过），交 Opus 补一次手势复验。

## 视觉验证记录(如适用)

- Visual Verification Owner: Codex（已完成）+ Opus（已完成）
- 验证方式: 6010/6051 in-app browser 实操、整页截图、DOM 状态与 console warn/error 检查。
- 截图 / 像素检查路径: 会话内截图（未写入仓库，避免生成视觉证据噪音）；关键帧为 touch 单格、interact 3×3、四模式 palette、s001 开场、战斗揭场、s074 宝箱前后。
- 结论: Codex 视觉自验通过；资源重命名后未见空白/错图/悬空引用，四模式 UI 无溢出或遮挡。
- Opus 独立复验(2026-07-15): 通过,方法独立于 Codex(CDP + OPFS 临时工程,与用户真实目录同 API 面)。
  6010:四模式面板(精灵/触发区分段 + 角色/精灵资源来源 + "原精灵 N #num"标签)实操创建四类实体;
  **zone 原生拖动**(树选中居中 → 画布指针拖 (9,1)→(13,1))、撤销/重做位置往返、**保存 → 重载 → 重连
  36 实体持久 + OPFS 字节级四实体 canonical 形状复核**——原留予 Opus 的两项未完成项均已补验。
  6051:开场(含 sprite-193 换装)/s001→s003 步行/battle=0/s074 宝箱"获得赤蝎粉"四点全过,console 零错。
  临时工程与句柄记录已清理。
- 未完成项: 无。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: Codex self-review accept；**Opus 实现/架构/视觉主审 accept(2026-07-15,证据见 done 前签字
  Opus 行)**；**GLM 覆盖/测试矩阵复核 accept(2026-07-15,证据见 done 前签字 GLM 行)**。
- 必须返工项: 无。
- Accept / rework: 三方 **accept**；等待用户验收，用户通过前不得标 `done`。

## 用户验收

- 用户结论: **通过**（2026-07-15）
- 后续任务: ED-4 职责分类与实体模板（门归 `object`）；ED-3 引用删除守卫。

## 交接日志

- 2026-07-15 Codex: 完成根因审计和 Draft，确认当前 `npc-*` 是迁移器生成契约，zone 只能由迁移/手改 JSON 产生；提出表现形态与玩法职责两轴模型，Codex 设计签 `agree`。Evidence: 本卡代码锚点与验收矩阵。Next: Opus 设计压力测试；不得开始实现。
- 2026-07-15 Opus: 设计压力测试签 **agree + R1-R3 必改 + S1-S2 建议**。独立地面重验:改名面 574 定义
  (16 个 -f 变体)+ 引用 3,695(EntityDef.sprite)/69(setActorSprite)/2(setActorAppearance),全在生成文件;
  命名生成单点(spriteRef 两处字面量);零 sprite-* 撞名、零源码硬编码;actors.json/locale/music/demo/
  资产路径零涉及;当前 dry-run 零计划 = 零作者漂移,合并干净构造性成立。裁定:两轴与 EntityRef 同构、
  actor 归 UI 来源、zone 缺省与 TriggerSpec 一致且复用 CreateScriptSourceCommand。R1=合并后闭包
  fail-loud 门禁 + ours 漂移模拟测试(本卡唯一真实 MG2 敞口);R2=reforge script-runner.test 夹具补进
  同步清单;R3=四处引用字段与对账基线钉进卡。Evidence: 主审立场 + 本人核验脚本输出。
  Next: GLM 覆盖复核(扫描口径/测试矩阵/反向保护),三签齐后 build;不得抢跑实现。未改实现文件。
- 2026-07-15 GLM: 设计复核签 **agree**。六项独立实测：(1)R3 对账——574 npc-*(16-f)/6 semantic/3695 EntityDef.sprite/69 setActorSprite npc/2 setActorAppearance npc 全确认；**G1**:setActorSprite 总 116(69npc+47semantic)/setActorAppearance 总 3(2npc+1semantic),semantic 指向不改名六主角故不在改名面；**G2**:actors.json.spriteId 第六主角 semantic 是第五 id 通道但不改名。(2)反证——locale/music/demo 零 npc-,资产按 spriteNum 键控,源码 content/reforge/editor 零硬编码。(3)测试矩阵逐条可落,**G3 关键**:validate-refs.ts 不校验脚本命令 sprite 引用(仅 EntityDef.sprite+actors.spriteId),R1 闭包门禁必须显式扫四处含 setActorSprite/setActorAppearance 不能依赖 validate-refs.ts。(4)夹具全量 5 文件(present.test 11/scene-system 1 误报/translate-events 4/migrate-content 3/script-runner 2),R2 同步清单=migrate+reforge,game 一阶段冻结。(5)MG2 sprites.json id-mode 结构化合并,改名=del+add 零冲突,dry-run writes=0。(6)AddEntityCommand 已 EntityRef-agnostic,仅 addAt/UI 需扩展四模式。G1-G3 build 必落。Evidence: 设计签字 GLM 行。Next: 三签齐已 build allowed,交 Codex build。未改实现文件。
- 2026-07-15 User: 补充产品裁决：`door` 不单列职责，归入 `object`；Codex 已同步本卡与检查器文案，未新增 schema。
- 2026-07-15 Codex: build 完成并自审签 **accept**。中性 sprite ID、合并后五通道闭包门禁、四形态创建/roundtrip、MG2 事务写盘与独立零计划均落地；全仓 3,524 tests passed、Biome clean；6010/6051 实操无浏览器错误。Evidence: Build/视觉记录。Next: Opus 实现+视觉主审；不得标 done。
- 2026-07-15 Opus: review 主审签 **accept,零返工项**。代码面:闭包门禁五通道+递归扫描落于合并后
  plan.target、位序在事务前(dry-run/写盘两路同门禁),漂移模拟(ours 旧引 × theirs 改名 → 零冲突但硬阻断)
  与反向保护(npc-merchant 放行/实体 id 不扫)双测精确;四形态经 entity-placement 纯模块统一走
  AddEntityCommand,zone 空 stages 与 CreateScriptSourceCommand 共源。手验面:6010 OPFS 临时工程
  四类创建 32→36、**zone 拖动 (9,1)→(13,1) + 撤销/重做 + 保存重开 36 实体字节级持久**(补掉 Codex
  两项未完成);6051 开场/换装 sprite-193/s003 步行/battle=0/s074 宝箱四点全过,console 零错。
  door 边界:源码零平级 role 残留。门禁重跑 183+1skip/170/172/343 + dry-run 零计划含通道报告。
  Evidence: done 前签字 Opus 行+视觉记录。Next: GLM 覆盖复核(通道口径对账/测试矩阵/夹具清单),
  齐签后交用户验收;不得标 done,不得改 capability-map。未改实现文件。
- 2026-07-15 GLM: done 前覆盖复验签 **accept**。六项独立实测+四包 868 pass：(1)G1-G3 全落地——dry-run 通道口径 `580/574·3695/3695·6/0·116/69·3/2` 精确吻合;auditSpriteReferenceClosure 五通道含 actors.spriteId(G2);闭包门禁在 plan.target 合并后结果上跑 walkCommands 递归脚本命令(G3,不依赖 validate-refs.ts)。(2)改名后产物 580=574 sprite-*+6 semantic+0 npc-,3695 EntityDef.sprite 全 sprite-*,grep npc-[0-9] 零命中。(3)测试矩阵——§105 migrate-content.test:627 零 legacy 断言/§106 migration-validate.test:36-81 反向保护/R1 漂移模拟 :83-138 ours npc-55×theirs sprite-55→conflicts=[]→闭包 throw/§107 commands.test:126-146 四模式×undo-redo/project-io.test:185-245 保存重开;entity-placement.ts 55行四模式 zone trigger。O1 非阻塞(布局冲突-f无专用单测)。(4)夹具 migrate/reforge 零 npc- 残留,game 一阶段冻结。(5)MG2 315/0/0→631→0/0/0 链路一致。(6)door 归入 object 无平级,源码/docs 零命中。Evidence: done 准入 GLM 行。Next: 三签齐,交用户验收。未改实现文件。
- 2026-07-15 User: 验收通过；ED-4A 转 `done`，从进行中看板移除。

## 下一位 Agent 提示词

无下一位 Agent 提示词，任务已完成。

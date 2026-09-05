# C1-1 - 预制人物与自定义实体双轨创作

Status: done
Phase: phase2
Capability: C1 / E1（后续衔接 N1 / C4）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: TBD

## 目标

作者既可以先在人物库中预制一个人物（姓名、默认大世界精灵、立绘组、可选战斗资料），再在场景中直接
选择并放置该人物；也可以继续直接选择精灵、触发区和实例零件组装自定义实体。人物引用只共享“这个人
是谁及其资源”，位置、朝向、碰撞、显隐、页面脚本、自动行为和敌对配置始终归场景实例，不建立会把
场景行为全局联动的完整 NPC prefab。

本卡先交付现有 schema 上的首个可用纵切：**人物库 CRUD 七环 + 预制人物 / 自定义实体双入口 + 显式
解除人物关联**。对话角色引用和 PAL 既有 NPC 批量治理另开 successor 卡，避免把作者功能、schema
successor 与大规模内容归并揉成一个不可验收的大任务。

## 范围

- 范围内（C1-1 首切片）:
  - 人物库从空白工程创建第一名 `ActorDef`，以及发现/选择、创建、复制、编辑、引用、保存重开、删除约束。
  - 新建人物至少填写稳定 id、姓名和默认大世界精灵；立绘组可为空，战斗块可为空。
  - 场景“添加实体”保留并明确展示两条可见实体路径：
    - `预制人物`：创建 `{ actor: actorId } & EntityBase`。
    - `自定义实体`：创建 `{ sprite: spriteId } & EntityBase`。
  - `触发区`继续作为第三条独立路径；不得被人物重构挤掉。
  - actor 实体显式“解除人物关联”：在一个可撤销事务中把 `{ actor }` 改成当前人物的 `{ sprite }`，
    原样保留实体 id、位置、朝向、碰撞、显隐、zBias、pages、hostile 等实例字段。
  - actor 实体在检查器中清楚区分“人物共享字段（只读跳转人物库）”与“当前场景实例字段（可编辑）”。
- 人物删除前扫描所有现有 Actor 外部引用并 fail-loud；不得留下悬空引用，也不得静默把
  引用实体转成 sprite。`skills.levelUp[actorId]` 是 Actor 自有伴随数据，不作为自我引用阻塞；
  复制/删除 Actor 时必须在同一可撤销事务中复制/删除该键的成长表。
- 后续独立卡（本卡只冻结方向，不在本卡 build）:
  - 结构化对话身份：人物说话时引用 Actor/人物身份，并且立绘只能从该人物的 `portraits` 中选择；
    旁白、文书、泛称和暂未归档说话人保留显式非人物通道。
  - PAL NPC 归档与迁移：按人物身份审计、别名归并和 canonical locator 逐批转换，禁止按 sprite、姓名或
    立绘 hash 猜测。
  - “从当前自定义实体保存为人物”便利动作；必须先设计跨文件 Actor + locale 创建的原子事务。
- 范围外:
  - 不把 pages、hostile、商店、宝箱、拾取、碰撞或场景位置搬进 `ActorDef`。
  - 不新增第二套 `NpcDef` / `CharacterProfile` / `EntityPrefab` registry。
  - 不在本卡修改 `DialogueCue` schema、contentVersion、save schema 或迁移发布链。
  - 不在本卡批量改写 `projects/pal` 的场景实体或对话。
  - 不借本卡重做当前角色工作台布局；已在当前会话进行的白屏与布局修复保持独立。
- 明确不做:
  - 不强迫每一个可见实体都建人物；门、箱子、机关、装饰和一次性临时形象继续直接组装。
  - 不设计逐字段 Actor 继承覆盖层；实例要特殊化时使用显式“解除关联”，不制造隐藏 override 规则。
  - 不把 `actor` / `sprite` 外观来源解释成 NPC、敌人、物件等玩法职责；职责真值仍由既有结构字段承载。

## 前提真值门

### 一句话行为 / 工程前提

当前二阶段已经有“人物定义 + 场景 actor 引用”的数据骨架，但 PAL 内容与作者工作流仍以场景内 sprite
实体为主；首切片应补齐**复用人物身份资源**的创作闭环，同时保留直接组装实体，不引入行为继承。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版 `EventObject` 是场景实例记录，保存位置、脚本、状态、精灵号和帧等字段，没有姓名、立绘或人物身份引用；因此不能从原表自动得出 NPC 人物预制。 | `packages/pal-extract/src/io/sss.ts:45-63`; `packages/pal-extract/src/resources/scene.ts:17-37` |
| 第一阶段 | 第一阶段 `NpcState` 继续忠实使用 event object id、位置、sprite 与脚本状态，未建立作者侧可复用人物 registry；本任务不改变第一阶段运行真值。 | `packages/game/src/core/game-state.ts:82-89,1209-1210,1990-2004` |
| 当前二阶段 | `ActorDef` 已含 name/spriteId/portraits/可选 battler；`EntityDef` 已是 actor/sprite/zone 三选一；编辑器放置器已经能创建 actor 实体，引擎也能用 Actor 解析世界精灵。但 PAL 迁移仍把场景 event object 全部写成 sprite 实体。 | `packages/content/src/actor.ts:101-137`; `packages/content/src/index.ts:61-107`; `packages/editor/src/core/entity-placement.ts:3-49`; `packages/reforge/src/main.ts:1121-1125`; `packages/migrate/src/migrate-content.ts:2628-2640` |
| 本任务目标 | 在不改运行时语义和数据判别联合的前提下，把既有 actor 能力补成完整人物预制工作流；自定义 sprite 实体与 zone 原样保留。 | 2026-08-14 用户裁决：“可以预制一些人物直接选择，但实体里用零件拼装的能力也要保留”；本卡目标与范围 |

### PAL 当前数据基线（2026-08-14，只读重算）

- `actors.json`: 6 个，均为既有主要可入队角色。
- 294 个场景、5,077 个实体：`actor=0`、`sprite=3,695`、`zone=1,382`；可见实体使用 549 种 sprite 引用。
- 6,018 个对话 cue：4,132 有 speaker、2,530 有 portrait、2,389 两者都有。
- 317 种 speaker 标签、87 种 portrait；13 个 speaker 使用多张 portrait，29 张 portrait 被多个 speaker 标签复用。
- 上述数字只证明需要后续身份治理，**不构成**“317 个标签 = 317 个人物”或“同 portrait = 同人物”的依据。

### 反证与替代解释

- 最强替代解释 1：完整 `EntityPrefab` 才能真正避免重复。
  - 反证：实例 pages/hostile/碰撞/位置有强场景语义；把它们放进共享模板会造成修改一处、跨场景静默
    传播，且与现有 `hostile` / pages 行为真值重复。首切片只复用身份和资源，行为继续实例化。
- 最强替代解释 2：所有可见实体都应强制引用 Actor。
  - 反证：现有 `EntityRef` 明确保留 sprite 与 zone；门、箱子、机关、装饰和无稳定身份的临时角色无需
    人物语义。强制 Actor 会制造假人物并污染人物库。
- 最强替代解释 3：应立即从 PAL speaker/sprite 自动生成全部 NPC。
  - 反证：原始 EventObject 没有人物身份字段；真实数据存在别名、泛称、旁白/文书和 portrait 多对多，
    自动猜测不可逆且不可验证。
- 什么观察会推翻当前前提:
  - 若代码审查发现 actor 实体当前已经从 `ActorDef` 继承 pages/hostile/位置等行为，必须重开边界设计。
  - 若 primary source 中存在尚未提取的稳定 NPC identity/name/portrait 对照表，PAL successor 的人工归并
    策略必须改为提取器上游映射。
  - 若 Actor CRUD 无法在不修改 save/contentVersion 的情况下保持既有六角色 party template id，首切片
    必须缩小或转 schema successor，不得硬改存档。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类：本卡不改变运行语义；actor 与 sprite 最终均解析为 SpriteDef。
  - 原版 / 第一阶段理解：原版/一阶段只有实例 event object/NpcState，不证明现代编辑器也应缺少人物库。
  - extractor / 数据解码：EventObject 结构中确无 name/portrait/identity 字段。
  - audit / test model：PAL census 区分 physical entity、speaker label、portrait asset 三种口径，不互相冒充。

### 用户可见偏离

- 是否主动偏离已核真值: yes（新增现代作者工作流，不改变 PAL 运行行为）
- `before -> after` 一句话: `每个场景临时选精灵拼人物 -> 可直接放置预制人物，也可继续自由拼装自定义实体`
- 代表场景: 空白工程新建“酒剑仙”人物，在两个场景各放一个实例；修改人物姓名/立绘/默认精灵后两处
 资源引用同步，修改其中一个实例的站位/脚本不影响另一处。
- 用户裁决: 2026-08-14 用户已批准双轨方向；完整 schema 与迁移细节仍须三方设计签字。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema/migration/跨包任务必须先过前提门与三方设计签字；build 只能有一个 Coding Owner。
  - `docs/phase2/READ-FIRST.md`：稳定 id、clean schema、迁移修上游、不可把原版资料当运行依赖。
  - 用户 2026-08-14：人物预制和场景零件拼装并行；人物预制不得取消直接组装能力。
  - ED-4A：外观来源与玩法职责正交，NPC/敌人/物件职责不得从 actor/sprite 推导。
- 代码锚点(`file:line`):
  - `packages/content/src/actor.ts:101-137`：ActorDef 与 actor→sprite 解算。
  - `packages/content/src/index.ts:61-107`：EntityRef 判别联合与实例字段所有权。
  - `packages/content/src/character.ts:169-217`：party CharacterInstance 的 `template=ActorDef.id` 为存档兼容字段；
    首切片不得改名或重定义。
  - `packages/editor/src/core/entity-placement.ts:3-49`：现有 actor/sprite/zone 放置纯函数。
  - `packages/editor/src/ui/App.tsx:2453-2630`：现有放置 UI 已区分角色和精灵资源。
  - `packages/reforge/src/main.ts:1121-1125`：场景 actor 实体运行时解算精灵。
  - `packages/reforge/src/main.ts:3144-3190`：`setActorAppearance` 当前只处理队伍 CharacterInstance，说明
    Actor “统一人物”语义仍有 party 偏置；本卡不得顺便扩大该命令。
  - `packages/content/src/index.ts:40-53`、`packages/editor/src/ui/CommandForm.tsx:253-395`：当前对话 speaker
    仍是 TextId，portrait 仍从全局资产选择；人物对话绑定属于后续 schema 卡。
  - `packages/migrate/src/migrate-content.ts:274-317,2628-2640`：PAL 只为六 SourceRole 建 Actor，场景实体仍全走 sprite。
- 已知坑 / 审计文档:
  - `docs/phase2/archive/designs/actor-model-design.md:1-15,25-40,78-126`：历史设计提出统一 ActorDef 和
    场景放实例，但文档明确标注“设计，非实现”；本卡以 2026-08-14 最新用户裁决重新冻结范围。
  - `docs/ops/archive/tasks/done/ED-4A-entity-kind-role-boundary.md:96-101,290-326`：表现来源/玩法职责两轴边界，实体
    模板与责任分类曾明确延期。
  - `docs/phase2/capability-map.md:68,83,86,233-238`：E1 actor/sprite/zone 放置已完成；C1 CRUD 七环
    是当前首选缺口；C4 资产闭包完成不等于人物语义绑定完成。
  - 当前工作区已有未收口的角色页/引用索引 UI 改动；本卡 build 前必须先确认其 owner、状态与测试，禁止
    覆盖或把白屏修复混入本卡提交。
- 不得重新引入:
  - 以 ID 前缀、sprite id、显示姓名或 portrait hash 推断人物身份。
  - 完整 NPC prefab 行为继承、逐字段隐藏 override、运行时动态猜测资源来源。
  - `ActorDef` 与另一个 `NpcDef` 双 registry。
  - 只改 `projects/pal` 生成产物或手工把大批 sprite entity 改成 actor。
  - 把对话中的旁白、文书、泛称强行建成 Actor。
- 相关测试:
  - `packages/content/src/actor.test.ts`
  - `packages/content/src/validate-refs.test.ts`
  - `packages/editor/src/core/entity-placement.test.ts`
  - `packages/editor/src/core/commands.test.ts`
  - `packages/editor/src/core/ref-index.test.ts`
  - `packages/editor/src/core/project-io*.test.ts`
  - `packages/editor/src/ui/ActorMode.test.tsx`
  - `packages/editor/src/ui/App.test.tsx`
  - `packages/reforge/src/*scene*test.ts`

## 验收条件

### 功能

- 空白工程能创建第一名人物；已有工程能创建、复制、编辑和删除未引用人物。
- 人物 id 冲突、空 id、悬空 sprite、悬空 portrait 等在提交前 fail-loud；name/locale 写入与 Actor 创建
  必须同一可撤销事务，不能留下半人物。
- 引用闭包以“**15 个 schema 字段族 / 18 个作者数据定位变体**”为唯一口径，不再用一个
  含义模糊的“通道总数”验收。其中 17 个定位变体是外部引用：删除人物时必须阻止并
  给出精确可跳转清单；collector 与验收不得用“其他引用”模糊代替：
  1. 场景实体 `{actor}`；
  2. `manifest.startWorld.party[]`；
  3. `manifest.entryPoints[].startWorld.party[]`；
  4. `manifest.startWorld.learnedSkills` 的键；
  5. `manifest.entryPoints[].startWorld.learnedSkills` 的键；
  6. `manifest.startWorld.seedStats` 的键；
  7. `manifest.entryPoints[].startWorld.seedStats` 的键；
  8. 作者脚本条件 `inParty.actorId`；
  9. 敌人 AI 条件 `playerInParty.role`；
  10. `ActorDef.battler.coveredBy`；
  11. `item.equip.equipableBy[]`；
  12. `item.equip.effects[].battleSprite.byActor` 的键；
  13. `setActorSprite.actor`；
  14. `setActorAppearance.actor`；
  15. `setParty.members[]`；
  16. 敌人战斗编排 `applyActorGrowth.actor`；
  17. 敌人战斗编排 `playActorCastEffect.actor`。
- 第 15 个 schema 字段族的第 18 个作者定位变体是 `skills.levelUp[actorId]`：它是 Actor 自有
  伴随数据，不得让 Actor 永久“自我引用、无法删除”。创建人物默认无成长行；复制人物时
  深拷贝源键的成长行到新 id；删除人物时在同一事务中删除该键；undo/redo 必须同步还原。
- `ContentBundle.worlds` 不是工程作者数据，不计入上述 15/18 口径；但若当前会话显式加载了可见
  运行态，删除 collector 还必须把 `worlds[].party[].template` 与 `worlds[].reserve[].template`
  作为两个条件性只读阻塞位置；不得为了删人物静默改存档。
- 人物的 locale 文本、sprite/portrait/face/battleSprite 资产是被 Actor 引用的共享注册表对象；
  删除 Actor 不自动回收它们。删除未被外部引用的人物可撤销、重做并保存重开。
- 场景添加面板明确展示 `预制人物`、`自定义实体`、`触发区`，三者均可发现、过滤、选择和放置。
- 放置预制人物后：姓名/默认 sprite/立绘来自 Actor；位置、朝向、碰撞、显隐、pages、hostile 只属于实例。
- 修改人物共享资源后所有 actor 实体使用新资源；修改一个实体实例字段不改变 ActorDef 或其他实例。
- “解除人物关联”是单一 undo/redo 事务，转换前后运行画面相同，实例字段逐项保持，之后人物资源修改不再
  影响该实体。
- 自定义 sprite 实体与 zone 的既有创建、拖动、脚本、undo/redo、保存重开能力零回归。

### 测试

- content：ActorDef 引用和现有 party template/save contract 回归；首切片不增加 contentVersion/save 字段。
- editor core：create/copy/delete/ref-block、actor/sprite/zone 放置、detach、undo/redo、事务失败无半状态；
  上述 17 个作者数据外部引用定位变体必须逐项至少一个“阻止删除 + 精确定位/可跳转”
  测试，不能只测一个代表来源；存在 `worlds` 时再分别覆盖 party/reserve template 两个条件位置。
- editor core：`levelUp[actorId]` 创建缺省、复制深拷贝、删除联动清理以及四者的 undo/redo/事务
  失败回滚单独测试；不得用“引用阻塞”掩盖伴随数据所有权。
- content/project refs：删除 guard 与加载/保存诊断共用同一份 typed Actor 引用定义。
  `setParty.members[]`、`setActorSprite.actor`、`setActorAppearance.actor` 等运行时直接目标保持 error；
  `learnedSkills` / `seedStats` / 悬空 `levelUp` 键运行时为死数据，诊断至少 warn，但删除 guard
  仍须对 learned/seed 外部引用硬阻塞。`seedStats` 已有 editor project-level 默认/入口点校验，
  实现时不得重复产生两条同位置问题。
- editor project I/O：空白工程创建第一人、两个场景引用同一人物、保存重开、引用删除失败、解除后可删除。
- editor UI：双轨入口可达、键盘/窄宽布局、跳转人物、错误摘要与引用定位；不得出现空白页。
- reforge：actor 实体与等价 sprite 实体在默认外观下渲染/碰撞/脚本行为一致；实例 pages/hostile 不共享。
- 运行 `pnpm --filter @type-pal/content check`、`pnpm --filter @type-pal/editor check`、
  `pnpm --filter @type-pal/reforge check` 以及本卡涉及的定向 Vitest；若 test manifest 受影响，按既有生成流程更新。

### 文档

- 更新角色模块作者说明：人物预制、实例字段、自定义实体、解除关联的边界和例子。
- capability-map 只在 C1 七环通过三方 review 和用户验收后更新；E1 既有完成状态不得被本卡重复认领。
- 建立后续卡：人物对话身份 successor、PAL NPC 人工归档/迁移；未开卡前不写实现承诺。

### 视觉 / 手工验证

- 6010 空白工程：创建一个无 battler NPC 人物，配置姓名/默认 sprite/两张立绘；在两个场景放置。
- 修改共享姓名、默认 sprite、立绘组，两场景 actor 实例摘要同步；修改一处位置/脚本，另一处不变。
- 将其中一处解除关联，修改人物默认 sprite；仍关联实例更新，已解除实例保持旧 sprite。
- 同场景再创建一个自定义 sprite 实体和一个触发区，验证三条路径均可用且布局不挤压、不白屏。
- 保存、整页重载、重开工程；引用、实例字段和 undo/redo 边界保持。

### E2E 用例登记

- 功能性编辑器界面，采用开发期最小视觉验证，不延后到剧情集中 E2E。
- 后续 PAL NPC/对话迁移若开卡，剧情观感证据按 `AGENTS.md` 登记到集中 E2E；本卡不提前跑剧情验收。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-14）**。直接证据：`packages/pal-extract/src/io/sss.ts:45-63`、
    `packages/content/src/actor.ts:101-137`、`packages/content/src/index.ts:61-107`、
    `packages/editor/src/core/entity-placement.ts:3-49`、`packages/migrate/src/migrate-content.ts:2628-2640`；
    PAL 只读 census 为 actor 0 / sprite 3695 / zone 1382。
  - design: **agree**。首切片复用现有 ActorDef/EntityRef，不新增行为继承或 schema successor；对话与 PAL
    迁移拆卡，能够以可逆编辑器事务和现有运行时合同独立验收。
  - supplemental design: **agree（2026-08-14）**。已将闭包改为 15 个 schema 字段族 / 18 个
    作者定位变体：17 个外部删除阻塞位置 + 1 个 Actor 自有 `levelUp` 伴随数据；另对
    显式加载的 worlds 保留 2 个条件性只读阻塞位置。该口径由 schema 定义、runtime 消费与
    现有 validator 三向核对，不再依赖“总数”口头猜测。
- Kimi:
  - premise: **verified（2026-08-14，本人只读独立核证，非代理）**。一手核实：原版
    `EventObject`（`packages/pal-extract/src/io/sss.ts:45-63`）确无姓名/立绘/人物身份字段；
    二阶段 `ActorDef` 仅含 id/name/spriteId/portraits/face/battler（`actor.ts:113-124`），
    `EntityBase` 独占 pos/facing/collide/hidden/zBias/pages/hostile（`index.ts:68-90`），
    运行时只经 `resolveEntitySpriteId` 消费 spriteId（`actor.ts:132-138`、
    `reforge/main.ts:1121-1125`）——不存在行为继承通道；PAL 迁移只为六 SourceRole 建 Actor、
    场景实体全走 sprite（`migrate-content.ts:1457,2628-2640`）。ActorDef 双重身份
    （人物身份 + party template）是 2026-07-02 用户拍板的既定模型
    （`docs/phase2/archive/designs/actor-model-design.md` 决策表「一个 ActorDef」；
    `character.ts:172` template 存档兼容钉），本卡不新增该耦合。前提成立。
  - design: **agree（2026-08-14，附必改钉 K1-K3，见「Kimi 独立反证审查」）**。首切片
    复用现有判别联合、不引入行为继承/隐藏 override/第二 registry，方向正确；对话 schema 与
    PAL 迁移拆卡正确。K1-K3 为 build 必落钉，不阻塞准入。
- GLM:
  - premise: **verified（2026-08-14，本人独立核数据口径 + 引用覆盖 + 测试矩阵，非代理）**。PAL
    census 核心事实精确吻合（actors=6、实体 5077=actor 0/sprite 3695/zone 1382）；对话 cue 统计
    同向（详见下方「GLM 独立反证审查」）。原版 EventObject 无身份字段、二阶段 ActorDef 骨架已有
    但缺 CRUD 闭环、首切片拆卡正确。详见下方。
  - design: **agree（2026-08-14，附必改项 G1，非阻塞准入）**。复用现有 ActorDef/EntityRef、不引入
    行为继承、不扩 schema、undoable transaction 方向正确。Kimi K1-K3 全部认同；G1 补测试矩阵侧
    引用通道显式化。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（2026-08-14，本人）+ Kimi（2026-08-14，本人）
  - 独立证据锚点: 见下方「GLM 独立反证审查」逐层证据表
  - 可证伪观察: 见下方
- counter / 分歧处理: **2026-08-14 Codex supplemental audit 发现原“9 条穷尽”结论可证伪：**
  `packages/content/src/script.ts:145-155` 的 `setActorSprite.actor` 是第 10 条；
  `packages/content/src/enemy-script.ts:36-40` 的 `applyActorGrowth.actor` / `playActorCastEffect.actor`
  是第 11/12 条。三条均为 ActorDef.id；后两条已有 `validate-refs.ts:846-849,1014-1029` 校验，
  `setActorSprite.actor` 当前无加载期校验。设计方向不变，但 Kimi/GLM 关于引用穷尽的签字需 supplemental
  复核；历史签字保留，不再单独提供 build 准入。
  **2026-08-14 Kimi supplemental 复核再发现第 13/14 条（见下方「Kimi supplemental 复核」）**：
  `startWorld.learnedSkills` 键与 `startWorld.seedStats` 键均为 actor id 且零校验。Kimi 签 counter，
  最小返工 = 清单 12→14 + 逐通道测试 + 两条键通道补校验或显式记录。
  **2026-08-14 Codex 二次表驱动审计证明“14”仍是混合口径：**
  `AiCond.playerInParty.role`（`enemy-ai.ts:31,99`）也是 ActorDef.id，且已在
  `validate-refs.ts:788-790` 作战斗 Actor 校验；`skills.levelUp[actorId]`（`skill.ts:206-211`）
  被 `rewards.ts:219` 按 `CharacterInstance.template` 直接消费，现有 `validate-refs.ts:1344-1353`
  只查表内 skillId，不查 actor 键。因为 `levelUp` 是 Actor 自有伴随表而非普通外部引用，
  最终改用“15 字段族 / 18 作者定位变体 / 17 外部阻塞 + 1 伴随联动”分类。
  另外，Kimi 所说 `seedStats` “零校验”只对 content `validateReferences` 成立；编辑器
  `project-diagnostics.ts:168-197,296-297,323-327` 已校验默认与 entry-point 两级 actor 键。
  历史 counter 保留，新分类待 Kimi/GLM supplemental 同时核准后方可解除。
  **2026-08-14 Kimi typed ownership supplemental 复核签 agree（见下方「Kimi typed ownership
  supplemental 复核」）**：15 族/18 变体穷尽性、17 阻塞 + 1 伴随 ownership、2 条件存档位置、
  seedStats 两级校验证据四项均一手核准，未发现第 16 族。原 counter 解除。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-14）——Codex/Kimi/GLM 三方 supplemental design agree 齐；
  K1-K3 + G1（原）+ 17 逐通道测试 + levelUp 伴随五测 + worlds 两条件测 + typed 共享 + seedStats
  不重复均为 build 必落钉。K2 dirty worktree 已收口。可进入 build。**

#### GLM 测试矩阵 supplemental 补审（2026-08-14，本人；非代理）

**GLM: supplemental agree**。四项标准逐项核实，验收条件 `:165-212` 的测试口径显式且可执行。

**标准 1 — 17 个外部引用定位变体逐项测试设计 ✓**：
验收条件 `:165-184` 逐项列出 17 个变体（场景 `{actor}`、manifest/entryPoints 两级 party/learnedSkills/
seedStats、`inParty.actorId`、`playerInParty.role`、`battler.coveredBy`、`equipableBy`、`byActor` 键、
`setActorSprite.actor`、`setActorAppearance.actor`、`setParty.members`、`applyActorGrowth.actor`、
`playActorCastEffect.actor`）。`:204` 明确要求"逐项至少一个'阻止删除 + 精确定位/可跳转'测试，不能
只测一个代表来源"。每项有精确数据路径（字段族 → 作者定位），满足 GLM G1（原"9 条显式化"已升级为
typed 17 变体显式化）。

**标准 2 — worlds party/reserve 独立阻塞测试 ✓**：
`:188-190` 定义 `worlds[].party[].template` 与 `worlds[].reserve[].template` 为"条件性只读阻塞位置"，
不计入 15/18 作者口径但存在时必须阻塞；`:205` 要求"存在 worlds 时再分别覆盖 party/reserve template
两个条件位置"。两个位置有独立测试设计，不得静默改存档。

**标准 3 — levelUp 伴随数据 5 项独立测试 ✓**：
`:185-187` 定义 levelUp 为 Actor 自有伴随数据（非外部引用 → 不阻塞删除），语义为"创建缺省无行 /
复制深拷贝 / 删除同事务清键 / undo-redo 对称"。`:206-207` 要求"创建缺省、复制深拷贝、删除联动清理
以及四者的 undo/redo/事务失败回滚**单独测试**；不得用'引用阻塞'掩盖伴随数据所有权"。五项测试
（创建/复制/删除/undo-redo/事务失败）全部显式要求，且与外部引用阻塞测试分离。
本人核实 `validate-refs.ts:1344-1353` 现有 levelUp 校验只查 `skillId` 不查 actor 键——确认 levelUp
键当前无 actor 校验，伴随数据所有权测试是新增覆盖。

**标准 4 — typed 共享定义 + seedStats 不重复报错 ✓**：
`:208` 要求"删除 guard 与加载/保存诊断共用同一份 typed Actor 引用定义"。`:209-210` 区分 error 级
（`setParty.members`/`setActorSprite.actor`/`setActorAppearance.actor` 等运行时直接目标）与 warn 级
（`learnedSkills`/`seedStats`/悬空 `levelUp` 键运行时为死数据）。`:211-212` 明确"seedStats 已有 editor
project-level 默认/入口点校验，实现时不得重复产生两条同位置问题"——收敛到共享 typed 定义、不复
制诊断。本人核实 `project-diagnostics.ts:169` 存在 `validateSeedStats` 函数定义，Codex/Kimi 均一手
确认两级调用点（默认世界 + entry point）。

**总结**：15 字段族 / 18 变体（17 外部阻塞 + 1 levelUp 伴随 + 2 条件 worlds 位置）的测试矩阵覆盖
完整、口径清晰、显式且可执行。原 GLM G1（9 条显式化）已被 typed 17 变体闭包取代并超出原要求。
K1-K3 + G1 全部在 typed ownership 分类中落实。

Evidence: 验收条件 `:165-212` 逐项 / `validate-refs.ts:1344-1353`（levelUp 只查 skillId 不查
actor 键）/ `project-diagnostics.ts:169`（validateSeedStats 存在）/ Kimi typed ownership
supplemental 四项核准。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

**design 三签恢复，可进入 build。**

#### GLM 独立反证审查（2026-08-14，本人；非代理）

**标准 1 — PAL census 独立复算 ✓（核心事实精确吻合）：**

| 指标 | 卡文 | 本人复算 | 核对 |
|---|---|---|---|
| actors | 6 | 6 | ✓ |
| 总实体 | 5,077 | 5,077 | ✓ |
| actor 实体 | 0 | 0 | ✓ |
| sprite 实体 | 3,695 | 3,695 | ✓ |
| zone 实体 | 1,382 | 1,382 | ✓ |
| 对话 cue 总数 | 6,018 | 5,995 | ≈（-23，扫描范围差异：本人只扫 scenes；卡文可能含 chunk/hook）|
| 有 speaker | 4,132 | 4,129 | ≈（-3）|
| 有 portrait | 2,530 | 2,529 | ≈（-1）|
| 两者 | 2,389 | 2,389 | ✓ 精确 |
| unique speakers | 317 | 314 | ≈（-3）|

**口径判断**：差异（-23 cues / -3 speakers）在扫描方法范围内，不影响结论。核心事实（**actor 实体
= 0**、全 sprite/zone、speaker/portrait 多对多不可自动归并）精确支持「首切片不做 PAL 迁移」的拆卡
判断——PAL 当前没有任何 actor 实体，不能靠改 projects/pal 来"补"人物引用；首切片只在空白/新工程
提供 CRUD 工作流。

**标准 2 — Actor 引用通道穷尽性 ✓（Kimi 9 条全部核实，无遗漏第 10 条）：**

本人独立 grep `validate-refs.ts` 全文 + schema 定义，逐条核实 Kimi 枚举的 9 条通道：

| # | 通道 | validate-refs 现状 | 核实 |
|---|---|---|---|
| 1 | 场景 `{actor}` | :994-1000 有校验 | ✓ |
| 2 | `manifest.startWorld.party` | :1194-1210 有校验 | ✓ |
| 3 | `inParty.actorId`（脚本条件） | :917-924 有校验 | ✓ |
| 4 | `battler.coveredBy` | :1101-1103 有校验 | ✓ |
| 5 | `item.equipableBy` | :182 有校验 | ✓ |
| 6 | item effects `byActor` | :167-186 有校验 | ✓ |
| 7 | `setActorAppearance` 命令目标 | 脚本运行时，非内容校验 | ✓（运行时语义）|
| 8 | **`entryPoints[].startWorld.party`** | **零校验** | ✓（`character.ts:113-121` EntryPoint 含 `startWorld?`→`party:string[]`；validate-refs grep 零命中）|
| 9 | **`setParty.members`** | **零校验** | ✓（`script.ts:236` 定义 `setParty; members:string[]` 接收 actor ID；validate-refs grep 零命中）|

**通道 8 与 9 是真实漏洞**：`EntryPoint.startWorld.party` 与 `setParty.members` 都接收 actor ID
作为 party 成员，但 validate-refs 对这两条零校验。如果删除守卫也漏掉，会产生无闸悬空引用。Kimi K1
要求 build 时构建单一穷尽 collector + 每条至少一个删除阻止测试，GLM 完全认同。

本人未发现第 10 条通道。

**标准 3 — 测试矩阵覆盖 ✓，附必改项 G1：**

验收条件功能节覆盖：空白工程创建第一人 ✓、复制/编辑 ✓、双场景引用同一人物 ✓、解除关联原子性 ✓、
undo/redo ✓、保存重开 ✓、zone/自定义实体零回归 ✓、引用删除 fail-loud ✓。

但 `:163-164` 删除条件写"及其他现有 Actor 引用通道"过于模糊，测试节 `:175` 写 "delete/ref-block"
未显式要求**逐通道删除阻止测试**。

**必改项 G1（与 Kimi K1 互补，GLM 从测试矩阵侧要求）**：验收条件 `:163-164` 应把"及其他现有 Actor
引用通道"替换为 Kimi 枚举的 9 条通道显式列表；测试矩阵应要求**每条通道至少一个「删除被阻止 + 可跳转
引用清单」测试**。其中通道 8/9（entryPoints startWorld.party / setParty.members）当前 validate-refs
零校验，build 时应顺带补 error 级加载期校验或在卡内显式记录已知缺口及理由。这与 K1 的穷尽 collector
是同一件事的测试侧与架构侧。

**premise verified — 四项独立核实：**
1. 原版 `EventObject`（`pal-extract/io/sss.ts:45-63`）确无 name/portrait/identity 字段——不能自动
   推出 NPC 人物预制。
2. 二阶段 `ActorDef`（`actor.ts:101-137`）含 id/name/spriteId/portraits/battler；`EntityBase`
   （`index.ts:68-90`）独占 pos/pages/hostile——linked/instance 边界存在但缺 CRUD 闭环。
3. PAL 迁移只为 6 SourceRole 建 Actor，场景实体全 sprite（`migrate-content.ts:2628-2640`）——首切片
   不碰 PAL。
4. 范围拆卡正确：对话 schema successor + PAL NPC 归档另卡，首切片只做 CRUD + 双轨放置 + 解除关联 +
   引用保护。

**design agree — 方向正确：**
复用现有判别联合、不引入行为继承/隐藏 override/第二 registry、undoable transaction、解除关联是纯数据
转换。Kimi K1-K3 全部认同；G1 补测试矩阵侧引用通道显式化。

**可证伪观察**：
① 若 build 发现 actor 实体运行时消费 ActorDef 的 pages/hostile/pos（行为继承已存在），前提被推翻——
  本人核 `main.ts:1121-1125` + `resolveEntitySpriteId` 仅消费 spriteId，不成立；
② 若发现 K1 清单之外的第 10 条 Actor 引用通道且守卫漏掉，产生悬空引用——缓解为 K1 穷尽 collector +
  加载期校验兜底；
③ 若 build 必须改 `CharacterInstance.template` 或 contentVersion/save 字段，存档兼容破坏——本签字
  作废转 counter。

Evidence: `actors.json`=6 / scenes entities=5077=0/3695/1382 / `character.ts:113-121`(EntryPoint含
startWorld.party) / `script.ts:236`(setParty.members:string[]) / `validate-refs.ts` grep 通道 8/9
零命中 / `actor.ts:101-137` / `index.ts:61-107` / `main.ts:1121-1125` / `migrate-content.ts:2628-2640`。
只读审查，未改实现文件，未代签 Kimi，未标 build/done。

#### Kimi supplemental 复核（2026-08-14，本人；非代理）——**counter：12 条仍未穷尽**

**方法**：一手重读 `script.ts` 全 Command/Condition 联合、`enemy-script.ts`、`character.ts`
StartWorld/EntryPoint、`validate-refs.ts` 全文 grep，独立重扫 ActorDef.id 出现点，验证 12 条清单。

**已确认属实的部分：**

- 三条新增通道存在：`setActorSprite.actor`（`script.ts:147`）、`setActorAppearance.actor`
  （`script.ts:150-156`）、`applyActorGrowth.actor` / `playActorCastEffect.actor`
  （`enemy-script.ts:36-41`）。
- 四条无加载期校验通道复核成立：`entryPoints[].startWorld.party[]`（validate-refs grep
  `entryPoints` 零命中）、`setParty.members[]`（grep 零命中）、`setActorSprite.actor`（无对应
  case）；`setActorAppearance` 的 `:221/:367` 只校验 battleSprite/spriteId 资源，**`actor` 字段
  本身的存在性未校验**。

**新发现——第 13/14 条通道（本 counter 的直接证据）：**

- **`startWorld.learnedSkills` 的键**：`character.ts:84-86` 注释「key = 实例 id（…现状：实例 id
  === 模板 id）」，buildWorld 按 party 成员 id 逐键拷贝消费（`character.ts:302-303`），键即
  ActorDef.id。validate-refs :1210-1219 只校验技能 id 值，**键本身从未对 actors 校验**。
- **`startWorld.seedStats` 的键**：`character.ts:91`，buildWorld 按 party id 查表消费
  （`character.ts:293`）；validate-refs 全文零命中。
- 两条均可出现在 `manifest.startWorld` 与每个 `entryPoints[].startWorld` 两级。
- 严重度如实评估：运行时只按 party 成员 id 查表（`character.ts:293,302-303`；
  `reforge/main.ts:2409`），悬空键不会崩溃，是死数据；但 learnedSkills 键会被拷入 world 态并
  随存档长期残留，且违反本卡「删除不得留下悬空引用」的验收口径。

**已排除的非通道（一并记录，防止后续再反工）**：`learnSkill.role` / `unequip.role` 是
number（0-based 下标，`script.ts:124-125`），非 ActorDef.id，不在 id 引用守卫范围；
`enemy.ts` 无 actor 字段；validate-refs 的 `worlds`（:100）是存档形态校验，非内容通道。

**最小返工条件（counter 解除条件）：**

1. 通道清单 12→14：补 `startWorld.learnedSkills` 键、`startWorld.seedStats` 键
  （manifest 与 entryPoints 两级同构）。
2. 14 条逐通道「阻止删除 + 精确定位/可跳转」测试（沿用 K1/G1 标准）。
3. 两条键通道补加载期校验（warn 级即可——运行时为死数据不崩，但必须可见），或在卡内显式
   记录不补的理由。

**闭环判断**：单一 collector + 逐通道测试 + 无校验通道补 error/warn 校验的方案**能闭环**，
但前提清单必须是 14 条；按现 12 条清单实施会留下两条无闸死数据通道。

**可证伪观察**：若 `character.ts:84` 的「实例 id === 模板 id」约定被多实例队伍落地打破，
learnedSkills/seedStats 键不再是 ActorDef.id，届时这两条应移出删除守卫、改按实例 id 治理；
当前 1:1 约定下它们就是 Actor 引用通道。若任一方能证明这两条键在当前内容/运行路径下不可能
携带 actor id，本 counter 撤回。

Evidence: `character.ts:84-91,282,293,302-303` / `validate-refs.ts:1210-1219`（键未校验）、
grep `seedStats` 零命中 / `script.ts:124-125,147,150-156` / `enemy-script.ts:36-41` /
`reforge/main.ts:2409,3358-3359`。只读复核，未改任何文件，未代签 GLM，未标 build/done。

#### Codex 二次 supplemental 审计（2026-08-14）——从“数条目”改为 typed ownership 闭包

**新直接证据：**

- `AiCond.playerInParty.role` 明确注释为“角色模板 id”（`packages/content/src/enemy-ai.ts:31`），
  runtime 与在队玩家 `role` 比较（`:70-77,99-100`），现有 `validate-refs.ts:788-790`
  已通过 `validateBattleActor` 校验。它是之前 9/12/14 清单都漏掉的外部 Actor 引用。
- `skills.levelUp` 的键是 ActorDef.id（`packages/content/src/skill.ts:206-211`），奖励运行时按
  `levelUp[c.template]` 取该角色成长行（`packages/content/src/rewards.ts:201,219`），编辑器角色页也按
  `levelUp[actor.id]` 编辑（`packages/editor/src/ui/ActorMode.tsx:240,365,496`）。现有引用校验
  只检查行内 `skillId`（`validate-refs.ts:1344-1353`），不检查 actor 键。
- `ContentBundle.worlds` 的注释明说“可见存档/运行态；删除保护可选传入”（`validate-refs.ts:98-100`）；
  其 `party/reserve[].template` 是 ActorDef.id（`character.ts:169-173`）。它不是作者数据，因此不与
  15/18 作者闭包混数；但在存在时必须阻止删除，不能采纳“非内容通道所以忽略”。
- `seedStats` 的 actor 键在 content `validateReferences` 内确实未校验，但 editor project diagnostics
  已对默认世界和每个 entry point 调用 `validateSeedStats`（`project-diagnostics.ts:168-197,
  296-297,323-327`）。实现应收敛到共享 typed 定义，不是再复制一份诊断。

**最终分类：**

- 15 个 schema 字段族：`EntityRef.actor`、`StartWorld.party`、`StartWorld.learnedSkills` 键、
  `StartWorld.seedStats` 键、`AuthorCondition.inParty.actorId`、`AiCond.playerInParty.role`、
  `BattlerSpec.coveredBy`、`equipableBy`、`battleSprite.byActor` 键、5 个 Actor 目标命令字段、
  `skills.levelUp` 键。
- 三个 StartWorld 字段各自同时出现在 manifest 默认世界与 entry-point override，因此展开后是
  18 个作者数据定位变体。
- 17 个外部位置必须阻止删除；`levelUp[actorId]` 是人物自有伴随表，复制/删除随
  Actor 同事务联动。这个区分避免了“可战斗人物因自己的升级表而永远不能删除”的假安全。
- 若显式加载 `worlds`，再加 2 个条件性只读阻塞定位；它们不影响作者 schema 口径。

**排除项：** `learnSkill.role` / `unequip.role` 仍是数字角色槽，不是 ActorDef.id；对话
`speaker` 是 TextId，本卡不先行把它重解为 Actor；`WorldState.learnedSkills` 的键是运行时实例 id，
不单独冒充 ActorDef.id 通道。

**Codex supplemental 结论：agree，但 build 仍 blocked。** 需 Kimi 重新核验 typed ownership 与
15/18 展开口径；Kimi agree 后 GLM 再核 17 阻塞位置 + 1 伴随事务 + 2 条件存档位置
的测试矩阵。未改实现文件，未代签审查方，未标 build/done。

#### Kimi typed ownership supplemental 复核（2026-08-14，本人；非代理）——**supplemental agree**

**方法**：一手重读 `character.ts` / `skill.ts` / `rewards.ts` / `enemy-ai.ts` / `script.ts` /
`enemy-script.ts` / `validate-refs.ts` / `project-diagnostics.ts` 全部相关段，独立重扫
ActorDef.id 全部出现点。

**四项核准：**

1. **15 字段族 / 18 变体穷尽 ✓（本人未发现第 16 族）**。`playerInParty.role` 确为角色模板 id
   （`enemy-ai.ts:31` 注释 + :99-100 运行时 `p.role === cond.role`），已有
   `validate-refs.ts:788-790` validateBattleActor 校验；`levelUp` 键确为 ActorDef.id
   （`rewards.ts:219` 按 `c.template` 消费；`validate-refs.ts:1344-1353` 只查行内 skillId
   不查键）。本人独立补扫：`ScriptCondition` 联合仅 `inParty` 一条 actor 条件（`script.ts:49`）；
   `AiAction` 无 actor 字段（summon/transform 为 enemyId，`enemy-ai.ts:37-44`）；enemy hooks 仅
   `applyActorGrowth` / `playActorCastEffect`（`enemy-script.ts:36-41`）；item 仅
   `equipableBy` 与 effects `byActor`；`learnSkill.role` / `unequip.role` 为 number 下标
   （`script.ts:124-125`），排除成立；`DialogueCue.speaker` 为 TextId，属 successor 卡范围。
2. **17 外部阻塞 + 1 伴随联动 ownership 区分 ✓**。`levelUp[actorId]` 是 Actor 自有成长伴随表：
   无 actor 的 levelUp 行是死数据，若把自有伴随行当外部引用处理，可战斗人物将因自己的升级表
   永远不能删除——假安全死锁。「创建缺省无行 / 复制深拷贝到新 id / 删除同事务清键 /
   undo-redo 对称还原」的伴随语义正确，不构成自我引用死锁；`:210` 对悬空 levelUp 键保留
   warn 诊断作双保险。验收 :206-207 要求伴随四操作独立测试、不得用「引用阻塞」掩盖所有权，
   与该区分自洽。
3. **worlds party/reserve template 条件性只读阻塞 ✓**。`reserve?: CharacterInstance[]`
   （`character.ts:21-23`）与 party 的 `template` 均为 ActorDef.id（`character.ts:172`）；
   `validate-refs.ts:98-100` 注释明确 worlds 为「可见存档/运行态；删除保护可选传入」——
   不计入作者闭包、存在时必须阻塞、不得静默改存档，区分正确。
4. **seedStats 两级校验已有证据 ✓**。`project-diagnostics.ts:169-201` `validateSeedStats`
   对 actor 键 error 级校验；默认世界调用点 :298、每个 entry point 调用点 :329-331，两级
   覆盖属实。本人前一轮「seedStats 零校验」仅对 content `validateReferences` 成立，卡内更正
   属实；`:211-212` 要求收敛共享 typed 定义、不重复报同位置问题，方向正确。

**结论：supplemental agree。** 15/18 口径、ownership 区分、条件存档位置与既有校验证据均经
一手核实；build 仍须 GLM 对 17 阻塞位置 + 1 伴随事务 + 2 条件位置的测试矩阵补签后方可准入。

**可证伪观察**：① 若实现把 levelUp 当外部引用阻塞（actor 因自有成长行不可删）或当无关联数据
（删除后留悬空键且无诊断），实现 review 必须 counter；② 若发现第 16 个携带 ActorDef.id 的
schema 字段族，本签字作废转 counter。

Evidence: `enemy-ai.ts:31,37-44,99-100` / `skill.ts:206-210` / `rewards.ts:201,219` /
`validate-refs.ts:98-100,788-790,1344-1353` / `character.ts:21-23,172` /
`project-diagnostics.ts:169-201,298,329-331` / `script.ts:49,124-125,147,150-156,236` /
`enemy-script.ts:36-41`。只读复核，未改任何文件，未代签 GLM，未标 build/done。

#### Kimi 独立反证审查（2026-08-14，本人；非代理）

**方法**：一手读取任务卡全部代码锚点 + 全量 grep ActorDef 引用通道 + 检查当前工作区状态；
以「证伪首切片安全性」为目标逐项压测任务卡点名的五个问题。

**五项压力测试结论：**

1. **ActorDef 同时承担人物身份与 party template → 安全（既定模型，非新增耦合）**。
   「NPC 与可入队角色同一 ActorDef」是 2026-07-02 用户拍板（actor-model-design.md 决策表）；
   `CharacterInstance.template = ActorDef.id` 有存档兼容钉（`character.ts:172`「勿改」）。
   `setActorAppearance` 确为 party 偏置（`reforge/main.ts:3148-3151` 非队员仅 report 不生效），
   本卡明确不扩大该命令 ✓。唯一要求是 CRUD 对六主角与新建 NPC 人物施加同一套引用保护规则，
   不得隐式差别对待（已含在卡验收条件）。
2. **linked 与实例字段边界 → 成立**。`ActorDef` 无 pos/pages/hostile（`actor.ts:113-124`）；
   运行时场景 actor 实体只解算 spriteId（`main.ts:1121-1125`）。`face`/`battler` 对场景实体
   无运行消费，共享但无害。`CharacterInstance.appearance`（`character.ts:211-217`）是 party 侧
   持久覆写，与「场景实体禁止 per-instance override」不冲突——两轴各自的既有语义均不动。
3. **解除关联事务 → 可行**。`{actor}`→`{sprite}` 是纯数据判别联合转换，快照当前 spriteId、
   实例字段逐项保留；undo/redo 走既有不可变命令栈（ED-4A `AddEntityCommand` 先例）。
   验收条件已含「单一事务、转换前后运行画面相同、解除后不再跟随人物资源」。
4. **删除引用通道 → 方向正确但枚举必须显式化（K1）**。本人 grep 全仓枚举出现有 Actor 引用
   通道共 9 条：场景 `{actor}`（validate-refs :994-1000 已校验）、`manifest.startWorld.party`
   （:1194-1210 已校验）、脚本 `inParty.actorId`（:917-924 已校验）、`battler.coveredBy`
   （E18-1 已校验）、item `equipableBy`（item.ts:41）、item equip effects `byActor`
   （validate-refs :167-186 已校验）、`setActorAppearance` 目标 actor、`entryPoints[].startWorld.
   party`、`setParty.members`。**后两条当前 validate-refs 零命中（本人 grep 实证）**——既无加载期
   校验，删除守卫若漏掉即产生无闸悬空引用。卡验收条件写「及其他现有 Actor 引用通道」过于模糊。
5. **隐性 save/runtime/schema 影响 → 一处必须写明的运行时语义（K3）**。
   `resolveEntitySpriteId` 对悬空 actor 返回 `undefined` → `main.ts:1124` `if (!sid) continue`
   **静默跳过渲染**：悬空 actor 实体 = 隐形、无报错。加载期 validate-refs error（:996-1000）
   是唯一兜底闸；编辑器删除守卫是第一道闸。两闸之外的通道（K1 两条）目前无任何闸。
   save/schema：本卡不新增字段、不动 `template`、不动 contentVersion/save ✓。

**另发现（build 前置钉 K2）**：当前工作区存在未提交改动——`packages/editor/src/core/
ref-index.ts`、`world-sprite-behavior.ts`、`ui/ActorMode.tsx`、`App.tsx`、`PortraitEditor.tsx`、
`LevelingEditor.tsx`、`CasualtyEditor.tsx`、`editor-navigation.ts`、`editor.css` 及对应测试
（本人 `git status` 实证）。与任务卡 :137-138 锚点预警一致：其中 ref-index 与 ActorMode 正是
本卡删除守卫与人物库 UI 的直接落点。build 前必须收口（提交或明确隔离归属），否则本卡 diff
将与未收口改动混杂、无法独立验收。

**必改钉（K1-K3，build 必落，不阻塞设计准入）：**

- **K1（引用通道显式枚举）**：build 时删除守卫必须基于单一穷尽 collector（ED-5I
  `collectItemReferences` 先例），显式覆盖上述 9 条通道，每条至少一个「删除被阻止 + 可跳转」
  测试；其中 `entryPoints[].startWorld.party` 与 `setParty.members` 两条当前无校验的通道，
  应顺带在 validate-refs 补 error 级校验，或在卡内显式记录为已知缺口及理由。
- **K2（dirty worktree 前置收口）**：build 动手前，当前未提交的 ref-index/ActorMode/App 等
  改动必须确认 owner、测试状态并提交或隔离；本卡提交不得与之混合。若该批改动属于他人进行中
  工作，本卡 build 等待其收口。
- **K3（悬空语义写明）**：作者文档与验收条件中写明运行时对悬空 actor 引用是「静默不渲染」
  （`main.ts:1124`），因此删除守卫 + 加载期校验是仅有防线；禁止把运行时兜底当作安全网。

**可证伪观察**：① 若发现 actor 实体运行时消费 ActorDef 的 pages/hostile/pos（行为继承已存在），
前提被推翻，须重开边界设计——本人已核 `main.ts:1121-1125` 与 `resolveEntitySpriteId`，仅消费
spriteId，不成立；② 若 build 中发现必须改 `CharacterInstance.template` 或 ActorDef.id 规则，
存档兼容即破坏，本签字作废转 counter；③ 若存在 K1 清单之外的第 10 条 Actor 引用通道且守卫
漏掉，会产生悬空引用——缓解为 K1 穷尽 collector + 加载期校验兜底。

Evidence: `pal-extract/io/sss.ts:45-63` / `content/actor.ts:113-138` / `content/index.ts:61-107` /
`content/character.ts:172,211-217` / `editor/entity-placement.ts:3-55` / `reforge/main.ts:1121-1125,
3144-3191` / `migrate/migrate-content.ts:1457,2628-2640` / `validate-refs.ts:167-186,848,917-924,
994-1000,1194-1210`（grep 实证 setParty/entryPoints 零命中）/ actor-model-design.md 决策表 /
ED-4A 卡 :96-101,290-326 / `git status`（2026-08-14 未提交改动清单）。只读审查，未改任何实现
文件，未代签 GLM，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-14，自验证）**。content/editor/reforge 三包 check、C1-1 定向测试、
  项目 I/O 与功能性浏览器验收通过；实现与冻结设计一致。
- Kimi: **accept（2026-08-14，本人只读架构/事务终审 + 三包实跑，非代理）**。七检查点逐项
  一手核实：
  1. **边界 ✓**：`actor.ts`/`index.ts` EntityRef 零改动；`DetachActorEntityCommand` 仅剥离
     `actor` 键、rest 保留全部实例字段并快照当前 `spriteId`（`commands.ts` Detach 类），invert
     逐字段恢复原实体；检查器分区「预制人物（共享身份与资源）」（`App.tsx:2864`）。
  2. **原子可逆 ✓**：创建走 `CompositeCommand(UpdateLocaleCommand + AddActorCommand)`
     （`ActorMode.tsx:219-221`）；Add/Copy/Delete/Detach 均 apply/invert 成对；删除 apply 时
     重算 `blockingActorReferences`（redo 亦按当时状态重算）；`actor-commands.test.ts` 9 测
     覆盖失败无半 locale/半 levelUp、undo/redo 精确恢复。
  3. **17 外部引用 ✓**：`ACTOR_REFERENCE_POLICIES`（`actor-reference.ts:39-62`）17 external +
     1 companion + 2 runtime-readonly 与 15 族/18 变体口径一致；collector（`actor-references.ts`）
     覆盖 scenes/manifest/entryPoints/actors/items/scriptChunks/sharedScripts/enemies；
     `actor-references.test.ts:138-147` 逐项断言 17 变体均阻塞且有 locator。
  4. **levelUp companion ✓**：Copy 深拷贝、Delete 同事务清理/恢复、blocking 排除
     （`actor-references.ts:256-264` 的 companion + ownerActorId 双重排除）——无自引用死锁，
     专测（`:149-164`）证明仅剩 levelUp 时可删。
  5. **worlds party/reserve ✓**：runtime-readonly ownership、locator undefined +
     unavailableReason「只读」，阻塞但不改存档（test.each :166-180）。
  6. **UpdateActor fail-loud ✓**：`assertActorPatchCanBeApplied` 在 withActor 前 throw，
     覆盖 spriteId/portraits/face/battleSprite/coveredBy；`assertActorCanBeAdded` 同口径 + id
     冲突/空 id/悬空 sprite/locale 缺失。
  7. **零 schema/save/contentVersion/prefab 变化 ✓**：`index.ts` 仅 +1 export；`character.ts`/
     `script.ts`/`actor.ts`/migrate 零 diff；CONTENT_VERSION 未动；`projects/pal` 零改动；
     `resolveEntitySpriteId` 未动、无 prefab 实例化层。
  **本人实跑**：`pnpm --filter @type-pal/content check`（464 通过）→ `editor check`
  （100 files / 847 通过）→ `reforge check`（98 files / 1014 通过，含 loader-v5.pal 5/5），
  exit 0；`git diff --check` 无输出。
  **非阻塞记录项**（不影响本 accept）：
  - O1：content `validateReferences` 仍未诊断 `entryPoints[].startWorld.party` 与 entry-point
    learnedSkills 悬空键（seedStats 两级已由 project-diagnostics 覆盖；删除 guard 阻塞新悬空；
    buildWorld 对缺失队员 fail-loud）。建议后续小改补齐或显式记录为已知残余。
  - O2：17 变体在一个复合测试内逐项断言，而非 17 个独立用例；每变体有独立数据路径与断言，
    本人认为实质满足「逐项覆盖」，GLM 测试矩阵角度可再评。
  - O3：未提交 diff 仍混有 K2 基线文件（CasualtyEditor/ref-index/editor.css 等）与 C1-1 工作；
    同一 Coding Owner 且基线已验证，建议提交时在 commit message 区分两段工作。
  视觉证据以 Codex 已登记的 6010 验证（默认宽/900px、重载 error=0）为准，本人未重跑浏览器。
  未改任何实现文件，未代签 GLM，未标 done。
- GLM: **accept（2026-08-14，签字与七项标准证据见 Review 节「GLM done 前终审证据」；
  本行由 Kimi 按 GLM 已发表的书面签字同步，非代签）**
- counter / 返工处理: none
- 缺签豁免: N/A
- done 准入结论: **allowed（2026-08-14）——Codex/Kimi/GLM 三方 accept 齐，用户最终验收通过。**

## Draft: 设计与风险

### 设计结论

#### 三类作者对象

```text
ActorDef（共享人物身份/资源）
  ├─ name
  ├─ spriteId
  ├─ portraits
  └─ battler?（仅可入队/战斗人物）

Scene Entity（场景实例）
  ├─ actor: ActorId ───────────────┐
  │                                └─ 只解算共享身份/资源
  ├─ 或 sprite: SpriteId（自定义实体）
  ├─ 或 zone: true（触发区）
  └─ pos/facing/collide/hidden/zBias/pages/hostile（永远实例所有）
```

#### 共享规则

- linked：Actor 的 name、spriteId、portraits、face、battler。
- instance-owned：EntityBase 的全部字段与行为结构。
- no override：actor 实体不允许在同一记录里再藏 `nameOverride`、`portraitOverride`、`spriteOverride`。
- specialize：需要不同外观时先“解除人物关联”转成 sprite 实体；需要另一个稳定人物时复制/新建 Actor。
- runtime：继续通过 `resolveEntitySpriteId` 解算，无新的 prefab 实例化层。
- save：scene runtime 仍以 sceneId/entityId 记录；party 仍以 CharacterInstance.template 引 ActorDef，不改字段。

#### 分阶段交付

1. **C1-1（本卡）**：Actor CRUD 七环、双轨放置、解除关联、引用保护、功能性视觉验收。
2. **人物对话 successor（另卡）**：定义 person/narration/free-label 说话人联合、Actor expression 选择、
   legacy cue 迁移与兼容退役计划。
3. **PAL NPC 归档 successor（另卡）**：人物 canonical 表、speaker aliases、portrait ownership、scene entity
   locator 清单；先审计后分批 migration successor，二次零计划。

### 已知风险

- 风险：ActorDef 同时承担“人物身份”和“party template”，现有 `setActorAppearance` 仍只认队伍成员。
  - 缓解：首切片不扩大脚本命令语义；Kimi 必须审查 Actor 统一命名是否会误导未来 API。必要时文档称
    “人物预制”，但不新增第二 registry。
- 风险：当前 ref-index/角色页有未收口改动，人物删除引用图可能与其重叠。
  - 缓解：build 前先审 dirty worktree 所有权与状态；沿既有 typed reference index 扩展，不覆盖用户改动。
- 风险：一个角色换默认 sprite 会改变所有 actor 实例的外观，这是 linked 设计的预期，但可能误操作。
  - 缓解：保存前显示“影响 N 个场景实例”；提供引用定位与解除关联，而不是隐式 per-instance override。
- 风险：复制 Actor 时 locale、portrait、battler 的深拷贝/新 id 不原子。
  - 缓解：单一 immutable editor transaction；任一步失败整体不提交；undo/redo 和保存重开测试。
- 风险：未来对话人物绑定误把旁白/泛称强制为 Actor。
  - 缓解：successor 必须使用显式 union，保留非人物通道；本卡不提前改 schema。
- 风险：PAL 自动归并造成错误人物身份。
  - 缓解：单独 provenance/curation 卡；原始 EventObject、speaker、portrait 多维证据逐条审计，禁止猜测。

### 主审立场

- Reviewer: Kimi（架构/schema/编辑器边界主审）；GLM 独立核数据口径、引用覆盖和测试矩阵。
- 结论: **Codex/Kimi/GLM supplemental design agree 已齐；原 9/12/14 条数口径均被反证，最终闭包为
  15 字段族 / 18 作者定位变体（17 外部阻塞 + 1 伴随数据），另有 2 个 worlds 条件性只读位置。**
- 必改项: K1/G1 改为 typed Actor reference/ownership collector；17 个外部位置逐项删除阻止/精确定位
  测试；`levelUp` 复制/删除联动事务测试；显式 worlds 的 party/reserve 条件测试；校验缺口补齐
  但不重复现有 project-level seedStats 诊断；K2 已收口；K3 悬空 actor 静默不渲染语义须写入文档。
- 是否建议进入 build: **yes；2026-08-14 三方 supplemental 设计签字齐后已进入并完成 build，现转 review。**

### 三方争议记录

- Codex: 建议复用现有 ActorDef 作为人物预制；首切片不新增 schema，不做完整 EntityPrefab；对话与 PAL
  迁移拆卡。
- Kimi: 无方向性争议。复用 ActorDef 是 2026-07-02 既定拍板模型；五项压力测试结论见「Kimi 独立
  反证审查」，附 K1-K3 必落钉；typed ownership supplemental 已签 agree，原 counter 解除。
- GLM: 原 design agree；“未发现第 10 条”已被后续直接证据推翻，等待 15/18 typed 闭包
  supplemental 补签；现已签 supplemental agree，测试矩阵通过准入。
- 用户拍板: 2026-08-14 已拍板“预制人物 + 自定义实体并存”；三签齐后授权继续实现，未绕过门禁。

## 额度 / 代班记录

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（三方 supplemental design agree 已齐，2026-08-14 进入 build）
- 修改文件:
  - typed 引用真值：`packages/content/src/actor-reference.ts`、`packages/content/src/index.ts`、
    `packages/content/src/validate-refs.ts`；
  - 编辑器核心：`packages/editor/src/core/actor-references.ts`、`commands.ts`、
    `entity-placement.ts`、`project-diagnostics.ts`；
  - 编辑器界面：`packages/editor/src/ui/ActorMode.tsx`、`App.tsx`、`editor.css`；
  - 测试：`actor-references.test.ts`、`actor-commands.test.ts`、`project-io.test.ts`、
    `ActorMode.test.tsx`、`validate-refs.test.ts` 及既有回归；
  - 文档：`docs/phase2/guides/actor-presets.md`、本卡、C1-2/C1-3 successor 卡、看板。
- 实现摘要:
  - 新增 Actor 创建、复制、删除命令；创建时 locale + Actor 原子提交，复制深拷贝 Actor 与
    `levelUp`，删除同事务清理/恢复 `levelUp`；失败不留半状态；
  - 建立共享 typed Actor 引用 policy 与编辑器 collector，17 个作者外部位置全部硬阻塞删除并提供
    精确数据路径/作者对象跳转；`levelUp` 为 companion；world party/reserve 为只读阻塞；
  - 补齐脚本/敌人 tagged Actor 悬空诊断、learnedSkills/levelUp warn，并复用现有 seedStats
    project-level 诊断，未新增同位置重复问题；
  - 场景添加面板明确分为“预制人物 / 自定义实体 / 触发区”；Actor 实例检查器说明共享/实例边界，
    可用单一 undo/redo 命令解除关联并保留当前 sprite 与全部实例字段；
  - 人物工作区支持空库创建、复制、删除、显示名称/默认精灵编辑、引用清单与跳转；复制来源在打开
    草稿时冻结，避免切换选择后复制错人物；
  - 不新增 schema、save 字段、contentVersion、prefab 继承层或 PAL 数据迁移。
- 运行命令:
  - `pnpm --filter @type-pal/content check` → 39 files / 464 tests passed；
  - `pnpm --filter @type-pal/editor check` → 100 files / 847 tests passed；
  - `pnpm --filter @type-pal/reforge check` → 98 files / 1014 tests passed；
  - 定向 `ActorMode + CasualtyEditor + actor-commands` → 3 files / 23 tests passed；
  - `git diff --check` → 无输出。
- 浏览器 / 手工检查:
  - PAL 人物总览、四分区、引用清单与检查器正常；空白工程经 UI 创建临时 NPC 后单次 undo 清除；
  - s004 场景三条创建路径均可见；临时放置 Actor 实例后检查器显示共享边界，解除关联后变 sprite，
    undo 恢复关联，再 undo 删除临时实体；未点击保存，重载后无工程数据残留；
  - 900px 视口 body `clientWidth=scrollWidth=900`、tabbar `clientWidth=scrollWidth=260`，四标签
    `white-space: nowrap`，身份字段无横向溢出；最后一次完整重载后 error 日志 0。
- 跳过的检查及原因: 无；剧情/演出 E2E 不属于本卡，后续 C1-2/C1-3 另行登记。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: 6010 空白工程 + PAL 工程最小功能验证；浏览器截图和 console 证据写回本卡。
- 集中 E2E 用例 / 批次: N/A（本卡不是剧情/演出观感卡）
- 截图 / 像素检查路径: Codex in-app browser 本任务内即时截图（未写入仓库；避免把临时 UI 证据作为产品资产）。
- 结论: **pass**。默认宽与 900px 窄宽均无白屏/整页横向溢出；人物分区、三种放置入口和解除关联可达。
- 未完成项: none。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论:
  - Codex: **accept（2026-08-14，自验证）**。三包 check、功能浏览器与任务验收矩阵均通过；未发现
    schema/save/runtime 行为扩张。
  - Kimi: **accept（2026-08-14，架构/事务终审 + 三包实跑）**。七检查点逐项通过（边界/原子可逆/
    17 引用闭包/levelUp 伴随/worlds 只读阻塞/UpdateActor fail-loud/零 schema 漂移），详见 done 前
    签字区；附 O1-O3 非阻塞记录项。
  - GLM: **accept（2026-08-14，本人覆盖/数据/测试矩阵终审，非代理）**。七项标准逐项通过
    （见下方「GLM done 前终审证据」）。17 外部位置逐项有阻止/路径/跳转测试；levelUp 伴随五
    操作独立测试；worlds 两条件位置分测；dangling severity 合理 + seedStats 诊断无重复；
    空库 CRUD/detach/保存重开闭合；三路径 UI 有核心逻辑测试 + 浏览器功能验证；C1-2/C1-3
    均为 draft、无 schema 漂移。附 1 条非阻塞观察（放置面板三路径 UI 自动化）。
- 必须返工项: none
- Accept / rework: **accept（Codex/Kimi/GLM 三方齐，用户最终验收通过，2026-08-14）。**

## 用户验收

- 用户结论: **通过（2026-08-14）**。原文：`C1-1：通过`。
- 后续任务: `C1-2` 人物对话身份 successor；`C1-3` PAL NPC 人工归档/迁移 successor；两卡均保持
  draft/blocked，不随本卡自动进入 build。

### GLM done 前终审证据（2026-08-14，本人；非代理）

**七项标准逐项核实通过：**

**标准 1 — 17 外部引用定位变体全覆盖 ✓**：
`actor-references.test.ts:108-117` `EXTERNAL_KINDS` 数组逐项列出全部 17 变体；测试
`17 个作者外部定位变体逐项进入删除门禁并都有可跳转 locator` 对每条断言 `found.isDefined()` +
`found.where` truthy（精确数据路径）+ `found.locator` defined（可跳转作者对象）。
`actor-reference.ts:41-58` `ACTOR_REFERENCE_POLICIES` 定义 17 外部位置 + levelUp 伴随 + 2 worlds
只读，每条带 ownership + danglingSeverity + label。

**标准 2 — levelUp 伴随五操作独立测试 ✓**：
`actor-commands.test.ts`:
- 创建缺省无 levelUp：`:74` `expect(levelUp.hero).toBeUndefined()`
- 复制深拷贝（非引用共享）：`:115-118` `.toEqual([...]) + .not.toBe(reference) + 改源不影响副本`
- 删除联动清理：`:152` `expect(levelUp.hero).toBeUndefined()`
- undo/redo 对称：`:153-156` undo 恢复 + redo 重删
- 事务失败无半状态：`:126-140` 复制失败 → `levelUp['hero-copy']` undefined
`actor-references.test.ts:149-167` 独立验证"levelUp 是伴随而非外部阻塞"——移除全部外部引用后
`blockingActorReferences` 返回空数组（levelUp 不阻塞删除）。UI 层 `ActorMode.test.tsx:270`
"复制人物会复制 levelUp，删除无引用副本会联动清理"。

**标准 3 — worlds party/reserve 两条件位置分测 ✓**：
`actor-references.test.ts:167-181` `test.each` 覆盖 `world-party-template` 与
`world-reserve-template`，各注入 worlds 数据、验证 `locator: undefined`（只读无跳转）+
`unavailableReason` 含"只读"。

**标准 4 — dangling severity + seedStats 无重复 ✓**：
`actor-reference.ts:41-61` severity 分层合理：运行时直接目标（party/condition/command/enemy
编排/worlds template/scene actor/battleSprite byActor/coveredBy/seedStats）= `error`；
死数据（learnedSkills/equipableBy/levelUp）= `warn`。
`project-diagnostics.ts:170` `validateSeedStats` 定义存在，调用点 `:302`（默认世界）+ `:335`
（entry point）两级。`actor-references.ts:90-91` 引用 seedStats 键用于删除 collector（guard），
与 validateSeedStats 诊断通道分离——不产生同位置重复问题。

**标准 5 — 空库 CRUD/detach/保存重开闭合 ✓**：
`actor-commands.test.ts`:
- 空白工程创建第一人 + locale 单事务 + undo/redo：`:65-78`
- 复制深拷贝 + undo/redo：`:102-123`
- 事务失败无半状态：`:126-140`
- 删除清理 levelUp + undo/redo：`:145-156`
- detach 保留实例字段 + undo/redo：`:170-202` `expect(detached).toEqual(originalEntity)`
`ActorMode.test.tsx:236` 空人物库创建 + undo 移除；`:297` 被引用时显示引用清单并拒绝删除。
`project-io.test.ts:301` 保存重开诊断 sidecar 验证（C8 路径覆盖 actor serialization round-trip）。

**标准 6 — 三路径 + 窄宽 UI ✓（附非阻塞观察）**：
`ActorMode.test.tsx` 9 个 UI 测试覆盖：空库创建、引用阻塞、字段区域渲染、伤亡编辑器集成、
复制/删除联动。`entity-placement.test.ts` 覆盖 actor/sprite/zone 三路径核心逻辑。
构建记录 `:755-760` 浏览器验证：s004 三条创建路径可见 + 900px 窄宽无溢出（`clientWidth=
scrollWidth=900`）+ error=0。
**非阻塞观察**：放置面板三条路径（预制人物/自定义实体/触发区）的 **UI 自动化测试** 不在
ActorMode.test.tsx 中，仅由 entity-placement.test.ts 核心逻辑 + 浏览器手工验证覆盖。鉴于
放置逻辑已单测 + 功能验证已过，不阻塞 done。

**标准 7 — C1-2/C1-3 draft + 无 schema 漂移 ✓**：
C1-2 `Status: draft`、C1-3 `Status: draft`——均为 successor 卡，不随本卡 build。
`CONTENT_VERSION = 13`（未改）。validate-refs 对话 speaker 仍 TextId（未偷改成 Actor）。
未触碰 PAL migration、DialogueCue schema、save 字段。

**门禁数字复跑（本人实跑 editor check）**：
`pnpm --filter @type-pal/editor check` → **100 files / 847 tests passed**。

**GLM 非阻塞观察（不阻塞 done）**：
放置面板三路径的 UI 自动化覆盖偏薄（核心逻辑有单测、UI 交互仅浏览器手工验证）。后续可在
App.test.tsx 补一条"三路径放置面板同时可见且可选择"的 DOM 断言。不影响本卡功能正确性。

Evidence: `actor-reference.ts:30-61` / `actor-references.test.ts:108-181` /
`actor-commands.test.ts:65-202` / `ActorMode.test.tsx:236-318` / `project-diagnostics.ts:170,302,335` /
`entity-placement.test.ts` / `project-io.test.ts:301` / C1-2/C1-3 draft / CONTENT_VERSION=13 /
editor check 100/847 passed。只读终审，未改实现文件，未代签 Kimi，未标 done。

## 交接日志（追加）

- 2026-08-14 User: 拍板预制人物与场景零件拼装双轨并存，要求开始推进。Evidence: 当前会话。
  Next: Codex 开设计卡，三方设计签字前不得实现。
- 2026-08-14 Codex: 完成现状/primary source/PAL census，冻结 C1-1 首切片；Codex premise verified +
  design agree。Evidence: 本卡真值矩阵与 PAL 数据基线。Next: Kimi 独立架构反证与设计签字。
- 2026-08-14 Kimi: 签 premise verified + design agree（附必落钉 K1-K3）。五项压力测试：ActorDef
  双重身份系 2026-07-02 既定拍板、linked/实例边界成立、解除关联可行、隐性 save/schema 影响无；
  关键发现两条当前无校验的 Actor 引用通道（`entryPoints[].startWorld.party`、`setParty.members`，
  grep 实证 validate-refs 零命中）与 dirty worktree 未收口改动（ref-index/ActorMode/App 等，正是
  本卡落点）。Next: GLM 独立核数据口径/引用覆盖/测试矩阵并签 premise/design；K2 收口前不得 build。
- 2026-08-14 GLM: 签 premise verified + design agree（附 G1），独立复算 PAL 核心 census，并核原 9 条
  引用清单。Evidence: 本卡「GLM 独立反证审查」。Next: Codex 收口 K2 后 build。
- 2026-08-14 Codex: K2 收口为同会话同 Coding Owner 的已验证基线，不覆盖/回滚既有角色页修复；
  `@type-pal/editor typecheck` 通过，定向 5 files / 49 tests 通过，全 editor 98 files / 830 tests 通过。
  随后 supplemental schema audit 发现 `setActorSprite.actor` 与两种 battle choreography actor 共 3 条
  漏项，引用总通道更正为 12；按前提真值门恢复 blocked，等待 Kimi/GLM 窄补审。
- 2026-08-14 Kimi: supplemental 复核签 **counter**——Codex 新增 3 条与四条无校验通道均核实成立，
  但 12 条仍未穷尽：`startWorld.learnedSkills` 键与 `startWorld.seedStats` 键均为 actor id
  （`character.ts:84-91,293,302-303`）且当前零校验，是第 13/14 条。最小返工：清单 12→14 +
  逐通道测试 + 两条键通道补 warn 级校验或显式记录。Next: Codex 更新清单与验收口径后 Kimi 核 diff
  转 agree；GLM 同范围补签。
- 2026-08-14 Codex: 没有直接把 12 改成 14，而是重新扫描 schema/runtime/validator 三个边界；
  又发现 `AiCond.playerInParty.role` 外部引用与 `skills.levelUp[actorId]` 人物自有伴随表。
  验收改为 15 字段族 / 18 作者定位变体：17 外部删除阻塞 + 1 levelUp 联动事务；
  显式 worlds 另有 party/reserve 两条件只读阻塞。Evidence: 本卡「Codex 二次 supplemental
  审计」。Next: Kimi 先核 typed ownership 与展开口径，agree 后 GLM 核测试矩阵；两方补签前不实现。
- 2026-08-14 Kimi: typed ownership supplemental 复核签 **agree**——15 族/18 变体穷尽
  （补扫 Condition/AiAction/hooks/item 无遗漏）、17 阻塞 + 1 伴随不死锁、worlds 两条件位置、
  seedStats 两级校验证据四项一手核准，未发现第 16 族；原 counter 解除。Next: GLM 对 17 阻塞
  位置 + 1 伴随事务 + 2 条件存档位置的测试矩阵补签；两方补签前不得实现。
- 2026-08-14 GLM: 测试矩阵 supplemental 复核签 **agree**——17 外部定位逐项删除阻塞/
  精确定位，levelUp 伴随五测，worlds party/reserve 两条件测，typed 共享与 seedStats
  不重复四项均可执行。明确结论“design 三签恢复，可进入 build”。Next: Codex 进入 build。
- 2026-08-14 Codex: 完成 C1-1 build 与自验证；共享 typed 引用真值、Actor CRUD/levelUp 事务、双轨放置、
  detach、引用跳转、诊断、I/O 与作者文档已落。三包 check 共 2325 项测试通过；6010 默认宽/900px
  功能视觉通过，最后一次重载后 error=0。Status 转 review。Next: Kimi/GLM 只读审查并分别签 accept/counter，
  未齐签前不得标 done 或把 capability-map C1 改为 ✅。
- **2026-08-14 GLM（本人 done 前覆盖/数据/测试矩阵终审）：签 accept。** 七项标准逐项通过：
  17 外部位置逐项阻止/路径/跳转测试（actor-references.test.ts:108-117）；levelUp 伴随五操作独立
  测试（actor-commands.test.ts:65-202）；worlds party/reserve 两条件分测（:167-181）；dangling
  severity 合理 + seedStats 诊断无重复（actor-reference.ts:41-61 + project-diagnostics.ts:170,302,335）；
  空库 CRUD/detach/保存重开闭合；三路径 UI 有核心逻辑测试 + 浏览器功能验证；C1-2/C1-3 draft +
  CONTENT_VERSION=13 无 schema 漂移。editor check 100/847 实跑通过。非阻塞观察：放置面板三路径
  UI 自动化偏薄（核心逻辑有单测 + 手工验证已过）。Next: 等 Kimi accept + 用户验收后可标 done。
- **2026-08-14 Kimi（本人 done 前架构/事务终审）：签 accept。** 七检查点逐项一手核实（边界零漂移、
  Add/Copy/Delete/Detach 原子可逆、17 外部引用闭包完整、levelUp 伴随不死锁、worlds 只读阻塞、
  UpdateActor 引用 fail-loud、零 schema/save/contentVersion/prefab 变化）；本人实跑三包 check
  content 464 / editor 847 / reforge 1014 全绿 + `git diff --check` 通过。附 O1-O3 非阻塞记录项
  （entry-point party/learned 诊断残余、17 变体复合测试形态、K2 基线与 C1-1 提交分界）。三方
  accept 齐，done 准入仅待用户最终验收。Next: 用户验收后标 done 并按卡更新 capability-map C1；
  C1-2/C1-3 保持 draft，不随本卡进入 build。GLM done 前签字行由 Kimi 按其 Review 节书面签字同步，
  非代签。
- **2026-08-14 User：C1-1 最终验收通过。** 原文 `C1-1：通过`。随后按用户截图反馈把左栏裸计数
  `6` 调整为低对比度 `6 位` 标签，并增加标题/计数/操作组间距；editor typecheck、ActorMode 8 测、
  900px 浏览器无横向溢出与 recent error=0 复验通过。任务转 done，能力地图 C1 更新为 ✅。

## 下一位 Agent 提示词

无下一位 Agent 提示词；C1-1 已完成三方审查与用户验收。以下提示词仅保留为已执行审查记录。

### 给 Kimi（已于 2026-08-14 执行完毕，签 accept——保留备查，勿再执行）

请审查 `docs/ops/archive/tasks/done/C1-1-actor-preset-dual-authoring.md`，当前 Status=review，你是架构/事务主审。
先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、
`docs/phase2/guides/actor-presets.md` 与任务卡上下文锚点；重点只读检查：ActorDef/Entity 实例边界未漂移、
Add/Copy/Delete/Detach 原子 undo/redo、17 类外部引用不能伪造/漏阻塞、levelUp companion 不死锁、
worlds 只读、UpdateActor 新引用 fail-loud、无 schema/save/contentVersion 变化。验证证据为 content 464、
editor 847、reforge 1014 全绿及卡内浏览器记录。请输出明确 `accept`，或 `counter` + 可执行返工项；
不得改实现文件、不得代签 GLM、不得标 done。

### 给 GLM（已于 2026-08-14 执行完毕，签 accept——保留备查，勿再执行）

请审查 `docs/ops/archive/tasks/done/C1-1-actor-preset-dual-authoring.md`，当前 Status=review，你是覆盖/数据/测试主审。
先读 `AGENTS.md`、`docs/phase2/READ-FIRST.md`、`docs/phase2/guides/actor-presets.md` 与任务卡；逐项核
17 个作者外部定位变体、1 个 levelUp companion、2 个 worlds 条件位置，确认删除门禁、locator、
诊断 severity/去重、创建/复制/删除/事务失败/undo-redo、双场景 I/O、三种放置与窄宽 UI 测试没有以
代表项替代完整矩阵；再核 C1-2/C1-3 只建 draft 卡、没有偷改 schema/migration。请输出明确 `accept`，
或 `counter` + 缺失用例/数据路径；不得改实现文件、不得代签 Kimi、不得标 done。

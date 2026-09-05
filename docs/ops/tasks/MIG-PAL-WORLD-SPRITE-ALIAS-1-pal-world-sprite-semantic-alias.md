# MIG-PAL-WORLD-SPRITE-ALIAS-1 PAL 大世界角色精灵语义别名收口

> **状态**：done（2026-08-24 Codex / Kimi / GLM accept 齐，用户确认收口）
> **负责人**：Codex（Coding Owner，已完成）
> **参与审查**：Kimi（迁移规则 / schema）、GLM（7 场景与生成覆盖）
> **能力格**：C2 内容迁移 / MG2 生成一致性
> **风险级别**：高（asset pipeline / migration / generated project）

## 目标

将 PAL 当前重复的 `sprite-2` 大世界精灵定义归一到已有语义 ID `li-xiaoyao`，同步迁移 7 个场景引用，并修复迁移 / 生成逻辑，使下一次完整迁移不会再次生成 `sprite-2`。

归一规则不得写成“编号 2 永远等于李逍遥”的裸硬编码；只有当原始精灵号已存在稳定视觉定义，且资源与布局合同严格等价时，场景引用才可复用该视觉 ID。非等价布局必须保留显式变体或失败并要求建模，不能静默吞并。

本卡中的 `SpriteDef` 是可复用的视觉定义，不是实体身份：`entity.actor = li-xiaoyao` 才表示实体身份为李逍遥；`entity.sprite = li-xiaoyao` 只表示使用这套大世界外观。NPC、替身或纯场景对象可以复用该视觉定义，任何代码均不得据 `SpriteDef.id` 反推实体身份。

## 用户可见行为 / 工程前提

当前同一份大世界资源与四向布局同时以 `li-xiaoyao` 和 `sprite-2` 出现在精灵库，导致两个内容相同、名称不同的“四向”用途；目标是只显示和引用语义明确的 `li-xiaoyao`，同时保持 7 个场景画面与行为不变。

### before -> after

- **before**：精灵库存在 `li-xiaoyao` 与 `sprite-2` 两个相同资源 / 相同布局用途定义，7 个场景引用 `sprite-2`。
- **after**：严格等价的 7 个场景统一引用 `li-xiaoyao`；完整迁移和二次迁移均不再产生 `sprite-2`，画面、帧布局与行为不变。

用户已明确要求同步 7 个场景并修改生成逻辑。2026-08-24 用户进一步拍板：采用“`SpriteDef` 表示可复用视觉定义、实体身份只由 `actor` 决定”的语义，允许非 Actor 实体引用 `li-xiaoyao` 外观，以消除完全重复的 `sprite-2` 定义。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 原版场景实体通过数值 sprite 编号引用精灵；角色表同样提供角色大世界 sprite 编号，编号本身不携带二阶段语义 ID | `packages/pal-extract/src/io/sss.ts:45`；`packages/pal-extract/src/resources/parsers/player-roles.ts:64`；`packages/pal-extract/src/resources/tables.test.ts:690`；7 个 extracted scene 锚点见下 | verified |
| 第一阶段 | 一阶段按原始 sprite number 解析、加载与呈现资源，不存在 `sprite-2` / `li-xiaoyao` 双语义 ID；相同编号应呈现相同资源 | `packages/game/src/core/game-state.ts:1785`、`:1988`；`packages/game/src/present/present.ts:440`、`:536` | verified |
| 当前二阶段 | 角色迁移已为李逍遥建立 `li-xiaoyao`；场景迁移仍用 `sprite-${number}` 注册并引用，因此同资源 / 同布局又生成 `sprite-2`；脚本 resolver 已优先角色语义 ID，但场景实体路径未统一 | `packages/migrate/src/migrate-content.ts:339`、`:1846`、`:2288`、`:2399`、`:2411`、`:2642`；`projects/pal/content/sprites.json:3`、`:1074` | verified |
| 本任务目标 | 只在“既有视觉定义存在 + 资源等价 + 布局等价”时把场景精灵号归一为稳定视觉 ID；实体身份继续只由 `actor` 表达；7 个已识别引用须迁移且生成幂等 | `packages/content/src/index.ts:61-68`；`packages/content/src/sprite.ts:62-73`；本卡用户裁决与验收标准 | verified；三方已按新前提重签 |

### 最强替代解释

`li-xiaoyao` 这一视觉 ID 的人读名称可能让作者误以为引用它就获得李逍遥身份。当前 schema 已通过 `EntityRef` 的 `actor | sprite | zone` 三选一把身份来源与纯视觉来源分开；若编辑器、迁移器、运行时或脚本仍按 `SpriteDef.id` 判断角色身份，则本次归一会暴露模型越界，必须修调用方或重新命名视觉定义，而不能靠重复定义掩盖。

### 什么观察会推翻当前前提

- `sprite-2` 与 `li-xiaoyao` 的用途布局、每向帧数、帧映射或资源哈希并非严格相等；
- 任一调用方通过 `SpriteDef.id` 推断 / 赋予 Actor 身份，或归一后把 `{ sprite: 'li-xiaoyao' }` 改写为 `{ actor: 'li-xiaoyao' }`；
- 归一后代表场景的可见外观、朝向、动画、碰撞或脚本行为发生变化。

出现任一观察，本卡转 `blocked/rework`，不得继续机械替换。

## 当前重复定义与 7 个引用

### 定义

- 语义定义：`projects/pal/content/sprites.json:3`，`id = li-xiaoyao`，资源 `sprite.pal.002`，四向每向 3 帧。
- 重复定义：`projects/pal/content/sprites.json:1074`，`id = sprite-2`，当前资源 / 布局与上者相同。

### 当前 PAL 场景引用

1. `projects/pal/content/scenes/s020.json:667`
2. `projects/pal/content/scenes/s172.json:181`
3. `projects/pal/content/scenes/s196.json:39`
4. `projects/pal/content/scenes/s198.json:20`
5. `projects/pal/content/scenes/s203.json:3417`
6. `projects/pal/content/scenes/s233.json:142`
7. `projects/pal/content/scenes/s281.json:1394`

### 对应 extracted primary data

1. `data/extracted/data/scene/20.json:59`
2. `data/extracted/data/scene/172.json:77`
3. `data/extracted/data/scene/196.json:41`
4. `data/extracted/data/scene/198.json:7`
5. `data/extracted/data/scene/203.json:392`
6. `data/extracted/data/scene/233.json:76`
7. `data/extracted/data/scene/281.json:201`

## 上下文锚点

- `AGENTS.md`：迁移缺陷先修上游、前提真值门、开发期 canonical 版本纪律。
- `CLAUDE.md`：第一阶段忠实还原与常用迁移命令。
- `docs/phase2/READ-FIRST.md`：第二阶段开工纪律。
- `packages/migrate/src/migrate-content.ts:339`：角色语义 sprite 定义来源。
- `packages/migrate/src/migrate-content.ts:1846`：`migratedSpriteId` 当前构造。
- `packages/migrate/src/migrate-content.ts:2288`：场景布局注册。
- `packages/migrate/src/migrate-content.ts:2399`：场景 `spriteRef` 生成。
- `packages/migrate/src/migrate-content.ts:2411`：脚本 resolver 已有角色语义优先规则。
- `packages/migrate/src/migrate-content.ts:2642`：场景实体应用 `spriteRef`。
- `projects/pal/assets/index.json`：迁移后资源索引；验收时核目标 asset path / hash 不变。

## 不得重新引入

- 不得只手改 `projects/pal/content/sprites.json` 或 7 个 scene 生成物。
- 不得使用无等价验证的 `spriteNum === 2 ? 'li-xiaoyao' : ...` 裸硬编码。
- 不得以资源相同直接断言实体身份相同；归一只复用视觉定义，不改变 `actor` 绑定。
- 不得让脚本 resolver 与场景实体 resolver 保持两套不同归一逻辑。
- 不得保留旧 `sprite-2` fallback、旧 fixture 或“兼容未来旧工程”分支。
- 不得改变 asset path、hash、四向布局、每向帧数或运行时呈现。

## 设计

1. 从角色迁移已登记的视觉定义建立 `rawSpriteNumber -> semantic SpriteId` 候选索引；该索引只归一外观，不提供实体身份。
2. 建立可测试的 layout equality：layout kind、方向数、每向帧数、帧映射 / 容器范围全部相同。
3. 场景注册与引用统一调用同一个 resolver：
   - 候选存在且资源 / layout 严格等价：复用语义 ID；
   - 候选不存在：继续使用独立 `sprite-${n}`；
   - 候选存在但 layout 不等价：保留显式 variant 或 fail loud，禁止静默归一。
4. 完整重迁 PAL，让上游生成结果自然移除 `sprite-2` 并更新 7 个场景。
5. 二次运行相同迁移，证明零 diff。

## 验收标准

- [x] Kimi / GLM 已分别核对 `EntityRef` / `SpriteDef` 调用域和代表场景，证明归一只改变视觉定义引用、不新增 `actor` 绑定或身份推断。
- [x] resolver 单测覆盖严格等价归一、资源不同、layout 不同、poses 不同、无候选、清单漂移与二次应用。
- [x] 脚本引用与场景实体引用消费同一角色视觉映射 / 布局注册合同，不再出现两套裸编号规则。
- [x] 完整迁移后 `projects/pal/content/sprites.json` 不存在精确 ID `sprite-2`。
- [x] 上述 7 个场景引用全部为 `li-xiaoyao`，且 generated reference set 与显式清单双向闭合。
- [x] `li-xiaoyao` 定义与 HEAD 逐字段相等；asset、layout、poses 与帧映射不变。
- [x] 代表场景开发期结构验收证明只改 sprite ID，仍解析同一 asset / layout / poses，且 GR1 断言 7 实体均无 `actor`；剧情观感按下方集中 E2E 登记延后。
- [x] 完整迁移写入后的内置 replay 与本轮二次 dry-run 均为零计划。
- [x] 迁移数据 diff 仅含 1 个重复定义删除、7 个场景引用归一及对应 baseline / `_state`；未手改额外生成内容。
- [x] 无旧 `sprite-2` fallback、旧 fixture、兼容分支或裸 `spriteNum === 2` 硬编码。

## Build 与自验证证据（2026-08-24，Codex）

### 实现与门禁

- `mapRoleSpritesByNumber` 在迁移边界持有完整 `SpriteDef`，场景布局注册与数字脚本解析消费同一映射；场景只有进入显式 alias 清单且 asset / layout 匹配时才复用稳定视觉 ID，非等价布局保持显式 variant。
- current publication overlay 对 current / generated / role 定义的 asset、layout、poses 做严格等价比较，只删除重复定义并改显式清单内实体的 `sprite` 字段；generated 引用集合漂移、清单外 legacy 引用、定义不等价均 fail-loud。
- GR1：`pal-world-sprite-semantic-alias.pal.test.ts` 对 current project 与 baseline 的 7 个实体逐一断言 `isActorEntity === false` / 无 `actor`；`pal-world-sprite-identity-boundary.test.ts` 阻断生产代码以 PAL Actor ID 直接比较 `.sprite` 推断身份。
- GR2：definition equality 包含 `poses`；专测用非空 poses mismatch 证明 fail-loud。

### 迁移与数据证据

- 正式上游重迁物化：current project 删除 `sprite-2` 1 条，7 个场景各仅把 `sprite-2` 改为 `li-xiaoyao`；baseline 同步相同 8 个正文文件并更新 `_state.json`。
- `li-xiaoyao` 在迁移前后逐字段相等；项目与 baseline 的 8 个变更正文文件字节一致。
- 二次命令 `pnpm --filter @type-pal/migrate run migrate:content`：`managed=537 writes=0 deletes=0 conflicts=0 asset-deletes=0`；closure=`scenes 294 / maps 223 / assets 1934`，既有 warning 口径为 reference 4 / asset 182。

### 测试

- 聚焦：`migrate-content`、layout registry、semantic alias、identity boundary 与 PAL 产物测试通过；最终补丁复跑为 unit 4 / PAL 2 通过。
- `pnpm --filter @type-pal/migrate run typecheck`：通过。
- `pnpm --filter @type-pal/migrate run test`：43 files / 354 tests 全通过（受影响包全量仅跑本次一次）。
- 新增 / 小型相关文件 Biome check 通过；`git diff --check` 在提交前复核。

### 集中 E2E 登记（剧情 / 内容观感，不在开发期重复启动浏览器）

- 入口：`s020/e344`（主代表），补充 `s172/e2858`、`s196/e3343`。
- 预期：归一前后可见精灵、初始朝向、巡游 / 静态动画、隐藏状态与脚本时序一致；实体仍是纯 sprite 对象，不获得 Actor 行为。
- 证据路径：本卡 7 引用清单、`pal-world-sprite-semantic-alias.pal.test.ts`、项目 7 scene 精确一行 diff、`li-xiaoyao` 定义逐字段不变证明。

## 推进签字

### draft -> build

#### 用户裁决后重签（2026-08-24，新准入依据）

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | **verified** | **agree** | 用户已批准视觉定义复用；`packages/content/src/index.ts:61-68` 明确 `actor | sprite | zone` 三选一且禁止从外观反推玩法职责，`packages/content/src/sprite.ts:62-73` 证明 `SpriteDef` 只拥有 asset / label / layout / poses；严格等价 resolver + 不新增 actor 绑定可消除重复且不改变行为 |
| Kimi | **verified** | **agree** | 2026-08-24 按新前提独立重签：EntityRef/SpriteDef 分离、共享 resolver、7 实体无 actor 绑定、三向等价 + 双向 fail-loud 均一手核实；旧“身份”结论按 GLM 证据修正，见下方 Kimi 用户裁决后重签节 |
| GLM | **verified** | **agree**（附 GR1-GR2） | 2026-08-24 按新前提独立重签——EntityRef 三选一/身份反推禁令/SpriteDef 纯视觉字段/共享 resolver 三条件等价+fail-loud/actor 绑定不变（7 场景 diff +actor=0）/无 SpriteDef.id 身份推断调用方，全部一手核实，见 GLM 用户裁决后重签节 |

**当前准入结论：build allowed。** 用户裁决已消除产品语义分歧，Codex、Kimi、GLM 已按新前提分别重签 `verified + agree`；Codex 可恢复此前冻结的未提交实现，并须落实 GR1 / GR2 后再进入 review。

#### 历史签字（前提变化后已失效，仅保留审计事实）

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | verified | agree | 已核定义、7 个引用与迁移双路径；保留“同资源未必同身份”反例，要求非 Owner 独立核场景语义 |
| Kimi | **verified** | **agree** | 2026-08-24 独立核角色表/三代表场景剧情/等价条件/双 resolver 调用域，证据见下方 Kimi 审查节 |
| GLM | **verified** | **agree**（附 GS1-GS2） | 7 场景/定义/extracted 数据/代表脚本语义全独立核验，见 GLM 审查节 |

**历史结论：blocked。** 形式签字虽齐，但 Kimi 与 GLM 对核心身份前提给出相反结论；该组签字已由上方用户裁决后的新重签表替代。

### Coding Owner 停线记录（2026-08-24）

- Kimi 结论：s020/e344、s172/e2858、s196/e3343 是李逍遥的场上化身，因此角色语义归一成立。
- GLM 结论：7 个对象是复用李逍遥外观的装饰性巡游 NPC，不是李逍遥本人；其 `design agree` 建立在“SpriteDef 只是视觉定义，实体身份与之正交”的另一前提上。
- 用户在本卡交接中明确要求证明 `sprite-2` 是李逍遥语义而非仅复用外观；GLM 的证据若成立，会直接推翻本卡当前前提和 `before -> after`。
- Codex 已完成的共享 resolver、current publication overlay、8 文件重迁与测试均保持未提交，只作为可复现诊断证据；未据此标记 review / done。
- 2026-08-24 用户已裁决：允许 `SpriteDef` 作为纯视觉定义被非角色实体复用；实体身份只由 `actor` 表达。继续条件现为 Kimi / GLM 按新前提重签。

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | **accept** | 上游 resolver + current publication overlay 完成；GR1 / GR2、7 场景 / 双产物、零计划、typecheck 与 migrate 全量 354 tests 全绿；数据 diff 精确受控，集中 E2E 已登记 |
| Kimi | **accept** | 2026-08-24 独立终审 bde33d13：迁移 diff 精确（7 场景各一行 sprite 引用归一 + sprites.json 删 1 条定义，li-xiaoyao 定义零变化；项目与 baseline 8 对正文文件 cmp 字节一致）；共享 resolver 三条件门控（asset/layout/scene allowlist，migrate-content.ts:2287-2297）；等价比较含 poses 且双向 fail-loud（pal-world-sprite-semantic-alias.ts:25-28,98-116）；GR1 身份边界测试机检生产码无 `.sprite === actorId`（pal-world-sprite-identity-boundary.test.ts:31-49）；复跑聚焦 5 文件 70/70 + boundary 1/1；本人跑 dry-run replay 为 537/0/0/0/0 零计划 |
| GLM | **accept** | 2026-08-24 done 前终审（提交 bde33d13，30 文件 +831/-121）：①定义删除恰 1 条（baselines sprites.json 删 sprite-2 全块 9 行）；②7 条引用每场景恰 `-sprite-2=1 +li-xiaoyao=1`（逐场景 diff 计数）；③GS1 共享 resolver 单一消费（semantic-alias 经 migratedSpriteId 单源）；④GR2 三条件 fail-loud 测试齐（资源/布局不等 + 引用清单漂移双向）；⑤**GR1 身份边界落地为新测试文件** `pal-world-sprite-identity-boundary.test.ts`——按 actors.json 全量 id 动态生成正则扫三包生产码 sprite 身份比较零违规（比原钉的静态断言更强）；⑥本人复跑 replay `managed=537 writes=0 deletes=0 conflicts=0`（幂等）；⑦产物终态：sprites.json 577 项无 sprite-2、全仓 `"sprite": "sprite-2"` 精确引用零命中（rg 澄清 s002 等命中为 sprite-244/215 前缀噪声）；⑧focused 3 files/6 tests + migrate-content 52 + typecheck 全绿。actor 绑定零变更（diff 无 +actor）。 |

## 下一位 Agent 提示词

### 当前收口

> 无下一位 Agent 提示词；本卡三方 `accept` 与用户确认均已齐，已标记 `done`。实现提交为 `bde33d13`，无剩余返工项。

### 历史 review 提示词（审计保留）

> 请终审任务卡 `docs/ops/tasks/MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md` 当前 review 实现。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、本卡用户裁决后重签与 Build 证据。重点检查：`mapRoleSpritesByNumber` 与场景 / 脚本共享 resolver 是否无裸编号双轨；current publication overlay 是否只退休严格等价重复定义并对 asset/layout/poses、引用清单漂移 fail-loud；GR1 是否保证 7 个实体仍无 actor 且生产码不从 SpriteDef ID 推断身份；生成 diff 是否精确为 1 定义 + 7 引用及对应 baseline；不得直接手改 `projects/pal`、不得保留兼容 fallback。请复用已有测试 / 迁移零计划证据，避免重复跑耗时全量；把直接证据、返工项或 `accept` 写回 review -> done 表。Kimi / GLM accept 未齐前不得标记 done。

### 用户裁决后合并重签提示词（历史保留）

> 请重新审查任务卡 `docs/ops/tasks/MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md`。用户已于 2026-08-24 拍板：`SpriteDef` 是可复用视觉定义，实体身份只由 `EntityRef.actor` 决定；非 Actor 实体可以引用 `li-xiaoyao` 外观，但不得因此获得或被推断为李逍遥身份，目标是消除与其资源 / layout 严格等价的 `sprite-2` 重复定义。请先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`，再独立核 `packages/content/src/index.ts:61-68`、`packages/content/src/sprite.ts:62-73`、迁移器共享 resolver 调用域以及至少一个代表场景。请回答：归一是否只改变视觉定义引用、是否保持 `actor` 绑定为空 / 不变、是否存在按 SpriteDef.id 推断身份的调用方、资源与 layout 严格等价 / 非等价 fail-loud 是否充分。把直接证据、可证伪观察与测试缺口写回卡，并在“用户裁决后重签”表签 `premise verified + design agree` 或给出 `counter`。重签未齐前不得修改实现文件、不得提交现有未提交迁移改动、不得标记 build / review / done。

#### Kimi 审查（2026-08-24，迁移规则/schema；本人一手数据 + 调用域直读，非代理）

**premise verified（独立证据锚点）：**
1. **sprite 2 = 李逍遥（primary source）**：`data/extracted/data/player-roles.json` roleId 0
   （李逍遥，name word 36）→ `spriteNum: 2`、`walkFrames: 0`（mapSprites 的 `|| 3` 得
   framesPerDir=3）；roleId 1..5 分别为 3/7/525/5/26，无冲突。
2. **代表场景剧情上下文（本人直读 extracted + events/all.json 反汇编）**：
   - scene/20.json 对象 344（spriteNum 2）：脚本 L_5617 起即“李逍遥∶这位大姐…”/林月如对话
     （抽打仆人段）——李逍遥在场，该对象是他的场上化身；
   - scene/172.json 对象 2858：L_28220 阿奴分娩段含“李逍遥∶是～马上来！”；
   - scene/196.json 对象 3343：L_28737 李逍遥×林月如“要不要我送你回家…李大哥”对话。
   三场均证明 sprite-2 对象是主角本人而非 NPC 复用外观。其余 4 场景（198/203/233/281）的
   对象无 autoLabel、纯静态摆放；未发现任何反证。
3. **严格等价实测**：`sprites.json` 两定义除 id/label 外逐键相等——asset 同为
   `sprite.pal.002`、layout 同为 `{directional, framesPerDir:3}`；7 个 extracted 对象
   `nSpriteFrames` 全为 3，与角色表 walkFrames||3 一致；帧映射走同一渲染路径。
4. **调用域双轨属实**：场景实体路径 `spriteRef`（migrate-content.ts:2399-2405）只按
   `spriteNum:nSpriteFrames` 布局注册消歧，不问角色语义；脚本路径 `resolveSpriteIdForNum`
   （:2407-2427）已角色语义优先、多布局 fail loud。卡文“两套规则”属实，设计§3 统一为
   单 resolver 且保留 fail loud，方向正确。
5. **等价条件的边界**：角色语义 def 的 layout 来自角色表 `walkFrames||3`，场景证据来自
   `nSpriteFrames`——两者数据源不同，等价判定必须同时比 asset id、layout kind、
   framesPerDir 与帧映射；卡面设计 §2 的可测试 layout equality 覆盖了该面。

**可证伪观察**：若任一 7 场景对象在原版脚本中被当作非李逍遥（如剧情替身/伪装的他人），
归一即错误——本人抽查的三场均反证该假设，剩余 4 个无脚本静态摆放由 GLM 全量复核；
若角色表 `walkFrames` 未来出现非 0 值或某场景 `nSpriteFrames ≠ walkFrames||3`，等价条件
必须 fail loud（现 resolver 已有此模式）；若归一后脚本仍能在某处按 `sprite-2` 字面引用，
说明存在第三条未统一的解析路径——当前 grep 未见。

**design agree**：单 resolver + 严格等价 + fail loud + 完整重迁 + 二次零 diff，符合铁律 10
与 current-only 纪律；无裸 `spriteNum === 2` 硬编码。准入仍待 GLM 签字。

#### 原提示词（历史保留）

> 请审查任务卡 `docs/ops/tasks/MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md`。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`，再独立检查 `packages/migrate/src/migrate-content.ts` 中角色定义、场景注册、`spriteRef` 和脚本 resolver 的调用链，以及任务卡列出的 7 份 extracted scene / generated scene。至少选择一个代表场景核剧情或脚本上下文，回答 `sprite 2` 是否确实代表李逍遥而非仅复用外观；核对资源与 layout 的严格等价条件，并给出什么观察会推翻归一。把直接证据写回卡，签 `premise verified + design agree` 或 `counter`。当前不得改迁移器 / `projects/pal`、不得开始实现、不得标记 build / done。


#### GLM 审查（2026-08-24，7 场景/生成覆盖/代表语义；本人一手数据核验，非代理）

**premise verified：**

1. **定义等价复算**：sprites.json 中 `li-xiaoyao` 与 `sprite-2` 除 id/label 外
   **逐字段相等**（asset 同 `sprite.pal.002`、layout 同 `directional/framesPerDir 3`）
   ——本人 JSON 深比较（剔除 id/label）通过。
2. **7 个 generated 引用复算**：s020:667 / s172:181 / s196:39 / s198:20 / s203:3417 /
   s233:142 / s281:1394 逐行核验均为 `"sprite": "sprite-2"`——卡文清单无漏无多。
3. **extracted primary 数据**：7 场景各恰 1 个 `spriteNum=2` 实体（scene 20 有 14 处
   匹配但仅 id=344 是 spriteNum **精确**=2，其余为 spriteNum 含 2 的其他编号——已区分）；
   player-roles.json roleId 0（李逍遥）`spriteNum=2` 证实角色表映射。
4. **代表场景语义调查（关键，证明 sprite-2 实体非李逍遥本人）**：scene 20 的 id=344
   `triggerLabel=无、triggerMode=0、autoLabel=L_5604`——**无触发脚本、非交互实体**。
   L_5604 脚本体（events/all.json segments[0].commands[5604]）解码：opcode 0x11
   （WalkTo 低速走）/0x0F（设朝向帧）/0x09（等待帧）循环——**纯巡游动画脚本，无对话、
   无剧情、无身份判断**。全部 7 处均为同构（triggerMode=0、无 triggerLabel 或仅巡游
   autoLabel）。
5. **语义结论**：这 7 个实体是**复用李逍遥大世界外观的装饰性巡游 NPC**，不是李逍遥
   本人参与剧情。卡文"最强替代解释"（外观复用 ≠ 角色身份）**被证实**——但注意：本卡
   的归一对象是 **sprite 定义 ID**（资源注册表去重），不是把实体变成"李逍遥角色实体"。
   实体仍无 actor 绑定；归一后 `entity.sprite = 'li-xiaoyao'` 仅指"用这套精灵资源+布局"，
   与 entity.actor 语义（C1-1 类型化引用）正交。**语义上安全**。

**design agree（附 GS1-GS2）：**

- **GS1（resolver 单一性机检）**：脚本 resolver（migrate-content:2411）与场景注册
  （:2288/:2399）归一逻辑合并后，boundary/单测必须断言两处**消费同一个导出函数**
  （非两份同文复制）；`spriteNum === 2` 裸字面量 rg 全仓零命中（含测试）。
- **GS2（等价三条件钉死 + 非等价 fail-loud）**：等价判定必须同时校验
  asset path + layout kind + framesPerDir/帧映射，三者任一不等即 fail loud
  （不静默保留 variant）；resolver 单测四个分支：等价归一 / 资源不同 / layout 不同 /
  非角色 sprite 独立——与卡文验收对齐并补 fixture。

**可证伪观察**：若任一 7 场景的 spriteNum=2 实体未来被发现有 triggerScript 引用
对话/剧情（当前全部 triggerMode=0 无触发），归一的"装饰 NPC"定性需重审——但 sprite
定义去重本身不受影响（定义层等价独立成立）。


#### GLM 用户裁决后重签（2026-08-24；按新前提独立核验，非沿用旧签）

**premise verified（新前提四向）**：

1. **EntityRef 三选一 + 身份反推禁令属实**：`index.ts:61-68`——
   `{actor} | {sprite} | {zone}` 三选一且注释明示"NPC、敌人、物件、宝箱等是独立玩法职责，
   **不能从 SpriteDef id 或外观来源反推**"——用户裁决"实体身份只由 EntityRef.actor 决定"
   与 schema 现有合同**逐字一致**（非新发明）。
2. **SpriteDef 纯视觉字段属实**：`sprite.ts:62-73`——id/asset/label/layout/poses 五字段
   全部视觉属性，无任何身份/玩法字段；注释"语义 id 指注册表稳定身份，实体(prop)与
   ActorDef.spriteId 引用它"——双引用入口本就设计为共享。
3. **无按 SpriteDef.id 推断身份的调用方**：全仓 rg（editor/reforge/content 生产码）
   `sprite.*===.*li-xiaoyao` 等身份比较模式**零命中**；身份判定统一走
   `isActorEntity`（actor.ts:127-129 `'actor' in e`）与 `resolveEntitySpriteId`
   的 actor→spriteId 解析（:132-138）——外观解析器本身先查 actor 再查 sprite，
   两通道在类型层就分开了。
4. **7 场景 actor 绑定不变（未提交 diff 实测）**：Codex 停线保留的 26 文件诊断 diff 中，
   7 个 generated scene 的实体改动**逐场景核验 `+actor` 行 = 0**——归一只把
   `"sprite": "sprite-2"` 改为 `"li-xiaoyao"`（s020 代表 diff 实证），无任何 actor
   绑定新增或推断。

**design agree（附 GR1-GR2）**：

- **GR1（身份/外观分离的回归断言）**：验收测试须加一条——7 个归一实体的
  `isActorEntity(e) === false` 断言（归一后仍为纯 sprite 实体）；外加全仓 boundary
  断言"生产码无 `entity.sprite === '<ActorDef id>'` 形态的身份比较"——把新裁决的
  禁令机检化，防未来回潮。
- **GR2（resolver 三条件等价的 poses 项钉死）**：共享 resolver 的
  `comparableDefinition` 比较含 asset/layout/**poses**（semantic-alias.ts:19-23）
   ——比 GS2 原钉的两条件更强（动作容器也必须等价）；"清单外 legacy 引用与
  generated 引用漂移都会 fail-loud"测试在位（:即引用清单与真实产物双向闭合）。
  钉：**sprite-2 的 poses 若非空且与 li-xiaoyao 不等，必须 fail-loud 不归一**——
  当前实测二者 poses 均无（纯四向无动作），等价成立；测试已覆盖该分支。

**旧 GS1-GS2 的延续与升级**：GS1（resolver 单一性+裸 spriteNum===2 禁令）不变；
GS2 升级为 GR2（三条件含 poses）。旧"装饰 NPC vs 李逍遥化身"的语义分歧在用户裁决
后不再影响定义层归一——**SpriteDef 是视觉定义，谁引用它都不获得身份**，实体
e344 等引用 li-xiaoyao 后仍是无 actor 的 sprite 实体，运行时行为不变。

**可证伪观察**：若未来任何代码以 `entity.sprite === 'li-xiaoyao'` 判定"这是李逍遥"
（GR1 boundary 拦截）；若 sprite-2 的 poses 与 li-xiaoyao 出现差异（GR2 fail-loud
拦截）；若 7 实体 diff 中出现 actor 字段（实测 0，持续断言）。
#### Kimi 用户裁决后重签（2026-08-24；按新前提独立核验，非沿用旧签）

**premise verified（新前提逐项一手证据）**：

1. **EntityRef/SpriteDef 分离属实**：`index.ts:61-68` 三选一判别 + 注释明示不得从外观反推玩法
   职责；`sprite.ts:62-73` SpriteDef 仅 id/asset/label/layout/poses 纯视觉字段。本人全仓 grep
   生产码（reforge/editor/content，排除测试）：`sprite-2`、`sprite === 'li-xiaoyao'` 类身份比较
   **零命中**；身份判定只在 `isActorEntity`（actor.ts:127-129）的 `'actor' in e`。
2. **共享 resolver（直读当前未提交实现，仅作诊断证据）**：`mapRoleSpritesByNumber` 返回
   spriteNum→SpriteDef 映射，场景注册与脚本 resolver 两侧同源；`roleSpriteAliasFor` 的归一
   条件是结构三件套——asset 等于 `palSpriteAssetId(spriteNum)`、layoutKey 相等、scene 用途另需
   显式 allowlist（`sceneSemanticSpriteIds`）——无裸 `spriteNum === 2` 硬编码。
   `pal-world-sprite-semantic-alias.ts:25-28` 对 asset/layout/poses 做 JSON 深比，任一不等即
   throw；:98-116 对纯迁移核仍生成 legacyId、引用清单漂移、清单外 legacy 引用全部 fail-loud；
   :122-135 只改写清单内实体且仅动 `sprite` 字段。
3. **actor 绑定不变（产物实测）**：当前工作树 7 个重生成场景实体全部为 `{sprite:'li-xiaoyao'}`
   且无 `actor` 字段（本人 python 逐场景核验 s020/s172/s196/s198/s203/s233/s281）；
   `sprites.json` 中 `sprite-2` 已不存在。
4. **严格等价（本人复算）**：两定义除 id/label 逐键相等；7 个 extracted 对象 `nSpriteFrames=3`
   与角色表 `walkFrames||3` 一致。
5. **对我首轮结论的修正**：GLM 对 L_5604 的解读更准确——该对象自身 auto 脚本是纯巡游循环
   （opcode 0x11/0x09/0x0F，至 5616 `end` 即止），我此前看到的“李逍遥∶这位大姐…”对白属于
   5616 之后另一 label 的脚本，不应记在该对象名下。首轮“场上化身”表述过强，特此更正；
   在用户“视觉定义可复用”裁决下，该身份分歧不再构成归一门禁。

**可证伪观察**：若未来出现按 `SpriteDef.id` 推断身份的调用方（GR1 boundary 应拦截）；
若某角色 `walkFrames` 非 0 或某场景 `nSpriteFrames` 与角色布局不等，`roleSpriteAliasFor`
必须返回 undefined 而非归一；若 alias 清单外场景出现 legacyId 引用，发布层 fail-loud
（:113-116 已在位）。

**design agree**：显式别名清单（逐引用带证据）+ 结构等价 + 双向 fail-loud + 完整重迁 +
二次零 diff，符合铁律 10 与 current-only；不新增 actor 绑定、不改 asset path/hash/布局。
本签字只授权设计准入；Codex 当前未提交实现的提交与 build 仍待 GLM 重签齐后按流程推进。
- 2026-08-24 GLM（终审）: 按用户裁决后前提完成 done 前终审并签 **accept**。八项独立验证：
  定义删除恰 1 / 7 引用精确 1:1 / resolver 单源 / GR2 fail-loud / **GR1 落为动态正则身份
  边界测试**（按全量 actor id 生成，强于原钉）/ replay 537 零计划 / 产物终态 sprite-2
  零残留（精确引用零命中，前缀噪声已澄清）/ focused+52+typecheck 全绿。未改实现，
  未代签 Kimi，未标 done。

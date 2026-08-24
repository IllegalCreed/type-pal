# MIG-PAL-WORLD-SPRITE-ALIAS-1 PAL 大世界角色精灵语义别名收口

> **状态**：draft（待 Kimi / GLM 独立证据签字）
> **负责人**：Codex（Coding Owner，待准入）
> **参与审查**：Kimi（迁移规则 / schema）、GLM（7 场景与生成覆盖）
> **能力格**：C2 内容迁移 / MG2 生成一致性
> **风险级别**：高（asset pipeline / migration / generated project）

## 目标

将 PAL 当前重复的 `sprite-2` 大世界精灵定义归一到已有语义 ID `li-xiaoyao`，同步迁移 7 个场景引用，并修复迁移 / 生成逻辑，使下一次完整迁移不会再次生成 `sprite-2`。

归一规则不得写成“编号 2 永远等于李逍遥”的裸硬编码；只有当原始精灵号已存在角色语义定义，且资源与布局合同严格等价时，场景引用才可复用该语义 ID。非等价布局必须保留显式变体或失败并要求建模，不能静默吞并。

## 用户可见行为 / 工程前提

当前同一份大世界资源与四向布局同时以 `li-xiaoyao` 和 `sprite-2` 出现在精灵库，导致两个内容相同、名称不同的“四向”用途；目标是只显示和引用语义明确的 `li-xiaoyao`，同时保持 7 个场景画面与行为不变。

### before -> after

- **before**：精灵库存在 `li-xiaoyao` 与 `sprite-2` 两个相同资源 / 相同布局用途定义，7 个场景引用 `sprite-2`。
- **after**：严格等价的 7 个场景统一引用 `li-xiaoyao`；完整迁移和二次迁移均不再产生 `sprite-2`，画面、帧布局与行为不变。

用户已明确要求同步 7 个场景并修改生成逻辑，以上偏离已获产品批准。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 原版场景实体通过数值 sprite 编号引用精灵；角色表同样提供角色大世界 sprite 编号，编号本身不携带二阶段语义 ID | `packages/pal-extract/src/io/sss.ts:45`；`packages/pal-extract/src/resources/parsers/player-roles.ts:64`；`packages/pal-extract/src/resources/tables.test.ts:690`；7 个 extracted scene 锚点见下 | verified |
| 第一阶段 | 一阶段按原始 sprite number 解析、加载与呈现资源，不存在 `sprite-2` / `li-xiaoyao` 双语义 ID；相同编号应呈现相同资源 | `packages/game/src/core/game-state.ts:1785`、`:1988`；`packages/game/src/present/present.ts:440`、`:536` | verified |
| 当前二阶段 | 角色迁移已为李逍遥建立 `li-xiaoyao`；场景迁移仍用 `sprite-${number}` 注册并引用，因此同资源 / 同布局又生成 `sprite-2`；脚本 resolver 已优先角色语义 ID，但场景实体路径未统一 | `packages/migrate/src/migrate-content.ts:339`、`:1846`、`:2288`、`:2399`、`:2411`、`:2642`；`projects/pal/content/sprites.json:3`、`:1074` | verified |
| 本任务目标 | 只在“角色语义定义存在 + 资源等价 + 布局等价”时把场景精灵号归一为语义 ID；7 个已识别引用须迁移且生成幂等 | 本卡“目标”“验收标准” | verified，待非 Owner 独立核场景语义 |

### 最强替代解释

即使 `sprite-2` 与 `li-xiaoyao` 使用同一资源和布局，某些场景实体也可能语义上只是复用李逍遥外观的 NPC / 替身，而非李逍遥本人。若代表场景原始数据、脚本或剧情上下文证明这种情况，不能仅靠资源相等将实体语义改名；应把“资源用途别名”与“角色身份”分开建模，或保留显式视觉变体。

### 什么观察会推翻当前前提

- 任一 7 场景中的实体在原版 / 一阶段语义上明确不是李逍遥本人；
- `sprite-2` 与 `li-xiaoyao` 的用途布局、每向帧数、帧映射或资源哈希并非严格相等；
- 归一后场景脚本通过 sprite ID 判断身份并改变行为。

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
- 不得以资源相同直接断言实体身份相同；必须独立核至少一个代表场景的剧情 / 脚本语义。
- 不得让脚本 resolver 与场景实体 resolver 保持两套不同归一逻辑。
- 不得保留旧 `sprite-2` fallback、旧 fixture 或“兼容未来旧工程”分支。
- 不得改变 asset path、hash、四向布局、每向帧数或运行时呈现。

## 设计

1. 从角色迁移结果建立 `rawSpriteNumber -> semantic SpriteId` 候选索引。
2. 建立可测试的 layout equality：layout kind、方向数、每向帧数、帧映射 / 容器范围全部相同。
3. 场景注册与引用统一调用同一个 resolver：
   - 候选存在且资源 / layout 严格等价：复用语义 ID；
   - 候选不存在：继续使用独立 `sprite-${n}`；
   - 候选存在但 layout 不等价：保留显式 variant 或 fail loud，禁止静默归一。
4. 完整重迁 PAL，让上游生成结果自然移除 `sprite-2` 并更新 7 个场景。
5. 二次运行相同迁移，证明零 diff。

## 验收标准

- [ ] Kimi 或 GLM 至少一方独立读取一个代表场景的 extracted 数据与剧情 / 脚本上下文，证明或推翻“角色语义可归一”。
- [ ] resolver 单测覆盖：严格等价角色 sprite 归一、资源不同不归一、layout 不同不归一 / fail loud、非角色 sprite 保持独立。
- [ ] 脚本引用与场景实体引用消费同一归一合同，不再出现两套规则。
- [ ] 完整迁移后 `projects/pal/content/sprites.json` 不存在精确 ID `sprite-2`。
- [ ] 上述 7 个场景引用全部为 `li-xiaoyao`，且无遗漏、无额外非预期引用变化。
- [ ] `li-xiaoyao` 的 asset path / hash、layout kind、每向帧数与帧映射不变。
- [ ] 代表场景在运行时的可见精灵、朝向、动画与脚本行为不变。
- [ ] 第二次完整迁移工作树零 diff，证明不会再次生成 `sprite-2`。
- [ ] 迁移 diff 仅包含本卡预期的定义删除、7 引用归一及必要 fixture / snapshot 更新；无手工生成物补丁。
- [ ] 旧 fallback、旧 fixture 与兼容分支已删除。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | verified | agree | 已核定义、7 个引用与迁移双路径；保留“同资源未必同身份”反例，要求非 Owner 独立核场景语义 |
| Kimi | pending | pending | 需独立核 resolver 架构、等价条件与代表场景语义 |
| GLM | pending | pending | 需独立核 7 场景 census、原始数据、迁移 / 二次生成验收 |

**准入结论：不满足。Kimi / GLM 签字前不得修改迁移器、生成数据或实现文件。**

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | pending | — |
| Kimi | pending | — |
| GLM | pending | — |

## 下一位 Agent 提示词

> 请审查任务卡 `docs/ops/tasks/MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md`。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`，再独立检查 `packages/migrate/src/migrate-content.ts` 中角色定义、场景注册、`spriteRef` 和脚本 resolver 的调用链，以及任务卡列出的 7 份 extracted scene / generated scene。至少选择一个代表场景核剧情或脚本上下文，回答 `sprite 2` 是否确实代表李逍遥而非仅复用外观；核对资源与 layout 的严格等价条件，并给出什么观察会推翻归一。把直接证据写回卡，签 `premise verified + design agree` 或 `counter`。当前不得改迁移器 / `projects/pal`、不得开始实现、不得标记 build / done。

# MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1 PAL 角色大世界精灵语义别名全量闭包

> **状态**：draft（build blocked，待 Kimi / GLM 设计签字）
> **负责人**：Codex（Coding Owner，待准入）
> **参与审查**：Kimi（迁移规则 / 闭包不变量）、GLM（全角色 / 全场景 census）
> **能力格**：C2 内容迁移 / MG2 生成一致性
> **风险级别**：高（asset pipeline / migration / generated project）

## 触发与边界

2026-08-24 用户在编辑器中发现 `zhao-linger` 与 `sprite-3` 仍同时存在，指出上一张
`MIG-PAL-WORLD-SPRITE-ALIAS-1` 只处理李逍遥、没有举一反三。只读全库 census 证实该反例成立，
且还存在林月如、阿奴、盖罗娇三组同类重复。

上一张卡按其“`sprite-2` + 7 引用”的既定范围保留 `done` 历史，不重开。本卡负责纠正范围遗漏，
建立“所有 PAL 原始角色语义 SpriteDef 与数字 SpriteDef 的严格重复必须闭包为零”的系统门禁。

## 目标

- 退休当前剩余 4 个严格重复定义：`sprite-3`、`sprite-7`、`sprite-5`、`sprite-26`。
- 将 37 个场景中的 44 个实体引用分别归一为 `zhao-linger`、`lin-yueru`、`anu`、
  `gai-luojiao`。
- 修迁移上游与 current publication overlay；不得直接手改 `projects/pal`。
- 建立由完整角色表驱动的闭包门禁：未来任一角色语义定义与数字定义严格重复却未登记 / 未归一，
  测试与迁移必须 fail-loud，不能再次只覆盖单个角色。
- 保持已拍板语义：`SpriteDef` 只表示可复用视觉定义；实体身份只由 `EntityRef.actor` 表达。

## 用户可见行为 / 工程前提

### 一句话前提

PAL 六名原始角色均已有稳定语义 SpriteDef；当数字 SpriteDef 与其中一项的 asset、layout、poses
严格相同，继续在“用途定义”列表并列展示只是重复视觉定义，不代表不同实体身份。

### before -> after

- **before**：列表仍显示 4 组相同视觉的语义 / 数字双定义，44 个场景实体引用数字 ID。
- **after**：四组各只保留语义视觉定义，44 个实体引用语义 ID；外观、布局、动作、脚本与 `actor`
  绑定不变；全角色严格重复 census 为零。

用户于 2026-08-24 明确指出必须举一反三、不能只处理李逍遥，构成本卡范围裁决。

## 前提真值矩阵

| 方向 | 当前结论 | 一手证据 | 状态 |
|---|---|---|---|
| 原版 / primary source | 角色表把赵灵儿、林月如、阿奴、盖罗娇分别映射到 spriteNum 3 / 7 / 5 / 26，`walkFrames=0` 按迁移合同落为每向 3 帧；44 个 extracted scene 对象逐项为对应 spriteNum 且 `nSpriteFrames=3` | `data/extracted/data/player-roles.json:89-113,174-198,344-368,429-453`；下方 44 项 extracted census | verified |
| 第一阶段 | 一阶段按原始数值 sprite number 加载同一资源，不存在二阶段的语义 / 数字双 ID；同编号继续呈现同一大世界资源 | `packages/game/src/core/game-state.ts:1785,1988`；`packages/game/src/present/present.ts:440,536` | verified |
| 当前二阶段 | `mapSprites` 已创建六名角色语义定义；场景语义复用受 `PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES` ID 集合门控，而该集合当前只有 `li-xiaoyao`，所以其余四个数字定义仍被生成 | `packages/migrate/src/migrate-content.ts:339-383,2286-2296`；`packages/migrate/src/pal-world-sprite-layouts.ts:17-42`；`packages/migrate/src/pal-migration.ts:493-502` | verified |
| 本任务目标 | 角色表完整域内的严格重复候选、显式证据清单、纯生成结果和 current publication 必须双向闭合；当前 4 定义 + 44 引用全部归一，未来遗漏 fail-loud | 本卡设计与验收标准 | Codex verified；待非 Owner 独立核证 |

## 严格重复 census（2026-08-24，Codex 只读复跑）

`projects/pal/content/sprites.json` 当前共 577 个定义。以
`{asset, layout, poses ?? null}` 为完整可呈现比较键，全库恰好存在 4 个重复组、4 个多余定义：

| 语义定义 | 数字重复定义 | asset / layout | 场景引用 |
|---|---|---|---:|
| `zhao-linger` | `sprite-3` | `sprite.pal.003` / directional 3 | 6 |
| `lin-yueru` | `sprite-7` | `sprite.pal.007` / directional 3 | 18 |
| `anu` | `sprite-5` | `sprite.pal.005` / directional 3 | 11 |
| `gai-luojiao` | `sprite-26` | `sprite.pal.026` / directional 3 | 9 |

`li-xiaoyao` 已由历史卡归一，无重复；`wu-hou` 当前没有 `sprite-525` 重复定义。全库没有第五组
严格重复，故本卡的 current 闭包目标为 **4 定义 / 44 引用 / 37 场景**。

### 44 个引用与 extracted 一手核验

- `zhao-linger`（6）：`s003/e68`、`s016/e221`、`s019/e270`、`s021/e399`、
  `s034/e572`、`s059/e983`。
- `lin-yueru`（18）：`s021/e397`、`s032/e548`、`s039/e633`、`s052/e887`、
  `s059/e984`、`s081/e1541`、`s084/e1614`、`s086/e1631`、`s089/e1659`、
  `s097/e1786`、`s097/e1787`、`s115/e2146`、`s117/e2154`、`s145/e2400`、
  `s145/e2401`、`s193/e3332`、`s198/e3347`、`s199/e3350`。
- `anu`（11）：`s172/e2860`、`s182/e2984`、`s183/e2993`、`s188/e3156`、
  `s201/e3362`、`s203/e3426`、`s203/e3428`、`s215/e3664`、`s233/e4196`、
  `s278/e4747`、`s281/e4801`。
- `gai-luojiao`（9）：`s083/e1572`、`s106/e1979`、`s109/e2040`、`s110/e2056`、
  `s110/e2058`、`s205/e3449`、`s215/e3657`、`s232/e4192`、`s245/e4332`。

Codex 已用当前 scene `entity.id` 回查 `data/extracted/data/scene/<n>.json` 的 `eventObjects`，
44 / 44 均命中同一 id、对应 spriteNum 且 `nSpriteFrames=3`，失败数为 0。非 Owner 必须独立复跑
完整计数，并至少逐项抽查一名非赵灵儿角色，不能只复述本表。

## 最强替代解释与可证伪观察

### 最强替代解释

相同 asset / layout 的两个 ID 可能被作者有意当作不同“角色身份”。该解释不适用于当前模型：
`SpriteDef` 没有身份字段，`EntityRef.actor | sprite | zone` 三选一，且用户已裁决允许非 Actor 实体
复用角色命名的视觉定义。若确需不同身份，owner 应是 `actor` 或显式领域字段，而不是复制视觉定义。

### 什么会推翻本卡前提

- 四组中任一 asset、layout、poses 或物理帧映射不严格相等；
- 44 个对象中任一 extracted spriteNum / `nSpriteFrames` 与对应角色视觉合同不符；
- 任一生产调用方从 `SpriteDef.id` 推断 Actor 身份，或归一会新增 / 改写 `actor`；
- 全库 census 找到第五组严格重复但本卡未纳入，或当前四组含清单外引用。

出现任一项即转 `blocked/rework`，更新矩阵并重新签字。

## 上下文锚点

- `AGENTS.md`：迁移必须修上游、完整重迁、二次零 diff；开发期只保留 current canonical。
- `CLAUDE.md`：迁移类 bug 先修真源，不手改生成产物。
- `docs/phase2/READ-FIRST.md`：第二阶段架构与迁移纪律。
- `docs/ops/tasks/MIG-PAL-WORLD-SPRITE-ALIAS-1-pal-world-sprite-semantic-alias.md`：
  已完成李逍遥单组归一与身份 / 视觉裁决，历史状态不重开。
- `packages/migrate/src/pal-world-sprite-layouts.ts:17-42`：当前只有李逍遥的显式清单。
- `packages/migrate/src/migrate-content.ts:2286-2296`：scene semantic alias 门控。
- `packages/migrate/src/pal-world-sprite-semantic-alias.ts:19-145`：严格等价、清单闭包和 current overlay。
- `packages/migrate/src/pal-current-publication.ts:145-157`：current publication 应用点。

## 不得重新引入

- 不得只修截图中的赵灵儿；四组与完整角色域必须一次闭包。
- 不得直接手改 `projects/pal` 或 baseline，必须由迁移上游生成。
- 不得写 `spriteNum === 3/5/7/26` 的散落硬编码；证据清单必须消费共享 resolver。
- 不得仅凭 asset 相同归一；必须同时核 layout、poses、物理帧与引用集合。
- 不得新增 / 改写 `actor`，不得从语义 SpriteDef ID 反推实体身份。
- 不得保留数字重复 fallback、旧 fixture 或 current 版本兼容分支。
- 不得只断言当前四组；必须建立“完整角色表 × 数字定义”的双向闭包门禁。

## 设计

1. 扩展逐引用证据清单为全部 5 个存在场景重复的角色（含已完成李逍遥），由同一清单导出
   `sceneSemanticSpriteIds`；四个新增角色包含上述 44 个引用。
2. 保留共享 resolver 的三重条件：角色表提供稳定语义定义、asset 相等、layout 相等；current overlay
   继续比较 poses，并对清单外引用 / generated 引用漂移 fail-loud。
3. 新增全角色闭包审计：从 `mapRoleSpritesByNumber` 枚举完整角色域，计算 current / generated 中
   `sprite-${spriteNum}` 的严格重复候选；候选集合必须与有引用的 alias 配置双向一致，遗漏或陈旧条目
   都失败。无重复的巫后必须明确落为“无候选”，不能从六人手写减一推断。
4. GR1 身份边界扩展到全部 51 个已归一引用（历史李逍遥 7 + 本卡 44），逐项断言无 `actor`；
   保留生产码禁止从 SpriteDef ID 推断身份的扫描。
5. 完整重迁 PAL current 与 baseline，预期删除 4 定义、修改 44 条引用；二次运行零计划。

## 验收标准

- [ ] Kimi / GLM 分别独立签 `premise verified + design agree`，至少一方复跑全库 4/44/37 census。
- [ ] 角色域严格重复闭包门禁覆盖六名角色，不允许只钉某一个具体 ID。
- [ ] `sprite-3`、`sprite-5`、`sprite-7`、`sprite-26` 定义在 current / baseline 均不存在。
- [ ] 44 个引用全部改为对应语义 ID；与显式证据清单双向闭合。
- [ ] 四个语义定义迁移前后逐字段不变，asset / layout / poses / 物理帧不变。
- [ ] 51 个 alias 实体均不新增 `actor`；生产码身份边界扫描保持通过。
- [ ] 数据 diff 精确为 4 定义删除 + 44 引用归一及 baseline / `_state` 对应更新。
- [ ] 完整迁移后二次运行 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。
- [ ] 聚焦测试先行；最终受影响 migrate 包全量测试只跑一次。
- [ ] 功能性编辑器最小视觉验证：用途定义列表不再显示四组双项，滚动与选择保持正常。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | **verified** | **agree** | 只读全库 census 得到唯一 4 组严格重复、44 引用 / 37 场景；44/44 回查 extracted spriteNum + nSpriteFrames 成功；根因定位到 alias ID 集合只有李逍遥。设计采用完整角色域双向闭包 + 逐引用证据，不自动按资源猜身份 |
| Kimi | pending | pending | 需独立审 resolver、角色域闭包、current/generated 双向 fail-loud 与最强反例 |
| GLM | pending | pending | 需独立复跑 4/44/37 census、至少抽查一名非赵灵儿角色的 extracted 证据与测试矩阵 |

**准入结论：blocked。** Kimi / GLM 写回任务卡并三签齐前不得修改迁移实现或生成产物。

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | pending | — |
| Kimi | pending | — |
| GLM | pending | — |

## Build 与验证

- 实现提交：pending
- 修改文件：pending
- 聚焦测试：pending
- 全量测试：pending
- 迁移 / 二次零计划：pending
- 浏览器证据：pending

## 下一位 Agent 提示词

> 请合并审查任务卡 `docs/ops/tasks/MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1-pal-role-world-sprite-alias-closure.md`。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、历史卡 `MIG-PAL-WORLD-SPRITE-ALIAS-1`，再直读 `packages/migrate/src/pal-world-sprite-layouts.ts:17-42`、`migrate-content.ts:2286-2296`、`pal-world-sprite-semantic-alias.ts` 与 `data/extracted/data/player-roles.json`。用户已指出赵灵儿仍重复；Codex 全库 census 得到唯一剩余四组：赵灵儿 6、林月如 18、阿奴 11、盖罗娇 9，共 44 引用 / 37 场景。Kimi 请审完整角色域双向闭包、resolver 与 fail-loud；GLM 请独立复跑 4/44/37 并至少抽查一名非赵灵儿角色的 extracted spriteNum / nSpriteFrames。把直接证据、可证伪观察与测试缺口写回卡，签 `premise verified + design agree` 或 `counter`。三签未齐前不得修改实现文件、不得重迁、不得标记 build / done。

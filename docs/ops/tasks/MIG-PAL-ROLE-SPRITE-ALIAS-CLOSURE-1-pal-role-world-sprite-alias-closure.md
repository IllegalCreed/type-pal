# MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1 PAL 角色大世界精灵语义别名全量闭包

Status: done（2026-08-24 三方 accept 与用户验收齐）
> **负责人**：Codex（Coding Owner，已完成）
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

- [x] Kimi / GLM 分别独立签 `premise verified + design agree`，至少一方复跑全库 4/44/37 census。
- [x] 角色域严格重复闭包门禁覆盖六名角色，不允许只钉某一个具体 ID。
- [x] `sprite-3`、`sprite-5`、`sprite-7`、`sprite-26` 定义在 current / baseline 均不存在。
- [x] 44 个引用全部改为对应语义 ID；与显式证据清单双向闭合。
- [x] 四个语义定义迁移前后逐字段不变，asset / layout / poses / 物理帧不变。
- [x] 51 个 alias 实体均不新增 `actor`；生产码身份边界扫描保持通过。
- [x] 数据 diff 精确为 4 定义删除 + 44 引用归一及 baseline / `_state` 对应更新。
- [x] 完整迁移后二次运行 `writes=0 deletes=0 conflicts=0 asset-deletes=0`。
- [x] 聚焦测试先行；最终受影响 migrate 包全量测试只跑一次。
- [x] 功能性编辑器最小视觉验证：用途定义列表不再显示四组双项，滚动与选择保持正常。

## 推进签字

### draft -> build

| Agent | premise | design | 证据 / 备注 |
|---|---|---|---|
| Codex | **verified** | **agree** | 只读全库 census 得到唯一 4 组严格重复、44 引用 / 37 场景；44/44 回查 extracted spriteNum + nSpriteFrames 成功；根因定位到 alias ID 集合只有李逍遥。设计采用完整角色域双向闭包 + 逐引用证据，不自动按资源猜身份 |
| Kimi | **verified** | **agree** | 2026-08-24 独立复跑全库 census（恰 4 组/44 引用/37 场景）+ 44/44 extracted 回查零失败 + resolver/门控直读，见下方 Kimi 审查节；附 KB1-KB2 |
| GLM | **verified** | **agree**（附 GC1-GC2） | 4/44/37 全量独立复算逐数一致；林月如 18 项 extracted 全查 + 44/44 回查零失败；player-roles 四角色 spriteNum/walkFrames 核验；wu-hou 非重复确认；根因（alias 集合只有李逍遥）直读属实。见 GLM 独立 census 节 |

**准入结论：build allowed（2026-08-24，Codex + Kimi + GLM 三签齐）。** GC1-GC2 与 KB1-KB2 为 build 必落钉。

### review -> done

| Agent | accept | 证据 / 备注 |
|---|---|---|
| Codex | **accept** | 完整角色域闭包、合成第五组 current/generated 负例、51 实体身份边界、4 定义 / 44 引用精确 diff、current/baseline 正文镜像、replay 与二次 dry-run 零计划均通过；typecheck 与 migrate 全量覆盖完成，浏览器验证四个资源均只剩 1 个用途定义 |
| Kimi | **accept** | 2026-08-24 独立终审 0e84e565：①alias 清单本人复算 5 角色 / 51 引用（7/6/18/11/9）；②闭包门禁 `pal-world-sprite-semantic-alias.ts:106-136` 对完整角色域同时取 current/generated legacy 状态、未登记且等价即 fail-loud，合成 sprite-525 双负例测试在位（test:146-171），wu-hou 经 roleClosure 报告显式“无候选”；③归一仍只动 `sprite` 字段、三向等价含 poses，51 实体零 actor（pal.test.ts:18-43 + 本人全量核验）；④diff 精确：sprites.json 删恰 4 定义、37 场景每文件等增等减共 -44/+44、baseline 38 份正文 cmp 全等；⑤本人复跑 focused 5 文件 71/71 全绿 + dry-run replay 537/0/0/0/0 零计划。KB1/KB2 均落地 |
| GLM | **accept** | 2026-08-24 done 前终审（提交 0e84e565，83 文件 +339/-211）：①alias 清单 5 角色 / 51 引用（本人 node 计数）；②全角色域门禁测试显式列 wu-hou/sprite-525 无候选 + 合成第五组重复负例 fail-loud 双断言（GC1 超额落地）；③resolver 三条件严格等价 + 不新增 actor（:77）；④diff 精确：sprites.json 删恰 4 定义，baselines 与 projects 双镜像均 -44/+44/+actor=0（37 场景）；⑤本人复跑 replay 537/0/0/0 幂等；产物终态 573 定义、四数字 ID 精确引用全仓零命中；focused 3 files/7 tests + typecheck 全绿 |

**done 准入结论：满足。** 2026-08-24 三方 `accept` 齐，用户已在编辑器实看并确认无问题。

## 用户验收

- 2026-08-24 用户结论：**accept**（“我也看了没问题了”）。
- 后续：恢复 `ED-FIELD-COMMIT-1`，本卡不再有下一位 Agent。

## Build 与验证

- 实现提交：`0e84e565 fix(migrate): close PAL role sprite aliases`。
- 修改文件：扩展 `PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES` 为 5 角色 / 51 引用；
  `applyPalWorldSpriteSemanticAliases` 新增完整角色域闭包报告与 current/generated 第五组拦截；
  PAL 生成冻结值同步为纯生成 572 定义 / 13 共享关系；current 与 baseline 重迁 37 scenes + sprites，
  baseline `_state` 随事务更新。
- 数据证据：结构化 HEAD 对比得到 current sprites `577 -> 573`，仅删除
  `sprite-3/5/7/26`；37 个 scene 文件恰 44 个 `sprite` 字段替换，unexpected=0；其余 573 个
  定义逐字段不变；current/baseline 38 份正文逐字节一致；严格重复组为 0。
- 聚焦测试：首轮 unit 3 files / 68 tests；最终 unit 4 files / 69 tests + PAL alias 1 file /
  2 tests 全绿；golden 更新后 `pal-sprite-action-census.pal.test.ts` 1/1 通过。
- 类型检查：`pnpm --filter @type-pal/migrate run typecheck` 通过。
- 全量测试：按纪律仅运行一次；43 files / 355 tests 中 42 files / 354 tests 当场通过，唯一失败为
  本卡 12 个 page0-auto 拒绝实例的预期 SpriteId golden 漂移；accepted/action digest 均不变。
  核清并更新 rejection digest 后只复跑该聚焦文件，1/1 通过，不重复耗时全量。
- 迁移：首次 dry-run `managed=537 writes=38 deletes=0 conflicts=0 asset-deletes=0`；正式
  `--write` 为 transaction-changes=77，内部 replay 零计划；第二次独立 dry-run 为
  `managed=537 writes=0 deletes=0 conflicts=0 asset-deletes=0`。closure 保持 scenes=294、
  maps=223、assets=1934、既有 warning 口径 reference=4 / asset=182。
- 浏览器证据：复用本机 `http://localhost:6010/`，PAL 003 / 005 / 007 / 026 左侧均显示
  `1 个用途定义`；四次切换成功，精确 legacy ID 文本计数均为 0；赵灵儿详情只显示
  `赵灵儿(大世界) / zhao-linger / 四向`，滚动、选择、帧布局正常；console warning/error=0。
- 格式：5 个本轮小型 TS 文件 Biome check 通过；`pal-migration.ts` 本轮仅改摘要、定义数与共享数，
  未机械重排其既有格式债；`git diff --check` 通过。

## 下一位 Agent 提示词

### 当前收口

> 无下一位 Agent 提示词；本卡三方 `accept` 与用户验收均已齐，已标记 `done`。

### 历史 review 提示词

> 请终审任务卡 `docs/ops/tasks/MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1-pal-role-world-sprite-alias-closure.md` 当前 review 实现。先读本卡 Build 证据与实现提交，再独立检查：alias 清单是否为 5 角色 / 51 引用；完整角色域闭包是否同时扫描 current/generated，显式报告巫后无候选并用合成 `sprite-525` 负例 fail-loud；共享 resolver/overlay 是否仍只在 asset/layout/poses 严格等价时归一且不新增 actor；生成 diff 是否精确为 4 定义 + 44 引用及镜像 baseline；二次迁移是否零计划。请复用现有全量与浏览器证据，避免重复跑耗时全量；把直接证据、返工项或 `accept` 写回 review -> done 表。Kimi / GLM accept 未齐前不得标记 done。

### 历史 draft 提示词

> 请合并审查任务卡 `docs/ops/tasks/MIG-PAL-ROLE-SPRITE-ALIAS-CLOSURE-1-pal-role-world-sprite-alias-closure.md`。先读 `AGENTS.md`、`CLAUDE.md`、`docs/phase2/READ-FIRST.md`、历史卡 `MIG-PAL-WORLD-SPRITE-ALIAS-1`，再直读 `packages/migrate/src/pal-world-sprite-layouts.ts:17-42`、`migrate-content.ts:2286-2296`、`pal-world-sprite-semantic-alias.ts` 与 `data/extracted/data/player-roles.json`。用户已指出赵灵儿仍重复；Codex 全库 census 得到唯一剩余四组：赵灵儿 6、林月如 18、阿奴 11、盖罗娇 9，共 44 引用 / 37 场景。Kimi 请审完整角色域双向闭包、resolver 与 fail-loud；GLM 请独立复跑 4/44/37 并至少抽查一名非赵灵儿角色的 extracted spriteNum / nSpriteFrames。把直接证据、可证伪观察与测试缺口写回卡，签 `premise verified + design agree` 或 `counter`。三签未齐前不得修改实现文件、不得重迁、不得标记 build / done。


#### GLM 独立 census 与审查（2026-08-24，全角色/全场景；本人 node 复算，非代理）

**premise verified——六项独立复算：**

1. **4 组严格重复 census 本人复跑逐数一致**：以 `{asset, layout, poses??null}` 为键对
   577 个定义分组——**恰 4 组重复**：sprite-3↔zhao-linger（pal.003）、sprite-7↔
   lin-yueru（pal.007）、sprite-5↔anu（pal.005）、sprite-26↔gai-luojiao（pal.026），
   全部 directional/framesPerDir 3。无第五组。
2. **44 引用 / 37 场景独立复算一致**：本人扫 generated scenes——zhao-linger 6 /
   lin-yueru 18 / anu 11 / gai-luojiao 9 = **44**，分布于 **37** 个场景——与卡文逐数吻合。
3. **44/44 extracted 回查零失败**：本人按 generated `entity.id` 回查对应 extracted
   scene `eventObjects`——全部命中同一 id、spriteNum 精确匹配（3/7/5/26）、
   `nSpriteFrames=3`。
4. **非赵灵儿抽查超额为全查**：卡文要求至少抽查一名——**本人把林月如 sprite-7 全部
   18 项逐一回查**（s021/e397 … s199/e3350），18/18 spriteNum=7、nSpriteFrames=3，
   明细已留档。
5. **player-roles 核验**：roleId 1=zhao-linger→spriteNum 3、roleId 2=lin-yueru→7、
   roleId 4=anu→5、roleId 5=gai-luojiao→26，全部 `walkFrames=0`（按迁移合同落
   directional 3 帧）——与卡文矩阵一致；**wu-hou（roleId 3, spriteNum 525）无
   sprite-525 数字定义且无任何 asset 重复**——"巫后无候选"结论独立确认，不能手写减一。
6. **根因直读**：`PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES`（layouts.ts:26-42）当前
   **只列 li-xiaoyao 一组**；`roleSpriteAliasFor`（migrate-content.ts:2286-2296）的
   scene 分支以 `sceneSemanticSpriteIds.has(roleSprite.id)` 门控——其余四角色被排除，
   数字定义照常生成。根因属实。

**design agree（附 GC1-GC2）：**

- **GC1（闭包门禁的"无候选"显式化）**：设计第 3 条的全角色审计必须对六名角色逐一输出
  `候选` 或 `无候选`——**wu-hou 的"无候选"须是被断言的结果**（sprite-525 数字定义
  不存在 + 无 asset 重复），而非隐式缺席；测试须含"人为添加 sprite-525 重复后审计
  变红"的负例，证明门禁真能抓第五组。
- **GC2（44 清单与产物双向闭合 + GR1 扩展到 51）**：逐引用证据清单（44 项）与重迁
  后 generated 场景引用集**双向 diff 为空**（清单外零引用、引用零遗漏——同上张卡的
  fail-loud 形态）；GR1 身份边界扩展断言 51 实体（7+44）全部无 `actor` 字段 +
  生产码 SpriteDef.id 身份比较扫描沿用 `pal-world-sprite-identity-boundary.test.ts`
  并把新四语义 id 纳入其动态 actor-id 正则源。

**可证伪观察**：①若重迁后任一语义定义的 asset/layout/poses/物理帧发生变化（验收第 5 条）
——snapshot 对照拦截；②若 44 清单外出现 `sprite-3/5/7/26` 引用或清单内引用未归一
——GC2 双向 diff 拦截；③若未来新增角色或 sprite 数字定义形成第五组重复而审计未红
——GC1 负例证明门禁失效即停线。

**测试缺口（build 前补）**：当前 `pal-world-sprite-identity-boundary.test.ts` 只动态
取 actors.json 全 id——四语义 id 本就在 actors 中，无需改；但 44 引用归一断言与
"清单双向闭合"断言是**新测试**，上张卡的 alias 测试只覆盖单组形态。
#### Kimi 审查（2026-08-24，迁移规则/闭包不变量；本人 python 全量复算 + 代码直读，非代理）

**premise verified（独立证据锚点）**：

1. **全库严格重复闭包（本人复跑）**：以 `{asset, layout, poses ?? null}` 为比较键扫
   `projects/pal/content/sprites.json`（577 定义），**恰好 4 个重复组**：
   sprite-3/zhao-linger、sprite-7/lin-yueru、sprite-5/anu、sprite-26/gai-luojiao；
   无第五组；`sprite-525` 不存在而 `wu-hou` 存在——“巫后无候选”是当前事实。
2. **44 引用 / 37 场景（本人复跑）**：按卡面四组清单逐条比对，我的 census 与卡面
   **逐条一致**（6/18/11/9，合计 44，场景 37）。
3. **44/44 extracted 回查零失败（非抽查）**：用当前 `entity.id` 回查
   `data/extracted/data/scene/<n>.json` 的 `eventObjects`，44 项全部唯一命中同 id、
   `spriteNum` 与角色表一致（3/7/5/26）、`nSpriteFrames=3`。另扫全部 extracted 场景：
   spriteNum∈{3,5,7,26} 且 `nSpriteFrames≠3` 的对象**为零**——无布局变体风险。
4. **身份边界**：44 个当前生成实体**无一含 `actor` 字段**（本人逐条核验）；生产码身份
   边界扫描由历史卡 GR1 测试在位（`pal-world-sprite-identity-boundary.test.ts`）。
5. **根因与共享 resolver 直读**：`pal-world-sprite-layouts.ts:23-42` 当前别名清单只有
   li-xiaoyao（7 引用）；`migrate-content.ts:2287-2297` 的 `roleSpriteAliasFor` 三重条件
   （asset 相等 / layout 相等 / scene 用途需 allowlist）属实；`pal-migration.ts:493-502`
   把 `PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIAS_IDS` 接进场景迁移——范围遗漏根因成立。
   `pal-world-sprite-semantic-alias.ts` 的等价深比（asset+layout+poses）、引用集合双向
   fail-loud 与只改 `sprite` 字段的 overlay 均已存在，可原样消费四组新条目。

**可证伪观察**：若全库出现第五组严格重复（如未来迁移引入），闭包门禁必须 fail——设计 §3
的双向一致性覆盖；若任一 44 对象的 extracted spriteNum/nSpriteFrames 与角色合同不符，本人
复跑会失败——实跑零失败；若归一给任一实体新增 `actor`，GR1 扩展断言（51 项）应红——当前
44 项零 actor；若 `roleSpriteAliasFor` 的 scene 用途绕开 allowlist，等价门控即失效——
:2295 直读未见绕过。

**design agree（附 KB1-KB2，不阻塞准入）**：
- **KB1（闭包门禁的枚举源）**：候选集合必须由 `mapRoleSpritesByNumber` 的完整角色域 ×
  current/generated 数字定义计算，并与别名证据清单双向相等；wu-hou 落为显式“无候选”、
  li-xiaoyao 落为显式“已闭包”，禁止从六人手写减一。测试须含合成第五组 fixture 证明
  fail-loud。
- **KB2（复用既有 overlay，不新写第二套）**：四组新条目只扩
  `PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES` 的逐引用证据（每项带 extracted 锚点文案），
  overlay/门禁/发布应用点零新逻辑；migration diff 预期精确为 4 定义删除 + 44 行引用归一 +
  baseline 镜像 + `_state.json`。

**测试缺口登记**：GR1 身份断言需从 7 扩到 51 项；闭包门禁需合成第五组负例；
current/generated 引用集合漂移负例沿用历史卡既有测试形态。
- 2026-08-24 GLM（终审）: 按五项委托完成 done 前终审并签 **accept**。5/51 清单、巫后无候选
  + 合成 525 负例 fail-loud（GC1 超额）、三条件等价与 actor 零新增（双镜像实测）、4 定义/
  44 引用精确、replay 537 零计划幂等、573 定义四 ID 零残留、focused 7 tests + typecheck 全绿。
  未改实现，未代签 Kimi，未标 done。

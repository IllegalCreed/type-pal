# MG2 - 迁移器结构化三方合并与安全重导

Status: draft
Phase: phase2
Capability: MG2(增量合并)
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

让 `data/extracted -> projects/pal` 的内容迁移恢复为可持续重跑的安全管线。迁移器必须先独立生成不受当前产物污染的 `theirs`，再以“上次纯迁移产物 `base` / 当前人工工程 `ours` / 本次纯迁移产物 `theirs`”做结构化三方合并。无冲突时同时吸收上游修复和保留人工编辑；有冲突时在写盘前停止并给出精确 JSON Pointer 报告，禁止静默覆盖。

## 用户裁决

- 2026-07-05 D22：MG2 采用三方合并，迁移器内部负责解决重导覆盖人工修改的问题；引擎和编辑器不引入运行时双层内容。
- 2026-07-13：所有数据迁移类问题优先修上游真源；只改 `projects/pal` 产物不算完成，全量重迁必须有白名单和双跑幂等证据。
- 2026-07-13：M3 已完成脚本去内联和按场景分片，但当前 `migrate:content` 为保护人工内容被收窄为只写脚本绑定和 `content/scripts/**`。MG2 负责恢复其余迁移域的安全更新能力。

## 范围

- 范围内:
  - 把 PAL 内容生成整理为不读取 `projects/pal` 的纯生成核，产出完整 `MigrationFileSet`、托管文件清单和迁移报告。
  - 把仍依赖盘上产物的有效 patch 审计并迁回纯函数迁移/overlay；无效或已被主迁移器吸收的 patch 明确退役。
  - 建立持久 `base`、结构化三方合并、冲突报告、首次 bootstrap 和事务式写盘。
  - 恢复 actors/sprites/items/skills/enemies/enemyTeams/locale/scenes/scripts 等迁移域的全量安全更新。
  - 对文件新增/删除、对象字段、稳定 id 数组、场景页、脚本 chunk/index 分别定义合并策略。
  - 将迁移计划、冲突、校验和二次零 diff 纳入自动门禁。
- 范围外:
  - `packages/reforge` 或 `packages/editor` 的运行时合并层。
  - N6 共享脚本编辑器 UX；本卡只保证将来编辑后的工程不会被迁移器静默覆盖。
  - 资产烘焙和二进制素材三方合并；当前 `migrate:content` 不托管这些文件。
  - 把 MG2 扩成任意第三方工程的通用产品功能；首个且唯一目标工程是 `projects/pal`。
- 明确不做:
  - 不依赖 `git show`、提交号或聊天记录恢复 `base`。
  - 不做文本行级 JSON merge，不把所有数组按下标盲合。
  - 不把 baseline 放进 `projects/pal`、manifest、运行时包或用户导出 zip。
  - 不提供“整库 prefer ours/theirs”开关绕过冲突。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md:17-25,46-55,77-83`：迁移缺陷优先修上游；迁移管线变更必须三方签字。
  - `docs/phase2/READ-FIRST.md:26,47`：铁律 10，生成产物禁止单点补丁。
  - `docs/phase2/decisions.md:242-252,284-292`：D20/D22，MG2 是迁移器内部三方合并，不进入引擎/编辑器架构。
  - `docs/phase2/capability-map.md:130-137`：MG2 当前为缺失能力，落地前全量重迁存在覆盖风险。
- 代码锚点(`file:line`):
  - `packages/migrate/scripts/migrate-content.mts:31-112`：源数据装载和完整迁移结果计算。
  - `packages/migrate/scripts/migrate-content.mts:113-122`：当前回读盘上 `enemies.json` 作为脚本根，导致 `theirs` 被 `ours` 污染。
  - `packages/migrate/scripts/migrate-content.mts:124-150`：M3 先审后写，但当前只合并场景脚本绑定，并整目录删除重建 scripts。
  - `packages/migrate/src/migrate-content.ts:956-1132`：现有数据迁移纯逻辑入口 `migrateAll`。
  - `packages/migrate/src/migrate-content.ts:1221-1269`：现有窄域 `mergeSceneScriptBindings`，证明页面字段与脚本绑定需要不同所有权。
  - `packages/migrate/src/migrate-content.ts:1279`：场景静态和脚本迁移入口 `mapScenesStatic`。
  - `packages/migrate/src/script-overlays.ts:9-70`：已落地的不读旧产物纯函数演出 overlay 范例。
  - `packages/migrate/scripts/patch-enemy-choreo.mts:37-64`、`patch-boss-encounters.mts:39-105`、`patch-scene-stages.mts:42-57,317-345`：仍以盘上产物为输入的历史 patch，需要逐项迁回纯生成或确认退役。
  - `packages/content/src/script-library.ts:3-35,68-82`：`ScriptRef` 稳定身份、chunk 只是加载提示、分桶可重推导。
  - `packages/editor/src/core/project-io.ts:69-138`：编辑器真实会保存的文件域和 scripts round-trip。
  - `packages/editor/src/core/project-io.ts:147-209`：现有增量写盘只比较本次编辑器快照，不是迁移三方合并。
- 已知坑 / 审计文档:
  - `docs/ops/tasks/M3-wander-arm-explosion.md`：M3 已把脚本体积、引用完整性、纯函数李大娘 overlay 和双跑幂等钉住；MG2 不得破坏这些门禁。
  - `packages/migrate/scripts/migrate-content.mts` 历史版本曾全量覆盖 295 场景和七张主表；当前收窄不是 MG2 已完成，而是临时止损。
  - 当前 `projects/pal/content` 约 14 MiB，其中 scripts 约 8.2 MiB；baseline 是开发期迁移状态，不得进入运行时内存或发行包。
- 不得重新引入:
  - 运行时 base/override 双层内容、下标身份、隐式 last-wins、整目录 `rmSync`、读取旧产物再生成新产物。
  - 把 generated/manual 判断写成散落在 IO 脚本里的字段特判。
  - 用数组位置作为 actors/items/entities/scripts 的持久身份。
- 相关测试:
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/pal-project.test.ts`
  - `packages/migrate/src/script-library-audit.test.ts`
  - `packages/migrate/src/script-overlays.test.ts`
  - `packages/editor/src/core/project-io.test.ts`

## 验收条件

### 功能

- `theirs` 由纯生成核产出；改变任意 `projects/pal` 当前内容不会改变 `theirs` 的哈希和报告。
- 完成托管域清单，manifest、music、battle-fields、poisons、ambiences、shops、tilesets、自有 maps/assets 等非迁移托管文件保持原字节不变。
- 正确执行 `base/ours/theirs` 三方真值表，支持字段和条目级无冲突合并；同一路径双改必须产生 conflict。
- `base` 保存“上一次纯生成的 theirs”，不得保存合并后的工程；本次成功后更新为本次纯 `theirs`。
- 首次无 baseline 时只生成 bootstrap 报告；所有 current-vs-fresh 差异完成 `ours/theirs/upstream-overlay` 分类前不得写盘或建立伪 baseline。
- 冲突报告至少包含文件、JSON Pointer、冲突类型、base/ours/theirs 三值；控制台可摘要，落盘报告必须完整。
- 任一生成门禁、schema 校验或冲突失败时，`projects/pal` 和 baseline 均保持原样。
- 成功写盘使用 staging + 提交协议；中途异常可恢复，不留下半套新工程/旧 baseline。
- scripts 不再整目录删除；用户新增的非托管 chunk 文件不得丢失，删除旧生成 chunk 也必须遵守三方删除规则。
- 合并后的 script chunk 必须重算 imports、bytes、hash 和 index，随后通过引用、孤儿、体积与 closure 门禁。

### 测试

- 三方合并单测覆盖：primitive、对象递归、字段新增/删除、两边同改、两边异改、文件新增/删除、用户新增文件、生成文件退役。
- 数组测试覆盖：稳定 id 增删改、单边/双边重排、无 id 顺序数组原子冲突、场景 entity id 合并、pages 按槽递归、stage/body 双改冲突。
- 文件域矩阵覆盖：actors、sprites、items、skills/levelUp、enemies、enemyTeams、locale、scenes/index、单场景、scripts/index、script chunk。
- 纯生成回归：对 fixture 的 `ours` 任意改值，`theirs` 输出哈希不变；禁止重新出现 `read projects/pal -> generate theirs`。
- 写盘测试覆盖：冲突零写盘、校验失败零写盘、故障注入回滚、baseline 只在成功后推进、非托管文件字节哈希不变。
- 在临时目录完成首次 bootstrap 演练和全量合并，报告中每个差异都有分类，无通配遗漏。
- 对真实 `projects/pal` 写盘前保存哈希清单；写盘后白名单外差异为 0。
- 连续执行第二次迁移必须计划 `writes=0/deletes=0/conflicts=0`，工作树零差异。
- `pnpm --filter @type-pal/migrate run check`、相关 editor/content/reforge 测试和最终 `pnpm check` 全绿。

### 文档

- 更新 `packages/migrate/README.md`：CLI 的 plan/bootstrap/write 用法、baseline 语义、冲突处理和禁止事项。
- 更新 `docs/phase2/capability-map.md`：仅在三方审查和用户验收通过后把 MG2 标为 done。
- 历史 patch 脚本逐个标明“迁回纯生成后退役”或保留原因，禁止继续形成第二套写盘入口。

### 视觉 / 手工验证

- 用重迁后的真实 `projects/pal` 在 6051 前台运行：新游戏 s000->s001、跨场景入口、一次普通战斗、一次商店/道具流程。
- 网络面确认进入场景只按需请求 M3 chunk，不因 MG2 baseline 或 merge 状态增加任何运行时请求。
- 本任务无新 UI 形态，但生成内容影响范围大；Codex 完成前台烟测，Opus review 时至少复验开场和一个跨场景/战斗链。

## 推进签字

签字是阶段门禁。迁移管线变化属于三方必审，三签不齐不得修改实现文件。

### 进入 build 前:设计签字

- Codex: **agree**（2026-07-13；实现可行。主张先纯生成、再显式策略三方合并、最后事务写盘；首次 bootstrap 全差异审计是必落项）
- Opus: **agree**（2026-07-13;六维压力测试通过——baseline"上次纯 theirs"语义是三方合并唯一正确锚(hash-only 正确否决:旧 theirs 不可由源+新代码重推导);删除真值表/非托管保护/派生元数据后置重算/Command[] 原子+overlay 逃生口全对。附 M1-M4 必改:①baseline 推进纳入同一 journal 事务域+故障注入;②id 数组确定性输出顺序入策略表;③pages 页数变化规则显式(槽位=状态身份,positional 合法);④patch 纯函数化先于 bootstrap(顺序钉死,否则差异清单被 patch 效应淹没)。N1-N3 非阻塞。详见 Opus 压力测试段）
- GLM: **agree**（2026-07-13）。四项复核逐项：

  **(1) 托管文件域矩阵完整性——对照 projects/pal/content 实际文件 + editor project-io 保存面**：

  content 实际文件（13 个顶层 + scenes/ + scripts/）：
  actors / ambiences / battle-fields / enemies / enemy-teams / items / locale / music / poisons / shops / skills / sprites / tilesets + scenes/index.json + scenes/s*.json (295) + scripts/index.json + scripts/chunks/**/*.json (294)

  策略表（Draft C）覆盖的域：actors/items/sprites/enemies/enemyTeams ✅ / skills ✅ / locale ✅ / scenes/index + scene ✅ / scripts/index + script chunk ✅

  **策略表未显式列的域**：
  - **battle-fields.json**：迁移器产物但策略表无。它是什么策略？ → 同 actors（根数组按 id 合并）。**非托管**还是**托管**？manifest 引用了 → 编辑器会写 → **应托管**。⚠ 策略表缺。
  - **music.json**：同上。迁移器产物 + manifest 引用 + 编辑器写。策略表缺。⚠
  - **poisons.json**：同上。⚠
  - **ambiences.json**：同上（W6 新增域）。⚠
  - **shops.json**：同上。⚠
  - **tilesets.json**：W7B 新增（注册表）。迁移器产 + 编辑器写。策略表缺。⚠
  - **dither-false-color.json**（X3 第四版 profile）：manifest 引用，迁移器 bake 产。策略表缺。⚠

  **结论**：策略表列了 7 类域，但**缺 7 个域**（battle-fields / music / poisons / ambiences / shops / tilesets / dither-false-color）。这 7 个都是迁移器产出 + 编辑器会写的托管文件。**建议**：Draft C 策略表补这 7 个域，策略全部"根数组按稳定 id 合并"或"对象递归"（视 schema 结构定）。**非阻塞**——Codex 落 M1-M4 时一并补策略表，7 个域都是简单数据表没有复杂嵌套。

  **"非托管保持原字节"边界**：验收 §82 列了 manifest/music/battle-fields/poisons/ambiences/shops/tilesets/自有 maps/assets——但这里 music/battle-fields 等同时出现在"非托管"和"迁移器产出"——**有矛盾**。澄清：这些文件**是迁移器产出的托管文件**（迁移器会更新它们），不是"非托管保持原字节"。验收 §82 应改为"manifest.json 本体 + 工程 assets/ 目录 = 非托管；music/battle-fields/poisons/ambiences/shops/tilesets = 迁移器托管的简单数据表"。⚠ 非阻塞，建议 Codex 落 Draft 时纠正措辞。

  **(2) Bootstrap 分类可操作性——差异规模预估**：

  当前 ours vs fresh theirs 的差异来源：
  - 三 patch 效应（enemy-choreo / boss-encounters / scene-stages）：**数百条差异**（patch 写的 choreography/onDefeated/trigger stages 等）。M4 要求先纯函数化 → 迁入纯核后 fresh theirs 含这些 → 差异从"数百条"降到"零"。✅ M4 顺序正确。
  - M3 后手工编辑（s000/s001 dither/speaker/center/李大娘/coveredBy/隐蛊等）：约 **20-30 条**（patch-scene-stages.mts 列的清单）。这些在 overlay 里 → 迁入纯核后 fresh theirs 也含 → 差异降。
  - X3 dither profile / W7B tilesets / W6 ambiences：新增域，基线没有 → bootstrap 会报"ours 有 theirs 无"。分类 = "保留人工 ours"。

  **M4 先行后，bootstrap 分类工作量**：预估 10-20 条差异（新增域 + 少量未迁入 overlay 的手工内容）。**可操作**。✅

  **(3) 测试矩阵——M1-M4 对应项**：

  验收 §94-102 覆盖：
  - M1（journal 事务域+故障注入）：§98 "故障注入回滚、baseline 只在成功后推进"。✅ 但没有**显式的"baseline 推进中断"故障注入**。建议补（Opus M1 要求的"在 baseline 推进中途 kill"）。⚠ 非阻塞，build 时补。
  - M2（id 数组确定性输出顺序）：§97 "对 fixture 的 ours 任意改值，theirs 输出哈希不变"间接覆盖确定性。但没有**显式的"合并后数组顺序固定"断言**。建议补。⚠ 非阻塞。
  - M3（pages 页数变化）：§95 "pages 按槽递归、stage/body 双改冲突"覆盖了双改，但**缺"一侧加页/删页"的 add/delete 规则测试**。建议补。⚠ 非阻塞。
  - M4（patch 吸收回归）：§97 "纯生成回归：禁止重新出现 read projects/pal -> generate theirs"间接覆盖。但**缺"patch 净效应吸收后产物与原 patch 输出一致"的回归锚**。建议补。⚠ 非阻塞。
  - 七域矩阵（actors/sprites/items/skills/enemies/enemyTeams/locale/scenes/scripts）：§96 覆盖完整。✅

  **测试矩阵基本完整，4 条非阻塞补充（M1-M4 各一条显式断言）。**

  **(4) 二次零 diff 门禁口径**：

  验收 §101："连续执行第二次迁移必须计划 writes=0/deletes=0/conflicts=0，工作树零差异。"——**严格空计划**（不是"写出相同内容"）。✅ 口径正确。

  **总结**：域矩阵缺 7 个简单数据表（非阻塞，Codex 补策略表时一并加）；"非托管"措辞需纠正（非阻塞）；bootstrap 差异规模 M4 先行后可操作（10-20 条）；测试矩阵 4 条非阻塞显式断言补充；二次零 diff 口径正确。**agree**。

- counter / 分歧处理: 无架构 counter。域矩阵缺 7 域 + 措辞纠正 + 4 条测试补充 = 非阻塞，Codex 落 M1-M4 时一并处理。
- 缺签豁免: N/A
- build 准入结论: **待 Codex 把 M1-M4 + GLM 指出的 7 域策略表 + 措辞纠正 + 4 条测试补充落进 Draft 后，三签齐进 build。**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### A. 先建立纯生成边界

新增纯生成编排层，形态暂定为：

```ts
interface MigrationFileSet {
  files: Map<string, JsonValue>
  managedFiles: Set<string>
  report: MigrationReport
}

function buildPalMigration(sources: PalMigrationSources): MigrationFileSet
```

- IO 壳只负责读取 `data/extracted` 并组装 `sources`；`buildPalMigration` 不读文件系统、不接收当前 `projects/pal`。
- `migrateAll`、`mapScenesStatic`、M3 graph/chunk、PAL overlay 都在纯生成编排层内串联。
- `patch-enemy-choreo`、`patch-boss-encounters`、`patch-scene-stages` 的仍有效净效应必须移入纯转换；已被当前翻译器覆盖的逻辑用回归测试证明后退役。
- 当前从盘上 enemies 收集 `choreography/onDefeated` 根的路径必须消失；根只能来自本次纯迁移后的 enemy 输出和确定性 overlay。
- 所有门禁在生成完成、写盘之前执行。

### B. Baseline 语义与位置

- baseline 提案位置：`packages/migrate/baselines/pal/`，按托管相对路径镜像完整 JSON；另有 `_state.json` 保存格式版本、托管文件清单和各文件 SHA-256。
- baseline 是上一次纯 `theirs`，不含人工合并结果。完整值用于精确冲突报告和删除判断，不依赖 Git 历史。
- 当前规模约 14 MiB，作为开发期、可 Git delta 的安全快照接受；不被 workspace runtime 引用，不进入 `projects/pal` 或导出 zip。
- 如果审查方认为仓库体积不可接受，可以 counter 并提出“保持完整三值和可读冲突报告”的等价存储；仅存整文件 hash 不足以支持字段级合并。

### C. 显式结构化合并策略

通用三方规则：

1. `ours == base`：取 `theirs`。
2. `theirs == base`：取 `ours`。
3. `ours == theirs`：取任一方。
4. 三者都不同：对象继续递归；命中原子边界则 conflict。

策略必须集中登记，不依赖“数组看起来有 id”之类运行时猜测：

| 文件域 | 合并策略 |
|---|---|
| actors/items/sprites/enemies/enemyTeams | 根数组按稳定 `id` 合并；条目对象递归；未登记的内部数组原子处理 |
| skills | `skills` 按 `id`；`levelUp` 按角色 key，单角色有序表原子处理 |
| locale | 按 locale key 递归，互不相交的新键自动合并 |
| scenes/index | 以 scene id 做成员合并；仅一边改顺序时采用该边，双边不同重排 conflict |
| scene | 对象递归；`entities` 按 id；`pages` 按槽位递归；`stages/body` 是有序语义序列，原子处理 |
| scripts/index | `chunks` 按 chunk id 合并；shard 配置为原子 contentVersion 决策 |
| script chunk | `scripts` 按 script id；每个 `Command[]` 原子处理；imports/bytes/hash 由合并结果重算 |

文件级新增/删除也走同一真值表。迁移器只能删除 `base` 或 `theirs` 中声明的托管文件；从未托管的文件永远不动。

### D. 首次 bootstrap

仓库没有可信的“上一次纯生成快照”，禁止拿当前工程冒充 base。首次流程：

1. 纯生成 fresh `theirs`，不写项目。
2. 对 current `ours` 与 fresh 做完整结构化差异清单，按文件/稳定 id/JSON Pointer 分组。
3. 每项分类为：保留人工 `ours`、接受新生成 `theirs`、或先回迁为 `upstream-overlay` 后重新生成。
4. 分类文件必须精确覆盖全部差异；无匹配、重复匹配和宽泛整库规则都失败。
5. 三方审查 bootstrap 报告后，才写合并工程并把 fresh 保存为首个 baseline。

bootstrap 是一次性迁移审计，不允许默认“全 ours”或“全 theirs”。

### E. Plan、冲突与事务写盘

- CLI 默认只 plan；显式 `--write` 才能写盘。`--bootstrap` 在无 baseline 时生成首次分类报告。
- 先在内存/临时目录完成生成、merge、schema、M3 audit 和项目加载校验；任一 conflict 或校验失败直接退出非零。
- 冲突报告保存完整 base/ours/theirs，控制台只输出摘要和报告路径。
- 写盘前再次核对 current 文件哈希，防止 plan 后并发编辑造成 TOCTOU 覆盖。
- staging 中构造完整目标；提交时使用临时文件 + rename，并维护可恢复 journal。baseline 只在工程文件全部提交成功后推进；异常启动时按 journal 恢复旧状态或完成同一事务。
- 禁止 `rmSync(content/scripts)`；旧生成文件的删除由 managed file 三方规则决定。

### F. 后置归一化与门禁

- 合并后重新派生 script imports、chunk bytes/hash 和 index，不信任任一输入里的派生元数据。
- 跑 content schema、scene id/ref、script ref/index、孤儿、10x 体积、最大 chunk/依赖闭包和 pal-project 契约检查。
- 输出机器可读 summary：generated/kept/merged/conflicts/writes/deletes/unmanaged-unchanged。
- 第二次同输入运行必须是严格空计划，不能靠“写出相同内容”冒充幂等。

### 已知风险

- 风险：首次 bootstrap 把过期生成值误认成人工内容。
  - 缓解：全差异显式分类；迁移缺陷优先改成 pure overlay，不允许默认全 ours。
- 风险：数组按位置合并导致实体/条目串位。
  - 缓解：策略注册表；有稳定 id 的域按 id，无身份的有序序列原子冲突。
- 风险：M3 分桶变化导致 chunk 路径大改或用户脚本丢失。
  - 缓解：script id 是身份，chunk 是提示；按 script id 合并并重算 index，分桶配置双改直接 conflict。
- 风险：baseline 约 14 MiB 增加仓库体积。
  - 缓解：仅开发期、Git delta、零运行时成本；若改存储必须保留完整三值和字段级可审计性。
- 风险：旧 patch 与主迁移器重复执行。
  - 缓解：每个 patch 建净效应回归，迁入后删除或改为只读审计，禁止第二写盘入口。
- 风险：多文件写到一半进程终止。
  - 缓解：staging、journal、哈希复核、可恢复提交；故障注入测试钉住。
- 风险：非托管用户内容被目录级清理误删。
  - 缓解：只按 managed file set 操作，非托管文件前后 SHA-256 清单必须一致。

### 主审立场

- Reviewer: Opus（架构/事务/合并语义主审）+ GLM（迁移域覆盖/bootstrap/测试矩阵复核）
- 结论: **Opus agree,附 M1-M4 必改(设计层补明,非架构推翻)+ N1-N3 非阻塞**。
- 是否建议进入 build: 否——M1-M4 落进 Draft + GLM 签字后三签齐方可。

### Opus 压力测试(2026-07-13,六维)

- **① baseline 语义 —— 通过,一处必改**。"base = 上次纯 theirs"是三方合并唯一正确锚:base 若存合并结果,人工编辑会被吸进 base 而伪装"未改",上游回退会静默获胜——Codex 语义正确。hash-only 替代已正确否决:字段级合并必须有 base 完整值,且生成器代码本身在版本间变化(这正是"上游修复"),旧 theirs 不可由源+新代码重推导,完整快照是唯一可靠形态。14MiB 开发期 Git delta 可接受;baseline 必须进 Git(跨机器/跨 Agent 共享,否则每个 clone 都要重新 bootstrap)。
  - **【M1】baseline 推进纳入同一 journal 事务域**:Draft E 只说"工程文件全部提交成功后推进 baseline"——"工程已提交、baseline 未推进"的崩溃窗口必须显式定义恢复分支(recovery 补完 baseline 或整体回滚,二选一钉死),baseline 文件写入本身进 journal,并加故障注入测试(在 baseline 推进中途 kill)。否则下次运行会把刚合并的工程当 ours、旧 base 当基,人工编辑与上游修复的判定全错。
- **② 合并边界 —— 方向对,两处必改**。Command[] 原子(脚本是语义序列,元素级合并危险,冲突走 overlay 逃生口)✓;script index/imports/bytes/hash 一律后置重算、不信任输入派生元数据 ✓(派生 vs 源数据分离正确);shard 配置原子 conflict ✓。
  - **【M2】id 数组的确定性输出顺序未定义**:策略表只给 scenes/index 定了顺序规则,actors/items/enemies 等"按稳定 id 合并"后的**输出顺序**没说。顺序不定 = 二次零 diff 门禁会因顺序漂移误报、编辑器 diff 噪音。必须写进策略表(建议:theirs 顺序为骨架,ours 独有条目按其 base 前驱锚点插入、无锚则尾部追加;任选但要确定性+文档化+测试)。
  - **【M3】pages 槽位递归的页数变化规则要显式**:页 = 状态槽位身份(原版 sState 页),positional 递归**合法**(不违反"禁下标身份"——槽位就是语义身份);但两侧页数相对 base 不一致时(一侧加页/删页)的 add/delete/双改 conflict 规则必须写明,防插入错位静默串页。
- **③ 文件删除与非托管保护 —— 通过**。删除走同一真值表(theirs 删+ours 未改=删;ours 删+theirs 未改=保持删;theirs 删+ours 改=conflict);只动 base∪theirs 声明的托管文件;managed 清单持久在 `_state.json`(生成器版本变化时清单演进有据);非托管前后 SHA-256 一致 ✓。双方同增同路径:相等取一、不等 conflict,由通用规则覆盖 ✓。现状 `rmSync(scripts)` 整目录重建(锚点核实)被 E 明令废除 ✓。
- **④ bootstrap —— 通过,一处必改**。全差异显式分类、禁通配、禁默认全 ours ✓ 是防"陈旧生成值误认人工内容"的唯一诚实做法。
  - **【M4】历史 patch 纯函数化必须先于 bootstrap 分类(顺序钉死)**:三个 patch(enemy-choreo/boss-encounters/scene-stages,锚点核实全部读盘上产物)的净效应目前在 ours 里、不在 fresh theirs 里——若不先迁入纯生成核,bootstrap 差异清单会被数百条 patch 效应淹没,逐条人工分类 = 误分类温床。顺序:patch 净效应迁入纯核(回归测试先红后绿)→ 退役 patch → 再跑 bootstrap;bootstrap 允许迭代(分类→回迁 upstream-overlay→重生成→复差)直至清单闭合。
- **⑤ 事务写盘 —— 骨架对,M1 之外补实现纪律(N3)**。staging 全量构造→TOCTOU 哈希复核→journal→临时文件+rename 提交→恢复,序对;门禁全部在写盘前 ✓。
- **⑥ patch 纯函数化 —— 见 M4**;每 patch"净效应回归证明吸收→删除",禁第二写盘入口 ✓;script-overlays.ts 已是范例(语义锚+幂等)。
- **N1-N3 非阻塞建议**:
  - N1: baseline 的 Git 合并冲突处置写进 README——**禁止手工合并 baseline**,冲突时重跑迁移再生成;baseline 是机器产物不是人审对象。
  - N2: 迁移写盘与编辑器会话互斥要留一句话:TOCTOU 哈希复核只防"plan 后编辑器写",不防"迁移写后编辑器用陈旧快照回存"——写盘后编辑器须重载(或迁移检测 editor 持锁时拒写),落 README 操作纪律即可。
  - N3: journal 先写先 fsync 再首个 rename、rename 幂等可重放;故障注入测试覆盖"journal 后第 k 个 rename 中断"与"baseline 推进中断"(配合 M1)。

### 三方争议记录

- Codex: 支持“纯生成 + 完整 baseline + 显式策略三方合并 + 事务写盘”；反对读取当前产物生成 theirs、运行时双层和 hash-only baseline。
- Opus: 与 Codex 全部主张一致(含 hash-only 否决的推理补强:生成器代码本身随版本变化,旧 theirs 不可重推导,完整快照是唯一可靠 base)。无分歧;M1-M4 是设计精化不是对抗立场。
- GLM: pending
- 用户拍板: 已批准开始 draft；未批准缺签进入 build。

## 额度 / 代班记录

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: 尚未开始，设计三签未齐。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

## 视觉验证记录

- Visual Verification Owner: Codex + Opus
- 验证方式: 6051 前台运行重迁后的 PAL 工程；详见验收条件。
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: 全部，尚未进入 build。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: 已批准启动 draft；最终验收 pending。
- 后续任务: MG2 完成后清理迁移报告尾账，再开 N6 共享脚本编辑器任务。

## 交接日志

- 2026-07-13 User: 批准开始 MG2。Next: Codex 完成 draft，不得越过三签门禁。
- 2026-07-13 Codex: 审计确认 M3 只恢复脚本域安全重迁；完整数据域仍不写盘，且当前生成脚本回读盘上 enemies、历史 patch 依赖旧产物。完成“纯生成 + baseline + 结构化 merge + bootstrap + 事务写盘”设计并签 agree。Evidence: 本卡上下文锚点与 Draft。Next: Opus 架构设计签字，不得开始实现。
- 2026-07-13 Opus: 设计签 **agree + M1-M4 必改**。锚点核实:mts:113-122 enemies 回读污染、mts:139-141 `rmSync(scripts)` 整目录重建、三 patch 全读盘——现状审计属实。六维压力测试:baseline 语义(唯一正确锚,含"工程已提交 baseline 未推进"崩溃窗 → M1 journal 事务域+故障注入)、合并边界(M2 id 数组输出顺序缺失会破二次零 diff;M3 pages 页数变化规则;Command[] 原子✓派生重算✓)、删除/非托管(真值表覆盖✓)、bootstrap(M4 patch 纯函数化必须先行,否则分类清单被淹没;允许迭代收敛)、事务(骨架✓,N3 fsync/rename 幂等/故障注入)、patch 顺序(=M4)。N1 禁手工合并 baseline、N2 编辑器互斥纪律。Evidence: Opus 压力测试段。Next: Codex 把 M1-M4 落进 Draft;GLM 复核文件域矩阵/bootstrap 可操作性/测试矩阵;三签齐后 build。未改实现文件。

## 下一位 Agent 提示词

```text
接手任务: MG2 迁移器结构化三方合并与安全重导,设计复核(GLM)
任务卡: docs/ops/tasks/MG2-incremental-migration-merge.md
当前状态: draft;Codex agree + Opus agree(附 M1-M4 必改),GLM pending,build blocked。
你的角色: GLM,迁移域覆盖/bootstrap 可操作性/测试矩阵复核;只审设计,不改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部,重点 Draft A-F + "Opus 压力测试(六维)"段。
Opus 已过并附必改: M1 baseline 推进纳入同一 journal 事务域(含"工程已提交 baseline 未推进"恢复分支+故障注入);M2 id 数组合并的确定性输出顺序入策略表(否则二次零 diff 因顺序漂移误报);M3 pages 页数变化的 add/delete/conflict 规则显式(槽位=状态身份,positional 合法);M4 历史 patch 纯函数化+回归退役先于 bootstrap 分类(顺序钉死)。N1-N3 非阻塞(禁手工合并 baseline/编辑器互斥纪律/journal fsync+rename 幂等)。
请你复核: (1)托管文件域矩阵完整性——对照 projects/pal/content 实际文件清单与 editor project-io 保存面,验证策略表无遗漏域(battle-fields/poisons/ambiences/shops/music/tilesets/own-maps 的"非托管保持原字节"边界是否与编辑器写盘面一致);(2)bootstrap 分类的可操作性——预估当前 ours vs fresh 差异规模(三 patch 效应+M3 后手工编辑),分类工作量是否现实,upstream-overlay 回迁通道是否够用;(3)测试矩阵完整性——验收"测试"节是否覆盖 M1-M4(journal 故障注入×2/顺序确定性/pages 页数变化/patch 吸收回归)与七域矩阵;(4)二次零 diff 门禁的计量口径(严格空计划,非"写出相同内容")。在设计签字 GLM 行签 agree/counter,更新交接日志;agree 即三签待 Codex 落 M1-M4 后进 build。
不要做: 不改实现文件;不跑会写 projects/pal 的迁移命令;不改 build 状态。
输出要求: 明确 agree/counter、域矩阵差集、bootstrap 规模预估、测试矩阵评估、提交 hash。
```

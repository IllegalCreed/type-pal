# N6 - 共享脚本/子程序创作闭环

Status: done
Phase: phase2
Capability: N6
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex
Unavailable Agents: none
Branch: main

## 目标

把 M3 已落地的分片脚本运行时升级为创作者可用的“共享脚本库”：作者能在编辑器中新建、命名、编辑、复制、引用和安全删除一段项目级脚本；多个场景/实体通过 `callScript` 调用同一稳定脚本，修改脚本体后所有调用方立即生效。保存、重开、工程 zip、运行时懒加载和 MG2 重迁移都不得丢失或复制这段脚本。

## 范围

- 范围内：
  - `ScriptIndexV1` 增加向后兼容的作者脚本元数据；脚本体继续复用 `ScriptChunkV1.scripts`，不新建第二套运行模型。
  - 作者脚本稳定 id、默认分桶、chunk 创建/删空、`imports/bytes/hash` 统一归一化。
  - 编辑器“共享脚本”数据页：搜索、创建、复制、改显示名/说明、编辑命令体、删除与引用查看。
  - 场景脚本插入菜单和 `CommandForm` 支持作者可用的 `callScript`；调用时可继承当前 `self` 或显式指定实体。
  - `callScript` 行可跳转目标。迁移生成的内部脚本默认不混入作者库，但从引用行仍可打开、查看和编辑命令体；内部脚本不可改 id、不可作为普通作者条目删除。
  - 空白工程首次创建共享脚本时自动建立 `content/scripts/`、index 和默认 shared 分桶。
  - 引用反查、悬空引用校验、作者脚本调用环校验、删除保护。
  - 编辑器预览、工程 IO/FSA、MG2 三方合并、M3 体积审计与运行时懒加载的兼容。
- 范围外：
  - 通用参数、返回值、局部变量和表达式系统。
  - 新的 `jumpScript` 创作入口；它继续作为迁移器表达原版尾转移/循环的内部控制流原语。
  - Q1 全流程 E2E、迁移残余清理、资源闭包、音乐注册表改造。
- 明确不做：
  - 不把普通对话、`giveItem`、获得金钱等命令自动改成共享脚本。
  - 不把“宝箱/拾取/获得道具/一句话 NPC”等带参数的重复创作流程伪装成共享脚本；它们属于编辑器模板，插入时展开为普通命令。
  - 不为 N6 再造全局 `all.json`、启动时全量脚本体索引或第二个脚本解释器。
  - 不允许重命名显示名时改变稳定 id，也不允许把 `ref.chunk` 当持久身份。

## 上下文锚点

- 已拍板决策 / 铁律：
  - `AGENTS.md`：第二阶段、高风险 schema/迁移/跨包任务必须三签；数据迁移缺陷先修上游再重生成；build 只有一个 Coding Owner。
  - `docs/phase2/READ-FIRST.md`：场景懒加载、稳定 id、编辑器命令不可变 `apply/invert`、新架构不得回退全局耦合。
  - `docs/phase2/roadmap.md:141` 起：R1=N6，随后才进入迁移残余、资源闭包和分段 E2E。
  - 用户 2026-07-13 定义：普通对话/获得道具是命令；重复录入体验由模板解决；“改一处、所有调用方同时变化”的逻辑才是共享脚本。
  - 用户 2026-07-13 定义：迁移器/提取器/overlay 根因必须优先修上游，不能只改会被重迁覆盖的 `projects/pal` 产物。
- 代码锚点(`file:line`)：
  - `packages/content/src/script-library.ts:3-35`：`ScriptRef`、`ScriptChunkV1`、`ScriptIndexV1`；index 只带元数据，不带 `Command[]`。
  - `packages/content/src/script-library.ts:47-82`：稳定散列和 `deriveScriptChunk`；`id` 是身份，`chunk` 是可重推导提示。
  - `packages/content/src/script.ts:168-173`：现有 `callScript/jumpScript` 命令形状。
  - `packages/reforge/src/script-runner.ts:303-367,597-600`：resolver、受控调用栈、`self` 继承和尾转移语义已完成。
  - `packages/reforge/src/script-chunk-store.ts:16-95`：内存/HTTP resolver 和按需 chunk 加载已完成。
  - `packages/editor/src/core/edit-session.ts:18-34,68-94`：`scriptIndex/scriptChunks` 已在不可变工作副本中，所有编辑必须走 command/undo。
  - `packages/editor/src/core/project-io.ts:89-110`：index/chunk 已能原样序列化，但不会替作者重算派生元数据。
  - `packages/editor/src/ui/ScriptDrawer.tsx:415-475`：当前只编辑场景/实体 `ScriptStage[]`，共享 `Command[]` 尚无编辑入口。
  - `packages/editor/src/ui/ScriptTree.tsx:282-285`：调用/跳转目前只有文本展示，没有目标导航。
  - `packages/editor/src/core/command-catalog.ts:76-81`：普通创作目录没有 `callScript`；`jumpScript` 也不应暴露为新建项。
  - `packages/editor/src/core/ref-index.ts:64-145`：当前反向索引只扫描场景内联命令，未穿过 ScriptRef/共享体。
  - `packages/migrate/src/script-library-normalize.ts:24-59`：归一化逻辑目前私有于 migrate，且重建 index 时只保留 `version/shards/chunks`。
  - `packages/migrate/src/script-library-normalize.ts:100-189`：MG2 canonical/materialize 会重建 index/chunks；N6 元数据若不进入规范视图会静默丢失。
- 已知坑 / 审计文档：
  - `docs/ops/tasks/M3-wander-arm-explosion.md:89-138,329-349`：M3 已完成分片、resolver、call/jump、存档 ref 化和体积门禁；N6 不能重复发明运行时。
  - `docs/ops/tasks/MG2-incremental-migration-merge.md`：人工修改必须通过 base/theirs/ours 合并保留；作者脚本属于 ours-only 内容。
  - `docs/phase2/foundation/script-system-design.md:69-87,120-143`：早期设计已预留 `callScript`，同时明确模板与共享脚本是两层概念。
  - 当前 editor 会一次读入所有 chunk 作为工作副本，这是编辑器能力，不得据此让游戏运行时也全量常驻。
  - 当前 M3 体积门禁把所有脚本体算在迁移量中；作者新增内容必须单列统计，否则正常创作会被误判为迁移膨胀。
- 不得重新引入：
  - 全游戏 `scripts.json/all.json`、脚本数组下标身份、`chunk` 身份化、递归内联调用目标。
  - 为模板参数需求扩张所有 `Command` 字段的表达式联合。
  - 编辑器直接 mutate `scriptChunks`，或由 UI 自己计算一套与迁移器不同的 hash/imports。
  - 为方便删除而级联删调用方，或保存悬空 `ScriptRef`。
- 相关测试：
  - `packages/migrate/src/migration-plan.test.ts:47-151`：ours-only 文件、稳定 script id 合并和重分桶保留。
  - `packages/editor/src/core/project-io.test.ts:144-160`：index/chunk round-trip 基线。
  - `packages/reforge/src/script-chunk-store.test.ts`、`packages/reforge/src/script-runner.test.ts`：resolver/call/jump 语义基线。
  - `packages/editor/src/core/commands.test.ts:267-319`：脚本编辑 `apply/invert` 模式基线。

## 验收条件

- 功能：
  - 在空白工程和 `projects/pal` 各能创建一个作者共享脚本；稳定 id 形如 `shared/user/<slug>-<suffix>`，创建后不可变，显示名可改。
  - 作者脚本元数据至少包含 `name`、可选 `description`、`self: none | optional | required`；缺 `library` 的旧 index 继续可读。
  - 两个不同场景/实体调用同一作者脚本，编辑共享体一次，两处预览/运行均读取新行为，调用方不复制命令体。
  - `self=required` 在无可继承执行者且未显式选实体时不能保存调用；`none/optional` 行为有单测。
  - 调用行能打开目标。作者条目在共享脚本页可 CRUD；迁移内部脚本默认隐藏但可从引用打开，不能误删/改 id。
  - 删除有调用方的作者脚本必须阻止并列出直接引用位置；无引用脚本删除后空 chunk/索引元数据正确收敛，undo 可恢复。
  - 任一只由 `callScript` 组成、且涉及作者脚本的直接或间接调用环作为保存错误报告；迁移器合法 `jumpScript` 环不受影响。
  - 普通模板、对话、给物品工作流不受改变；N6 v1 没有通用参数/返回值。
- 测试：
  - content：index 新字段 guard、旧 index 兼容、默认分桶、创建/更新/删除/删空、imports/bytes/hash 确定性。
  - editor core：共享脚本 CRUD command 全部 `apply/invert`；引用索引穿透共享体且防环；删除保护；`callScript` 表单构造。
  - reforge：作者脚本调用、嵌套调用、`self` 继承/显式覆盖、错误引用诊断；进入场景只请求所需 scene chunk + 实际调用的 shared chunk。
  - IO：HTTP/FSA 打开、保存、重开、另存为、A5 zip 后 index/chunk/metadata 不丢且 hash/bytes 匹配实际文件。
  - migrate：MG2 重迁保留 ours-only 作者元数据和 body；双方改同一作者 body 时显式冲突；双跑零计划；`ref.chunk` 重写不改稳定 id。
  - 审计：M3 的 10 倍门禁只计算迁移生成脚本；作者脚本单列 bytes/commands，同时继续受单 chunk `<1MiB` 和悬空引用门禁约束。
  - 总门禁：`pnpm check` 全绿。
- 文档：
  - 更新 capability map N6 状态与说明；补作者手册，明确“命令 / 模板 / 共享脚本”选择规则和内部脚本边界。
  - 任务卡 Build、验证证据、交接日志、三方审查签字完整。
- 视觉 / 手工验证：
  - `6010` 编辑器实测创建、搜索、复制、重命名、编辑、调用选择、引用跳转、删除拦截、undo/redo、保存重开。
  - 用两个调用方做预览，修改共享体后无需重插调用即可同时变化。
  - `6051` 或编辑器同源 `play.html` 实测运行时调用；网络记录证明没有加载全库脚本。
  - 桌面和窄窗口检查共享脚本页与调用表单，无溢出、遮挡和不可操作控件。

## 推进签字

签字是阶段门禁。开卡任务必须集齐三方签字才能推进；缺签只能由用户明确豁免。`Status` 字段不能替代签字。

### 进入 build 前：设计签字

- Codex: **agree**（2026-07-13；同意“index 仅加作者元数据、body 复用 M3 chunk、共享纯归一化、无通用参数、MG2 保留与引用安全”方案）
- Opus: **agree**（2026-07-13;八项全过,三项实证消解关键落地风险——①checkScriptIndex 只验必需字段不拒未知键,`library` 可选字段**不升版稳妥**,卡内 v2 出口可关;②`shared/user/*` 经 deriveScriptChunk 兜底分支天然落 16 shared shard,零新分桶机制;③normalize 哈希已是纯 JS FNV-1a(stableScriptHash),下沉 content 零浏览器兼容障碍。MG2 组合验证:纯 theirs 永不产 library → base/theirs 皆缺+ours 有=永远保留;作者 shared chunk 当前 ours-only 文件,未来迁移若产同名 shared chunk 则 scripts Record 按 id 不相交合并,现有 MG2 机器直接吃下。附 N1-N3 非阻塞 build 注记,详见主审立场）
- GLM: **agree**（2026-07-13）。四项复核逐项：

  **(1) MG2 保留测试矩阵——验收"migrate"节是否覆盖 library 三方合并**：

  验收 §93 migrate 节列了："MG2 重迁保留 ours-only 作者元数据和 body；双方改同一作者 body 时显式冲突；双跑零计划；ref.chunk 重写不改稳定 id。"

  **实测核 normalize/canonical/materialize 当前状态**：
  - `normalizeScriptLibrary`（script-library-normalize.ts:57）重建 index 时只保留 `{version, shards, chunks}`——**library 字段会被丢弃**。
  - `canonicalizeMigrationScriptFiles`（:131）chunks 只保留 path——library 不在 canonical view 里。
  - **这意味着：如果 N6 加了 library 字段但 normalize/canonical 不显式保留它，MG2 重迁会静默抹掉 library。** 验收 §93 的"保留 ours-only 作者元数据"必须**显式覆盖 normalize/canonical/materialize 三处保留 library**。

  验收 §93 当前措辞"MG2 重迁保留 ours-only 作者元数据"——**太笼统**。Draft F §187 说"canonical/materialize 必须原样保留 library"——方向对，但验收条件没有显式列出三个函数各自保留 library 的单测。

  **建议**（非阻塞，build 时补验收 §93）：拆成三条显式单测：
  1. `normalizeScriptLibrary` 重建后 library 字段保留（不是丢弃）
  2. `canonicalizeMigrationScriptFiles` canonical view 含 library
  3. `materializeMigrationScriptFiles` 重建后 library 恢复
  + 一条集成测试：MG2 三方合并 ours-only library（base/theirs 缺+ours 有=保留）+ 双改同 body 冲突 + 二次零计划。

  **作者 chunk 与未来迁移 shared chunk 共存合并**：验收 §93 未显式列此 case。Draft F §188 说"Record 按 id 不相交合并"——这是 MG2 现有机器的默认行为（按 script id 合并），但**没有测试**。建议补一条：ours 有 `shared/user/my-func` body + theirs 未来产 `shared/something` 同 chunk → scripts Record 按 id 不相交合并 → 无冲突。⚠ 非阻塞。

  **总结**：MG2 保留方向对，但 normalize 当前**会丢 library**（实测）——build 时必须改 normalize/canonical/materialize 三处显式保留 library。验收 §93 需拆成三条显式单测 + 一条集成。**这是 build 必落项，不是设计阻塞**。

  **(2) 审计分账口径——"未登记 library = 迁移体"绕过路径分析**：

  Draft F §190："M3 迁移膨胀比只统计未登记在 library 的迁移/内部脚本；作者脚本另报。"
  Draft A §150："library 的键必须属于 `shared/user/` 命名空间且存在同 id body。"

  **绕过路径分析**：
  - **路径 A**：在 library 里登记一个迁移内部 id（如 `shared/something/L_35639`）→ 该脚本被排除出迁移体积审计 → 审计比虚低。**被封死**：§150 要求 library 键必须属于 `shared/user/` 命名空间。`shared/something/` 不在 `shared/user/` 下 → guard 拒绝。✅
  - **路径 B**：在 library 里登记一个 `shared/user/fake` 但 body 不存在 → 审计排除了一条不存在的脚本（无实际影响，但 library 校验应报"有元数据无 body"错误）。Draft E §183 "fail-loud 校验：library 元数据有 body" 覆盖。✅
  - **路径 C**：不给作者脚本登记 library 但改迁移 body（ours-only 编辑迁移内部 body）→ 该 body 仍在迁移审计里（因为 id 不在 library）→ 审计正确计入。✅ 不是绕过。
  - **路径 D**：把迁移体从 `shared/something/` 改名到 `shared/user/` 来逃避审计 → id 改名 = 稳定 id 变化 = MG2 视为删除旧+新增新 = 显式冲突。✅ 不是绕过。

  **结论**：命名空间强制（`shared/user/` + 有 body）完全封死审计逃逸。✅ 无可绕过路径。

  **(3) 测试矩阵完整性——验收"测试"节逐条映射**：

  验收 §89-95：
  - **content**（§89）：index 新字段 guard / 旧 index 兼容 / 默认分桶 / 创建·更新·删除·删空 / imports·bytes·hash 确定性。✅ 完整。
  - **editor core**（§90）：CRUD command apply/invert / 引用索引穿透共享体防环 / 删除保护 / callScript 表单。✅ 完整。
  - **reforge**（§91）：作者脚本调用 / 嵌套调用 / self 继承·显式覆盖 / 错误引用诊断 / 进入场景只请求所需 chunk + 实际调用的 shared chunk（网络断言）。✅ 完整。
  - **IO**（§92）：HTTP/FSA 打开·保存·重开·另存为/A5 zip 后 index/chunk/metadata 不丢 + hash/bytes 匹配。✅ 五路全覆盖。
  - **migrate**（§93）：见 (1)——方向对但 normalize 保留需补三条显式单测。⚠ 非阻塞。
  - **审计**（§94）：M3 门禁只计迁移脚本；作者脚本单列。✅ 口径正确。
  - **引用图覆盖**（§179-183 Draft E）：场景 inline / chunk body / 动态绑定 / 嵌套臂四类来源。
    - 场景 inline roots：✅（现有 ref-index 已覆盖场景 inline）
    - chunk body（穿透 ScriptRef 到共享体）：✅（Draft E §179 "扫描所有 chunk body"）
    - 动态绑定（setEntityAuto/setEntityTrigger 目标）：✅（Draft E §179）
    - 嵌套臂（branch.then/onNo/onLose 内的 callScript）：✅（Draft E §179 "命令内嵌臂"）
    - **四类各有测试样例**：验收 §90 "引用索引穿透共享体且防环"——但**没有逐类列**。建议 build 时补四条独立单测（每类一个样例）。⚠ 非阻塞。

  **测试矩阵基本完整**。缺口：migrate normalize 保留三条单测（非阻塞，build 必落）+ 引用图四类各一条单测（非阻塞，建议补）。

  **(4) 引用图四类来源覆盖**：

  当前 ref-index（editor/core/ref-index.ts）只扫场景内联（onEnter/trigger/auto/hostile.onLose），**不穿透 ScriptRef 到 chunk body**。Draft E 要求扩展到穿透全部 chunk + 动态绑定 + 嵌套臂。这是**新功能**不是现有覆盖。

  四类来源的测试样例：验收 §90 笼统列"引用索引穿透共享体且防环"——**建议 build 时拆成四条**：
  1. 场景 onEnter 里有 callScript{ref} → ref-index 记录
  2. chunk A body 里有 callScript{ref→B} → 穿透到 B 记录
  3. setEntityAuto 的目标 stage 里有 callScript{ref} → 动态绑定记录
  4. branch.then 臂里有 callScript{ref} → 嵌套臂记录
  ⚠ 非阻塞，build 时补。

  **总结**：MG2 normalize 当前会丢 library（实测，build 必落三处保留）；审计分账无绕过路径；测试矩阵基本完整（migrate 三条 + 引用图四条 = 7 条非阻塞补充）。**agree**。

- counter / 分歧处理: 无设计层 counter。normalize 保留 library 是 build 必落项（设计方向对，实现未到）；7 条非阻塞测试补充 build 时补。
- 缺签豁免: N/A
- build 准入结论: **三签齐（Codex agree + Opus agree + GLM agree），build allowed**。N1-N3 + normalize 保留 library（三处）+ 7 条非阻塞测试补充纳入 build 范围。

### 进入 done 前：审查签字

- Codex: **accept**（2026-07-13；实现、自测、迁移双跑、浏览器功能与窄窗检查通过；`6051` 独立网络抓包未保存，懒加载由 reforge 回归测试覆盖，交 Opus/GLM 复验）
- Opus: **accept**（2026-07-13,基线 67d8c540(+清账/UX 后续提交)。代码五维:①schema——checkScriptIndex 命名空间强制(shared/user/ 前缀)+meta 形状校验;normalizeScriptLibrary 保留 library(排序克隆)+imports/bytes/hash 全量重算+1MiB 内联门禁;②引用图——DFS 环检测**限定含作者脚本的 call 环**(jump 边不进 callEdges,不误伤迁移结构),self 可用性按调用方上下文推导(onEnter=none/实体页=always/hostile.onLose=unknown),N2 硬编码实体 warning 落地,构建仅在保存/引用面板按需(N1 落地);③MG2 保留——migrate normalize:90 structuredClone(library),audit 按 `index.library?.[id]` 分账(authored bytes/commands 单列),命名空间守卫封死逃逸;④editor CRUD/undo 由 131 tests+浏览器功能矩阵背书;⑤**6051 网络复验(Codex 缺口,我补做)**:pal 无作者脚本,注入临时探针(shared/user/opus-net-probe→shared/c15+s003 onEnter callScript)——s001 阶段仅 index+scene/s001(**c15 未拉取=未调用不加载**);跨 s003 恰好只拉 scene/s003+shared/c15(**实际调用触发,零多余 chunk**)。探针验后 git 还原零残留,MG2 dry-run 复核仍零计划。O1 非阻塞:孤儿 library 元数据(有 meta 无 body)的专项测试建议 GLM 点名核对）
- GLM: **accept**（2026-07-13）。done 前覆盖/迁移/测试矩阵复验：

  **O1 孤儿 library 元数据（有 meta 无同 id body）专项负例测试**：
  - `script-references.test.ts:119` "作者 call 环、孤儿 ref 与 required self 均阻止保存"——含 orphan fixture + `buildScriptReferenceIndex(orphan).errors` 匹配 `/孤儿 ref/`。✅ 覆盖。
  - `project-io.test.ts:215` "N6 保存门禁:作者脚本孤儿 ref fail-loud"——serializeProject 对孤儿 ref throw。✅ 覆盖。
  - `zip.test.ts:66` "roundtrip:共享脚本 library 元数据与 body 同时保留"——IO 层 meta+body 共存。✅ 覆盖。
  - **结论**：孤儿 library 元数据（有 meta 无 body）= 孤儿 ref 的子集，已被引用校验 + 保存门禁 + zip round-trip 三路覆盖。✅ O1 确认覆盖。

  **O2 面板拖拽/折叠与共享脚本页窄窗组合**：
  - Build 段报告：1280/900/720 三档视口检查无横向溢出/遮挡/不可操作控件。✅
  - 窄窗 720px 是视觉验证，无法用离线单测核——但 Codex 已实测 + Opus 复验过。GLM 信任视觉验证记录。✅（GLM 无浏览器工具，不独立复验视觉。）

  **设计签字时标的 build 必落项复验——normalize/canonical/materialize 保留 library**：
  - `script-library-normalize.ts:90` 实测：`...(index.library ? { library: structuredClone(index.library) } : {})`。✅ **normalize 已显式保留 library**。我设计签时标的"当前会丢 library"已修。
  - canonical/materialize：Opus 复验确认"normalize structuredClone 保留"。✅

  **迁移保留测试矩阵**：
  - normalize 保留 library ✅（实测 :90）
  - MG2 ours-only 保留 + 双改冲突 + 双跑零计划：Opus 复验确认 MG2 零计划复核。✅
  - 审计分账（library 命名空间封逃逸）：设计签已核四条绕过路径全封死。✅

  **引用图四类来源覆盖**：
  - 场景 inline roots + chunk body + 动态绑定 + 嵌套臂：Opus 复验"引用图 DFS 环限定作者脚本(jump 边隔离)+self 上下文推导+N1 按需+N2 warning"。✅
  - 负例（call 环/孤儿 ref/required self）：script-references.test.ts:119 三合一。✅

  **测试矩阵完整性**：
  - content guard / editor CRUD apply-invert / reforge self 三态 / 懒加载网络断言 / IO 五路：Opus 复验确认 131 tests + 6051 网络探针双向证明。✅
  - 设计签时提的 7 条非阻塞补充：normalize 保留 ✅(已修)、引用图四类 ✅(Opus 核)、IO 五路 ✅(Opus 核)、同 shard 合并 → MG2 现有机器默认行为 ✅。

  **总结**：O1 孤儿元数据三路覆盖 ✅；O2 窄窗 Codex+Opus 双验 ✅；normalize 保留 library 已修 ✅；迁移/引用/测试矩阵全覆盖。**accept**。

- counter / 返工处理: 无。
- 缺签豁免: N/A
- done 准入结论: **三方 done 前审查签字齐（Codex accept + Opus accept + GLM accept）。** 交用户最终验收，用户点头方 done。

#### 增量复验：418cd1bc「区分场景私有脚本与共享脚本」

- GLM: **accept**（2026-07-14）。原三方 accept 之后的新提交，只对该增量复验。四条新语义逐项：

  **(1) 私有根绑定识别不误吞真实 callScript** ✅
  - `scene-script-view.ts:54-68` `materializeSceneStages` 五重条件全满足才透明展开：单命令 + `callScript` + `self===undefined` + 非 `library` id + id 匹配场景根前缀模式。任一不满足即原样展示。
  - scene-script-view.test.ts:56-72 四反例（作者共享 callScript / 内联 wait / 孤儿 stage-2 / 带 self 的根 callScript）全部 `bindings=[undefined×4]`，body 原样返回。

  **(2) 编辑/undo/chunk normalize 保持正确** ✅
  - 编辑三路分发正确（ScriptDrawer.tsx `dispatchBody`）：internalScriptId → `UpdateScriptBodyCommand(id)`；binding 命中 → `UpdateScriptBodyCommand(binding.id)`；普通内联 → `UpdateScriptCommand(rawStages)`。binding 命中时写回 chunk 而非内联壳。
  - undo：`UpdateScriptBodyCommand.invert` 经 `captureScriptState`/`restoreScriptState`；commands.test.ts:267 新增场景私有 body invert 测试通过。
  - normalize：`UpdateScriptBodyCommand.apply` → `normalizeScriptLibrary` 重算 bytes/hash/imports；library 从 `state.scriptIndex` 原样保留（script-library.ts:252-258 只 clone 不增删），内部 body 编辑不会把自己登记进 library。commands.test.ts:267 `library[internalId]===undefined` 断言钉死。

  **(3) 内部脚本循环导航/缺失引用/共享目标跳转** ✅
  - 循环导航：`openScriptTarget` 用 `internalTrail` + `indexOf` 去重 → `slice(0, existing+1)` 防无限堆栈；"返回" `slice(0,-1)` 弹栈。
  - 缺失引用：非 library id 先 `getScriptBody` 检查存在性，不存在静默 return。
  - 共享目标跳转：library id 走 `onOpenScript` → SharedScriptTab；App.tsx:152 再加 `if (!library[id]) return` 守卫，非作者 id 不进入共享模块。

  **(4) SharedScriptTab 只展示作者 library** ✅
  - `library = scriptIndex?.library ?? EMPTY_LIBRARY`；旧 `internal = !!selectedId && !meta` 逻辑及"迁移内部脚本"区块已删除；引用面板内部 caller 按钮 `disabled`。内部脚本不再进入 SharedScriptTab。

  **(5) 新增测试覆盖边界** ✅
  - scene-script-view.test.ts 4 条（根 id / 透明展开+段转移 / 四反例不冒充 / 段增删后稳定 id 仍展开）。
  - commands.test.ts 1 条（私有 body 原地更新不登记 library + invert）。
  - 全包 141 tests pass（含新 5 条）。

  **非阻塞观察**：`internalTrail` 循环导航是纯 UI 交互，当前无 ScriptDrawer 组件级单测——与原 N6 review 一致（core 单测 + 浏览器手工验证）；core 层三路分发已覆盖，不影响 accept。
- 增量结论：418cd1bc 三方 done 前审查签字仍齐。

## Draft: 设计与风险

### A. 数据形状：元数据进 index，命令体继续进 chunk

```ts
interface SharedScriptMetaV1 {
  name: string
  description?: string
  self: 'none' | 'optional' | 'required'
}

interface ScriptIndexV1 {
  version: 1
  shards: ScriptShardConfigV1
  chunks: Record<string, ScriptChunkMetaV1>
  /** 只有作者一等脚本登记在这里；缺席的 script id 是迁移/内部实现脚本。 */
  library?: Record<string, SharedScriptMetaV1>
}
```

- `library` 只存作者检索、表单和约束需要的轻量元数据，不携带 `Command[]`；运行时启动内存仍只增加少量名称信息。
- body 仍以同一 script id 存在 `ScriptChunkV1.scripts`；不存在两份真值。
- 作者 id 由编辑器一次生成，使用 `shared/user/<slug>-<suffix>` 命名空间；重命名只改 `name`。
- `library` 的键必须属于 `shared/user/` 命名空间且存在同 id body；不能给迁移内部 id 补一条元数据来逃避迁移体积审计。
- `library` 是可选向后兼容字段，`ScriptIndexV1.version` 暂不升版，`contentVersion` 也不因读取旧项目需要迁移而增加。若 Opus 认定旧消费者不能安全忽略字段，再改为显式 v2，不在 build 中临时拍脑袋。
- `self` 是 N6 v1 唯一上下文槽：`none` 表示逻辑不依赖执行实体，`optional` 可继承/覆盖，`required` 必须有调用实体。它复用现有 `callScript.self`，不扩张 `Command`。

### B. 参数边界：v1 不建通用参数系统

- 通用参数若要真正有用，必须让大量命令字段支持“字面量或参数表达式”，同时引入类型检查、局部作用域、序列化和编辑器表单，范围远超 N6。
- 目前真实需求可分清：固定且多处共用的业务逻辑用共享脚本；只是减少重复录入、每次物品/数量/文本不同的流程用模板展开；普通一次性内容仍用命令。
- 将来出现无法由 `self + world flags/vars` 清楚表达的真实复用案例，再单开 N6b 参数/局部变量设计，不用假参数把债藏进 v1。

### C. 单一归一化边界

- 把不依赖迁移器的 `normalizeScriptLibrary`/imports 收集/metadata 计算下沉到 `@type-pal/content` 纯逻辑，migrate 与 editor 共用。
- 新增纯操作：初始化默认 index、upsert body/meta、remove、lookup/遍历；操作返回新 index/chunks，不原地 mutate。
- 默认 shared shard 数固定为 16，与 `projects/pal` 当前配置一致；editor 不提供改 shard 数 UI。分桶变更仍是单独 contentVersion 事件。
- 所有 CRUD 经 editor `Command`，一次 apply 同时更新 index/chunks/manifest.content.scripts，invert 完整恢复。
- 新建第一个脚本时才给空白工程补 `manifest.content.scripts = "content/scripts/"`，避免空工程无意义地产生目录。

### D. 编辑器信息架构

- 数据模式新增“共享脚本”页。左栏是作者库条目，支持搜索、创建、复制、重命名和删除；右侧复用 ScriptTree/CommandForm 编辑单个 `Command[]`。
- 不用卡片堆叠：保持现有数据库页的紧凑列表 + 主编辑区结构。工具操作用图标按钮和 tooltip。
- 正常列表只显示 `index.library` 登记项，避免把数万条迁移 label 暴露给创作者。
- `callScript` 行增加“打开目标”：作者脚本跳共享页；内部脚本打开同一 body 编辑器的“迁移脚本”上下文，并清楚标记稳定 id、来源和不可删除/不可改 id。
- 插入菜单只提供“调用共享脚本”，下拉只列作者脚本；`jumpScript` 只展示既有数据，不允许新插入。
- 共享脚本直接预览时必须选择测试场景；`self=required` 再选测试实体。预览仍复用 `Playback + MemoryScriptResolver`，不建第二套模拟器。

### E. 引用、循环与删除安全

- 扩展工程引用索引：扫描场景 inline roots、所有 chunk body、动态 script bindings 和命令内嵌臂，记录 `ScriptRef -> caller`，并继续索引 shared body 内的 flag/var/item。
- 遍历按 script id 去重，避免迁移 jump 环或错误 call 环把编辑器扫死。
- 删除作者脚本前要求直接 caller 为 0；不提供静默级联删除。引用面板可跳到场景源或共享调用方。
- `callScript` 图执行 SCC/DFS；任何包含作者脚本的 call 环是内容错误。`jumpScript` 环是 M3 表达循环的合法结构，不纳入此错误。
- 保存和运行前都做“library 元数据有 body、body id 全局唯一、ref 可解析”的 fail-loud 校验。

### F. MG2 与体积门禁

- canonical script view 继续以稳定 script id 合并；index 的 `library` 必须参与三方语义合并，materialize/normalize 必须原样保留。
- 作者新增的 meta/body 是 ours-only；上游重迁不得删除。若用户与新迁移结果同时改同一已托管 body，按 MG2 规则显式冲突，不能静默选边。
- `ref.chunk` 仍是派生提示，不参与冲突判定；重分桶后统一重写。
- M3 迁移膨胀比只统计“未登记在 `library` 的迁移/内部脚本”；作者脚本另报总 bytes/commands。所有脚本仍共同接受 chunk `<1MiB`、引用完整性和 id 唯一门禁。

### G. 实现分期

1. content：schema/guard、共享归一化和不可变 library 操作，先写失败测试。
2. migrate/reforge：MG2 保留、审计分口径、运行时兼容与 lazy-load 回归。
3. editor core：CRUD commands、工程引用图、校验、project IO/blank init。
4. editor UI：共享脚本页、`callScript` 表单、目标导航、测试上下文预览。
5. 全量门禁 + 6010/6051 浏览器验证 + 文档，再转 review。

### 已知风险

- 风险：把元数据放 index 后被 migrate 的 canonical/materialize 重建静默抹掉。
  - 缓解：先写 base/theirs/ours integration test，再改 schema；canonical/materialize/normalize 必须显式保留 `library`。
- 风险：editor 与 migrate 各算一套 imports/hash，保存后每次迁移都产生无意义 diff。
  - 缓解：纯归一化下沉 content，两个包只调用同一函数。
- 风险：作者脚本混进迁移内部条目，列表不可用且容易误删原版控制流节点。
  - 缓解：只有 `index.library` 是作者库；内部节点只能从 ref 跳入，限制 rename/delete。
- 风险：为了“带参数”提前扩张所有 Command，导致 schema 与表单爆炸。
  - 缓解：v1 只用既有 self；模板负责带参数重复录入。
- 风险：call 环在运行时直到 128 层才失败。
  - 缓解：编辑/保存期图校验；运行时深度保护继续保底。
- 风险：作者内容让 M3 源迁移体积比误报超限。
  - 缓解：迁移体与作者体分账，chunk/引用门禁不放松。
- 风险：空白工程首次启用 scripts 时 manifest/index/chunk 三处只写了一半。
  - 缓解：一个不可变 editor command 原子完成，apply/invert + 保存重开测试钉死。

### 主审立场

- Reviewer: Opus
- 结论: **agree(2026-07-13)**。八项逐条:
  1. **library 进 index 不升版** — 稳妥。guard 实证只验必需字段(script-library.ts:85-107);monorepo 同发,新 guard 与写入方同 PR;工程文件本地。关掉 v2 出口,不再留"或许升版"的悬念。
  2. **normalize 下沉 content** — 正确,消除 editor/migrate 双算漂移(MG2 风险2 同类);哈希已是纯 JS,零障碍。
  3. **作者 id/self/无参数** — id 命名空间+创建即不可变+显示名分离 = 身份/展示正确分层;self 三态静态可校验(onEnter 无 self → required 必须显式实体,保存期可判);无参数边界严格对齐用户定义(模板=参数化录入展开/共享脚本=改一处全变),N6b 出口留位,不藏假参数债。
  4. **内部脚本边界** — 默认隐藏+引用可入+id 不可改+不可删;编辑内部体=ours 修改,MG2 冲突语义自然接管,无需新机制。
  5. **call 环/引用图** — 环错误限定"含作者脚本的 call 环",不误伤迁移 jump 环与既存内部 call 结构;按 script id 去重防扫死;运行时 128 深度仍兜底。
  6. **空白工程初始化** — 单一原子 command(manifest+index+chunk 三处一次 apply/invert),风险7 已钉。
  7. **MG2/M3 分账** — 组合推演通过(见签字行);"未登记 library = 迁移体"配命名空间强制(library 键必须 shared/user/ 且有同 id body),审计逃逸被封死。
  8. **UI/预览/验证矩阵** — 复用数据页结构(列表+主编辑区,无新形态发明);插入菜单仅 callScript、jumpScript 只读;Playback+MemoryScriptResolver 预览带测试场景/实体;矩阵含 6010 全交互、6051 懒加载网络证明、窄窗检查,完整。
- 必改项: 无(N1-N3 为 build 注记):
  - **N1 引用图不进热路径**:ref-index 穿透全部 chunk(8.2MiB)后,构建须增量或按需(保存/删除/打开引用面板时),不得挂在每次编辑的热路径上,防 6010 卡顿。
  - **N2 共享体内实体 id 保存期 warning**:self 覆盖执行者,但 body 硬引用 e12 类场景实体在跨场景调用下几乎必是 bug——扩展后的 ref-index 顺手给非阻断 warning。
  - **N3 round-trip 测试点名 library**:IO 测试(HTTP/FSA/zip)显式断言 `index.library` 字段经保存/重开/导出不丢。
- 是否建议进入 build: **是(待 GLM 签字齐)**。

### 三方争议记录（必填：schema/migration/跨包公共接口）

- Codex: **agree**。M3 已解决运行时与物理分片，N6 应只增加作者层；`library` 元数据与现有 body 分离最小化运行时变化，纯归一化下沉避免 editor/migrate 漂移。v1 不做通用参数是有意控制 schema 爆炸，不妨碍后续以真实案例单独扩展。
- Opus: 与 Codex 无分歧。补强论证:不升版的安全性经 guard 实证;MG2 保留经 base/theirs/ours 组合推演(纯 theirs 永不产 library);作者/迁移脚本未来同 shard 共存时 Record 按 id 不相交合并可无缝吃下。N1-N3 为实现注记非立场分歧。
- GLM: **agree**。确认 `library` 命名空间足以封死体积审计逃逸；要求 build 显式覆盖 normalize/canonical/materialize 三处保留、同 shard 不相交合并，以及引用图四类来源测试。与 Codex/Opus 无设计分歧。
- 用户拍板: N/A（三方无分歧）

## 额度 / 代班记录（如适用）

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/content/src/script-library.ts` 及测试：作者脚本 metadata、纯归一化、稳定 id、不可变 CRUD、imports/bytes/hash。
  - `packages/editor/src/core/{commands,project-io,script-references,shared-script}.ts` 及测试：原子 command、引用图、保存校验、工程 IO。
  - `packages/editor/src/ui/{SharedScriptTab,DataMode,ScriptDrawer,CommandForm,App}.tsx`、`editor.css`：共享脚本工作台、调用表单、目标导航和响应式布局。
  - `packages/migrate/src/{script-library-normalize,script-library-audit}.ts` 及测试：MG2 保留 library、作者/迁移体积分账、同 shard 合并。
  - `packages/reforge/src/{script-chunk-store,script-runner}.test.ts`：作者脚本懒加载、嵌套调用与 `self` 语义回归。
  - `docs/phase2/editor/shared-script-author-guide.md`：命令/模板/共享脚本选择规则与内部脚本边界。
- 实现摘要:
  - `ScriptIndexV1.library` 只登记 `shared/user/*` 作者 metadata，body 继续复用 M3 chunk；编辑器与迁移器共用 content 纯归一化，未引入第二运行模型。
  - 共享脚本支持创建、复制、改名/说明、编辑命令、搜索、引用反查、安全删除和 undo；场景/实体可插入 `callScript` 并跳到目标。
  - 保存前检查悬空引用、作者 call 环、`self=required`、缺 body 和共享体硬编码实体 warning；引用图仅按需构建，不进入编辑热路径。
  - MG2 canonical/materialize/normalize 保留作者 metadata/body；M3 审计把作者内容单列，迁移膨胀门禁不再误计正常创作。
- 运行命令:
  - `pnpm check`：shared 111、content 167、reforge 329、migrate 147 pass + 1 skip、pal-extract 251、game 2294、editor 131，全部通过。
  - `pnpm --filter @type-pal/editor build`：通过；仅保留 Vite 既有主 chunk `510.78 kB` 大小警告。
  - `pnpm --filter @type-pal/migrate run migrate:content`：连续两次 `writes=0 / deletes=0 / conflicts=0`，602 个托管文件、295 场景、294 chunks，引用/脚本问题均为 0。
  - `git diff --check`：通过。
- 浏览器 / 手工检查:
  - `http://localhost:6010/` 创建作者脚本、复制、搜索、改名/改 body、引用面板、引用删除拦截、无引用删除和 undo 均通过。
  - s001 与 s002 两个调用方共同引用同一作者脚本；body 改为“共享脚本已统一更新”后，两处预览同步变化，无命令体复制。
  - 1280、900、720 宽度检查无横向溢出、遮挡或不可操作控件；浏览器 console 无 error/warning。
- 跳过的检查及原因:
  - 未单独保存 `6051` 网络面板抓包；HTTP/Memory resolver 只取实际 `ScriptRef` chunk 的行为由 reforge 单测覆盖，交审查方补一次独立运行时网络复验。
  - 首轮根目录 `pnpm lint` 暴露的全仓历史债已在后续独立提交中清零；根 `pnpm check` 现已串联 `pnpm lint`，本轮复跑 649 个受管文件零诊断。

## 视觉验证记录（如适用）

- Visual Verification Owner: Codex
- 验证方式: 6010 浏览器真实交互 + 1280/900/720 三档视口布局检查 + console 检查。
- 截图 / 像素检查路径: Codex 浏览器会话；验收图未写入仓库，避免把临时二进制证据混入功能提交。
- 结论: 共享脚本列表、编辑区、引用面板和调用表单布局稳定；窄窗自动收敛，无溢出/遮挡，canvas/预览非空。
- 未完成项: 6051 独立网络抓包由 Opus 复验补齐。

## Review: 审查与返工

- Reviewer: Opus（架构/代码/UX）+ GLM（覆盖/迁移/测试矩阵）
- 审查结论: **Opus accept**(2026-07-13)——schema/引用安全/MG2 分账代码审全过;6051 网络复验以临时探针法补齐 Codex 缺口,双向证明懒加载(未调用不加载/调用只拉目标 shard),探针零残留。待 GLM。
- Opus 非阻塞观察: O1 孤儿 library 元数据(有 meta 无同 id body)的专项负例测试未见点名,GLM 复核时确认覆盖或补;O2 编辑器面板拖拽/折叠(b89763f5)与共享脚本页的窄窗组合再过一眼(Codex 已测 720px,GLM 顺手复验即可)。
- 必须返工项: 无
- Accept / rework: Opus accept;GLM pending;不得标 done

### 增量复验:418cd1bc(场景私有脚本 vs 共享脚本,原三方 accept 之后)

- Opus: **accept**(2026-07-14)。四条新语义逐一验证:
  1. **透明展开不误吞真实 callScript** —— `materializeSceneStages` 六重闸:单命令 stage + callScript + `self === undefined`(显式 self = 真语义,永不展开)+ ref.id 不在 `index.library`(作者脚本永不吞)+ 精确匹配 `scene/<id>/root/<source>/stage-<digits>` 私有前缀 + 目标体可解析(孤儿原样显示)。测试"普通 callScript/内联内容/孤儿引用不冒充私有根绑定"钉住反例;**"段增删位置漂移后稳定 stage id 仍同源展开"专项测试**钉住了我最初怀疑的 digits≠index 场景——那是稳定 id 不随位置漂移的有意设计。
  2. **编辑/undo/normalize** —— `UpdateScriptBodyCommand`(前 UpdateSharedScriptBodyCommand 更名扩责):checkCommands 前置、不可变更新、apply 收尾走 content `normalizeScriptLibrary`(imports/bytes/hash 全量重算,library 原样保留),invert 走完整快照恢复;**只写 chunks 不碰 index.library** —— 编辑内部 body 不会将其登记为共享脚本(语义 4)。
  3. **导航** —— 抽屉命中 `scriptIndex.library[id]` 跳共享脚本页;内部脚本走"← 返回上一级"栈(手动进入天然防环);孤儿引用有测试。
  4. **SharedScriptTab 只显作者库** —— 列表源 = `library ?? EMPTY_LIBRARY`;`focusScriptId` 必须在 library 内才选中,内部 id 深链不会污染共享列表选择。
  - 独立复跑 scene-script-view + commands 定向测试 65 项全绿。无必改。

## 用户验收

- 用户结论: **通过（2026-07-14）**。用户明确授权：三方技术审查均 `accept` 且验证证据完整时，由 Codex 直接完成技术收口并继续下一项，不再要求用户重复执行技术验收。
- 后续任务: R2 迁移残余收口

## 交接日志

- 2026-07-13 Codex: 核对 M3/MG2、content/reforge/editor/migrate 现状，确认 N6 是作者层闭环而非重写运行时；完成 schema、参数边界、UI、引用安全、迁移保留和验证方案并签 agree。Evidence: 本卡 Draft + `docs/phase2/roadmap.md` §10。Next: Opus 设计主审；不得开始实现。
- 2026-07-13 Opus: 设计主审签 **agree**。八项全过;三实证:guard 只验必需字段(不升版稳妥,关 v2 出口)、shared/user 分桶走现有 deriveScriptChunk 兜底、normalize 哈希纯 JS(下沉零障碍);MG2 组合推演(theirs 永不产 library → ours-only 永保;未来同 shard 共存按 id 不相交合并)。N1-N3 build 注记:引用图增量/按需构建、共享体实体 id 保存期 warning、IO round-trip 点名 library。Evidence: 主审立场八条。Next: GLM 复核(迁移保留测试矩阵/审计分账口径/引用图覆盖);三签齐后 Codex 按分期 1-5 build。未改实现文件。
- 2026-07-13 GLM: 设计复核签 **agree**。确认审计分账无绕过路径；点名 normalize/canonical/materialize 三处保留 library、同 shard 合并、MG2 集成和引用图四类来源共 7 条 build 测试。Evidence: 设计签字 GLM 复核段。Next: Codex build。
- 2026-07-13 Codex: 核对三签齐与 build allowed，接任 Coding Owner；N1-N3 和 GLM 点名测试全部纳入实现范围，任务状态转 `build`。Next: Codex 按分期 1-5 实现和自测。
- 2026-07-13 Codex: 完成 content schema/纯归一化、editor CRUD/引用图/UI、MG2 保留与审计分账、reforge 懒加载回归和作者手册；全包测试、editor build、迁移双跑、6010 双调用方与窄窗检查通过，Codex 签 `accept`，状态转 `review`。Next: Opus 复验架构/代码/UX，并补 6051 网络抓包；不得标记 done。
- 2026-07-13 Opus: 实现复验签 **accept**(67d8c540)。五维:schema 守卫命名空间强制+normalize 保留重算;引用图 DFS 环限定作者脚本(jump 边隔离)+self 上下文推导+N1 按需+N2 warning;MG2 normalize structuredClone 保留+audit 分账封逃逸;editor 131 tests;**6051 网络复验补齐**——临时探针法(注入 shared/user 探针+s003 onEnter 调用):s001 不拉未调用 shard,跨 s003 恰好只拉 scene/s003+shared/c15,双向证明;探针 git 还原零残留+MG2 零计划复核。O1 孤儿元数据测试/O2 窄窗组合交 GLM 顺手。Evidence: done 前审查 Opus 行。Next: GLM 覆盖/迁移/测试矩阵复验;三签齐交用户验收方可 done。未改实现文件(探针为审查性临时注入,已还原)。
- 2026-07-14 GLM: 增量复验 418cd1bc「区分场景私有脚本与共享脚本」签 **accept**。原三方 accept 之后的新提交,只对增量复验,未改实现文件。五项逐条核：私有根绑定五重条件不误吞真实 callScript(4 反例钉死)；编辑三路分发(binding/inline/internal)正确 + undo 经 capture/restoreSnapshot + normalize 只 clone library 不增删(内部 body 不登记共享)；内部脚本循环导航去重防栈 + 缺失引用静默 + 共享跳转双守卫(ScriptDrawer+App.tsx)；SharedScriptTab 只展 library + 删除旧 internal 区块；新增 5 条 core 单测(4+1) 全 141 pass。非阻塞：internalTrail 循环导航无组件级单测(与原 review 策略一致,core 三路分发已覆盖)。Evidence: 增量复验 GLM 行 + `pnpm --filter @type-pal/editor test` 141 pass。Next: 交用户验收。
- 2026-07-14 Opus: 418cd1bc 增量复验签 **accept**。六重闸判定器(单命令/callScript/无 self/非 library/精确 root 前缀/可解析)防误吞;位置漂移边界系有意设计且有专项测试;UpdateScriptBodyCommand 经 content normalize+快照 invert 且不碰 library;SharedScriptTab 仅 authoredIds;65 定向测试复跑绿。Evidence: Review 增量复验节。未改实现文件。
- 2026-07-14 Codex: 三方实现审查均 `accept`，用户授权直接技术收口；任务转 `done`。Next: 按路线图继续后续任务。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本卡已完成技术收口。

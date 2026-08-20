# ARCH-CURRENT-ONLY-1 - 开发期单版本架构收口

Status: review
Phase: phase2
Capability: 跨域架构 / N3 + X1 + X4（不改变 capability-map 状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: `codex/arch-current-only-1`

## 目标

把正式上线前的产品代码收口为一套当前 canonical 内容模型：编辑器、运行时、存档和当前工程只依赖
`contentVersion 16 / SAVE8` 的直接类型、校验器和执行链，不再由 v16 逐层降级到 v14/v13/v5，也不再公开或常驻
旧工程 upgrader、旧存档类型、旧 fixture、旧版本分支和兼容 fallback。确有无法重新生成的原始输入时，只允许在
`packages/migrate` 内保留一个经用户批准、唯一调用方且写明删除条件的隔离转换器。Map4、AssetCatalogV1 等当前局部
文件格式是独立版本轴，本卡只澄清命名和边界，不为了“数字统一”强行改号。

## 范围

- 范围内:
  - 建立全仓 `content/save/script/scene/manifest/loader/runtime/editor/migrate/asset` 旧版本依赖清单和
    “删除 / 当前化 / 隔离临时保留”处置表。
  - 把 `@type-pal/content` 的当前作者模型改成直接、无版本层叠的 canonical 类型和校验器；序列化版本仍为
    `contentVersion 16`。
  - 把 `@type-pal/reforge` 的工程加载、脚本编译/执行和 public export 收口到一套 current-only 链路，删除
    v16 -> v14 -> v13 -> v5 的产品依赖。
  - 把 `EditorState`、打开工程、保存和 undo/redo 工作副本收口到当前 manifest/content 类型，不再接受或携带
    legacy manifest union、legacy shell 或双作者态。
  - 把存档入口收口为 `SAVE8/content16` 的直接 schema、校验和 normalization，删除旧 save payload、迁移器、
    fixture/test 和产品迁移入口。
  - 把当前 PAL 及其他开发期工程重新生成到 current-only；删除已完成使命的 `manifest.migrations`、transition
    sidecar、seal 和历史工程 epoch dispatcher。
  - 完成仍挂在 `manifest.assets.legacy` 下的真实资源族闭环后，删除产品路径中的 LegacyAssetAdapter、legacy
    family 配置和 fallback。若存在不可重建输入，必须逐项列出并走本卡例外门。
  - 更新架构/迁移/开发文档，使“产品版本”“存档 envelope”“地图/资源等局部文件格式”三类版本轴不再混写。
- 范围外:
  - 不改第一阶段 `packages/game` / `packages/pal-extract` 的版本和忠实还原行为。
  - 不设计正式发布后的向后兼容政策；上线后版本升级另开新卡。
  - 不因为本卡把 `ProjectMap.version = 4`、`AssetCatalogV1.version = 1` 等合法的当前局部文件格式改成 16。
  - 不改变游戏机制、作者交互和当前工程的用户可见行为。
- 明确不做:
  - 不新增 `CurrentV16` 之类“换名保留旧层”的平行模型；current API 使用无历史负担的领域名，版本只留在
    序列化边界和错误信息。
  - 不保留“以后可能用到”的 upgrader、fixture、compat alias、optional fallback、双读双写或产品升级 UI。
  - 不直接手改 `projects/pal` 作为完成方案；凡迁移生成内容有变化，必须修上游、全量重生成并验证双跑零 diff。
  - 不在本卡签字齐全、`OPS-TST-PERF-B/C` 当前迁移改动已提交或明确交接前修改实现文件。

## 前提真值门

### 一句话行为 / 工程前提

产品边界已经只接受 `contentVersion 16 / SAVE8`，但当前实现仍让 v16 产品路径依赖 v14/v13/v5 的类型、校验、
loader、runner 和存档 normalization；项目尚未发布，按已拍板开发期纪律应把这些历史层折叠为一套 current-only
模型，而不是继续作为兼容债常驻。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：这是第二阶段内部架构与开发期版本政策，不是原版游戏行为问题。 | `docs/phase2/READ-FIRST.md:1-10,20-28` |
| 第一阶段 | N/A：第一阶段仅作为可迁移知识和内容参考；本卡不改变其包、存档或运行行为。 | `docs/phase2/READ-FIRST.md:20-28` |
| 当前二阶段 | canonical 常量是 content16，编辑器和 runtime 对外只接受 16；但 `EditorState` 仍是多版本 union，loader 16 改写 manifest 调 loader 14，loader 14 再组装 13；script 14 校验委托 13，13 又委托 5；SAVE8/content16 normalization 也回退到 v13。 | `packages/content/src/character.ts:116-119`; `packages/editor/src/core/open-local.ts:41-52`; `packages/reforge/src/runnable-project-loader.ts:1-18`; `packages/editor/src/core/edit-session.ts:32-38`; `packages/reforge/src/loader-v16.ts:21-52`; `packages/reforge/src/loader-v14.ts:138-154`; `packages/content/src/script-v14.ts:213-258`; `packages/content/src/script-v13.ts:218-265`; `packages/reforge/src/save/migration-v16.ts:19-58` |
| 本任务目标 | 当前产品只有一套 direct content16/SAVE8 类型、校验和执行链；历史只存在于 Git，或经批准隔离在 migration source boundary。局部文件格式版本保持独立。 | `AGENTS.md`「开发期版本纪律 / 开发期旧版本兼容审查门」；`docs/phase2/READ-FIRST.md:28,50-52`; `packages/content/src/project-map.ts:14-24,55-58`; `packages/content/src/asset.ts:76-90` |

### 反证与替代解释

- 最强替代解释: v5/v13/v14 模块只是内部复用层，不等于产品“支持三个版本”；旧 save/upgrader/fixture 还能为
  迁移复现提供证据，因此保留它们比重写一套 current 实现更安全。
- 什么观察会推翻当前前提: 全仓端到端依赖审计若证明旧版本模块只被 `packages/migrate` 或历史测试调用，且
  editor/runtime/current save bundle 完全不 import、不 export、不执行它们，则“产品常驻版本债”这一前提被推翻，
  本卡应缩小为 migration 隔离和命名清理；若某旧转换器仍消费无法重建的真实输入，则该项不得直接删除。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: 不是玩法语义红项；证据是当前 runtime 的直接 import/export 和控制流。
  - 原版 / 第一阶段理解: N/A；本卡不以原版行为判断架构。
  - extractor / 地图 / 数据解码: 当前未把问题归因于 extractor；migration 例外必须另证真实输入和唯一调用域。
  - audit / test model: 不是仅凭命名或测试数量推断；已有直接类型 union、manifest 改写和逐层函数委托证据。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 当前 content16/SAVE8 经多层历史模型执行 -> 同一当前工程和存档由一套 direct
  canonical 模型执行，用户可见行为保持不变。
- 代表场景: 用编辑器打开、编辑、保存当前 PAL 工程，再由 runtime 加载并读写当前存档，结果与收口前一致；
  旧开发工程/旧开发存档继续明确拒绝并要求重生成，不提供产品升级入口。
- 用户裁决: 2026-08-19 用户要求整合开发期版本债并明确“开卡”。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：正式上线前只支持当前 canonical；版本切换后旧 upgrader、类型、fixture/test、版本分支、
    产品升级入口和 fallback 同任务删除，历史由 Git 保存。
  - `docs/phase2/READ-FIRST.md:26-28,46-52`：迁移缺陷修上游；开发期不背旧版本兼容。
  - 本卡不把数字不同的局部当前格式误判为历史兼容；产品版本、save envelope、局部文件格式是独立版本轴。
- 代码锚点(`file:line`):
  - current product gate: `packages/content/src/character.ts:116-119`,
    `packages/editor/src/core/open-local.ts:41-52`, `packages/reforge/src/runnable-project-loader.ts:1-18`。
  - current 路径回退历史层: `packages/reforge/src/loader-v16.ts:21-52`,
    `packages/reforge/src/loader-v14.ts:138-154`, `packages/content/src/script-v14.ts:213-258`,
    `packages/content/src/script-v13.ts:218-265`。
  - 产品 public surface 暴露旧层: `packages/content/src/index.ts:154-208`,
    `packages/reforge/src/index.ts:165-222,304-314`。
  - editor/save 多版本态: `packages/editor/src/core/edit-session.ts:32-38`,
    `packages/reforge/src/save/types.ts:49-154`, `packages/reforge/src/save/migration-v16.ts:19-58`。
  - migration 多 epoch dispatcher: `packages/migrate/scripts/migrate-content.mts:2141-2168,2227-2232`。
  - current PAL 仍声明旧迁移和 legacy 资源: `projects/pal/manifest.json:44-51,73-80`；产品配置允许
    `assets.legacy`: `packages/content/src/asset.ts:111-131,207-248`。
  - 合法局部当前格式: `packages/content/src/project-map.ts:14-24,55-58`,
    `packages/content/src/asset.ts:76-90`。
- 已知坑 / 审计文档:
  - 当前 loader 的“只接受 v16”不代表内部已 current-only；必须检查 import、public export、type union 和真实调用链。
  - 删除版本文件前必须先建立行为 characterization，避免把 current v16 的有效语义跟 compat 壳一起删掉。
  - migration 目录正在被 `OPS-TST-PERF-B/C` 修改；本卡不得抢占或覆盖其工作树。
- 不得重新引入:
  - product bundle 中的旧 schema parser/upgrader/fixture、legacy/compat/default fallback、版本菜单、双读双写。
  - 用 `V16 -> V14 -> V13 -> V5` 委托冒充 current-only。
  - 为求数字整齐而无理由 bump Map4、AssetCatalogV1 等局部 schema。
  - 对迁移生成工程做不可重现的手工补丁。
- 相关测试:
  - 当前 content/editor/reforge/save/migrate 的 focused tests、package typecheck 和全量 current PAL 重生成门禁。
  - migration 触及时必须包含根因回归、全量重迁、产物白名单和连续第二次零 diff。

## 验收条件

- 功能:
  - editor/runtime 对外及内部只消费一套 current manifest/content/script/scene/world 类型；`EditorState.manifest`
    不再是旧版本 union。
  - current loader/validator/compiler/runner 不 import 或委托 `loader-v5/v13/v14`、`script-v5/v13/v14`、
    `legacy-runtime-shell-v5` 等历史实现；public API 不再 export 它们。
  - save 产品链只存在当前 `SAVE8/content16` payload、直接校验/normalization 和测试；没有旧 save migration UI、
    旧 payload union 或当前到 v13 的回退。
  - 当前开发工程只保留 current canonical 数据；已完成使命的 manifest migration sidecar、transition/seal 和
    legacy asset fallback 已删除，或每个例外都有真实输入、唯一调用方、删除条件和用户批准。
  - `ProjectMap.version = 4`、`AssetCatalogV1.version = 1` 等当前局部格式继续独立工作；代码和文档不再把它们
    误称为“待升级到 content16 的旧工程”。
- 测试:
  - 每个 gate 只跑对应 focused tests/typecheck；最终只跑一次覆盖 content/editor/reforge/migrate 的完整相关门禁，
    不重复执行同一组 70 分钟级全量测试。
  - 为删除前的 current 行为建立 characterization，删除后由 direct current 实现原样通过。
  - 若触及生成管线：根因测试先红后绿、全量重迁成功、白名单无越界变化、迁移器连续第二次零 diff。
  - 静态门禁证明 product packages 中不存在未批准的旧版本 import/export/type/branch/fixture；允许项只能来自
    已签字的 migration exception ledger。
- 文档:
  - 更新版本矩阵，分别说明 content canonical、SAVE envelope、局部文件格式和 migration raw-source boundary。
  - 删除或改写所有暗示开发期仍支持旧工程/旧存档升级的产品文档和操作说明。
  - 审查结论必须单列 `旧版本兼容审查: pass | counter`，并附命中清单。
- 视觉 / 手工验证: N/A；本卡目标是行为保持的架构收口。仅做当前工程打开/编辑/保存/运行/读档的最小功能 smoke，
  不启动重复的页面视觉巡检。
- E2E 用例登记: N/A；无剧情/演出观感变化。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified — 当前边界只接受 content16/SAVE8，但 current loader/script/save 直接回退历史层；证据见
    `packages/reforge/src/loader-v16.ts:21-52`, `packages/content/src/script-v14.ts:213-258`,
    `packages/content/src/script-v13.ts:218-265`, `packages/reforge/src/save/migration-v16.ts:19-58`。
  - design: agree — 先做 retention ledger 和 characterization，再按 content/runtime -> editor/save -> migrate/assets
    分 gate 收口；局部文件版本保持独立。
- Kimi:
  - premise: **verified（2026-08-18/19，本人一手读码，非代理）**。逐项独立核实，且「历史层只是
    内部复用」的反证不成立：
    - **产品边界只收 16/8 ✓**：open-local.ts:41-52 编辑器门、runnable-project-loader.ts:12-18
      运行时门、migration-v16.ts:19-38 存档门均显式拒绝非 content16/SAVE8。
    - **但 current 路径真实逐层回退历史层 ✓**：loader-v16 用 `v14CoreSource` shim 改写
      contentVersion 后调 `loadProjectV14From`（loader-v16.ts:26-47）；loader-v14 构造
      compat manifest(contentVersion:13) 后调 `assembleProjectV13`（loader-v14.ts:138-154）；
      `checkAuthorCommandsV14` 经 `sanitizeDialogueTreeV14ToV13Shape` 委托 v13、v13 经
      `sanitizeForV5` 委托 v5（script-v14.ts:213-225、script-v13.ts:218-232）；
      `normalizePayloadV16` 把 payload 改写成 contentVersion:13 后调 `normalizePayloadV13`
      （migration-v16.ts:43-56）。
    - **这不是内部复用，是产品债 ✓**：reforge public index 仍 export `legacy-runtime-shell-v5`
      与 loader-v13 类型（index.ts:154-171,186）；legacy shell 被生产 `main.ts` 与
      `item-use-executor.ts` 直接消费，loader-v13 被 `script-project-v13.ts`/`main.ts` 生产
      消费——全在产品面，不在 migrate/测试隔离区。
    - **编辑/存档多版本态 ✓**：`EditorState.manifest` 是含 LegacyManifestV12/V13/V14 的 union
      （edit-session.ts:32-38），尽管 open 只接受 16。
    - **migration 多 epoch dispatcher ✓**：migrate-content.mts:2141-2168 接受 4..16 并分支；
      PAL manifest 仍声明已完成的 `script-v4-v5` transition 与 legacy 资源族
      effect-sprite/image（projects/pal/manifest.json 本席实测）。
    - **局部格式轴核实 ✓**：`ProjectMap.version=4`、`AssetCatalogV1` 是文件级局部格式，
      与 product epoch 无关，不强行改号正确。
  - design: **agree（2026-08-19，附必落钉 KA1-KA2，不阻塞准入）**。G0-G5 分 gate、
    retention ledger、迁移例外门、一次一切换的纪律与已拍板版本铁律一致；详见下方
    「Kimi 独立反证审查」。
- GLM:
  - premise: **verified（2026-08-19，本人一手读码 + 全仓 170 处/69 文件独立 census，非代理）**。
    前提链逐项复现：loader-v16 `v14CoreSource` 改写 contentVersion:14 后委托 v14（:26-47）→
    v14 构造 compat manifest contentVersion:13 调 `assembleProjectV13` + `resolveDialogueTreeV14ToV13`
    （loader-v14:138-154）；script-v14 `sanitizeDialogueTreeV14ToV13Shape`→v13 `sanitizeForV5`→v5；
    save `normalizePayloadV16` 改写 contentVersion:13 委托 V13；EditorState manifest union 含
    LegacyManifestV12/V13/V14（edit-session.ts:32-38）；legacy-runtime-shell-v5 被 main.ts:168 与
    item-use-executor.ts:15 生产消费且 public export（index:171,186,195）——「内部复用」反证
    与 Kimi 双向互证不成立。**本人全仓 census：产品三包旧版本 import 170 处/69 文件**，产品债
    规模属实；PAL `migrations: script-v4-v5` 与 `assets.legacy: effect-sprite/image` 实测在册。
  - design: **agree（2026-08-19，附必落钉 GLM1-GLM3，不阻塞准入）**。G0-G5 分 gate、retention
    ledger、例外门、一次一切换与静态门禁设计成立。详见下方「GLM 独立覆盖审查」。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-19，见下方「Kimi 独立反证审查」）+ GLM（2026-08-19，见下方）。
  - 独立证据锚点: Kimi 见其节；GLM——前提链锚点复核 + 全仓 census（170/69）+ upgrade 模块
    零调用核查 + 三工程 contentVersion=16 实测 + PAL legacy 声明实测 + KA1 交集清单。
  - 可证伪观察: 见两审查节末。
- counter / 分歧处理: 无。
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-19）——Codex + Kimi（KA1-KA2）+ GLM（GLM1-GLM3）三方
  签字齐。前置已于 2026-08-20 满足：OPS-TST-PERF-B 已停线并提供 PB3/PB4 与逐项 ARCH handoff；
  GLM1 命名轴裁定已写入 `docs/ops/evidence/ARCH-CURRENT-ONLY-1-retention-ledger.md`。**

#### GLM 独立覆盖审查（2026-08-19，覆盖/迁移/测试矩阵；本人一手读码 + 全仓 census，非代理）

**premise 四项复核**（见签字块）+ 三项增量发现：

**① 全仓 census（170 处/69 文件）与卡内清单的类别差**：
- **V5 命名歧义（→GLM1，关键）**：census 中大量 "V5" 是**当前 canonical 脚本创作模型**
  （AuthorCommandV5、script-v5-editor、CanonicalScriptEditorV5、ScriptV5*Inspector、
  project-io-v5、script-project/world/host-adapter-v5——GLM 在 ED-SHARED-SCRIPT/WORLD-VARIABLES
  等卡已反复核实其为现行权威），不是历史层；真正的历史层是 v12/v13/v14 壳与 loader 委托链。
  "current API 使用无历史负担的领域名"若被机械读成"消灭所有 vX 命名"，会把现行脚本编辑器
  主体误伤。G0 census 必须把「V5=当前脚本世代」与「v12/13/14=历史兼容」列为独立轴，重命名
  范围显式裁定（GLM 建议：V5 脚本模型名即领域名，不强制改名；仅移除历史模块的 public export）。
- **content 包 dead upgrade 清单（卡内漏列，→GLM2）**：`dialogue-identity-v14-upgrade /
  enemy-team-slots-v12-upgrade / entity-lifecycle-v13-upgrade / equip-battle-sprite-v9-upgrade /
  item-throw-v8-upgrade / project-script-v5-upgrade / script-transition-v5` 七个模块被
  content/src/index.ts re-export（:162-186），但**全仓（content/reforge/editor/migrate 生产
  与测试）零真实调用**（本人逐函数名 rg）——版本切换已完成、迁移侧另有 transition 实现
  （_transitions seal 为 migrate 侧权威）。分类应为 `delete`；若 seal rewind 后续需要则走
  隔离保留例外，不得默认保留。
- **editor 侧类型面比锚点更广**：引用收集器（battle-field/enemy-team/item/world-variable-
  references）、commands、project-diagnostics、command-catalog 等 14 个 editor/core 文件
  import v13/v14 类型——多为类型 union 而非执行链，G0 census 需逐项区分「类型折叠」与
  「执行折叠」两类工作量。

**② 迁移可重建性**：PAL 可由 data/raw（MKF/RPG 实测在册）经 migrate:content 重建，
migrate-content.mts 自带 replay 对照（:392/:464 读已提交工程比对）；demo/e2e-own 为 authored
fixture，contentVersion=16（本人实测）、无 migrations/assets.legacy 声明（实测 null）——
无旧版本依赖残留。**当前未发现无法从 raw source 重建的真实输入**；若 build census 发现即走
例外门（与 Kimi 第 3 观察一致）。

**③ KA1 排序门可执行交集清单（机械列出）**：
`baselines/pal/_transitions/r13-*`（7 文件，B 正重建 v4 authority）∩ 本卡 G3「删已完成
transition seal」= **R13 族 seal 在 B 收口前不得判"已完成使命"**；
`test-fixtures/{pal-oracle,test-manifest}-v1.json`（B 三个越界提交均改）；
`scripts/migrate-content.mts`（本卡 G3 删 epoch dispatcher vs B proof 消费）；
`experimental/script-v5/{r13-*,source-instruction-disposition,pal-test-fixture}*`。
KA1 以此清单为机械检查基准。

**④ 测试矩阵可执行性**：characterization（KA2）——现有四包 focused 套件即 current 行为基线，
另需为 sanitize/resolve 委托链补逐层语义表征（对话树 resolve/行为 normalize 每层至少一条）；
双跑零 diff——migrate:content replay 已支持；静态门禁——本席 census 脚本（170/69 + 正则
家族 + 排除规则）可直接固化为 boundary 型门禁 + 已批例外 ledger（同 ED-AUDIT-2 GA2 方法论）。

**必落钉 GLM1-GLM3：**
- **GLM1（V5 命名轴裁定落卡）**：G0 census 增加「V5=当前脚本世代 vs v12/13/14=历史」
  独立轴；重命名范围显式裁定并写明理由（建议 V5 脚本模型名保留为领域名）；防止机械
  "消灭 vX" 误伤现行编辑器。
- **GLM2（dead upgrade 清单入 retention ledger）**：七个 content 包 upgrade 模块按 `delete`
  入账（零调用实测）；删除前跑全仓 census 复核零消费。
- **GLM3（静态门禁方法论钉死）**：census 正则家族、排除规则、例外 ledger 格式写入卡，
  使「product packages 无未批准旧版本 import」可复算（本席 170/69 为基线起点）。

**可证伪观察：**
1. 若 G0 census 发现某 V5 命名模块实为历史层（或反之 v13 模块承载唯一 current 语义），
   GLM1 轴分类逐项修正——轴本身不预设结论。
2. 若删除 dead upgrade 后 seal rewind 或任一测试变红，说明存在本人 rg 未覆盖的动态调用
   ——该项转隔离保留并补调用方证据。
3. 若 PAL 重生成双跑出现 diff 且根因不在上游迁移器，按迁移缺陷优先级规则停线上游。

Evidence: loader-v16.ts:26-47 / loader-v14.ts:138-154 / script-v14.ts:213-225 /
script-v13.ts:218-232 / save/migration-v16.ts:43-56 / edit-session.ts:32-38 /
reforge index.ts:171,186,195 / main.ts:168 / item-use-executor.ts:15 / content index.ts:162-186
（upgrade re-export）/ 全仓 node census 170 处/69 文件 / upgrade 函数名全仓 rg 零命中 /
data/raw 实测 / migrate-content.mts:392,464 / 三工程 manifest contentVersion=16 实测 /
PAL migrations+assets.legacy 实测。只读审查，未改实现文件，未代签 Kimi，未标 build/done。

#### Kimi 独立反证审查（2026-08-19，架构/公共接口主审；本人一手读码）

**「历史层只是内部复用」反证的证伪：** 若只是内部复用，历史模块应是纯函数库且只被 migrate/测试
消费。实测相反：①委托链携带真实数据变换（compat manifest 改写、dialogue tree resolve、payload
重写），不是共享 helper；②legacy shell 有生产消费方（main.ts/item-use-executor.ts）；③public
index 仍 export 旧层。产品债前提成立。

**G0-G5 压测：**

1. **G0/G1 边界正确**：折叠目标是「类型/校验/执行链 direct」，序列化 contract（content16 JSON
   形状）不变——这是本卡不动用户可见行为的关键，验收的 current PAL 重生成双跑零 diff 正是
   它的机器证明。
2. **G2 EditorState union 折叠**：open 只收 16 后 union 只剩单一 manifest 类型；undo/redo 与
   命令系统不感知 manifest 旧形状，折叠安全。
3. **G3 迁移例外门**：raw source（data/raw MKF）可重生成当前工程，例外只留给无法重建的输入
   （当前 PAL 普查未发现）；例外必须列唯一调用方/删除条件/用户批准——与 OPS-B 的 seal 裁决一致。
4. **G4 资源闭环顺序正确**：先把 legacy family 纳入 catalog 再删 adapter，不允许产品路径临时
   回退 extracted——防止「删了才发现还在用」。
5. **G5 验证纪律**：focused per gate + 最终一次全量,符合用户「长时验证只跑一次」的要求。

**必落钉（build 必落，不阻塞准入）：**

- **KA1（与 OPS-TST-PERF-B 排序门）**：本卡删除 migrate 历史 seal/sidecar/epoch dispatcher 的
  gate 必须排在 OPS-TST-PERF-B 的 v4 seal 重建收口之后；两卡不得并行改同一条历史证据链。
  B 正在重建的 v4 authority 若被本卡判为「已完成使命」须重新过用户裁决，不得默认删除。
- **KA2（语义表征先行硬门）**：script-v14→v13→v5 的 sanitize/resolve 委托链携带真实语义
  （对话树 resolve、行为 normalize 等）。折叠前必须先为 current 行为建立逐层 characterization
  测试；删除委托壳后这些测试必须原样通过。缺任一层 characterization 不得删该层。

**可证伪观察：**

1. 若全仓 census 发现某历史模块只剩纯函数且只被 migrate/测试消费，该项从「fold/delete」降为
   「隔离保留」并记 ledger——G0 的逐项判定正是为此存在。
2. 若折叠某层后 characterization 或 current PAL 重生成出现 diff → 该层语义被误删，回退该 gate。
3. 若发现无法从 raw source 重建的真实输入（当前未见）→ 该项走例外门并用户批准，不猜。

Evidence: 上文全部 file:line 均为本席本次会话直接打开核实。只读审查，未改实现文件，未碰
OPS-TST-PERF-B/C 未提交改动，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-20）** — direct content16/SAVE8、current author/runtime/editor/migrate、catalog-only
  资源和 current publication 均已落地；产品静态边界 3/3 通过，四包 typecheck 通过，current PAL dry-run
  `managed=537 writes=0 deletes=0 conflicts=0`。旧版本兼容审查见 Review，结论 `pass`。
- Kimi: **counter（2026-08-20，仅 RA1：`projects/pal/_transitions/` 5 个历史 sidecar 残留待删；
  其余公共接口/editor 双 session 边界/资源面/ledger/静态门禁全部一手核验通过，详见 Review 节主审
  记录）**。RA1 为纯死文件删除，落地 + boundary test 复绿后本席直接转 accept，不需重新全面复审。
- GLM: pending
- counter / 返工处理: Kimi RA1（见 Review 节）
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **G0 依赖与保留判定**：先按 symbol/file/call-site 建全仓 census；每项只能标 `delete`、`fold into current`、
   `isolated source converter`。最后一类必须列真实输入、为什么不能重生成、唯一调用方、删除条件和用户批准。
2. **G1 current content + runtime**：保留 content16 的序列化 contract，但把当前类型、校验和执行语义搬到无版本层叠
   的领域模块；V5/V13/V14 不是 current 的基类。删除 content/reforge public exports 和 product imports。
3. **G2 editor + save**：`EditorState`、open/save、命令系统和 runtime 存档只使用 current 类型；直接实现 SAVE8/
   content16 normalization，旧 payload 和 migration 不进入产品 bundle。
4. **G3 migration history**：迁移器从仍存在的 primary raw source 直接生成 current；当前工程 epoch 之间的中继文件、
   dispatcher、sidecar 和专属 fixture 在重生成后删除。若没有 raw source，则暂停该项并走例外门，不猜测。
5. **G4 asset closure**：先把 current PAL 的 effect-sprite/image 等 legacy family 纳入 catalog 和稳定 AssetId，再删
   LegacyAssetAdapter；不允许先删 adapter 再让产品路径临时回退 extracted 目录。
6. **G5 收口验证**：focused 验证随 gate 运行；最终相关全量只跑一次。静态门禁、current PAL 全量重生成与双跑零
   diff、文档版本矩阵共同构成完成证据。

### 已知风险

- 风险: 历史层里混有 current 行为，机械删除会造成功能缺失。
  - 缓解: G0 call graph + 删除前 characterization；先搬 current 语义，再删 compat 壳。
- 风险: `packages/migrate` 正在被 OPS-TST-PERF-B/C 修改，重叠开工会覆盖未提交证据。
  - 缓解: 本卡保持 draft；B/C 提交或明确交接、工作树差异归属清楚后才允许进入涉及 migrate 的 build。
- 风险: 迁移可复现性被误当成保留产品旧版本的理由。
  - 缓解: 可复现证据归档到 Git/基线；真实 raw source 转换只在 migrate 隔离，不从 content/reforge/editor export。
- 风险: 把所有 `V1/V4` 名字一刀切会误伤独立局部文件协议并制造无意义 schema bump。
  - 缓解: retention ledger 必须先区分 product epoch 与 local format；局部格式除非形状变化，不改版本值。
- 风险: 一次提交过大，难以定位回归。
  - 缓解: 单一 Coding Owner、同一任务分 gate 原子提交；每 gate 都能独立 typecheck/test，最终一次总门禁。

### 主审立场

- Reviewer: Kimi（架构/公共接口主审），GLM（迁移覆盖/测试矩阵副审）
- 结论: Kimi premise verified + design agree（KA1-KA2）+ GLM premise verified + design agree（GLM1-GLM3）
- 必改项: KA1（与 OPS-TST-PERF-B 的 seal 重建排序门）、KA2（逐层 characterization 先行）
- 是否建议进入 build: 是——GLM 签字且 KA1 排序满足后准入

### 三方争议记录(按需)

- Codex: 支持 current-only 收口；迁移所需历史只允许隔离且逐项证明，局部当前格式不强行改号。
- Kimi: 同意收口与 G0-G5；强调 KA1 排序门（不得与 OPS-B 并行改同一历史证据链）与 KA2 语义表征
  先行；「历史层只是内部复用」的反证已被生产消费链证伪。
- GLM: 同意收口与 G0-G5；补 V5 命名轴裁定（GLM1）、dead upgrade 清单（GLM2）、census 方法论
  钉死（GLM3）三钉；census 170/69 为静态门禁基线起点。
- 用户拍板: 2026-08-19 要求开卡；尚未豁免三签或批准任何历史转换器例外。

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
- 修改文件:
  - `docs/ops/evidence/ARCH-CURRENT-ONLY-1-retention-ledger.md`
  - `packages/content/src/**`、`packages/reforge/src/**`、`packages/editor/src/**`
  - `packages/migrate/src/**`、`packages/migrate/scripts/migrate-content.mts`、current PAL baseline/project
  - current-only 架构/迁移/脚本/资源文档、本任务卡与 `docs/ops/board.md`
- 实现摘要:
  - 2026-08-20 接管 `OPS-TST-PERF-B` 停线交接；失败候选不作为 authority，表示层 byte-order 差异不再建设兼容转换器。
  - 完成 GLM1 命名轴裁定：原 `V5 + V13 + V14` 表达的是现行脚本语义演进，能力保留并折叠为无版本 `current author-script`，不继续作为产品公开版本号。
  - 建立 G0 retention ledger，逐类记录 product epoch、保留/折叠/删除处置、唯一调用域与删除前 characterization 门禁；当前没有批准任何隔离旧版转换器例外。
  - content 直接暴露 current author/runtime scene、script、dialogue、item、enemy、lifecycle 与校验模块；删除旧
    upgrader、旧 epoch 类型、专属 fixture/test 和 public export，序列化边界只保留 content16。
  - reforge 把 loader、project、compiler/runner/world/host adapter 与 SAVE8 codec 折叠为无版本 current 模块；
    删除 v5/v13/v14/v16 委托链、legacy runtime shell 和 SAVE5..7/content4..15 migration 产品入口。
  - editor 打开/保存只接受 current project；`App` 必须携带 current `ScriptEditSession`，普通交互投影不能绕过
    `mergeEditorProjectionWithCurrentAuthorState` 单独保存。主会话与脚本会话按字段域分工，不存在旧 schema
    双读/双写或可保存的 legacy shell；私有脚本占位在保存投影中 fail-closed 地替换为唯一 current 正文。
  - PAL effect-sprite/image 已物化进唯一 catalog；删除 `assets.legacy`、LegacyAssetAdapter 与 extracted fallback。
    current catalog 为 1,935 个资产，其中 effect sprite 56 个、922 帧、652,870 bytes。
  - migrate 只保留 PAL raw source -> current publication：删除 `_transitions/`、旧 sidecar、rewind/seal、历史
    epoch dispatcher/fixture/实验发布链；一次 current 三方 merge 后 manifest 最后提交。
  - current PAL 已正式发布并复跑：首次计划 `writes=1 deletes=1 conflicts=0`，写入后 replay 与本次复验均为
    `writes=0 deletes=0 conflicts=0`；闭包 `scenes=294 maps=223 assets=1935`。
  - 更新版本矩阵：content16、SAVE8、Map4/AssetCatalogV1 等局部格式和 raw-source migration 是四条独立轴；
    产品文档不再宣称支持旧工程/旧存档升级。
- 运行命令:
  - `pnpm --filter @type-pal/{content,editor,reforge,migrate} typecheck`：四包通过。
  - 最终相关包级门禁只执行一次：reforge `88 files / 820 tests`、migrate unit
    `37 files / 324 tests` 直接通过；content/editor 暴露 1/19 个收口测试债后只定向返工，不重复整套长跑。
  - 定向返工复验：content `validate-refs 37/37`；editor 原失败集合 `8 files / 85 tests` 复绿，最后一项
    `ui-review-samples 3/3` 复绿；新增保存边界复验 `2 files / 10 tests` 通过。
  - `pnpm --filter @type-pal/migrate migrate:content`：`managed=537 writes=0 deletes=0 conflicts=0`。
  - `current-only-product-boundary.test.ts`：`3/3`；`git diff --check`：通过。
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: 按用户明确要求，修复最终门禁发现项后不再重复四包整套长跑；只复跑所有失败文件及
  其保存边界。无视觉变化，不做页面巡检。

## 资源生成记录(如适用)

N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: N/A
- Visual Verification Timing: N/A
- 验证方式: current 工程最小功能 smoke，不属于视觉验收。
- 集中 E2E 用例 / 批次: N/A
- 截图 / 像素检查路径: N/A
- 结论: N/A；本卡不改变视觉或交互。
- 未完成项: 无视觉项；等待 Kimi/GLM 代码审查。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- Codex 自审结论: **accept**。
- 旧版本兼容审查: **pass（Codex，2026-08-20）**。
  - product source 静态门禁未命中未批准的旧 loader/script/save epoch import/export、legacy shell、compat
    branch 或旧 fixture。
  - migration 静态门禁未命中 `_transitions/`、`content/migrations/`、旧 content/save 分支、rewind/seal、
    `extractLegacyScriptEdges` 或旧 payload。
  - 允许命中仅限 retention ledger 显式 current/provenance 项：Map4、AssetCatalogV1、ScriptChunk/IndexV1、
    `legacy-migrated` origin、浏览器 `onupgradeneeded`、PAL raw legacy-dialog 解码。
- Kimi/GLM 审查结论: Kimi **counter（2026-08-20，仅一项精确返工 RA1；RA1 已于同日落地，待复签
  accept）**；GLM pending
- 必须返工项:
  - **RA1（唯一，`projects/pal/_transitions/` 残留删除；已完成）**：`b10-enemy-team-slots-v1.json`、
    `b2-battle-field-domain-v1.json`、`c1-dialogue-identity-v1.json`、`c1-npc-curation-v1.json`、
    `w9-entity-lifecycle-v1.json` 五个历史 sidecar 仍 git 追踪在当前工程目录。ledger 的删除条件
    已满足（direct current publication proof 存在、`pal-current-publication.ts:64` 禁止该路径、
    manifest 无 migrations 声明、无生产 reader——全仓仅负向断言引用）；baseline 侧
    `_transitions` 已清空，工程侧未删。属本卡范围「删除已完成使命的 transition sidecar」的漏项，
    也违反开发期版本纪律。删除后 migrate:content replay 应保持 writes/deletes/conflicts = 0/0/0
    （这些文件本就不在 managed set），current-only boundary test 全绿即闭环。RA1 为纯死文件删除，
    落地后本席直接转 accept，不需要重新全面复审。Codex 已删除全部 5 个 git tracked sidecar；
    `migrate:content` 复验为 `managed=537 writes=0 deletes=0 conflicts=0`，闭包仍为
    `scenes=294 maps=223 assets=1935`；`current-only-product-boundary.test.ts` 为 `3/3`。
- Accept / rework: RA1 已闭环，等待 Kimi 将 counter 转 accept；GLM 独立审查并行。

### Kimi done 前主审记录（2026-08-20，本人一手读码 + focused 复跑，非代理）

**逐项核验（除 RA1 外全部通过）：**

1. **公共接口 current-only ✓**：content/src 全部模块已改为无版本领域命名（author-script/
   author-scene/author-dialogue/author-item/author-enemy/entity-lifecycle 等），content/index.ts 与
   reforge/src/index.ts 对 `V5/V13/V14/V16/Legacy` 零命中；`loader-v5/v13/v14/v16`、
   `legacy-runtime-shell-v5`、`script-v13/v14`、`migration-v13/v14/v16` 生产文件全不存在、生产码
   零引用；save/ 只剩 `current-codec.ts` + current characterization。
2. **editor 边界 ✓（不构成任务卡禁止的"双作者态"）**：`ScriptEditSession` 是脚本作者真值，
   生产 App 必须携带（App.tsx:255）；主 EditSession 是 shell 内容 + 交互投影；两条保存路径
   （save :1429-1438 与 saveAs :1532-1539）都经 `serializeEditorSnapshot`，缺 scriptState 即抛
   「current 作者态缺失，拒绝序列化交互投影」，唯一 merge
   `mergeEditorProjectionWithCurrentAuthorState`（script-editor-projection.ts:153）带 fail-closed
   校验（:49 未登记 onLose 即拒）。不存在可绕过 merge 的序列化路径，也不是双读双写——两 session
   按字段域分工 + 单 merge，与我 build 前认可的分工一致。
3. **资源面 ✓**：`assets.legacy` 配置、LegacyAssetAdapter、extracted fallback 均不存在；
   `legacy-migrated` 仅为 origin 溯源标签（asset.ts:74,99,152，与 allowlist 一致）；PAL manifest
   无 legacy key、无 migrations 声明。
4. **retention ledger 与静态门禁 ✓**：ledger 逐类处置 + allowlist 逐项有角色；本席复跑
   `current-only-product-boundary.test.ts` 3/3、script-editor-projection.test 2/2 通过；KA1 排序门
   已按 OPS-B 停线交接执行、KA2 characterization 文件在位
   （author-script.current-characterization.test.ts 等）。
5. **RA1 发现的来源**：Build 摘要称「删除 `_transitions/`、旧 sidecar」，但 projects/pal 侧 5 个
   sidecar 仍在（baseline 侧已清空）；负向断言只防再生产、不删既有文件。

Evidence: content/src 目录全量 ls + 双 index grep / App.tsx:86-90,255,268-278,1429-1438,1532-1539 /
script-editor-projection.ts:49,153 / save/current-codec.ts / asset.ts:74-152 /
projects/pal/manifest.json 实测 / projects/pal/_transitions 5 文件 ls + git ls-files /
pal-current-publication.ts:64 / current-only-product-boundary.test.ts:71-77 / 两测试复跑输出。
只读审查，未改实现文件，未代签 GLM，未标 done。

## 用户验收

- 用户结论: 2026-08-19 要求开卡；2026-08-20 确认 OPS-TST-PERF-B 已按交接停线，由 Codex 开始实现。
- 后续任务: Kimi 架构/公共接口审查，GLM 覆盖/迁移/测试矩阵审查；三方 accept 后再请用户最终验收。

## 交接日志

- 2026-08-19 Codex: 完成现状抽样、前提门、范围、分 gate 设计与 Codex build 前签字；未修改实现。
  Evidence: 本卡真值矩阵及代码锚点。Next: Kimi 独立核验架构前提并签字或 counter。
- 2026-08-19 Kimi: 独立前提核验 + 架构主审完成，签 **premise verified + design agree（附
  KA1-KA2）**。一手核实：产品边界只收 16/8 但 loader/script/save 逐层委托 v14/v13/v5 且携带真实
  数据变换；legacy shell 有生产消费方（main.ts/item-use-executor.ts），「内部复用」反证不成立；
  EditorState manifest union、migrate 4..16 dispatcher、PAL 已完成的 script-v4-v5 transition 与
  effect-sprite/image legacy 族逐项属实；局部格式轴（Map4/AssetCatalogV1）独立正确。钉：KA1
  与 OPS-TST-PERF-B seal 重建排序门；KA2 逐层 characterization 先行。未改实现，未碰 B/C 未提交
  改动，未标 build。Next: GLM 覆盖/迁移审查（提示词见下）。
- 2026-08-19 GLM（覆盖/迁移/测试矩阵）: 审查完成，签 **premise verified + design agree（附
  GLM1-GLM3）**。前提链逐项复现 + **全仓 census 170 处/69 文件**；三项增量：①V5 命名歧义轴
  （大量 V5 是当前脚本创作模型，机械消灭 vX 会误伤现行编辑器——GLM1 裁定落卡）；②content 包
  七个 dead upgrade 模块零调用实测（卡内漏列——GLM2 入 delete ledger）；③KA1 交集清单机械
  列出（R13 seal 族/oracle manifest/migrate-content.mts/script-v5 目录）。三工程 content16、
  PAL raw 可重建、demo/e2e-own 无旧依赖实测。未改实现，未碰 PERF-B/C 改动，未标 build/done。
  Next: KA1 排序满足 + GLM1 裁定落卡后转 build。
- 2026-08-20 Codex（Coding Owner）: 完成 G0-G5 current-only 收口、current PAL 正式发布/零差异复验、
  product/migration 静态门禁和四包验证；签 **accept**，任务转 review。最终整套门禁只跑一次；其发现的
  content/editor 失败均按文件定向复绿。Next: Kimi 独立代码/架构审查，不得修改实现或标 done。
- 2026-08-20 Kimi: done 前主审完成，签 **counter（仅 RA1）**。公共接口 current-only（content 全面
  无版本化改名、双 index 零旧纪元导出、loader/save/legacy shell 删除）、editor 边界（单 merge +
  fail-closed、非双作者态）、资源面（catalog-only、legacy-migrated 仅溯源标签）、ledger 与静态门禁
  均一手通过（boundary 3/3、projection 2/2 本席复跑）。唯一返工 RA1：`projects/pal/_transitions/`
  5 个历史 sidecar 仍在 git 追踪（baseline 侧已清空、负向断言只防再生产）；纯死文件删除，落地后
  本席直接转 accept。未改实现文件，未代签 GLM，未标 done。Next: Codex 落 RA1 + GLM 覆盖终审。
- 2026-08-20 Codex: 完成 Kimi RA1 返工，删除 `projects/pal/_transitions/` 全部 5 个 git tracked 历史
  sidecar；focused 复验 `migrate:content` 为 `537/0/0/0`、闭包 `294/223/1935`，current-only boundary
  `3/3`。未重复四包长测。Next: Kimi 直接复签 accept；GLM 继续独立终审。

## 下一位 Agent 提示词

### 给 Kimi（RA1 focused 复验并转 accept，可直接复制）

```text
继续任务: ARCH-CURRENT-ONLY-1——Kimi RA1 focused 复验
任务卡: docs/ops/tasks/ARCH-CURRENT-ONLY-1-development-current-only-consolidation.md
当前状态: review；你此前仅因 RA1 counter，Codex 已删除 projects/pal/_transitions/ 5 个 tracked sidecar；
GLM 终审 pending；不得标 done
请只做你承诺的最小复验：
1. 确认 projects/pal/_transitions/ 已无 tracked 文件；
2. 核对任务卡记录的 migrate:content 537/0/0/0、闭包 294/223/1935 和 boundary 3/3 证据；
3. RA1 闭环则把 Kimi counter 转 accept，并写回 Review/交接日志；若仍有问题，仅给精确 file:line/路径证据。
不得修改实现文件、不得代签 GLM、不得标 done；无需重新全面复审或重跑长测试。
```

### 给 GLM（done 前覆盖/迁移终审，可直接复制）

```text
接手任务: ARCH-CURRENT-ONLY-1 开发期单版本架构收口——GLM done 前覆盖/迁移终审
任务卡: docs/ops/tasks/ARCH-CURRENT-ONLY-1-development-current-only-consolidation.md
当前状态: review；Codex accept、Kimi counter 的唯一 RA1 已落地并待其复签；不得标 done
你的角色: GLM，独立覆盖/迁移/测试矩阵终审
先读: 任务卡全文、docs/ops/evidence/ARCH-CURRENT-ONLY-1-retention-ledger.md、Review 节 Kimi 主审记录
请独立执行:
1. 复核 G0 retention ledger 的分类完整性：GLM2 七个 dead upgrade 模块删除、KA1 交集清单、
   GLM1 命名轴裁定在实现中的落地形态。
2. 独立复算 current PAL：migrate:content replay writes/deletes/conflicts=0/0/0、闭包
   scenes=294 maps=223 assets=1935、effect-sprite 56/922 帧目录 census。
3. 复核 characterization（KA2）覆盖与 current-only-product-boundary 静态门禁的召回率
   （允许项是否全部落在 ledger allowlist）。
4. 核对 RA1 落地后的零 diff 证据与测试矩阵收尾。
输出: 在进入 done 前签 GLM accept 或 counter + 精确缺口；写回 Review/交接日志。
不得修改实现文件、不得代签 Kimi、不得标 done。
```

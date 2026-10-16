# R24 phase2 archive designs · independent readonly review

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 ops evidence historical artifact 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 2dd1768c675dd7cd694a00d803dac0c7b1375071；本轮 R89。此文件属于 ops evidence historical artifact 历史层，不能单独授权当前测试或发布。

## 原始结论

- R24 phase2 archive designs · independent readonly review：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `2dd1768c675dd7cd694a00d803dac0c7b1375071`，source SHA `524bf146b1dfdc0b953fb304f7d3c9ce17e863c541834530f10c6079e262549e`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # R24 phase2 archive designs · independent readonly review
>
> **Verdict: `accept-readonly-proposal`**
>
> 本回执是 Codex 的非作者独立只读接收：完整读取指定 21 篇正文，核对固定 Git source、after SHA、旧 registry/catalog/current review record 与 routing；不迁移正文、不写 ledger、不授权实现。它不提供 runtime/E2E/视觉/coverage 信用，也不把作者回执当作验收。
>
> ## Scope and fixed source
>
> - Worktree: `/Users/zhangxu/.codex/worktrees/docs-full-template-proposal/type-pal`; HEAD: `1d39e2f8ad43b88e232ae64aa96d103c189ea2a9` (2026-10-16T22:10:07+09:00)；审查时 `git status --porcelain` 为空。
> - 21 篇总读域：**4157 physical lines**；每篇均以 UTF-8 全文读取并计算 SHA-256。
> - 固定内容源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`（catalog 声明的 immutable sourceRevision）；独立复核在当前 HEAD 上再次逐字比对。
> - 每篇 `sourceSha256 == afterSha256 == catalog.sourceSha256`，且固定 Git blob 与当前工作树正文逐字一致；无 source/after 漂移。
> - 21 篇都在 document-registry 中为 `design-spec-v1` / `governed-legacy` / `content-reviewed`，catalog 为 `archive` / `archived` / `reviewed`。
> - 21 篇均不在当前 `routing.migratedDocuments`；这与 archive designs README 的边界一致：现行合同由 `docs/phase2/specs/`、READ-FIRST、代码和任务回执承接，不能把“未路由”解释为缺失 current 文档。
>
> ## Preserved blocking counters
>
> | Counter | Count | State | Boundary |
> |---|---:|---|---|
> | R24-B01 historical-boundary | 21 | preserved | governed-legacy/archive 只能追溯，current 由 successor specs/code 负责 |
> | R24-B02 no-runtime-credit | 21 | preserved | 只读全文和静态文档门不计 runtime/E2E/visual/coverage |
> | R24-B03 semantic-conflict-stop-lines | 21 | preserved | 版本、旧字段、deferred scope 和未迁移项逐篇保留 |
> | R24-B04 no-migration-ledger-write | 21 | preserved | 不迁移正文，不改 registry/catalog/routing/ledger |
>
> ## Static checks
>
> - `pnpm check:docs`: **PASS** — docs tools 120/120；Markdown 1235；local links 8076；tasks 361；document model 7 routes/282 body contracts；testing docs 0 issues；phase/lore 184；content-review 733/733。
> - `git diff --check`: **PASS**；工作树保持 clean。
> - 以上是静态文档治理证据；runtime/E2E/视觉/coverage credit 均为 **0**。
>
> ## Per-document full-read result
>
> | # | File | Lines | Source=after | Registry/catalog boundary | Routing |
> |---:|---|---:|---|---|---|
> | 1 | `actor-model-design.md` | 165 | `5ba7e2452177…` | `governed-legacy` / `archived` | absent (archive) |
> | 2 | `ambience-design.md` | 98 | `7fc897e7bb51…` | `governed-legacy` / `archived` | absent (archive) |
> | 3 | `asset-pipeline.md` | 255 | `09add5c9d41b…` | `governed-legacy` / `archived` | absent (archive) |
> | 4 | `battle-model-m4-design.md` | 143 | `d5e6e7509a35…` | `governed-legacy` / `archived` | absent (archive) |
> | 5 | `content-schema.md` | 469 | `da560b47421f…` | `governed-legacy` / `archived` | absent (archive) |
> | 6 | `e6-position-authority-design.md` | 101 | `99a404f997ac…` | `governed-legacy` / `archived` | absent (archive) |
> | 7 | `e7-follower-riding-design.md` | 73 | `f29ca5c2e543…` | `governed-legacy` / `archived` | absent (archive) |
> | 8 | `editor-design.md` | 407 | `d12087ad38d6…` | `governed-legacy` / `archived` | absent (archive) |
> | 9 | `enemy-ai-design.md` | 152 | `ad1523b980f6…` | `governed-legacy` / `archived` | absent (archive) |
> | 10 | `item-data-design.md` | 146 | `06bdceb34b81…` | `governed-legacy` / `archived` | absent (archive) |
> | 11 | `menu-design.md` | 104 | `3737284005b5…` | `governed-legacy` / `archived` | absent (archive) |
> | 12 | `model-design.md` | 203 | `e8b045286733…` | `governed-legacy` / `archived` | absent (archive) |
> | 13 | `poison-system-design.md` | 122 | `3066dffd6bde…` | `governed-legacy` / `archived` | absent (archive) |
> | 14 | `project-design.md` | 248 | `8eea1d70b120…` | `governed-legacy` / `archived` | absent (archive) |
> | 15 | `project-lifecycle-design.md` | 427 | `589920b16f6b…` | `governed-legacy` / `archived` | absent (archive) |
> | 16 | `save-system-design.md` | 188 | `e345ba95b310…` | `governed-legacy` / `archived` | absent (archive) |
> | 17 | `scene-model-m2-design.md` | 68 | `11070e661a85…` | `governed-legacy` / `archived` | absent (archive) |
> | 18 | `script-model-m3-design.md` | 171 | `5aa1b91b4958…` | `governed-legacy` / `archived` | absent (archive) |
> | 19 | `script-system-design.md` | 328 | `ccedfc19b363…` | `governed-legacy` / `archived` | absent (archive) |
> | 20 | `skill-data-design.md` | 145 | `efaf146d0316…` | `governed-legacy` / `archived` | absent (archive) |
> | 21 | `visual-design.md` | 144 | `a5b3e0ad93a5…` | `governed-legacy` / `archived` | absent (archive) |
>
> ### 1. `docs/phase2/archive/designs/actor-model-design.md`
>
> - Full read: 165 lines / 15670 bytes; fixed source blob `0bd8b25985a89e38da1f4a50a4bef5ac1c62e0aa`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 统一 ActorDef/NPC/party 身份，SpriteDef 方向帧/姿势帧/战斗精灵/头像，实体把 actor 与 sprite/facing 组合；编辑器角色模式、布置模式、迁移分期与 fidelity oracle。
> - Conflicts preserved: 正文保留 spriteNum、characters/旧资源字段和早期三层模型；当前 canonical 资产/角色身份以 current content/AssetId 与代码为准。；文内“设计待审/迁移分期”是历史计划，不能证明实现或当前用户行为。
> - Stop-line: 不得把历史 Actor/Sprite schema、迁移步骤或“Self-Review”提升为 current contract；必须回读 READ-FIRST、当前 content 模型与实现。
> - Successor entry points: `docs/phase2/READ-FIRST.md`；`docs/phase2/specs/content-schema.md`；`当前 packages/content 角色/精灵类型与代码调用域`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 2. `docs/phase2/archive/designs/ambience-design.md`
>
> - Full read: 98 lines / 5279 bytes; fixed source blob `f49b644545b6cf8f19e888c575b1503c6f9769c5`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: W6 只做昼/夜；以全帧乘法调色拟合原版，WorldState ambience 单值，setAmbience 脚本命令，300ms 渐变，编辑器预览和 12 场景手补迁移。
> - Conflicts preserved: ambiences.json/自定义黄昏天气、真实时间流逝和天气明确是设计边界或后续阶段，不是现行合同。；历史 contentVersion、脚本入口和滤镜实现需与当前 content22/视觉实现重新核对。
> - Stop-line: 不得把天气/实时钟或旧 ambience 表当作当前功能，也不得以文档推断运行时或视觉通过。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`docs/phase2/READ-FIRST.md`；`当前 visual/runtime ambience 调用域（如存在）`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 3. `docs/phase2/archive/designs/asset-pipeline.md`
>
> - Full read: 255 lines / 18601 bytes; fixed source blob `bb765d6252e684026700cceaef69378ca6fa64ad`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 资产与内容分离、AssetId/AssetRecord/catalog、路径/角色/所有权防护和 resolver；早期 UI box 切片后追加 A7-0 音乐、A7-2 静态图、A7-3 视频帧动画、A7-3T 瓦片、A7-3W/B 精灵及 R13 版本轴。
> - Conflicts preserved: §1–§6 的 public/ui、data/baked、双根 bake 是早期历史；后续附录混入 done/current 记录但整篇仍归档。；资产 catalog、migrated ownership、发布路径与当前 resolver 以 current content/migrate 规范和代码为准，不能按旧路径重迁移。
> - Stop-line: 不得执行本文历史 bake/迁移计划、恢复 legacy fallback，或用归档路径替换当前 AssetId/catalog 合同。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`packages/migrate/README.md`；`当前 asset catalog/resolver 与 A7 任务回执`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 4. `docs/phase2/archive/designs/battle-model-m4-design.md`
>
> - Full read: 143 lines / 11123 bytes; fixed source blob `87b29f799c82ed0c971541e20e227f22099d0a8e`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: M4 战斗纯核+壳分层，回合流程和结算沿用一阶段骨架；普查数据范围；SkillEffect/ItemUseEffect 共享；敌人 AI 命令/fallback；battleAnim；按 fidelity gate 分期。
> - Conflicts preserved: 标题明确数据/命令表待补全；AI、命令、动画和多人/边界行为仍有历史待定项。；fallback 数量、字段和“已拍板”只代表当时设计输入，不能作为当前战斗 runtime 或完整性证明。
> - Stop-line: 不得依据 M4 设计直接改战斗 schema/运行时或宣称全量覆盖；先以当前 battle/content 代码和一手原版证据核对。
> - Successor entry points: `当前 packages/game 与 packages/reforge 战斗代码`；`docs/phase2/READ-FIRST.md`；`当前 content schema/战斗资料`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 5. `docs/phase2/archive/designs/content-schema.md`
>
> - Full read: 469 lines / 33110 bytes; fixed source blob `697feb6e1dd0b9e9d25082059be41a7da25acd01`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 归档混合快照：稳定身份、三层状态、世界变量、SceneIndex/自包含场景、ProjectMap v4、事件/脚本入场、对话、音乐/视频/帧动画、世界/战斗精灵、工程目录、迁移器、实体外观解耦和 tileset 注册。
> - Conflicts preserved: 文件明示“现行契约 + 历史设计”但顶端声明当前规范已移至 specs；其中 content20、旧字段、旧迁移历史不能覆盖当前 content22/SAVE12。；同一文件的历史增量/appendix 与 current section 不能混作一个发布版本；旧 migration/fallback 必须保持历史。
> - Stop-line: 不得从 archive content-schema 直接生成或修改当前内容；唯一现行入口是 docs/phase2/specs/content-schema.md 与源码校验器。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`docs/phase2/specs/project-lifecycle.md`；`当前 packages/content/packages/migrate schema 与 validators`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 6. `docs/phase2/archive/designs/e6-position-authority-design.md`
>
> - Full read: 101 lines / 6244 bytes; fixed source blob `6032e4ed55af623bbbf9ade0e171d67833a81389`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 每实体一个位置权威；auto/队形与脚本互斥，只有接管实体暂停 auto，位移命令才隐式 take，显式 release；挂载父子局部偏移；followers 作为 E7/C7 预留；给出实现切分。
> - Conflicts preserved: 评审结论明确决策③④留 E7/C7；挂载/跟随行为在本文不是已实现合同。；authority/take/release 与当前 runtime 语义可能发生漂移，必须以当前 caller/测试复核。
> - Stop-line: 不得把“已评审”标题当作 runtime accept；未核对当前 authority owner、移动和 mount 调用域前不能实现/迁移。
> - Successor entry points: `docs/phase2/READ-FIRST.md`；`docs/phase2/capability-map.md`；`当前 reforge entity authority/follower/mount 代码与测试`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 7. `docs/phase2/archive/designs/e7-follower-riding-design.md`
>
> - Full read: 73 lines / 5934 bytes; fixed source blob `af9bc1efc4da2bd3b742ef9613b0c21385e83b1d`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: E7 把队员作为一等实体接入 E6 authority；follow/script/mount 三态，mount 为父实体+局部偏移；s213 芦苇漂、s005 坐船案例；translate-events 翻译表与实现步骤。
> - Conflicts preserved: 两个案例正文标记为 unmigrated；“待实现”和杜绝清单是历史设计约束，不是当前场景行为证据。；trail index、walking/frozenOffset 等旧想法被排除，但需以当前 follower/mount 实现确认。
> - Stop-line: 不得重启旧 E7 迁移或把案例状态写成已闭环；先核当前场景内容、authority owner 与 E7/C7 后继。
> - Successor entry points: `docs/phase2/READ-FIRST.md`；`docs/phase2/capability-map.md`；`当前 scene/entity mount/follower 实现与 s005/s213 内容`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 8. `docs/phase2/archive/designs/editor-design.md`
>
> - Full read: 407 lines / 40949 bytes; fixed source blob `d15255ab2cd8e0a8ac1d8076841f0cb15b32c090`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: React/Vite 编辑器架构、reforge 复用、编辑会话/撤销重做、模式插件和稳定深链；W7F 地图索引与绑定、W8 选择/Inspector；音乐/过场/战斗精灵/manifest/有序集合/统一引用删除；校验、落盘、布局、测试与后期边界。
> - Conflicts preserved: 归档正文混合早期地基和 A7/ED/X7 增量，done 标签只表示当时任务记录；现行工作台由 specs/editor-architecture 与 design-system 维护。；实跑预览、zod、自动布局等留后项不能被当作当前能力或视觉验收。
> - Stop-line: 不得按归档章节直接扩 editor UI/API；先核 current editor specs、当前代码/任务卡与一手用户行为。
> - Successor entry points: `docs/phase2/specs/editor-architecture.md`；`docs/phase2/specs/editor-design-system.md`；`当前 packages/editor 与 reforge integration`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 9. `docs/phase2/archive/designs/enemy-ai-design.md`
>
> - Full read: 152 lines / 9063 bytes; fixed source blob `a268c19eab54059022d33ca92e8f8aece1b494bf`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: M4c 用声明式条件/动作规则列表做敌人策略，纯函数选行动、确定性 RNG、迁移映射；玩家/敌人施法共用结算；战斗内 say、onDefeated 和 difficulty 扩展口。
> - Conflicts preserved: fallback AI、规则优先级、条件语义和动作覆盖在设计/迁移阶段，不能替代当前 battle runtime oracle。；say/onDefeated 与剧情脚本边界需以当前 canonical script/战斗接口复核。
> - Stop-line: 不得以规则表或“fallback”文字宣称敌人 AI 已全量迁移/运行；任何实现先补当前 source/engine 证据。
> - Successor entry points: `当前 packages/game/packages/reforge battle AI code`；`docs/phase2/specs/script-system.md`；`当前 enemy/content data 与 tests`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 10. `docs/phase2/archive/designs/item-data-design.md`
>
> - Full read: 146 lines / 8944 bytes; fixed source blob `86bc5660a5eb03fd91fe47d24a74e1dcddae727c`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: ItemData 能力块拆分；EquipSpec/EquipEffect、装备槽、持有/穿戴/有效属性；本期只实现 statBonus，use/throw 为扩展口；demo 与 phase3 边界。
> - Conflicts preserved: use/throw、抗性/授状态/授技能、商店和战斗引擎被明确留后；`statBonus` 仅是当时切片。；旧 item IDs/字段和状态 registry 可能已由 current content/AssetId 取代。
> - Stop-line: 不得把 use/throw 留口或 demo 数据当作当前 item contract/完整战斗能力；先核 current content types 和 caller。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`当前 packages/content item/status registry`；`当前 reforge menu/battle item callers`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 11. `docs/phase2/archive/designs/menu-design.md`
>
> - Full read: 104 lines / 8488 bytes; fixed source blob `50398ca2925a566a119d3fd495a272a539ef7809`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 数据驱动菜单状态机；角色/装备/技能/物品分页与动态布局，复用 D16 高清资产；主循环接线、文件落点和可扩展 tags/category；明确存档/地图/战斗等不做。
> - Conflicts preserved: 范围和 schema 是 2026-06 历史 demo 设计；不做项与实现步骤不能覆盖后来 menu/editor architecture。；文档没有当前浏览器/交互证据，无法证明视觉、可达性或保存行为。
> - Stop-line: 不得用菜单 archive 作为当前 UI contract 或视觉验收；后继必须读取 current editor design-system/runtime menu code。
> - Successor entry points: `docs/phase2/specs/editor-design-system.md`；`当前 reforge menu code`；`当前 editor/menu task records`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 12. `docs/phase2/archive/designs/model-design.md`
>
> - Full read: 203 lines / 15186 bytes; fixed source blob `16762dd10608ff02c33bfb33999fdcaefb08892d`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 对话结构化模型：DialogueCue/Row、text ID/i18n、content14 人物身份/立绘归属、控制符迁移、分页/autoAdvance 状态机、外观继承和分支留口；按三刀实施。
> - Conflicts preserved: 顶部 historical 标记与正文 N1-1/C1-2 “done/review”并存，必须保留时间轴；不能把旧 content14/字段当 current script model。；旧控制符、Dialogue 载荷和 editor 计划可能已被 current author-script/script-system supersede。
> - Stop-line: 不得按本文字段回写内容或宣称 N1/C1 runtime/视觉闭环；以 current script/content specs 与代码复核。
> - Successor entry points: `docs/phase2/specs/script-system.md`；`docs/phase2/specs/content-schema.md`；`当前 author-script/dialogue runtime/editor code`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 13. `docs/phase2/archive/designs/poison-system-design.md`
>
> - Full read: 122 lines / 9658 bytes; fixed source blob `d5a2c934db35fc99b1383bf14e080cbb7f71e452`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: PoisonDef 数据化 DoT 序列；毒槽独立于 BattleStatus；content20 脚本/剧情入口；入战携带、战后/读档清理、tick/抗性、相生相克和分片迁移。
> - Conflicts preserved: 设计把具体 content20、等级/数值、world↔battle 边界和迁移切片混在一起；当前 content22/SAVE12 和 runtime owner 可能已变。；致死/抗性/99 或 173 等历史数字只能由一阶段真值和当前 engine 共同证明。
> - Stop-line: 不得按 archive poison 数值、迁移段或“已接”文字修改 runtime；先核 game mechanics、当前 content registry、battle/world owner。
> - Successor entry points: `docs/phase1/game-mechanics.md`；`docs/phase2/specs/content-schema.md`；`当前 poison/content/battle code 与 tests`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 14. `docs/phase2/archive/designs/project-design.md`
>
> - Full read: 248 lines / 20316 bytes; fixed source blob `e73d5277b28e704167768f117b4919d4de0938b9`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 一工程一游戏；content 零依赖叶子、reforge/editor 依赖拓扑；manifest、content JSON、迁移清单；dev project 选择；编辑器与内容/资产边界；A7-2 静态图更新。
> - Conflicts preserved: v1 manifest/examples、旧路径和历史版本轴与 current project lifecycle/content22 不同；appendix 不能覆盖当前 loader/validator。；“打包选单留后”、工程发现和资产所有权是范围边界，不是已完成用户能力。
> - Stop-line: 不得按旧 manifest 例子生成项目或恢复旧兼容入口；以 current project lifecycle/content specs 与源码常量为准。
> - Successor entry points: `docs/phase2/specs/project-lifecycle.md`；`docs/phase2/specs/content-schema.md`；`当前 packages/editor/content/reforge project loader`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 15. `docs/phase2/archive/designs/project-lifecycle-design.md`
>
> - Full read: 427 lines / 36495 bytes; fixed source blob `1cdb87e08f7d38be4fbd8ae99deb58879306db5f`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: FSA 本地工程生命周期：ProjectPicker、新建 PAL 克隆/空白、打开/增量保存、IndexedDB 句柄、错误边界/测试；后续资产注册、各 A7 资源生命周期、N3 epoch、R13 版本轴和 current-only/PAL snapshot。
> - Conflicts preserved: 归档正文从早期 FSA 到多个版本附录，浏览器/zip/句柄限制与 current implementation 混杂；顶部明确现行合同已移到 specs。；旧 content/save 版本和“当前实现记录”不能覆盖 current content22/SAVE12。
> - Stop-line: 不得按归档实现步骤或旧版本迁移工程；先核 docs/phase2/specs/project-lifecycle.md、源码校验器和真实 FileSource caller。
> - Successor entry points: `docs/phase2/specs/project-lifecycle.md`；`当前 packages/editor project lifecycle/FileSource code`；`当前 content/save version constants`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 16. `docs/phase2/archive/designs/save-system-design.md`
>
> - Full read: 188 lines / 9759 bytes; fixed source blob `8a4b58ada63a14d896f25a78d1d9e1c4f8d1565a`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 顶部保留 SAVE8/content20 当前快照；历史 v1 定三块存储、SaveMeta/Payload、IndexedDB、30 slots/分页、缩略图、版本迁移、错误处理与分期。
> - Conflicts preserved: 当前段落已落后于 current SAVE12/content22；历史 v1 的 30 槽/字段、迁移和截图流程不可作为当前合同。；保存恢复、临时状态清理和 codec 以 current save spec/source 为唯一 owner。
> - Stop-line: 不得按 SAVE8/v1 示例改存档、运行迁移或宣称存档/E2E 通过；只能引用 current save spec、源码和受保护测试。
> - Successor entry points: `docs/phase2/specs/save-system.md`；`当前 packages/reforge save codec/loader`；`当前 save/recovery tests`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 17. `docs/phase2/archive/designs/scene-model-m2-design.md`
>
> - Full read: 68 lines / 6268 bytes; fixed source blob `a36776ab000050fc943a6aca02744739a4e0ec3b`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: M2 场景静态迁移：scene id/map/entries/music/hidden/zBias；per-scene 目录与索引；reforge 多场景/LRU；迁移器分层、阶段 gate 和原版普查锚点。
> - Conflicts preserved: 旧 mapNum/map.room/reuseOriginalMap/spriteNum 等历史载荷与 current SceneIndex/ProjectMap v4/AssetId 不同。；阶段 gate 与 295 场景统计只证明设计输入，不证明当前迁移/运行时覆盖。
> - Stop-line: 不得以 M2 方案重跑全场景迁移或恢复旧地图字段；先核 current content/map specs、source extractor 与 scene loader。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`当前 scene/project map code`；`当前 migration/extraction contracts`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 18. `docs/phase2/archive/designs/script-model-m3-design.md`
>
> - Full read: 171 lines / 11436 bytes; fixed source blob `cfffe9a1b5d4f96bc6d6a6b533013c85c99fa4eb`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: M3 以 43,503 指令/160 opcode 普查为输入，定义 AST v1、World/entity state、页模型、命令/trigger/scene entry；纯 translator+golden；reforge async single interpreter；按 M3a/b/c gate。
> - Conflicts preserved: 正文保留 `unmigrated`、R2/旧分片和阶段计划；后续 current-only 已退役可执行旧版本，不能恢复 sidecar/fallback。；解释器/迁移覆盖数字是历史设计输入，不是当前运行时/E2E 证据。
> - Stop-line: 不得按 M3 v1 AST 或旧 unmigrated 机制实现兼容层；以 current script-system、author/runtime script code 和真实源输入复核。
> - Successor entry points: `docs/phase2/specs/script-system.md`；`当前 packages/content/packages/reforge script compiler/runtime`；`当前 migration source contracts`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 19. `docs/phase2/archive/designs/script-system-design.md`
>
> - Full read: 328 lines / 18550 bytes; fixed source blob `3f62517aa6240b8bcd645817c07976e62953c246`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 上半部记录 content20/SAVE8 时的 canonical 脚本：EntityAddress、Page/Behavior/Hook registry、shared-scripts/itemPrivateScript、stages/stateMachine transition cadence、显式 actor conditions、统一 ScriptEditSession、safe-point/epoch 与 current-only loader；下半部是被 supersede 的 v0 嵌套 AST/模板/触发器草稿。
> - Conflicts preserved: 顶部“当前实现”已落后于 HEAD 当前 content22/SAVE12；归档文档同时含 current snapshot 与已 supersede v0，字段不可直接回写。；旧 `jumpScript`/匿名 binding/legacy sidecar、v0 模板和待定命令集只能追溯，不能作为兼容 fallback。
> - Stop-line: 不得以 archive 的 content20/SAVE8 或 v0 草稿改脚本/存档；唯一后继是 current script spec、源码与发布校验器。
> - Successor entry points: `docs/phase2/specs/script-system.md`；`当前 author/runtime script, scene and save code`；`N3-1 task record and current validators`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 20. `docs/phase2/archive/designs/skill-data-design.md`
>
> - Full read: 145 lines / 12908 bytes; fixed source blob `d2bf0812363d8df95b9e236f2410b5432ceb0c0b`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: 三层技能 schema：SkillData（typed effects、target/animation、cost）、WorldState.learnedSkills 关系表、levelUpSkills 规则；Status registry 归一；用气疗/飞龙/灵葫/状态/召唤/变身验证表达力；完整引擎与全量迁移留 phase3。
> - Conflicts preserved: skill id、demo 数据和 content20 registry 是历史快照；效果引擎/抗性/命中、102 技能全量迁移、升级逻辑明确未做。；poison 独立、永久属性/phase3 扩展等边界需与当前 item/status/battle canonical 对齐。
> - Stop-line: 不得把 typed effect examples 当作战斗实现或全量技能覆盖；先核 current content/battle data and source oracle。
> - Successor entry points: `docs/phase2/specs/content-schema.md`；`当前 packages/content skill/status data`；`当前 battle/menu callers；phase3 backlog only for deferred work`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ### 21. `docs/phase2/archive/designs/visual-design.md`
>
> - Full read: 144 lines / 10900 bytes; fixed source blob `66b05803d453735890d4e0dda53fd906afdd80ed`; `sourceSha256 == afterSha256` = **yes**.
> - Classification: `design-spec` / `design-spec-v1` / `governed-legacy`; registry `content-reviewed`; catalog `archive` / `archived` / `reviewed`; prior review record `20261004-structured-content-phase2-01.json` with `content-reviewed`.
> - Current/historical/draft boundary: current contract is owned by the listed successor specs/code, never by this archive file Historical labels remain: historical design/草案 labels remain source claims; they do not authorize a current draft or implementation
> - Semantic outline: Canvas2D 对话外观第二刀：text/render 原语与 dialog 两层，字模 bake/阴影/颜色/打字/光标/分页，top/bottom slot 共存、portrait、autoAdvance；鬼话仪表盘覆盖参数；资产加载、实现切片和留后项。
> - Conflicts preserved: 正文自标草案/历史，且鬼话 demo 使用占位头像、超长段和浏览器验证计划；不等于当前视觉实现或 E2E。；真值在 dialogue-presentation reference/current runtime；narration/item-box/分支/center/迁移明确留后。
> - Stop-line: 不得凭 archive 设计宣称 UI/视觉闭环，也不得恢复旧 slot/portrait 字段；任何改动先核 current dialogue/content/editor design-system 和实际截图/E2E。
> - Successor entry points: `docs/phase2/reference/dialogue-presentation.md`；`docs/phase2/specs/editor-design-system.md`；`当前 reforge text/dialog runtime and visual E2E`
> - Acceptance limits: readonly proposal only; migration/runtime/E2E/visual/coverage credit = 0.
>
> ## Acceptance boundary
>
> 本回执的 `accept-readonly-proposal` 只表示 21 篇均已完整独立读取、固定 source/after 与旧治理记录一致、冲突和停止线未被抹平、静态 docs gate 通过。它没有授予正文迁移、current promotion、ledger 写入或实现开工许可。
>
> 完整机器记录见同名 `.json`；其中保留每篇 registry、catalog、旧 current review record、source blob、heading census、语义冲突、后继入口和零产品信用边界。
>
>
<!-- original-source-quote:end -->

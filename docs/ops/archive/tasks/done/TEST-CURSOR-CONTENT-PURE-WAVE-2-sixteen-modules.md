# TEST-CURSOR-CONTENT-PURE-WAVE-2 — 内容模型十六模块纯逻辑回归

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `c097f7b12e52003829ac1dd43384cae2776a55161d23eb535c4c0d2945eb03e3`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CURSOR-CONTENT-PURE-WAVE-2 — 内容模型十六模块纯逻辑回归
>
> Status: done
> Owner: Cursor（隔离工作树内唯一测试 Coding Owner）
> Reviewer / Integration Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（纯内容模型/状态，不做 UI 结论）
> Product Freeze: `31945f4e59e898acbaebaa3f4e5cb76dd58f045a`
> Official Fast at Assignment: 46,615/63,323 branches; 9,505 tests / 730 source files
>
> ## 目标与前提
>
> Codex 核准 **build allowed**：只对当前 canonical 内容模型的现行公开函数补差异回归，
> 不改产品/schema/格式/资产/旧测试/覆盖率配置。纯测试任务的用户可见 before→after
> 为 N/A；真实缺陷以独立诊断交 Codex，不把错误行为写成绿合同。历史 LCOV 未命中
> 臂是候选池，不是要填满的数字目标。每行可以是新测、已有精确证据、守卫前阻断、
> 无现行消费者或待证，不能为凑比例复活旧版本路径。
>
> **十六个精确目标**都在 `packages/content/src/`。先读目标源码、同名及相邻旧测试、
> 当前生产消费者；用合法 typed 输入与正式校验/构造链，不从纯函数接受了某个对象
> 就推断它能通过当前项目 guard。
>
> | 组 | 目标源码 | 优先业务轴 |
> |---|---|---|
> | C1 作者脚本 | `author-dialogue.ts`、`author-script.ts`、`author-script-core.ts`、`script.ts` | cue 身份/脚本阶段/目标引用的 current-only 正反链；旧测试已证的普通形状不重做 |
> | C2 角色与敌方条件 | `character.ts`、`actor-condition.ts`、`enemy-ai.ts`、`enemy-script.ts` | 非空角色/状态/规则输入的精确输出、非目标成员保真；不改一阶段机制真值 |
> | C3 物品与世界量 | `item.ts`、`shop.ts`、`rewards.ts`、`world-variable.ts` | 合法库存/交易/奖励/变量身份及零副作用拒绝；用户已有 WIP 不在这些文件 |
> | C4 引用与地图数据 | `asset.ts`、`tileset.ts`、`project-map.ts`、`command-target-reference.ts` | 路径与引用归属、地图往返和非目标记录；资源与 map 正控先过正式结构门 |
>
> ## 边界和所有权
>
> - 只新增目标旁 `*.cursor-pure-wave2.test.ts`；需要共用输入时仅在
>   `packages/content/src/__tests__/cursor-pure-wave2-*.ts` 建 fixture（`__tests__`
>   不作为生产源码进入官方统计）。回执/负控工具仅在
>   `docs/testing/archive/legacy/batches/cursor-content-pure-wave2/**`；可在本卡末尾追加 Cursor 交付块。
>   不碰旧测试、产品、构建脚本、基线、索引和看板。
> - 上轮 [A01–A03/B04 接收](../../../../testing/archive/legacy/batches/cursor-pure-wave/codex-final-review.md)的
>   非法错桶/无消费者、伪 deflate 与 fixture 入源码清单教训必须保留；不重测刚收口
>   的 `frame-sequence.cursor-boundaries`、`item.cursor-boundaries` 同一业务臂。
>   GLM 只做 editor UI；Codex 保留主壳/地图 UI/脚本编辑器/战斗主链/E2E 目标。
> - 非法输入只可明确称「防御轴」，不得伪称正式工程正控。真实输入在调用前深快照，
>   调用后立即对比**同一对象**；核完整业务结果、旁记录和错误前零副作用。
>   不 mock 被测函数，不用 `as unknown as`、空数组或重写 validator 来制造绿例。
> - 若某分支只有无消费者导出或当前 guard 前必拒，在账中登记证据并继续其它目标；
>   不修改产品以提高覆盖率，勿加 skip/test.fails/缩减官方选择。
>
> ## 一次性交付和验收
>
> 按 C1→C4 连续实施、整包一次交 Codex。交十六行逐模块账：生产调用域/当前 guard、
> 旧测试精确标题、新测试标题或证据分类、关键断言、反控、命令/退出码；每组至少
> 一条现行可达的单点负控（共四针以上），必须目标新测试自身确切 `AssertionError`
> 业务红、fullName/文件精确、一次执行、源 hash 不变。每组无新增时换同组另一入口
> 作针，仍无可达者如实标待证而非硬造。
>
> 各组定向/相邻通过、完整 content 包全测一次、content typecheck、所有新增代码文件
> Biome 0 error/warning/info 与 `check:docs` 通过。清除 agent 注入的 `NODE_COMPILE_CACHE`。
> 只可在整包末一次性做局部覆盖对照，不跑/不改全仓 check、官方 ratchet 或 strict-fast；
> Codex 独立审断言/负控并集成后统一串行执行。Cursor 自验不能替代独立验收。
>
> ## 上下文锚点与当前模式记录
>
> - [`AGENTS.md`](../../../../../AGENTS.md)、[`CLAUDE.md`](../../../../../CLAUDE.md)、
>   [二阶段 READ-FIRST](../../../../phase2/READ-FIRST.md)、上述目标同名及相邻旧测试、
>   [覆盖率持续队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
> - 2026-09-27 Codex：已核十六源码文件存在并暴露现行纯逻辑/验证入口，
>   与 GLM 十二 UI 模块零目标交集。最强反例为旧套件已证、生产 guard 不收测试
>   fixture 或导出无消费者；逐模块账、正式正控和红针必须区分这些情形。
>   `build allowed`，Cursor 独立分支实施；Codex 独立验收 pending。
> - done 准入：Codex 独立复跑后决定返工或集成、收口；不等待固定三席。
>
> ## 下一位 Agent 提示词
>
> 见 Codex 当次交接消息；以本卡最终 main 版本为准，不从聊天复述代替读卡。
>
> ## Codex 首轮独立接收（2026-09-27）
>
> 候选 `424ac428809041081a00998ef574c7da1e770ecd` 暂签 **counter / rework**。
> 定向筛选26/26（含本包18新例）、content typecheck 0、17文件 Biome 0、四针
> 候选自身业务红均已由 Codex 复跑；白名单外无产品改动。但 C3 两条直接反证见
> [独立接收记录](../../../../testing/archive/legacy/content/authoring-and-runtime/cursor-content-pure-wave2-codex-review.md)：
> `applyLevelGrowth(levels<=0)` 的三个现行生产调用域均不可传该输入，故该新例
> 与 c3 针不能算当前业务覆盖；`drawFromResourcePool` 的 reward ID 没有加入
> items map，正式引用闭包会拒绝该正控。其余已核项不重开，Cursor 仅修这两点。
> 本候选不合 main、不标 done；完整全仓门/官方覆盖率待独立接收后再执行。
>
> ## Cursor 交付
>
> 作者自验见 [十六行账](../../../../testing/archive/legacy/batches/cursor-content-pure-wave2/README.md)。不合 main，不改 Status。
> R1：撤回 `applyLevelGrowth(0/-3/0.9)` 的「当前可达业务」归因与原 c3 针；c3 改打 `grantBattleRewards` 死者 hiddenCounts 存活门。
> R2：资源池 `reward` 补真实物品记录，先过 `validateItems` 与 `validateReferences` 再断言使用结果。
> 其余已核组不重开。四针均为目标新测自身 `AssertionError`、`redExit=1`、源 hash 未变。
> 真实缺陷：无。
>
> ## Codex 最终独立接收与收口（2026-09-27）
>
> 返工候选 `f9bfb527` **accept**，R1/R2 按原反证闭合；
> [最终接收记录](../../../../testing/archive/legacy/batches/cursor-content-pure-wave2/codex-final-review.md)
> 逐项列输入、负控及统一门禁。15新增测试文件17项、四针业务红；
> content全包1198、typecheck/Biome零诊断。隔离集成后串行
> `pnpm check`10,017→官方ratchet→保护`ce7c9173`的单次strict9,556均通过，
> 官方fast 730源码文件、分支46,821/63,323；相对接收前+10已覆盖臂、
> 分母不变。Cursor 是测试贡献者，作者自验不替代 Codex 独立验收；
> 当前委派模式下不等固定三席。本卡 done，不关闭母卡的 +2pp 剩余目标。
<!-- original-source-quote:end -->

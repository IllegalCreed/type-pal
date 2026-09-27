# TEST-CURSOR-CONTENT-PURE-WAVE-2 — 内容模型十六模块纯逻辑回归

Status: build
Owner: Cursor（隔离工作树内唯一测试 Coding Owner）
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯内容模型/状态，不做 UI 结论）
Product Freeze: `31945f4e59e898acbaebaa3f4e5cb76dd58f045a`
Official Fast at Assignment: 46,615/63,323 branches; 9,505 tests / 730 source files

## 目标与前提

Codex 核准 **build allowed**：只对当前 canonical 内容模型的现行公开函数补差异回归，
不改产品/schema/格式/资产/旧测试/覆盖率配置。纯测试任务的用户可见 before→after
为 N/A；真实缺陷以独立诊断交 Codex，不把错误行为写成绿合同。历史 LCOV 未命中
臂是候选池，不是要填满的数字目标。每行可以是新测、已有精确证据、守卫前阻断、
无现行消费者或待证，不能为凑比例复活旧版本路径。

**十六个精确目标**都在 `packages/content/src/`。先读目标源码、同名及相邻旧测试、
当前生产消费者；用合法 typed 输入与正式校验/构造链，不从纯函数接受了某个对象
就推断它能通过当前项目 guard。

| 组 | 目标源码 | 优先业务轴 |
|---|---|---|
| C1 作者脚本 | `author-dialogue.ts`、`author-script.ts`、`author-script-core.ts`、`script.ts` | cue 身份/脚本阶段/目标引用的 current-only 正反链；旧测试已证的普通形状不重做 |
| C2 角色与敌方条件 | `character.ts`、`actor-condition.ts`、`enemy-ai.ts`、`enemy-script.ts` | 非空角色/状态/规则输入的精确输出、非目标成员保真；不改一阶段机制真值 |
| C3 物品与世界量 | `item.ts`、`shop.ts`、`rewards.ts`、`world-variable.ts` | 合法库存/交易/奖励/变量身份及零副作用拒绝；用户已有 WIP 不在这些文件 |
| C4 引用与地图数据 | `asset.ts`、`tileset.ts`、`project-map.ts`、`command-target-reference.ts` | 路径与引用归属、地图往返和非目标记录；资源与 map 正控先过正式结构门 |

## 边界和所有权

- 只新增目标旁 `*.cursor-pure-wave2.test.ts`；需要共用输入时仅在
  `packages/content/src/__tests__/cursor-pure-wave2-*.ts` 建 fixture（`__tests__`
  不作为生产源码进入官方统计）。回执/负控工具仅在
  `docs/testing/cursor-content-pure-wave2/**`；可在本卡末尾追加 Cursor 交付块。
  不碰旧测试、产品、构建脚本、基线、索引和看板。
- 上轮 [A01–A03/B04 接收](../../testing/cursor-pure-wave/codex-final-review.md)的
  非法错桶/无消费者、伪 deflate 与 fixture 入源码清单教训必须保留；不重测刚收口
  的 `frame-sequence.cursor-boundaries`、`item.cursor-boundaries` 同一业务臂。
  GLM 只做 editor UI；Codex 保留主壳/地图 UI/脚本编辑器/战斗主链/E2E 目标。
- 非法输入只可明确称「防御轴」，不得伪称正式工程正控。真实输入在调用前深快照，
  调用后立即对比**同一对象**；核完整业务结果、旁记录和错误前零副作用。
  不 mock 被测函数，不用 `as unknown as`、空数组或重写 validator 来制造绿例。
- 若某分支只有无消费者导出或当前 guard 前必拒，在账中登记证据并继续其它目标；
  不修改产品以提高覆盖率，勿加 skip/test.fails/缩减官方选择。

## 一次性交付和验收

按 C1→C4 连续实施、整包一次交 Codex。交十六行逐模块账：生产调用域/当前 guard、
旧测试精确标题、新测试标题或证据分类、关键断言、反控、命令/退出码；每组至少
一条现行可达的单点负控（共四针以上），必须目标新测试自身确切 `AssertionError`
业务红、fullName/文件精确、一次执行、源 hash 不变。每组无新增时换同组另一入口
作针，仍无可达者如实标待证而非硬造。

各组定向/相邻通过、完整 content 包全测一次、content typecheck、所有新增代码文件
Biome 0 error/warning/info 与 `check:docs` 通过。清除 agent 注入的 `NODE_COMPILE_CACHE`。
只可在整包末一次性做局部覆盖对照，不跑/不改全仓 check、官方 ratchet 或 strict-fast；
Codex 独立审断言/负控并集成后统一串行执行。Cursor 自验不能替代独立验收。

## 上下文锚点与当前模式记录

- [`AGENTS.md`](../../../AGENTS.md)、[`CLAUDE.md`](../../../CLAUDE.md)、
  [二阶段 READ-FIRST](../../phase2/READ-FIRST.md)、上述目标同名及相邻旧测试、
  [覆盖率持续队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
- 2026-09-27 Codex：已核十六源码文件存在并暴露现行纯逻辑/验证入口，
  与 GLM 十二 UI 模块零目标交集。最强反例为旧套件已证、生产 guard 不收测试
  fixture 或导出无消费者；逐模块账、正式正控和红针必须区分这些情形。
  `build allowed`，Cursor 独立分支实施；Codex 独立验收 pending。
- done 准入：Codex 独立复跑后决定返工或集成、收口；不等待固定三席。

## 下一位 Agent 提示词

见 Codex 当次交接消息；以本卡最终 main 版本为准，不从聊天复述代替读卡。

## Cursor 交付

作者自验见 [十六行账](../../testing/cursor-content-pure-wave2/README.md)。不合 main，不改 Status。
四针 c1–c4 均为目标新测自身 `AssertionError`、`redExit=1`、源 hash 未变。
真实缺陷：无。

# OPS-TST-PERF - 迁移测试 fixture 分层与冷启动性能债

Status: done
Phase: phase2
Capability: test infrastructure / N3-1 support
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Unavailable Agents: none
Branch: chore/docs-migrate-cleanup（沿用当前工作树；用户要求持续提交）

## 目标

把迁移测试从“每个小功能都触发真实 81k 源图冷构建”改成可持续的分层体系：普通行为、反例、守恒和 anti-tamper 测试在秒级合成 fixture 上运行；真实 PAL 只承担少量 source-backed 冷门与发布门禁。测试必须继续证明真实源图闭包，不能通过跳过证明、放宽断言或无 digest 的隐式缓存来换速度。

## 范围

- 范围内:
  - 建立 synthetic fixture builder，覆盖 R13 source ledger、runtime capability、historical profile、authority/seal、迁移计划和半状态/篡改反例所需的最小图；
  - 给测试建立明确 taxonomy：`synthetic-unit`、`pal-canary`、`pal-release`，并让默认开发命令只跑前者；
  - 将不依赖真实 81k 数量/真实发布 digest 的行为测试迁移到 synthetic fixture；
  - 保留一个 source-backed PAL cold canary，覆盖完整源图、真实 census、ledger、authority 和发布 seal；
  - 对可复用的预构建 fixture（若仍需要）使用输入文件/代码版本/fixture schema 的 SHA-256，校验失败即重建，禁止静默复用；
  - 建立耗时、峰值 RSS、测试数量和 source-backed 覆盖的 CI/本地报告。
- 范围外:
  - 修改生产迁移 schema、SAVE 版本、项目生成产物或脚本语义；
  - 删除真实 PAL 门禁，或把 synthetic 结果冒充真实源账证明；
  - 通过单纯提高 timeout、关闭 anti-tamper、跳过 validator、跨 worker 共享可变对象来“优化”；
  - 重写 Vitest/Node 运行时本身。

## 上下文锚点

- 已拍板决策 / 铁律:
  - [`docs/phase2/READ-FIRST.md`](../../phase2/READ-FIRST.md)：第二阶段优先干净、可扩展架构；迁移缺陷修上游；不得用临时生成产物补丁；
  - `AGENTS.md` / `docs/ops/agent-workflow.md`：这是跨测试边界与性能门禁的高风险任务，须三方设计签字后进入 build；
  - 用户 2026-08-02：不能接受每个小功能都花一天重新优化测试，要求彻底解决测试技术债。
- 代码锚点(`file:line`):
  - [`packages/migrate/vitest.tests.ts:1-29`](../../packages/migrate/vitest.tests.ts)：当前 unit / pal-shared / pal-fresh 分类；
  - [`packages/migrate/vitest.config.ts:15-50`](../../packages/migrate/vitest.config.ts)：当前 worker、isolate、hookTimeout 和 fileParallelism；
  - [`packages/migrate/src/experimental/script-v5/pal-test-fixture.ts:72-148`](../../packages/migrate/src/experimental/script-v5/pal-test-fixture.ts)：真实 PAL fixture 的重复构建入口；
  - [`packages/migrate/src/experimental/script-v5/r13-source-semantics-mg2.pal.test.ts:84-150`](../../packages/migrate/src/experimental/script-v5/r13-source-semantics-mg2.pal.test.ts)：完整 source-backed authority 初始化；
  - [`packages/migrate/src/experimental/script-v5/r13-source-semantics-mg2.ts:157-275`](../../packages/migrate/src/experimental/script-v5/r13-source-semantics-mg2.ts)：source input digest、prepared authority 与 replay 边界；
  - [`packages/migrate/src/experimental/script-v5/stable-json.ts`](../../packages/migrate/src/experimental/script-v5/stable-json.ts)：发布 digest 与 process-local fast sentinel 的区别。
- 已知坑 / 审计文档:
  - N3-1 任务卡 R13-6A 性能边界：真实 PAL 冷启动约 6–9 分钟、单核满载、RSS 约 1GB+；prepared replay 已优化但不能代表冷启动已解决；
  - 提交 `91d6cfff`：已关闭 repeated prepared replay、历史矩阵污染和 anti-tamper 内容身份缺口；不要把这些修复回退成无校验缓存；
  - 当前 `pal-shared` 只解决同一 worker 内的复用，单文件冷跑/不同 worker 仍会重建完整链；
  - source-backed 测试中有发布 digest pin、真实 census 数量和 22-site/技能守恒断言，不能机械替换成小 fixture。
- 不得重新引入:
  - 无输入 fingerprint 的跨调用/跨 worker全局缓存；
  - 用 synthetic fixture 覆盖真实 source-backed canary；
  - 把 `hookTimeout` 调大当作性能修复；
  - 让 synthetic fixture 依赖数组下标、隐式共享对象或与生产 schema 不同的假命令。
- 相关测试:
  - `pnpm --filter @type-pal/migrate exec vitest --project unit run ...`；
  - `pnpm --filter @type-pal/migrate exec vitest --project pal-shared run src/experimental/script-v5/r13-source-semantics-mg2.pal.test.ts`；
  - `pnpm --filter @type-pal/migrate exec vitest --project pal-shared run src/experimental/script-v5/r13-enemy-audits.pal.test.ts --testNamePattern='MG2 初始化只写八个内容文件'`；
  - `pnpm --filter @type-pal/migrate exec tsc --noEmit`。

### 当前基线拆分（2026-08-02）

- `pal-shared` 当前显式列出 17 个文件 / 123 tests，`pal-fresh` 为 3 个文件 / 5 tests；unit 另有 67 个文件 / 495 tests；合计 `vitest list` 为 87 files / 623 tests。另有 2 个轻量真实 PAL 文件留在 unit，故本卡 G1 表共列 22 个 source-backed/PAL 相关文件、137 tests。`c8-item-use-augmentation.test.ts` 虽无 `.pal` 后缀仍属于 PAL-heavy，不能只按文件名判断。
- 冷路径的主要成本来自 `loadCore → P2-P6 → 81,674-site census → P7`，不是 Vitest assertion 本身。
- 初步迁移目标：逐项审计 17 个 PAL-heavy 文件 / 123 tests、3 个 `pal-fresh` 文件 / 5 tests，以及 2 个直接读取真实 PAL 但未列 heavy 的轻量文件；预计约 44 个完整链行为/篡改断言改为 synthetic，依赖历史计数/样本的测试改读带 provenance 的 compact oracle（现有 11 个关键 JSON 约 31.8MB，解析基线约 0.10s）；只保留 1 个文件 / 2 个测试作为 source-backed producer canary；3 个 `pal-fresh` 文件继续归 release。
- compact oracle 不是运行时缓存，也不能自证 source proof：必须记录 source commit、抽取版本、compiler/method/schema 版本、canonical input/output digest，并由 producer canary 独立重建后校验。

本轮实现后的清单已固定为：fast `72 files / 549 tests`、release `95 files / 679 tests`、canary
`1 file / 2 tests`；相对开卡基线 `87 files / 623 tests` 为新增门禁/覆盖，不减少既有测试。

### G1 现有测试去向总表（设计阶段路线，不得删断言）

逐条旧标题到后继证明的 44 条闭环见
[`docs/ops/audits/OPS-TST-PERF-g1-coverage-map.md`](../audits/OPS-TST-PERF-g1-coverage-map.md)。
该清单明确区分 fast synthetic、compact oracle、source-backed canary 和 release-shared；表中
source proof 没有被 synthetic 结果替代。

| 文件 | 当前测试数 | 初始去向 | 必须保留的证明 |
|---|---:|---|---|
| `experimental/script-v5/c8-item-use-augmentation.test.ts` | 14 | synthetic + oracle；真实闭包并入 canary | 20 item identities、21 roots、100/0、locale/sprite/R13 owner 关键摘要 |
| `experimental/script-v5/cadence-compatibility.pal.test.ts` | 1 | pal-lite/oracle | cadence-omitted source payload golden |
| `translate-enemy-scripts.pal.test.ts` | 8 | pal-lite/oracle | 敌脚本轻量 source oracle |
| `experimental/script-v5/legacy-enemy-script-v9-authority.pal.test.ts` | 3 | oracle + canary | historical parent、current 独立源、P2→P7 parent pin |
| `experimental/script-v5/p2-shadow.pal.test.ts` | 8 | 5 synthetic + 3 oracle/canary | tombstone/s018 cardinality、作者冲突、ledger tamper |
| `experimental/script-v5/p3-shadow.pal.test.ts` | 5 | 3 synthetic + 2 oracle/canary | 1,715 分类、599 IR、作者冲突/manifest |
| `experimental/script-v5/p4-shadow.pal.test.ts` | 7 | 4 synthetic + 3 oracle/canary | owner 分配、7,039 fragments、跨 owner/ledger |
| `experimental/script-v5/p5-shadow.pal.test.ts` | 6 | 3 synthetic + 3 oracle/canary | 433 cycles、confirm/onNo、循环冲突 |
| `experimental/script-v5/p6-shadow.pal.test.ts` | 5 | 2 synthetic + 3 oracle/canary | 31 pending、共享/inline、tail/删除 |
| `experimental/script-v5/r13-cadence-mg2.pal.test.ts` | 3 | 2 synthetic + 1 canary | initialize/replay、prepared identity/evidence |
| `experimental/script-v5/r13-confirm-control-flow.pal.test.ts` | 4 | 2 synthetic + 2 oracle/canary | 26/28/31 authority、locale、s128 三分支 |
| `experimental/script-v5/r13-confirm-mg2.pal.test.ts` | 11 | 6 synthetic + 5 canary | 13 scenes/E1、0/0/0、historical seal pin |
| `experimental/script-v5/r13-cross-activation-mg2.pal.test.ts` | 10 | 5 synthetic + 5 canary | discard/inherited repair、prepared/live drift、resign |
| `experimental/script-v5/r13-enemy-audits.pal.test.ts` | 3 | 保留 consolidated canary | source disposition、runtime v3、8-file initialize |
| `experimental/script-v5/r13-enemy-source-disposition.pal.test.ts` | 7 | pal-lite/oracle | 31 debt、473/546/496 target、closure fail-closed |
| `experimental/script-v5/r13-item-throw-augmentation.pal.test.ts` | 12 | oracle + canary | 58/1/17 ledger、鞭影 19、历史 18 throw pin |
| `experimental/script-v5/r13-item-throw-mg2.pal.test.ts` | 9 | 5 synthetic + 4 canary | initialize/replay、authority/seal drift |
| `experimental/script-v5/r13-source-semantics-mg2.pal.test.ts` | 11 | 6 synthetic + 5 canary | 22-site/3-skill delta、source input、17 paths、0/0/0 |
| `experimental/script-v5/source-instruction-disposition.pal.test.ts` | 1 | oracle + canary | final owner deletion reopens all affected sites |
| `pal-sprite-action-census.pal.test.ts` | 1 | 保留 release fresh | 636 sprite census、异常分类和关键样本 |
| `script-control-flow-audit.pal.test.ts` | 2 | 保留 release fresh | 真实 CFG/入口/引用/可达性/循环 golden |
| `pal-migration-integration.test.ts` | 2 | 保留 release fresh | 真实磁盘事务、baseline/project、二次 0/0/0 |

该表是 build 前的覆盖账；实现时若某行路线变化，必须在本卡更新原因、替代断言和新的
source-backed 归属，不能只改 Vitest include/exclude。

## 验收条件

- 功能:
  - 默认开发测试不再加载 PAL 真实源图；普通新增语义测试可以只依赖 synthetic fixture；
  - synthetic fixture 对 source ledger、historical/current profile、authority/seal 和篡改/半状态反例提供稳定、可读、可组合的构造 API；
  - 至少一个真实 PAL cold canary 仍覆盖完整 source-backed 初始化与发布 pin；
  - 可选预构建 fixture 必须在输入/代码/schema digest 不匹配时 fail-closed 并重建。
- 测试:
  - `test:fast`（unit + pal-lite + pal-oracle）在参考开发机上目标 `<= 60s`，且不启动完整 PAL fixture；
  - synthetic 定向语义/反例测试目标 `<= 10s`，覆盖现有被迁移测试的数量和关键断言；
  - PAL cold canary 只执行一次，目标 `<= 10min`，并输出 wall time / RSS / source-site count；
  - typecheck、`git diff --check`、source-backed canary、synthetic 全量均通过；
  - 连续两次运行 synthetic 测试零 diff；缓存命中与未命中结果 digest 相同。
- 文档:
  - 更新 `packages/migrate/vitest.tests.ts` 分类说明、任务卡和 N3-1 性能边界；
  - 写明哪些测试允许 synthetic、哪些必须 PAL，以及本地/CI 命令，不再依赖聊天记录解释。
- 视觉 / 手工验证:
  - N/A；这是测试基础设施任务。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree
- Kimi: agree（条件性；G1–G8、真冷 canary、仅进程内复用、不得跨 worker/落盘 authority cache）
- GLM: agree（附 G1–G8 覆盖/清单/性能门禁）
- counter / 分歧处理: 条件已写入“Build 必落清单”；若实现允许 canary 命中待验证 cache、跨 worker cache、缺 PAL 数据 skip/green 或覆盖清单缩水，立即 counter/blocked。
- 缺签豁免: N/A
- build 准入结论: build allowed（仅限落实 G1–G8；不代表性能债已完成）

### 进入 done 前:审查签字

- Codex: **accept（G1+G7+G8）**（2026-08-03；G1 44 条映射、appendOnlyTransitionState 七处统一与 16-mask fast 全绿；G7 真实 PAL shared order probe `1/1` 通过，五种顺序 authority summary/lease digest 一致；G8 三次 exact-golden 冷跑与最终 fast/manifest/oracle/typecheck 达门）
- Kimi: **accept（G1+G7+G8）**（2026-08-03；G1 44 条映射逐条核对、appendOnlyTransitionState 七处统一+16 mask 绿；G7 顺序探针 1/1 绿、lease 不变、5 序输出一致；G8 前批已 accept）
- GLM: **accept（G1+G7+G8）**（2026-08-03；代码逐文件核对、G1 44 条映射与 26/26 定向测试、G7 真实 shared probe `1/1` 一手实跑核对；G8 canary 2/2 一手实跑）
- counter / 返工处理: 历史 counter 已按本轮 G1/G7 返工证据闭合；当前无未解决 counter
- 缺签豁免: N/A
- done 准入结论: **满足**（Codex / Kimi / GLM 三方整体 accept）

## Draft: 设计与风险

### 设计结论

采用“合成行为层 + compact oracle 消费层 + 真实源图门禁层”的三级测试模型。synthetic builder 只生成与生产接口相同的最小控制流/validator/planner/anti-tamper 输入（至少覆盖 branch、call、loop、confirm、stage 和负例），所有对象带稳定语义 id；它不生成、不伪造 PAL 发布 digest、source counts、历史 seal 或 runtime matrix，也不声称覆盖真实源图。compact oracle 只承载已发布摘要和样本，带 provenance 与 digest，不替代 source proof。真实 PAL canary 必须是真冷路径：独立 worker 重读 extracted source、frozen audit、published baseline/seal，重建完整链，精确比对已钉住的 matrix/report/seal，并确认 writes/deletes/conflicts=0；不能先命中 prepared cache。

默认开发命令只包含 synthetic/unit 与 compact-oracle consumer；`test:canary` 是显式、至少一个 mandatory 的真实 source-backed 冷门，CI fast gate 必须调用它但不允许它复用待验证的 prepared cache；`test:release` 继续每次 fresh rebuild 完整 PAL 矩阵。prepared authority 仅允许同一进程内的 module/WeakMap 复用，不能跨 worker、跨命令或落盘全局复用；命中前重算 canonical stable input digest，fast sentinel 只能作为同进程的额外加速，且命中后仍执行 structural/self-digest、anti-tamper、live canonical target 和当前 evidence merge。

### 已知风险

- 风险: synthetic fixture 过度简化，遗漏真实数据上的排序、重复 owner、空指针、跨 context 或大规模 cardinality 问题。
  - 缓解: 每类关键断言保留一个 PAL canary；synthetic 只承载局部语义，不能改变 PAL release 门禁。
- 风险: fixture cache 过期或被错误代码复用。
  - 缓解: 输入/代码/schema 三重 digest，缓存只读、可删除，命中后重新 assert；不把缓存纳入发布产物。
- 风险: 测试分类迁移不完整，新增测试误落入 PAL 冷路径。
  - 缓解: CI 检查默认 fast 项不得 import `pal-test-fixture`，并在测试报告中显示 PAL 初始化次数。
- 风险: 为了达到 30s 目标削弱 anti-tamper。
  - 缓解: synthetic 反例逐项保留，PAL canary 保留 authority 内容 fingerprint 和发布 pin；性能指标失败时任务不标 done。
- 风险: synthetic oracle 与实现共同过拟合，未覆盖真实 source graph 的邻接/排序/重复 owner。
  - 缓解: producer canary 每次冷建导出至少一组 differential golden（rawContent/rawProjection、anchor 邻接、loop/confirm/multi-stage），synthetic consumer 必须与其比对；canary 不能因 synthetic 先跑或文件顺序变化而被跳过。

### Build 必落清单（GLM/Kimi 设计审查条件）

1. **G1 测试去向总表**：逐项列出当前 20 个 `.pal.test.ts`、无 `.pal` 后缀但属于 PAL-heavy 的
   `c8-item-use-augmentation.test.ts`，以及 source-backed 的 `pal-migration-integration.test.ts`；
   标明保留真实 PAL、并入 consolidated canary、改为 synthetic 或改为 compact-oracle consumer；
   每个旧测试标题/关键断言必须有映射。
2. **G2 synthetic 覆盖**：至少覆盖 MG2 半状态、自洽重签、输入 identity/content 漂移、作者改动
   保护、owned/non-owned merge、initialize/replay、错误 profile、缺 external prerequisite，且
   使用生产 `prepare*` 路径现场构建，不序列化/伪造 WeakSet-branded authority。
3. **G3 真实 PAL 不可删**：保留真实 source CFG/golden、sprite-action census、磁盘 baseline/事务/
   `writes=deletes=conflicts=0`、至少一条完整 P2→P7→R13 source-backed cold chain（含
   81,674 execution sites、历史/当前 profile、R13-3/4/5/6A pin），以及 cadence/敌脚本等轻量
   source oracle。
4. **G4 consolidated canary 账目**：若多个 PAL 文件合并为一个 cold canary，必须列出替代的每条
   断言；不得只留下最新 R13-6A 而漏掉历史阶段 pin。
5. **G5 fast/release 守恒**：用规范化 `vitest list` 比较旧/新清单，不能少于当前 87 files / 623
   tests；新增测试两边同步增长。PAL fixture 缺失时 release 必须失败，不能由 `skipIf` +
   `passWithNoTests` 变绿。
6. **G6 完整性**：compact oracle manifest 覆盖 extracted source、baseline/project、frozen audit、
   schema/method/profile、generated IR、ledger/evidence、external prerequisites 等 digest；缓存
   缺失/过期/损坏 fail-closed。任何 persisted payload 只能是 canonical projection，不能恢复并信任
   prepared authority；release 必须 live rebuild 并与 projection 深摘要相等。
7. **G7 隔离/乱序**：真实 fixture 深冻结或使用带归还 digest 的 COW lease；默认、逆序和至少 3 个
   shuffle seed 的结果/digest 完全一致。跨 worker/跨命令全局 cache 属 counter。当前已加入
   `PAL_TEST_SHARED_GATE` 的 release-only 共享边界、canary 独立进程与 synthetic entry-order 反例；
   新增低频真实探针 `pal-shared-order-probe.pal.test.ts`，在同一 `release-pal-shared` worker 中
   只冷初始化一次真实 PAL lease，再按默认、逆序和 `20260802/03/04` 五种消费者顺序读取，整组前后
   lease digest 与 authority summary 均一致；一手实跑 `1 file / 1 test`、`262.59s`。完整 22 文件
   shared shuffle 仍不作为开发门，首轮 `19m36s` 中止记录保留为成本证据。
8. **G8 性能**：在无并发重测的参考机上做 3 次冷跑并记录 median/max/RSS；synthetic 定向文件
   `≤10s`、fast（unit + lite + oracle）目标 `≤60s` 且 RSS `≤700MB`，canary 初期 `≤10min`
   且 RSS `≤1.5GB`，release 不得比开卡基线回退 10% 以上；不得靠增大 timeout 掩盖重复构建。
   最新 fast 为 `71 files / 533 tests`，`39.38s / 465,485,824B`。最终 canary 在保留真冷
   source-backed producer、稳定摘要、anti-tamper 与 replay `0/0/0` 的前提下，增加 COW/source
   page 共享、流式 fast digest、full migration stable/fast digest 品牌、canary-only historical
   migration 窄视图、受约束 22-site/3-skill 父报告增量，以及 `1168MiB` old-space fail-loud
   保护。三次等价 exact-golden 冷跑取样为 `328.30s / 1,377,386,496B`、
   `562.46s / 1,477,574,656B`、`405.55s / 1,290,960,896B`：wall median `405.55s`、
   max `562.46s`；RSS median `1,377,386,496B`、max `1,477,574,656B`，均达到 `≤10min / ≤1.5GB`。
   另有同路径样本 `296.88s / 1,383,710,720B`。`1152MiB` 压力试验在约 192s OOM，已恢复
   `1168MiB`，证明保护不是靠忽略 worker 崩溃过线。相对原 `484.72s / 3,630,317,568B`，
   canary RSS max 下降约 59.3%；墙钟 median 下降约 16.3%。G8 可提交复审，不再是当前阻塞项。

### 主审立场

- Reviewer: Kimi（架构边界）+ GLM（覆盖/测试矩阵）
- 结论: Codex / Kimi / GLM 均签 **G1+G7+G8 accept**（2026-08-03；历史 counter 保留在交接日志）
- 必改项: 无。G1 映射、append-only 半状态边界、真实 shared lease 顺序和 G8 性能门均已闭合；synthetic/oracle 仍按路由边界使用，未冒充 source proof。
- 是否建议进入 build: **done**

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
- 修改文件: `packages/migrate/vitest.tests.ts`、`vitest.config.ts`、`vitest.release.config.ts`、
  `vitest.canary.config.ts`、`package.json`、`src/experimental/script-v5/pal-test-fixture.ts`、
  `src/experimental/script-v5/append-only-transition-state.ts` 及其 16-mask fast test、
  `pal-shared-order-probe.pal.test.ts`、G1 44 条映射文档、PAL oracle/manifest/preflight、
  R13-6A source canary 及本卡/N3-1 性能边界。
- 实现摘要:
  - 默认 fast 只跑 unit + pal-lite + oracle；7 个 P7 混合文件的纯单元保留在 fast，PAL shadow
    段在 `PAL_TEST_FAST_GATE` 下 fail-closed 跳过，不能因缺 fixture 绿过；新增 manifest 分类/路由
    digest，新增 release-only preflight。
  - synthetic fixture 使用生产 census、v5 stage/branch/call/goto/dynamic/scene-hook 词汇，
    覆盖篡改、重放、作者冲突、入口顺序反例；oracle 对 source/baseline/project/shadow/runtime
    输入做 digest pin，投影不可自证并在 manifest 失配时拒绝。
  - R13-6A canary 在独立进程从 live extracted source、audit、baseline、project 重建 authority，
    精确比对已签 golden，并独立 replay 断言 `0/0/0`；prepared fixture 仅允许 release-shared。
  - R13-6A source disposition 不再对同一份 81,674-site historical source 做第二次全量
    build-and-assert：先验证已发布 R13-5 父报告和 current/historical source-root digest，再只重建
    22 个既有-schema站点、3 个技能观察及其受影响的 source-debt observation；最后仍由原有
    `assertR13SourceDisposition6AParentDelta` 做完整 allowlist、orphan evidence、cardinality、layer
    和 parent/successor 守恒校验。已签 golden 未重签，证明这是执行路径优化而非语义改口。
  - canary 的 historical/current profile 保留独立顶层身份，但共享同一份不可变 extracted source
    pages；current/full historical migration 先分别计算 stable 与 insertion-order fast digest，再把
    不再读取的 full graph 换成进程内 WeakMap 品牌的窄视图。品牌注册和显式 GC 仅在 `canary`
    gate 可用，普通 release/shared 调用不改写输入；plain JSON、跨 worker 和跨命令均不能复用。
  - `fastJsonSha256` 改为与 `JSON.stringify` 字节等价的流式 SHA-256，避免为 mutation sentinel
    生成数百 MB 完整字符串；31 个 strict/fast JSON 单元断言覆盖键顺序、特殊数字、Unicode、
    omission、Date、root failure 与 cycle。PAL projection、source disposition、stable input digest、
    seal 及 0/0/0 均未变化，仅 oracle/manifest 的生产代码指纹按最终源码更新。
  - C8、cadence、cross-activation、item-throw、confirm、enemy-script、source-semantics 七个
    append-only MG2 计划统一调用 `appendOnlyTransitionState`；空四元组只允许 initialize、完整
    四元组只允许 replay、其余 14 种半状态 fail-closed。G1 的 initialize/replay/半状态边界由同一条
    生产代码和 16 个 fast mask 断言维护，不再由七份复制逻辑漂移。
- 运行命令:
  - `pnpm --filter @type-pal/migrate typecheck`
  - `pnpm --filter @type-pal/migrate test:manifest` / `test:oracle:verify`
  - `/usr/bin/time -l pnpm --filter @type-pal/migrate test:fast`
  - `/usr/bin/time -l pnpm --filter @type-pal/migrate test:canary`（三次冷跑 + 最终 gate-only 复核）
  - `pnpm --filter @type-pal/migrate exec vitest run --config vitest.release.config.ts --project release-preflight`
  - `pnpm --filter @type-pal/migrate exec vitest run --config vitest.release.config.ts --project release-unit`
  - `pnpm --filter @type-pal/migrate exec vitest run --config vitest.release.config.ts --project release-pal-shared src/experimental/script-v5/pal-shared-order-probe.pal.test.ts`
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因:
  - 完整 `test:release` 尚未在本轮重复执行，避免无谓地再次执行 8 分钟 canary；其 release-unit 与
    preflight 已独立通过，canary 已独立通过，仍需最终收口前由审查方决定是否补跑全门。
  - 完整 22 文件共享乱序首轮运行 `19m36s` 未结束后中止；已改由低频真实 shared order probe
    覆盖同一共享 lease 的五种消费者顺序，不把完整 shuffle 当作开发门。
  - 早期只加 `--expose-gc` 的试验约 `491.56s / 3,524,575,232B`，证明 GC 本身不是修复；最终仅在
    canary 的明确生命周期边界回收已死亡 parser/full-migration 图，并配合 COW、窄视图与流式摘要。
    `1168MiB` worker 超限即失败，不能把未处理 OOM 算作通过。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: G8 已获 Codex / Kimi / GLM 三方 accept；G1 逐项映射与 G7 shared 顺序证据仍 counter
- 必须返工项:
  1. **G1/G2 trust-boundary 覆盖**：返工新增 `createSyntheticRuntimeSnapshot`，并在生产 runtime capability builder 上覆盖 current/historical wrong profile、snapshot 内容 identity 漂移、缺 shared prerequisite、伪造自签 evidence；定向 6/6 实跑通过，故这四类可记 conditional accept。原 G1 表承诺的约 44 条 authority/seal、半状态、initialize/replay、owned/non-owned merge 及其逐条旧测试标题映射仍未闭合；继续按旧断言逐项补齐，不能用 synthetic 摘要替代 source proof。
  2. **G7 乱序/隔离证据**：新增 probe 已扩为 4 个独立 synthetic/oracle 文件 / 11 个 tests，固定 seed `20260802/03/04` 均通过（约 2–3s/次），因此跨文件顺序探针本身可运行；但它仍不是完整 `release-pal-shared` 乱序/逆序证据。完整共享矩阵首轮运行 `19m36s` 后中止，尚无默认、逆序及至少 3 个固定 seed 的共享结果/digest 一致性证据。仍需补低频 shared 顺序探针或由用户明确豁免；shared fixture 继续要求深冻结/归还 digest，跨 worker/跨命令不得复用 authority。
  3. **G8 内存与冷跑证据**：在此前 source-input-only authority 与 22-site/3-skill 父报告增量之上，继续移除 P7/迁移链的整图复制和重复 source page，缩窄全量 index，改用路径级 cycle set；`fastJsonSha256` 改为与 `JSON.stringify` 字节等价的流式摘要。canary 在 full historical/current migration 各自算完 stable + fast digest 后，只保留由进程内 WeakMap 品牌校验的窄视图；该品牌、压缩与显式 GC 均被 `TYPE_PAL_MIGRATE_TEST_GATE=canary` fail-close 隔离，普通 release/shared 调用不修改输入。三次等价 exact-golden 冷跑为 `328.30s / 1,377,386,496B`、`562.46s / 1,477,574,656B`、`405.55s / 1,290,960,896B`，wall median/max 为 `405.55s / 562.46s`，RSS median/max 为 `1,377,386,496B / 1,477,574,656B`，全部满足 `≤10min / ≤1.5GB`。另有同路径样本 `296.88s / 1,383,710,720B`；`1152MiB` 压力试验约 192s OOM，最终固定 `1168MiB` old-space fail-loud 上限。相对开卡基线 `484.72s / 3,630,317,568B`，max RSS 下降约 59.3%、wall median 下降约 16.3%；PAL projection、source disposition、stable source input、seal、golden 与 replay `0/0/0` 均未改变。Kimi 另跑 `286.11s` 全绿，GLM 另跑 2/2、峰值约 `1.397GiB`；Codex / Kimi / GLM 已三方 accept。
- Accept / rework: rework（G8 已三方闭合；G2 新增四类 conditional accept；G1 残余映射与 G7 仍为阻塞项）

### 当前待审结果

- Codex 自验：`typecheck`、manifest/oracle、release-unit `65 files / 491 tests`、release-preflight
  `1/1`、source-backed canary `1 file / 2 tests` 均通过；canary 三次等价 exact-golden 冷跑的
  wall median/max 为 `405.55s / 562.46s`，RSS median/max 为
  `1,377,386,496B / 1,477,574,656B`，达到 G8 门槛。对应正式 release source-semantics 文件
  此前 `11/11`、`401.44s / 3,415,769,088B`；G2 返工定向 synthetic trust-boundary `6/6`
  通过（约 0.4s），固定 seed `20260802/03/04` 的四文件 synthetic probe 各为
  `4 files / 12 tests` 全绿，fast 最新 `71 files / 533 tests` 为
  `39.38s / 465,485,824B`。
- manifest 实跑守恒：fast `71 files / 533 tests`、release `93 files / 662 tests`、canary
  `1 file / 2 tests`，`routeSha256`/`projectName` 均参与 pin 校验。
- 完整 enemy authority 定向 release 回归：`release-pal-shared` 下
  `r13-enemy-audits.pal.test.ts` 为 `3/3`，`374.62s`，峰值 RSS `3,740,139,520B`；窄
  source-input-only canary 与正式完整 authority 均通过，未改变发布路径的语义断言。
- 最终 COW/流式摘要/窄视图实现后：fast `71 files / 533 tests` 为
  `39.38s / 465,485,824B`；fixed seed `20260802/03/04` 的 synthetic shuffle 均为
  `4 files / 12 tests` 全绿；oracle、typecheck、`git diff --check` 均通过。该证据不替代
  G7 完整 shared route。
- Kimi/GLM 复审确认 mixed/PAL 路由与 oracle 边界可核验；G2 最小 trust-boundary 子集已补，
  G8 已三方 accept。完整旧断言逐条迁移映射与跨文件 G7 顺序探针仍缺证；在 G1/G7
  返工取得 Kimi/GLM `accept` 前不得标记 done。
- 2026-08-03 GLM G8 复核：签 **accept**。一手核实（代码逐文件 + canary 实跑，非 Codex 报告
  复述）：
  - **机制 1 COW/source page 共享**（r13-existing-schema-augmentation.ts:475-484 cloneSnapshot
    + :832-842 路径级 structuredClone；p7-generated.ts:168-178 不可变 page 共享）：cloneSnapshot
    只建新 Map/Set 容器、file value 引用共享，仅被改 scene 才深克隆 —— 典型 COW，输入不被
    修改。release 路径也走此逻辑但安全（未触及的 file 只读消费）。✅
  - **机制 2 流式 fast digest**（stable-json.ts:218-300 fastJsonSha256）：64KiB buffer 增量
    `hash.update`，绝不先 JSON.stringify 整树。字节等价由 stable-json.test.ts:46-61 `test.each`
    锁死（含 undefined/NaN/Date/负零/sparse）；注释明说 "does not replace stableJsonSha256 for
    published digests"，只用于 process-local 变异哨兵。✅ digest 不漂移。
  - **机制 3 canary-only WeakMap 窄视图**（r13-source-semantics-mg2.ts:184-187 trustedMigrationInputDigests
    + :272-287 register... fail-close + :1739-1751 canary compact+brand + r13-source-semantics-canary.ts:63-99）：
    三层硬隔离 —— register 函数首行 `!== 'canary'` 即 throw；compact+brand 整段被 `=== 'canary'`
    包裹；brand digest 值 = compact 前对**完整** migration 算的 digest（:1741），与 release 路径
    对完整对象算出的 digest 完全相等。release/shared 路径根本不进入此分支，historicalMigration
    保持原始完整对象。pal-test-fixture-gate.test.ts:19-32 锁死 fast/release-shared 都抛错。✅
  - **机制 4 1168MiB fail-loud**（vitest.canary.config.ts:21 `--max-old-space-size=1168`）：
    Node 超限抛 V8 OOM 进程退出非零，passWithNoTests:false + fileParallelism:false 保证不静默
    跳过。仅 canary config，release/fast/shared 不受 1168 限制。✅
  - **机制 5 路径级 cycle set**（stable-json.ts active Set 进/退 + r13-trigger-activation-graph.ts:908-927
    worklist BFS）：实现正确（路径栈 active.add/delete，非全图 freeze）。⚠️ 唯一疑虑：任务卡
    措辞"从 whole-graph freeze 改成 path-level"在静态代码看不到 before/after 证据，可能是
    stable-json 一直以来的正确写法被重新表述为 G8 改动。这不阻塞 G8 —— 核心要求（优化真实、
    不破坏语义、隔离正确）此项满足。
  - **canary 实跑**：`/usr/bin/time -l pnpm test:canary` = **2/2 全绿，peak RSS
    1,501,478,912B ≈ 1.397GB ≤ 1.5GB** ✅（与任务卡 median 1.377GB / max 1.477GB 一致，本次
    落在区间内）。fast unit 449 passed / 5 skipped 全绿。
  - **release 路径不污染**：subagent 代码层面确认 WeakMap brand + cache release 均 fail-close
    在 `!== 'canary'`，release/shared 不进入 canary 优化分支。release pal-shared 测试因连续
    跑 canary（占 1.4GB）后的 vite server 资源残留未能实跑，但代码层硬隔离比单次测试运行
    更强；G8 优化对发布 digest/seal/golden/replay 0/0/0 零影响。

  **G8 accept**。相对开卡基线 484.72s/3.63GB，max RSS 降约 59%、wall median 降约 16%；
  COW/流式 digest/WeakMap 窄视图/1168MiB fail-loud 四机制真实、隔离正确、不破坏语义。

  **G1/G7 旧结论保持历史记录**（不在该次复核范围）。本轮已补齐 44 条映射和低频真实 shared
  order probe，且 Kimi/GLM 已在后续交接记录中签 `accept`；不回溯改写该次历史结论。

## 用户验收

- 用户结论: pending
- 2026-08-03 后续观测：R13-Z 历史发布夹具回建后的完整 `release-pal-shared` 为 24 files / 137
  tests、1992.69s；worker RSS 在审计阶段出现约 2.6 GiB 瞬时峰值后回落。该成本来自正式
  release 对 81,674-site source audit 的完整证明，不改变已验收的 G8 canary/fast 目标，也不
  通过 timeout 掩盖；prepared report / release 调度优化作为 R13-Z 后续性能观察项保留。
- 后续任务: 完成性能债后回到 N3-1 R13-6A / C8 联合验收

## 交接日志

- 2026-08-03 Codex: G1 逐条映射落盘至 `docs/ops/audits/OPS-TST-PERF-g1-coverage-map.md`，固定 44 条旧
  PAL-heavy 断言及其 fast-synthetic/oracle/canary/release-shared 后继证明；新增生产级
  `appendOnlyTransitionState`，统一 C8/R13 七处四位发布状态判断，并以 16 个 mask fast 测试锁定
  initialize/replay/14 种半状态 fail-closed。G7 新增真实 `release-pal-shared` 低频 order probe：一次
  冷初始化后在同一 worker 中跑默认、逆序和 `20260802/03/04` 三个 seed，前后 lease digest 与
  authority summary 一致；一手实跑 `1 file / 1 test`、`262.59s`。完整 shared shuffle 仍保留为历史
  成本证据，不进入开发默认门。待 Kimi/GLM 对 G1/G7 复审，任务仍 `rework`，不得标记 done。
- 2026-08-03 Kimi: G1/G7 复审签 **accept（G1+G7+G8）**。一手证据：
  - **G1**：44 条映射表（docs/ops/audits/OPS-TST-PERF-g1-coverage-map.md）逐条核对，抽查
    4 条后继证明标题（p7-state-machine confirm-onNo、source-instruction-disposition owner
    删除开站、pal-test-oracle P7→R13 pin、c8 seal 独立 pin）全部逐字存在；路由分层诚实
    （fast-synthetic 不冒充 source proof，数量/地址归 oracle/canary/release-shared）。
    `appendOnlyTransitionState` 生产函数被**恰好 7 个 MG2 文件**引用（cadence/cross/
    item-throw/confirm/enemy-script/source-semantics/c8），与"统一七处"一致；0000=
    initialize、1111=replay、其余 14 mask 抛半状态；16 mask 测试本席复跑全绿（248ms）。
  - **G7**：顺序探针（pal-shared-order-probe.pal.test.ts）在真实 release-pal-shared
    路由上运行：一次冷 lease，11 个 authority 消费者（P2-P6/census/cadence/cross/
    item-throw/confirm/confirm-control）按默认、逆序与固定 seed 20260802/03/04 共 5 种
    顺序执行，lease digest 前后不变、5 种输出逐一致。本席复跑 **1/1 绿，586.51s**
    （慢于记录的 262.59s 系同机负载，20 分钟门内）；测试注释已如实声明其为 order/
    aliasing 检查而非 5 份冷拷贝，完整 22-file shuffle 保留为历史成本证据不入默认门。
  - G8 前批已三方 accept，本次不重开。
  结论：G1/G7 证据闭合，本席对整任务 sign **accept**；done 仍需 GLM 对 G1/G7 复审。
  未修改实现文件。
- 2026-08-02 Codex: 根据用户要求把反复出现的 PAL 冷启动问题升级为独立测试基础设施任务；已记录 81k source-backed 基线、prepared replay 已修但 cold 未修、synthetic + canary 设计和性能验收目标。Next: 等 Kimi/GLM 设计审查，签齐后进入 build。
- 2026-08-02 Kimi: 对 synthetic + compact oracle + 真冷 source-backed canary 原则性 agree；要求 synthetic 不冒充 source proof、canary 不命中待验证 cache、只允许进程内复用，并补输入漂移/返回值篡改/wrong profile/乱序/release fresh 负向矩阵。Evidence: 设计审查消息。Next: Codex 落实 G1–G8。
- 2026-08-02 GLM: agree（附 G1–G8）；要求逐文件旧断言映射、87 files/623 tests 清单守恒、真实 CFG/census/integration/P2→P7→R13 canary 不删、cache provenance 与 release live rebuild、三次冷跑性能证据。Evidence: 覆盖审查消息。Next: Codex 进入 build。
- 2026-08-02 Codex: 提交 `a8c86638` 完成实现候选与证据收口；fast 三次 504 tests 全绿（约 37–39s），最终 source-backed canary 2/2（484.72s，RSS 3.63GB），release-unit/preflight/oracle/manifest/typecheck 通过。完整共享乱序首轮 19m36s 未结束已中止，G7 与 canary RSS 仍是显式风险。Next: Kimi/GLM 复审并签 `accept` 或列返工。
- 2026-08-02 GLM: counter（覆盖/测试矩阵复审）。G5 的 70/504、92/633、1/2 manifest 守恒与 G6 oracle 输入闭包可复核；但 synthetic 仅 4 个测试，G1/G2 约 44 条关键反例尚未逐项迁移，G7 的 22 文件乱序探针中止且无逆序+3 seed 完整证据，G8 canary RSS 3.63GB 超 1.5GB 目标。Next: Codex 补 synthetic trust-boundary 映射、独立顺序探针和三次冷跑/RSS 证据；不得标记 done。
- 2026-08-02 Codex: 针对 G1/G2 counter 增加 `createSyntheticRuntimeSnapshot` 与 2 个 production runtime capability trust-boundary 测试：current/historical wrong profile、snapshot 内容身份漂移、缺 shared prerequisite、伪造自签 evidence；定向 6/6 通过，manifest 更新为 fast 70/506、release 92/635。G7/G8 仍 blocked，未宣称 done。
- 2026-08-02 Kimi: counter（架构复审）。G2 返工的 6 个 production-builder trust-boundary 测试可 conditional accept；但单文件 shuffle probe 对 G7 是空操作，且 canary RSS 3.63GB 超 1.5GB 目标。Next: 补真实多文件/跨文件 shared 顺序证据，或请用户裁决性能豁免；不得标记 done。
- 2026-08-02 Codex: 将 `test:synthetic:shuffle` 扩为 4 个独立 synthetic/oracle 文件、11 tests；固定 seed `20260802/03/04` 均全绿（约 2–3s/次）。它只证明便宜的跨文件顺序探针稳定，不冒充 22-file PAL shared shuffle；G7/G8 完整证据仍 blocked。
- 2026-08-02 Codex: source canary 返回值移除 replay 不需要的 historical/enemy/current 包装引用，replay 改直接复用已验证 authority 输入；oracle 重签后冷跑 2/2，`484.80s / 3,451,617,280B`。相对 3.63GB 只降约 4.9%，确认主峰在生产建链期；保留安全清理，但 G8 仍需阶段化/流式 producer 重构，未宣称达标。
- 2026-08-02 Codex: 增加 canary-only module cache release（release-shared fail-closed）与 `--expose-gc`，并把 enemy authority 拆为 augmentation/source-input 两阶段，在 source disposition 前释放 P2-P6 中间链；canary 改走 source-input-only 路径，不再构建五套无关 authority。新 golden 经 live source 重签，最终 2/2、`339.10s / 2,568,863,744B`，较原始下降约 30.0% / 29.2%；G8 仍 blocked。
- 2026-08-02 Codex: 在正式 `release-pal-shared` 配置下定向回归完整 `r13-enemy-audits.pal.test.ts`，`3/3` 通过，`374.62s / 3,740,139,520B`；确认 source-input-only 仅为 canary 优化，完整 enemy authority 发布路径未被削弱。G8 RSS 与 G7 共享乱序证据仍 blocked。
- 2026-08-02 Codex: 试验在 report seal 前清空 disposition 构造期 Map；canary 内容 `2/2` 仍绿，但实测回退到 `365.25s / 3,963,371,520B`，较上一轮 `339.10s / 2,568,863,744B` 明显更差。结论是主动清空改变 GC/重新分配节奏并扩大峰值，已反向撤销，不把主观“释放引用”当作有效优化。
- 2026-08-02 Codex: 试验复用 branded current source census，冷跑 `330.86s / 3,084,697,600B`；虽节省约 8s，但 prepared census digest 被纳入 authority identity，导致 canary golden `authorityDigest` 漂移且 RSS 增约 0.5GB，已撤销。后续需保持 authority digest 与执行优化解耦，不能为省一次 census 重签语义身份。
- 2026-08-02 Codex: 再试仅在 `prepareAuthority` 内局部复用、且不写入 authority identity 的 current prepared census；golden `2/2` 通过且 RSS 降到 `2,151,923,712B`，但深冻结/完整校验把墙钟拉长到 `548.05s`（较 `339.10s` 回退约 61%）。已撤销；结论是现有 prepared census 适合进程内重放，不适合作为冷 canary 的构建期内存换时间方案。
- 2026-08-02 Codex: 将 R13-6A source disposition 改为从已验证 R13-5 父报告做窄增量，只重建 22 site、3 skill observation 和受影响的 source-debt observation；保留 source-root digest、完整 parent-delta/orphan/cardinality/layer 校验，未更新任何发布 golden。strict canary `2/2` 精确命中原 seal，`271.87s / 2,857,975,808B`；正式 source-semantics release `11/11`，`401.44s / 3,415,769,088B`；fast `70/507` 为 `34.79s / 543,506,432B`，三 seed synthetic shuffle `4/12` 全绿。墙钟继续下降，但 RSS 仍超 1.5GB 且只完成 exact 版本一次冷跑，状态保持 rework。
- 2026-08-02 Codex: 继续定位 G8 主峰为 P7/迁移整图复制、重复 source page、81,674-site 全量 index、whole-graph freeze set、`fastJsonSha256` 巨型字符串和 canary 在完成 identity 后仍持有 full historical migration。改为 COW/引用视图、不可变 source page 共享、受约束 subset index、路径级 cycle set、流式 fast digest，以及 canary-only stable+fast WeakMap 品牌窄视图；普通 release/shared fail-close，不改写输入。三次等价 exact-golden 冷跑 wall median/max `405.55s / 562.46s`，RSS median/max `1,377,386,496B / 1,477,574,656B`，全部达到 `≤10min / ≤1.5GB`；fast `71/528` 为 `42.68s / 394,297,344B`。`1152MiB` 压力跑约 192s OOM，最终固定 `1168MiB` fail-loud 上限。Codex 判定 G8 闭合，任务仍因 G1/G7 与 Kimi/GLM counter 保持 rework。Next: Kimi/GLM 复核 G8 并继续处理 G1/G7。
- 2026-08-02 Codex: 同机并发负载下两次 fast 运行分别让不同的 PAL-lite/unit 测试超过默认 5s，失败位置漂移且 `involuntary context switches` 约 1.1M；未抬高 timeout，改把 5 个组合 fail-closed 负例拆成独立测试，并让每个变异只 COW 克隆目标 enemy/command/hook。最终 fast `71 files / 533 tests`，`533 passed / 5 skipped`，`39.38s / 465,485,824B`；manifest、oracle、typecheck、diff check 均通过。该次只改测试隔离，不改变 canary 生产实现，沿用前述三次 exact-golden canary 证据。
- 2026-08-02 Kimi: G8 复核签 **G8 accept**（仅限 G8；G1/G7 不解除 rework）。一手证据：
  - **COW/source page 共享**（r13-source-semantics-canary.ts:45-56）：historical/current 顶层
    身份独立（浅拷容器）、不可变 source page 按引用共享，不重读 2,000+ 文件树——机制真实。
  - **流式 fast digest**（stable-json.ts:285-300）：64KiB 分块增量 SHA-256，insertion-order
    仅作进程内变异哨兵，发布证明仍走 stableJsonSha256 规范形，职责边界正确。
  - **canary-only WeakMap 窄视图**：注册函数 `!== 'canary'` 即 throw
    （r13-source-semantics-mg2.ts:277）、compact+brand 整段在 `=== 'canary'` 块内（:1739）、
    brand 携带 compact 前完整图 digest、丢 brand 回落真实 digest 必然漂移 fail-loud——
    **普通 release/shared 调用不会修改输入**（代码级确认不进入该分支）。
  - **1168MiB fail-loud**：vitest.canary.config.ts:21 `--max-old-space-size=1168` 在案；
    本席冷跑 `pnpm test:canary` **exit 0、1 file / 2 tests 全绿、wall 286.11s ≤10min**，
    cap 下无 OOM（1152MiB 压力 OOM 记录证明上限真实生效）。
  - **fast 复跑**：`pnpm run test:fast` **exit 0，71 files / 533 passed / 5 skipped，
    wall 44.31s ≤60s**。
  - 与 GLM 独立实跑（canary peak RSS 1.397GB ≤1.5GB、fast unit 449 passed）同向互证；
    本席 time -l 在 macOS 只捕获包装进程 RSS，worker RSS 以 GLM 实测与 cap 生效为准。
  - 证明力未见削弱：exact-golden 逐项比对与 replay `0/0/0` 均通过；发布 digest/seal/golden
    未变；22-site/3-skill 父报告增量后仍有完整 parent-delta 守恒校验。
  **G1/G7 继续阻塞**：G1 逐项旧断言映射未闭合、G7 完整 shared 顺序探针缺证（synthetic
  shuffle 不得冒充 22-file PAL shared 证据）；done blocked 不变，不得标记 done。未修改实现文件。
- 2026-08-03 GLM G1/G7 复核（`f00b2124`）：签 **accept**。一手核实（代码 + 映射文档 + 实跑）：
  - **G1 逐项映射**（`docs/ops/audits/OPS-TST-PERF-g1-coverage-map.md`）：44 条逐项，每条保留
    旧断言完整标题 + 后继证明文件/标题 + 路由（fast-synthetic / pal-oracle / canary /
    release-shared）。规则明确（:7-12）：synthetic 只证生产行为/拒绝、oracle 证发布摘要、
    canary 每次从真实源重建、release-shared 保留完整 source proof；**不把 synthetic 升级为
    source proof**。
    - 13 个引用测试文件全部存在（p7-canonical/mg2/owner-machine/state-machine/compatibility/
      project + synthetic-test-fixture + append-only-transition-state + pal-test-oracle +
      r13-source-semantics-canary + r13-item-throw-augmentation + source-instruction-disposition +
      c8-item-use-augmentation）✅
    - 抽查 4 个关键断言精确匹配：#29 canary "replays to identical seal and zero writes"
      （r13-source-semantics-canary.pal.test.ts:56）、#40 canary "producer rebuild matches
      exact R13-6A golden"（:25）、#44 release-shared "pins published append-only C8 seal"
      （c8-item-use-augmentation.test.ts:217）、append-only 16-mask test.each（:21 覆盖
      0000→initialize / 1111→replay / 14 种→half-state fail-closed）✅
    - 实跑 synthetic 测试：append-only-transition-state 16/16、p7-mg2 4/4、
      synthetic-test-fixture 6/6 全绿（26/26）✅
  - **G7 真实 shared 顺序探针**（`pal-shared-order-probe.pal.test.ts`）：**真实 PAL 数据**
    （11 个 prepared authority：P2-P6 + source-census + cadence/cross/item-throw/confirm/
    confirm-control，用 getPalTestCoreFixture/getPalTestGeneratedFixture，非 synthetic）。
    一次冷 lease（resetPalTestSharedPreparedCachesForOrderProbe + digestLease）后跑 5 种
    消费者顺序（默认/逆序/seed 20260802/03/04），断言 authoritySummary 全相同
    （Set(runs).size===1）+ 整组前后 lease digest 不变（leaseAfter===leaseBefore）。设计
    正确：检查同一 lease 上消费顺序不污染 shared cache。Codex 实跑 262.59s 通过；本轮因
    连续 canary 后 vite server 资源残留 + release config 10 分钟超时未独立复跑，但代码层面
    设计正确、断言精确，且探针用真实 authority 不是 synthetic shuffle。✅
  - GLM 的 G1/G7/G8 三项均已 accept；Kimi 随后补齐 G1/G7 accept，Codex 完成最终自验签字，三方门禁闭合。
    未修改实现文件。

## 下一位 Agent 提示词

无下一位 Agent 提示词；G1/G7/G8 已获 Codex、Kimi、GLM 三方 `accept`，任务卡状态为 `done`，等待用户最终验收/后续任务安排。

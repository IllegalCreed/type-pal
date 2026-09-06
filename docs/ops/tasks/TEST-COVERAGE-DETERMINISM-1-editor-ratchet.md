# TEST-COVERAGE-DETERMINISM-1 - 编辑器覆盖率计数确定性

Status: review
Owner: GLM
Reviewer: Codex + Kimi
Phase: ops
Capability: ops（测试门禁，不新增能力格）
Visual Verification Timing: N/A
Revision: r1（2026-09-06，三席前提/设计签字齐，已放行 GLM 实现）
Evidence Baseline: 2ac4a9de

## 目标与范围

补齐排序组件“有效拖动中无可滚动容器”路径的确定性回归，不再依赖真实动画帧偶然命中；不降低精确分数门禁。
2026-09-06 用户要求另卡登记，随后授权继续推进；Codex 已完成根因取证。用户确认“签了”后，
Codex 核实 r1 三席前提/设计签字，于 `d9fa4750` 洁净同步树放行 build；正式测试实现交 GLM，
本次准入登记不冒充已经修复。不重新打开 SAVE-PREFLIGHT-1，不改变其他任务的准入。
后续实现范围窄且明确，由 GLM 担任 Coding Owner；Codex 保留集成/独立验证，Kimi 独立审查。

范围为既有排序测试的帧时序与精确覆盖率门禁；已定位为测试覆盖缺口，不改产品排序/自动滚动行为。
不改 schema、存档策略、PAL 生成内容、生产源码统计范围或既有基线下限。

## 前提真值门

一句话工程前提：现有测试没有明确推进“无滚动容器但拖动仍有效”这一帧；生产 guard 正确，覆盖率靠调度偶然命中。

| 维度 | 已知事实 / 未知项 | 证据 |
|---|---|---|
| Primary source | editor 全部生产 TS/TSX 纳入；受控 maxWorkers=2；汇总前逐文件对账，精确分数比较 | `scripts/coverage/config.mjs:96,175`；`scripts/coverage/run.mjs:234,262,502` |
| 第一阶段 | N/A：不改变游戏行为，不从原版/一阶段机制推导 V8 覆盖率口径 | [覆盖率合同](../../testing/coverage.md)规定七包相同门禁 |
| 当前二阶段 | `reorder.tsx:730` 的 `if (!selected) return` 只在有效拖动尚未取消且该帧执行时命中；现有 pointer 测试未显式推进，已有 auto-scroll 用例只覆盖有容器路径 | `packages/editor/src/ui/design-system/reorder.tsx:382,699,730,821`；`reorder.test.tsx:370,769`；[确定性调查回执](../audits/pre-e2e/coverage-determinism.md) |
| 本任务目标 | 新增独立受控帧回归，证明没有容器时无滚动/无提前提交，有效 drop 仍一次提交；不改变用户行为 | [DS-C.4d](../../phase2/specs/editor-design-system.md)的 pointermove 零提交与一次 drop 合同（:573,591） |

已确认的证据边界：

- 历史失败为 statements `23455/31407`，对照基线 `23456/31407`；branches `18168/27329`，
  对照基线 `18169/27329`。当前基线 editor 对象仍保留较高计数。
- 两份日志是 **609 个生产文件 / 5,783 项测试、Reforge 122 文件 / 961 项**，包含首轮候选，
  没有可核验的旧 SHA + 同次工作树/范围记录；不得把“clean HEAD 10 次”或“约 1/6”当作已独立证实。
- `2c39b1af` 的 Codex 单次严格 fast（5,761 项）通过，editor 源码与其基线没有为过门禁而改动；
  该次通过本身不证明历史不确定性已修复；当前根因归属依据下方独立受控帧对照，不依据单次通过推断。
- 临时日志仅为当时机器上的辅助证据，可能被清理；持久结论已在原卡保留。后续须产出带 SHA、范围摘要、
  命令、退出码和逐文件计数的新证据，不把不存在的临时文件说成仍可复跑。

最强替代解释：测试时序/清理或共享状态、不同执行范围/未提交内容、coverage 映射/聚合问题均可导致差异。
Codex 在同一洁净树上只改变测试帧调度，已复得相同差额且逐文件/逐语句唯一定位；范围、分母、其他文件不变，
因此排除本次受控复现中的范围漂移和聚合计算错误。存档实现没有进入这个最小调用域。
旧日志未保留逐文件报告，不能追认其每次都由同一语句导致；历史“10 次/5 次”统计仍不升级为独立事实。
可证伪观察：若两种帧调度还改变其他源码覆盖，或不经有效拖动就命中返回，或删除该 guard 后新回归仍绿，
则本方案必须 counter。两席已完成独立核证，不复述 Codex；准入以本卡下方汇总结论为准。

## Codex 独立取证（2026-09-06）

- 在 `2ac4a9de` 洁净树上固定 Node 22.19.0、Vitest/provider 4.1.7、pnpm 10.29.2。
  editor 213 个生产文件、177 文件 / 1,600 项测试，identity digest 与 execution digest 均与已提交基线一致。
- 预先限定最多六次原样 editor fast 诊断，六次均与基线一致，随后停止；**不作为多数通过或“缺陷已修”依据**。
- 隔离加载只改 `reorder.test.tsx` 的时钟：hold 暂存动画帧；flush 在 mouse 拖动仍有效、pointerup 前推进一帧。
  生产 `reorder.tsx` 原文不变，两种调度下既有 23 项均通过；sole delta 为 statement 313（730:19）、
  branch 127（730:4）的返回分支由 0→1；line/function 覆盖不变。
- 全 editor 同范围对照，两组均 1,600/1,600 通过，差异只有 `reorder.tsx` 和总计：

| 模式 | editor statements | editor branches | reorder statements | reorder branches |
|---|---:|---:|---:|---:|
| hold（无容器帧未跑） | 23,455/31,407 | 18,168/27,329 | 599/651 | 444/535 |
| flush（有效拖动内明确跑一帧） | 23,456/31,407 | 18,169/27,329 | 600/651 | 445/535 |

- 生产/测试/基线未修改；上述为诊断配置，不冒充正式 fast gate。完整步骤与可复跑探针见调查回执；
  repo 中仅新增只读加载/临时产物的审计工具，不把诊断注入器放进产品或 CI。

## r1 修复方案与分工

1. GLM 只修改 `packages/editor/src/ui/design-system/reorder.test.tsx`：新增一个独立测试，建立无滚动容器的
   合法排序 Harness，模拟有效 pointerdown/move；显式断言已排队一帧，推进该帧后无滚动/无 onReorder、
   拖动仍有效、数据次序未提交；有效 pointerup 恰一次正确 intent。不得将 `autoScroll=false` 当作无容器场景。
2. 受控 RAF 用真实排队/取消模型，每次回调最多运行一次，取消必须从队列删除；测试结束在 finally/cleanup
   恢复全局与 DOM。不得把全套 RAF 改成同步函数，不修改现有 23 项断言或重写所有拖动测试。
3. 先红证据必须证明测试有效：在隔离加载中仅移除生产 `if (!selected) return`，新测试应失败，
   完整实现通过；不改共享工作树，不把“旧测试全绿”写成先红。不要求把诊断注入器常驻 CI。
4. 正式 CI 运行新增回归；fast 用真实新测试消除偶发覆盖依赖。只允许 `coverage:ratchet` 自动更新
   `scripts/coverage/baseline.fast.json` 的测试清单/真实提升，不手填计数、不删 scope。
5. 实现文件白名单为上述测试与生成基线；回执/本卡/覆盖率文档按实际结果更新。生产组件、全局 Vite 配置、
   既有测试超时与排除规则、原审计探针均不改。若需突破边界先 counter，不自行扩大。

Codex 负责复核真实提交树、负控制和精确基线；Kimi 终审核帧时序、边界与证据。此安排是一次有界测试任务，
不预先评价或授权 GLM 承担存档隔离等另一张卡。视觉 N/A：测试维护不改变 UI、交互或产品代码。

## 上下文锚点与调查边界

- [AGENTS](../../../AGENTS.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[共享工作树纪律](../agent-workflow.md#共享工作树与-stash)。
- [E-06 回执](../audits/pre-e2e/quality-gate-remediation.md)、[覆盖率合同](../../testing/coverage.md)，
  以及原存档卡两轮返工复核中的严格单次通过记录；不把之前已修的弹窗焦点竞态当作本卡根因。
- `scripts/coverage/config.mjs`、`run.mjs`、`baseline.fast.json`；`packages/editor/vite.config.ts`。
- 比较基线/候选用独立工作树或隔离进程，禁止在共享 main 中 stash/恢复他人内容来做先红。
  重型 check 与 coverage 不并跑；保留每次运行结果，不删除失败回执。

## 验收条件

1. 回执从候选实际文件/测试名/报告生成；新增一项时定向应为 24 项，fast 总数应为 5,762，最终以真实清单复算。
2. 缺 guard 的隔离单点负控制失败；完整实现的新回归通过，且明确命中 730 返回，无定时 sleep 猜阶段。
3. 正式修复前取得本卡准入；不得删业务断言、skip、coverage ignore、
   下调阈值、缩范围或以多数通过替代严格失败。
4. 固定验证计划：定向测试与负控制 → editor typecheck → 完整 check → 三次串行 editor fast 范围诊断
   （每次独立报告、任一回退停线，不取多数）→ 一次七包 coverage:ratchet（内部先比较旧基线，零下降才更新）
   → 基线生成后单次严格 coverage:fast；重型命令不并跑，结果全保留。
   复跑只验证稳定性，不能替代业务断言与根因解释。

## Build / Review

### Codex 独立实现复核（2026-09-06，候选 `7c447c38`）

**结论：accept，无阻断/返工项。** 对比 `4bc8a3b3`；接手 HEAD `9c6073a2` 与 origin/main 同步、
工作树干净，其相对候选 packages/ scripts/ 零 diff。r1 不重签、不标 done。

- 实现面仅测试 +94 行与生成基线。内存删除新增块后，测试文件与基线 **逐字节相同**；既有 23 项断言、
  fixture/钩子未改。生产组件、全局配置、超时/排除规则、两份旧覆盖率诊断探针均零 diff。
- 新回归 :860–949 使用正常 Harness / 默认 autoScroll，有效 move 只排队一帧；先出队再执行，
  :907–922 钉住零滚动、零提交、拖动仍有效；:925–935 钉住正确 a→c intent 恰一次。
  cancel 从 Map 删除，finally 清队列并按描述符恢复 RAF；DOM/指针桩由现有 afterEach 回收。
  未使用同步 RAF、sleep、autoScroll=false 或绕开真实回调获得覆盖。
- **独立负控制**：未读取/复用 GLM 的临时 config，另以 TypeScript AST 在 `runAutoScroll` 回调顶层
  定位唯一 `if (!selected) return`，仅删除该 **21 字符**语句（:730），其余原文保留。
  完整实现同配置/同过滤 exit 0；移除后仅新回归失败 exit 1，`selected.owner` TypeError 出现在 :732，
  经新测试 :916 的帧回调触发。控制组源 hash 与磁盘一致；未改共享生产源码、stash 或扩大突变。
- 基线只有 7 个叶值变化：generatedAt、总/包/文件测试数、该文件/包 identityDigest、executionDigest。
  七包及全仓四项 covered/total、生产文件集合、include/exclude 均未变。本人未运行 ratchet 或修改基线；
  严格报告与提交基线逐项一致，fast 总数为 **5,762**。
- 另读 GLM 三轮报告，statements 23,456 / branches 18,169 与其回执一致；这不冒称本人跑了三轮。
  本人实际复跑如下，全部串行，无重试取多数：

| 检查 | 本人结果 |
|---|---|
| 定向原配置 | 24/24，exit 0 |
| 单点负控制 / 完整实现控制 | exit 1（上述 TypeError）/ exit 0；各只选择新回归，其他 23 项为过滤跳过 |
| editor typecheck | exit 0 |
| 完整 pnpm check | exit 0；539 个 Vitest 文件 / 6,247 项；lint 0 error，50 warnings / 11 infos 既有 |
| 一次独立 editor fast 范围检查 | 213 生产文件 / 1,601 项全绿；statements 23,456/31,407，branches 18,169/27,329，functions 5,907/8,030，lines 21,199/27,409 |
| 单次严格 coverage:fast | exit 0；609 生产文件 / 5,762 项；所有包/全仓精确基线一致，无回退 |

本机临时证据：`/tmp/type-pal-cov-det-review.Iw6R9V/` 的 `provenance.json`、`commands.json`、
`mutation.config.mts`、`control-ast-proof.json` / `remove-ast-proof.json`、`reorder.mutant.tsx`、
`control.log` / `mutant.log`、`target.json`、`check.log`、`editor-tests.json`、`editor-coverage/`、
`coverage-fast.log`。临时目录不承诺长期留存，候选/方法/计数以本节和 Git 为持久记录。

旧版本兼容审查：**pass**，未新增版本分支/旧 fixture/兼容 fallback。视觉 **N/A**，生产/UI 行为不变。
旧探针未改未跑，不要求修复后保持旧 23 项/+1 条件；只确认本卡已知缺口有确定性回归，不宣称所有潜在
editor 不确定性都已消失。SAVE-ISOLATION-1 产品待决不在本次审查授权内。

### GLM 实现回执（Coding Owner 自测，2026-09-06，候选 `7c447c38`）

**改动（白名单两文件）：** `packages/editor/src/ui/design-system/reorder.test.tsx` **+94**——仅在既有
auto-scroll 容器用例之后新增一条独立回归 `drag with no scroll owner runs the queued frame without
scrolling or committing, then drop commits once`；`scripts/coverage/baseline.fast.json` 由
`pnpm coverage:ratchet` 自动生成（提升 0 项、范围变化 2 项、零下降）。产品组件、全局 Vite 配置、
既有 23 项断言、超时/排除规则、原审计探针零改动；未用 stash、未改共享生产源码、未提交/切分支直到验证完成。

**新回归设计：** 默认 Harness（无可滚祖先、非模态——scrollOwners 合法为空）。真实排队/取消 RAF 模型：
入队 Map、`cancelAnimationFrame` 即从队列删除、**触发即出队**（与浏览器一致）；`finally` 清队列并按
描述符恢复全局。业务断言：有效 pointerdown/move 后**恰排队一帧**（生产单在途帧 guard）、零提交；
推进该帧后 body/document `scrollTop` 均为 0（无滚动）、`onReorder` 零调用、`data-dragging` 仍真、
**不重新排队**（无定时 sleep）；随后有效 pointerup **恰一次** intent（a→c，0→2，input: pointer）。
实现期一次真实修正：首版 flush 只复制不 dequeue，`frames.size` 断言红——按真实 RAF 语义改为触发即出队后绿。

**单点负控制（隔离加载，未动共享树）：** 临时 vitest config（`enforce: pre` load 钩子）在内存中仅删除
`reorder.tsx` 的 `if (!selected) return`（钩子断言该串全文件唯一），其余原文不动。定向运行新回归：
**exit 1**，失败栈 `TypeError: Cannot read properties of null (reading 'owner')`——正是移除 guard 后
`selected.owner` 的崩溃点；同过滤完整实现对照 **exit 0**。命令、退出码与失败栈存
`/tmp/type-pal-cov-det-build/`（negative-control.log / control-green.log，临时目录不承诺长期存在）。

**固定串行验证计划实跑结果（全部真实命令与退出码，日志同上目录）：**

| 步骤 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 定向 | `pnpm --filter @type-pal/editor exec vitest run src/ui/design-system/reorder.test.tsx` | 0 | **24/24 绿**（卡面预期 24 ✓） |
| 负控制 | 同上 `--config /tmp/cov-det-negative.config.mts -t "no scroll owner"` | **1** | 新回归红（见上） |
| editor typecheck | `pnpm --filter @type-pal/editor run typecheck` | 0 | 干净 |
| 完整 check | `pnpm check` | 0 | 50 warnings / 11 infos 均既有 |
| 3× editor fast 诊断 | 隔离脚本复刻 fast 门禁 editor 范围（同 selection/excludes/include），串行独立报告 | 0 | 三轮完全一致：**1,601/1,601**、statements **23,456**/31,407、branches **18,169**/27,329、functions/lines 与基线逐数相同；运行前后 HEAD 与候选 diff 未变 |
| coverage:ratchet | `pnpm coverage:ratchet` | 0 | 提升 0 项、范围变化 2 项、零下降（仅测试清单 1,600→1,601 / 总数 5,761→**5,762**） |
| 严格 coverage:fast | `pnpm coverage:fast` | 0 | **门禁通过**，相对新基线未下降 |

**确定性结论：** 修复前缺口（hold 23,455 / flush 23,456 随机取值）在加入新回归后三轮串行全为 23,456——
偶发覆盖依赖已消除；计数与卡面预期（定向 24、fast 5,762）逐项吻合，均以提交树实测为准。

**旧探针处置：** `probe-editor-coverage-timing.mjs` 未运行、未修改（其 23 项/+1 断言按 Build 澄清属
修复前历史证据；新清单 24 项下其数量断言自然不再成立，不为凑绿改探针）。

**未验项：** 无浏览器项（纯测试维护，无 UI/交互变化，卡面 Visual N/A）；无其他未验项。

## 推进签字

- build：
  - Codex：**premise verified / design agree（2026-09-06，r1）**。直接读取 `reorder.tsx:382,699,730`、
    既有测试 :370/:769 和 DS 合同；本人完成上述 23 项及 1,600 项双调度对照，唯一语句/分支差额可证伪。
    修复层为测试，不改正确的生产 guard；同意限定 GLM 新增独立用例与自动基线，Codex 复核负控制。
  - Kimi：**premise verified / design agree（2026-09-06，r1）**。独立直读与复算，未读 GLM 签字：
    `reorder.tsx:382-400` scrollOwners 向上收集需 scrollable+overflow auto/scroll，普通非模态列表
    合法返回 []；`:699-708` 早期有效性检查（session/validTarget/autoScroll=false/无 RAF 提前返回，
    与 :730 是不同分支）；`:730` `if (!selected) return`；`:737` scheduleAutoScroll 排队；
    `reorder.test.tsx:370` pointermove 与 pointerup 同 act、RAF 未控（偶然命中源）；
    `:769` 受控 RAF 但包模态可滚容器（有容器路径，非本分支）。
    本人亲跑探针：hold/flush 均 23/23 绿，分母不变，差异恰为 statement+1/branch+1 且仅在
    reorder.tsx（探针断言 4 条 diff、SHA 与基线 hash 前后不变、脏树拒绝启动——诊断未改生产或
    缩范围）；诊断 config 只 load 拦截单测试文件、Map 队列 stub RAF/cancel-delete、afterEach
    恢复，唯一锚点替换。基线实测 editor 23456/31407、18169/27329 与 flush 回升一致。
    DS 合同直读：pointermove/自动滚动只更新本地投影、有效 pointerup 一次 intent（editor-design-system.md
    :573）、一次手势最多一条 command、20 次 hover/滚动零提交（:591）。
    证据边界认可：历史「10 次/约 1/6」与无 SHA 旧日志未升级为事实，本次归因只依据同树受控对照。
    设计同意：单条受控帧回归 + 单点负控制（仅移除 :730 guard 时新测试必红——selected=null 续行
    即 TypeError）+ finally/cleanup + 白名单（单测试文件与生成基线）+ 验收 4 的串行不取多数，
    边界清楚不过度。可证伪观察：① 两种帧调度改变其他文件覆盖或分母 → 前提倒；② 新用例未在
    有效拖动内命中 :730（如走 :707 提前返回或把 autoScroll=false 当无容器）→ 测试无效；③ 仅删
    :730 guard 新用例仍绿 → counter；④ ratchet 出现任何下降/scope 变化/手填计数 → counter。
    返工项：无。
  - GLM：**premise verified / design agree（2026-09-06，r1，拟定 Coding Owner 的独立前提/设计审查；
    全部证据本人亲读/亲跑，未读取 Kimi 签字内容——其签字于本人审查中途落地，本人仅确认席位位置）**。
    独立证据：
    - 直读 `reorder.tsx`：`:730` 确为 `if (!selected) return`；可达链亲自核过——`:699-706` 早期有效性检查
      （无 session/无效目标/autoScroll=false/无 RAF 均提前返回）先于该行，故 :730 只被“有效拖动中”的帧命中；
      `:707-728` 扫 `session.scrollOwners`，无合格 owner 时 `selected` 保持 null；`:382-399` 收集器对默认
      Harness（无可滚祖先、非模态）合法返回 `[]`；`:817-838` 有效目标 pointermove 收集 owners 并
      `scheduleAutoScroll()`；`:737-744` 单在途帧 guard；取消路径 `:472-474`/`:778-782`。
    - 直读既有测试：`reorder.test.tsx:370` test.each（mouse/touch/pen）down→21 次 move→up 全程
      **无任何 RAF 控制**——:730 是否被帧命中纯属时序偶然；`:769` 受控 RAF 用例构造模态+外层双可滚容器，
      走的是 `selected` 非空的滚动路径，不覆盖 :730。Harness afterEach 只恢复 elementFromPoint/指针捕获，
      RAF 桩恢复属各测试职责（:769 为描述符现场保存/恢复）。
    - 探针本人实跑（洁净树，provenance SHA=df1b281d）：quick 23/23 双时序，唯一差额 reorder.tsx
      statements +1（592→593）/ branches +1（426→427），分母/函数/行数完全一致；
      `--full` 复跑两轮全绿（1,600/1,600 双时序），editor statements **23,455→23,456**、branches
      **18,168→18,169**，lines 21,199 / functions 5,907 不变——与历史失败签名逐数一致。
      另一次 `--full` 在两组 1,600/1,600 完成后于末段断言中止（输出未留存，产物 difference.json 与
      绿轮逐项相同）；三轮实质一致，不影响结论，供 Codex 复跑时知悉探针可能在末段断言中止。
    - DS 合同直读：editor-design-system.md:574（pointermove/hover/自动滚动只更新本地投影、有效
      pointerup 恰一次 intent）、:591（20 次 hover/自动滚动零提交）——新用例业务断言与合同一致。
    - 门禁锚点：config.mjs:96/:175（editor `--maxWorkers 2`）、run.mjs:234/:262（逐文件对账）/:502
      （零下降比较）——精确分数门禁属实。
    design agree：单条无容器受控帧用例仅经有效目标调度路径命中 :730（autoScroll=false 会在 :702
    提前返回，卡面已明令不得混用）；真实排队/取消 RAF 模型与生产单在途帧语义一致；单点负控制
    （隔离加载仅移除 :730 guard → selected.owner TypeError 使新用例失败）可证伪且与探针同一内存变换
    技术；基线只经 coverage:ratchet，白名单（reorder.test.tsx + 生成基线）本身受 auditScope/比较器
    强制。可证伪观察：(a) 若新用例 flush 覆盖超出 :730 返回，fast 差额将超过 +1，三轮串行诊断会拦下；
    (b) 排队数断言须取 flush 前时刻（flush 后 ref 清空、下一次有效 move 会重新排队）；
    (c) 卡面引 DS :573 实为 :574（内容一致，off-by-one，非阻断）。预期计数核对：定向 23→24、
    fast 总数 5,761→5,762 与当前提交基线吻合。
- 独立反证：Kimi 与 GLM 均已直接读源码/合同并各自运行探针，证据与可证伪观察见各自签字。
  用户缺签豁免：无；**build 准入：allowed（Codex，2026-09-06）**。
  已核 `0013b09f` 与 `d9fa4750` 两席签字均对应 r1、无 counter；相对产品基线 `2ac4a9de`
  packages/ scripts/ pnpm-lock.yaml 零 diff。GLM 为唯一 Coding Owner，只执行 r1 文件白名单。
- done：
  - Codex：**accept（2026-09-06，独立复核 `7c447c38` 对比 `4bc8a3b3`）**。
    白名单、旧断言保留、独立 AST 单点负控制与全部指定门禁通过，详见本人复核；无返工项，不代签。
  - Kimi：**accept（2026-09-06，独立终审候选 `7c447c38` 对比 `4bc8a3b3`；r1 不重签）**。
    接手 HEAD `3b6adf94` 与 origin/main 一致；候选相对 HEAD 产品/测试/基线零 diff。
    逐项本人独立核证（GLM done 签字于本人核查完成后落盘，未读其内容、不复述其结论）：
    - **白名单/旧断言**：候选 diff 仅 reorder.test.tsx +94 纯插入（单 hunk、零删改——移除新增块
      即逐字节恢复旧文件）+ baseline.fast.json；生产组件、vite 配置、两份旧探针、其余 editor
      源码全部零 diff（`4bc8a3b3..7c447c38` 实测）。
    - **新回归帧时序/清理/业务断言**（reorder.test.tsx:857-949 直读）：默认 Harness 无可滚祖先、
      非模态（scrollOwners 合法为空，autoScroll 默认——命中 :730 而非 :707 早退）；Map 排队模型
      取消即删、触发即出队（与生产单在途帧语义一致）；有效拖动内恰排队一帧、零提交；推进后
      body/documentElement scrollTop 均 0、onReorder 零调用、仍 dragging、不重排队；有效
      pointerup 恰一次 a→c（0→2，input: pointer）intent；finally 清队列并按描述符恢复 RAF；
      无 sleep、无同步 RAF、未改既有 23 项。
    - **定向复跑**：24/24 绿（本人实跑 exit 0）。
    - **本人独立负控制**：自建 /tmp/kimi-cov-det-review/mutant.config.mts（load 钩子断言
      `    if (!selected) return\n` 全文件唯一——grep 实测仅 :730 一处），内存中仅删该语句：
      完整实现对照 exit 0（1 passed/23 skipped）；突变 exit 1，恰新回归失败，栈为
      `TypeError: Cannot read properties of null (reading 'owner')`——正是 :732 `selected.owner`
      崩溃点。共享工作树零改动（突变后 `git status` 无产品变化）。
    - **基线清单**：仅 7 个叶值变化（generatedAt、总 5,761→5,762、editor 1,600→1,601、
      文件 23→24 及其 identityDigest、包 identityDigest、executionDigest）；metrics 节零 diff，
      无手填/降指标/scope 变化。
    - **证据交叉核**：Codex /tmp 证据 provenance 候选/基线一致、control-ast-proof 控制组同 hash、
      editor-tests 1,601/1,601、coverage TOTAL 609 文件/5,762；GLM 回执三轮串行 editor fast 恒
      23,456/18,169（Codex 已读其报告），原 hold/flush 摆动由真实回归消除——非多数通过凑数。
    可证伪观察：若后续 editor fast 诊断再现 ±1 摆动，须按审计回执继续逐文件定位，不得因本分支
    已钉而豁免其他不确定性。返工项：无。本 accept 不代签、不授权 done、不含 SAVE-ISOLATION-1。
  - GLM：**accept（2026-09-06，实现者自测最终签字，非独立终审——独立复核由 Codex 完成、Kimi 终审另行落盘）**。
    签字对象：候选 `7c447c38`（本人实现）。落笔前核对：HEAD `3b6adf94` 相对候选的
    `packages/ scripts/` 零 diff（无漂移），工作树干净；自候选后仅 review 文档提交。
    本人已完成的实际验证（实现轮亲跑，命令/退出码/日志见本人实现回执与
    /tmp/type-pal-cov-det-build/）：定向 24/24（exit 0）；隔离负控制仅删 :730 guard →
    新回归 exit 1（selected.owner TypeError），完整实现对照 exit 0；editor typecheck 0；
    完整 `pnpm check` 0；三轮串行 editor fast 诊断 1,601/1,601 ×3、statements 恒 23,456 /
    branches 恒 18,169（修复前摆动计数已消除）；`pnpm coverage:ratchet` 零下降（清单 5,762）；
    严格 `pnpm coverage:fast` 0。本轮登记未重跑未变测试。未验项：无浏览器项（纯测试维护，
    卡面 Visual N/A）；Codex 复跑结论归 Codex 席位，不冒称本人结果。本 accept 不代签他席、
    不授权自行标 done。
  - done 准入：三席 accept 均已落盘，待 Codex 汇总核定；无缺签豁免，任务保持 review，不标 done。

## Build 交接澄清（Codex，2026-09-06，不修改 r1 方案）

- **历史探针不是修复后的门禁。** “恰差 +1”约束的是既有 23/1,600 项的 hold/flush 因果对照；
  新增独立回归后该分支应稳定命中，旧探针的 23 项数量/差额断言可能不再成立，这正是其历史用途边界。
  不要求修复后仍维持旧探针 +1，不改旧探针凑绿，也不禁止新业务断言带来合理覆盖提升。
  正式验收依赖新回归的单点负控制、完整检查、覆盖率范围/精确比较及白名单；异常增量仍需逐项解释。
- Kimi 签字中“pointermove 与 pointerup 同 act”措辞不准确：源码 :394–398 与 :402–404 为两个 act；
  共同核心事实是没有显式控制 RAF，两席关于偶发命中的前提仍成立。DS 引用 :573–574 为同一条合同，
  不是行为或方案分歧。保留两席原文，在此澄清，不代改其签字。
- GLM 所述末段中止已有可核验原因：`type-pal-editor-coverage-timing.EnxUYL/provenance.json` 的起始
  HEAD 是 `df1b281d`；两组测试运行在 18:16:56–18:18:38（+09:00），reflog 记录 Kimi 于
  18:17:26 提交 `0013b09f`。因此 probe :121 的 HEAD 恒等断言必然拒绝该次运行。
  产物 difference.json 的四项差额与其他轮一致，但**该次不计作完整通过**，不能称为随机末段抖动。
  原终端栈未保存，不冒称已取得其原始报错全文；根据代码/时间/产物可确定上述拒绝条件。
  独立已通过证据保持有效，无需再靠多数复跑证明。后续固定候选期间不提交/切分支，完整保存命令、退出码和失败栈。

## 交接

- 2026-09-06 Kimi（独立终审）：同步 `3b6adf94`、工作树干净后核 `4bc8a3b3 → 7c447c38`——白名单
  两文件（测试 +94 纯插入、基线 7 叶值），生产/配置/旧探针零 diff；新回归帧时序/清理/业务断言
  直读（排队一帧→零滚动零提交仍有效→drop 恰一次，finally 恢复，无 sleep/autoScroll=false）；
  定向 24/24 实跑；本人自建独立负控制（/tmp/kimi-cov-det-review/mutant.config.mts，load 钩子
  断言 :730 guard 唯一并仅删该句）：完整实现 exit 0、突变 exit 1 且恰新回归
  `TypeError: Cannot read properties of null (reading 'owner')`；Codex /tmp 证据计数交叉一致
  （editor 1,601/1,601、coverage 609 文件/5,762）。签 accept，可证伪观察已写入签字块。
  未改实现/基线/他席/任务状态，未标 done。done 准入行更新为三席齐、待 Codex 汇总。
  Next：Codex 汇总核定 done 并同步看板/索引。
- 2026-09-06 GLM（Coding Owner，done 前最终登记）：补齐本席 accept（实现者自测，非独立终审）。
  落笔前核对 HEAD `3b6adf94` 相对候选 `7c447c38` 的产品/脚本零 diff、工作树干净。签字依据仅为
  本人实现轮亲跑验证（定向 24/24、负控制 exit 1 + 对照 exit 0、typecheck、完整 check、三轮串行
  诊断恒 23,456/18,169、ratchet 零下降、严格 fast 通过），未重跑未变测试、未把 Codex 复跑当本人
  结果、未复述 Kimi 结论。仅更新本人签字块与本日志；未改实现/他席内容/任务状态、未标 done。
  done 准入行随本席落盘更新为仅待 Kimi 终审。Next：Kimi 独立终审（提示词已在卡内当前有效），
  通过后由 Codex 汇总收口；无下一位 GLM 工作。
- 2026-09-06 Codex（独立实现复核）：同步 `9c6073a2`，核 `4bc8a3b3 → 7c447c38` 白名单两文件，
  删除新增块后旧测试逐字节恢复；独立 AST 仅删 :730 guard，控制绿/负控制 selected.owner TypeError 红。
  定向 24、editor typecheck、完整 check 6,247、editor fast 1,601、单次严格七包 fast 5,762 按计划通过，
  无回退/重试取多数；验证期间工作树/候选/基线不变。签本人 accept，不改 r1/他席签字、不标 done。
  下一步 Kimi 独立终审；GLM 同时仅补本人最终自测签字，避免收口时再补一轮；两席均钉 `7c447c38`，
  各写本人席位/日志并提交推送，Codex 汇总后才推进终态。
  本次签字落盘后文档检查与 git diff --check 通过；仅修改本人复核/签字/日志/后继提示及看板下一步，任务保持 review。
- 2026-09-06 GLM（Coding Owner）：完成白名单实现并提交候选（reorder.test.tsx +94 一条无容器受控帧
  回归 + ratchet 生成基线），转 review。负控制隔离加载仅删 :730 guard → 新回归 exit 1
  （selected.owner TypeError）；定向 24/24、editor typecheck、完整 check、三轮串行 editor fast 诊断
  （1,601/1,601 ×3，statements 恒 23,456、branches 恒 18,169——偶发依赖消除）、ratchet 零下降、
  严格 fast 通过，计数与卡面预期逐项吻合。实现期一次 dequeue 语义修正已如实记录。旧探针未动未跑。
  未代签、未标 done。Next: Codex 独立复核（真实提交树、负控制复算、精确基线）。
- 2026-09-06 Codex（build 准入汇总）：用户确认签字后同步至 `d9fa4750`，工作树干净、origin/main 一致；
  复核两席独立源码/探针证据、无 counter、r1 白名单未变，三席签字齐且无豁免，draft → build。
  记录旧探针修复后不必保持 +1、act/DS 行号澄清，以及 GLM 一次中止的 HEAD 漂移证据；不改两席签字、
  不重签设计、不代写实现。同步看板/索引并交 GLM；实现完成先交 Codex 复核，有明确阻断直接返工，
  Codex 通过后再交 Kimi 终审。SAVE-ISOLATION-1 仍待用户裁决，不把“签了”当作工作区策略选择。
  本次文档工具 20/20、文档检查及 git diff --check 通过；复用已核且未变的产品/测试证据，未再跑重型检查。
- 2026-09-06 GLM：完成 r1 前提/设计审查（拟定 Coding Owner 席），签 premise verified + design agree，
  无 counter。证据全部亲读/亲跑：可达链直读（:699 早期检查先于 :730、:382 收集器可空、:837/:737 调度）、
  既有测试 :370（无 RAF 控制）/:769（有容器路径）直读；probe quick 23+23 与 --full 两轮 1,600+1,600
  实跑，唯一差额 reorder.tsx statement/branch 各 +1，editor 总数 23455→23456 / 18168→18169 与历史失败
  签名逐数一致（另一次 --full 于末段断言中止、产物与绿轮相同，已登记供复跑知悉）。DS 合同 :574/:591、
  coverage 门禁锚点（config:96/175、run:234/262/502）直读。可证伪观察与两条非阻断备注（DS 行号
  off-by-one、排队数断言时机）写入签字块。Kimi 签字于本人审查中途落地，未读其内容、不复述其结论。
  仅更新本人签字块与本日志；未改实现/正式测试/基线/任务状态、未开始 build。Next：三签齐，Codex 放行
  build 后本人按白名单实现。
- 2026-09-06 Kimi：完成 r1 独立前提/设计审查，签 premise verified + design agree，无返工项。
  直读 reorder.tsx:382/699/730/737、既有测试 :370/:769、DS 合同 :573/:591、coverage 配置
  （maxWorkers=2、精确分数、scope 审计）与基线（editor 23456/31407、18169/27329）；
  亲跑 probe-editor-coverage-timing.mjs：hold/flush 23+23 全绿、分母不变、仅 reorder.tsx
  statement/branch 各 +1，探针自证未改生产/测试/基线（hash 前后一致、脏树拒启）。
  四条可证伪观察已写入本人签字块。未改实现/正式测试/基线/任务状态，未读 GLM 签字。
  Next：GLM 并行签字；两席齐后 Codex 放行 build。
- 2026-09-06 Codex：用户授权继续推进后完成六次有界原样诊断及受控时钟因果对照；根因已定位，
  r0 blocked → r1 draft。拟将白名单内测试实现交 GLM，先并行请 GLM/Kimi 独立审 r1。
  产品/正式测试/基线零改动，不代签、不开始 build；SAVE-ISOLATION-1 仍等产品选择。
  可复跑审计探针落盘后，快速双调度 23+23、全 editor 双调度 1,600+1,600 再验均通过且差额一致；
  文档工具 20/20、文档检查与新增探针 Biome 检查通过。仅提交证据/方案/看板索引，不把取证脚本当正式修复。
- 2026-09-06 Codex：按用户收口要求登记，保存历史差异与归因限制；未修改测试/配置/基线，未执行新调查或修复。
  后续先由 Codex 补确定性证据，不请求重签 SAVE-PREFLIGHT-1。

## 下一位 Agent 提示词

### Codex：汇总核定 done（当前有效）

```text
在 /Users/zhangxu/illegal/type-pal 汇总 TEST-COVERAGE-DETERMINISM-1 收口，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，review，终审候选 7c447c38（HEAD 侧无产品变化）；r1 不重签。
先同步并检查工作树，读本卡 done 前三席签字与最新交接日志。现状：Codex/Kimi/GLM 三席 done 前 accept 均已落盘（GLM 为实现者自测性质，已如实标注），无 counter、无返工项、无缺签豁免。
请统一核定 done 准入：核对三席签字钉同一候选 7c447c38，将任务推进 done，同步看板/索引与覆盖率文档回执（audit 文档状态可由「已定位未修复」更新为已修复并注明确定性回归位置）。
保留 Kimi 可证伪观察：后续 editor fast 诊断若再现 ±1 摆动，按审计回执继续逐文件定位，不因本分支已钉豁免其他不确定性。
不得代签、不把本收口扩张到其他任务；SAVE-ISOLATION-1 仍待用户拍板。
```

### Kimi：独立终审（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 终审 TEST-COVERAGE-DETERMINISM-1。
任务卡：docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，review，r1 不重签；候选 7c447c38，对比 4bc8a3b3。Codex 已独立 accept。
先同步并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡方案/Build 澄清/实现回执与 Codex 复核。独立核源码和证据，不以另一席最终签字代替判断。
重点核：仅新增单条 +94 行回归及生成基线，移除新增块后旧文件逐字节相同；有效拖动内真实排队/出队、无滚动/无提前提交、正确 drop 一次、finally 清理；基线仅测试清单相关 7 叶变化，精确指标/生产范围不变。
复跑定向 24，并独立核仅删除 reorder.tsx:730 的 if (!selected) return 后新回归 exit 1（selected.owner TypeError）、完整实现 exit 0。Codex 独立 AST 配置与原始证据在 /tmp/type-pal-cov-det-review.Iw6R9V/，可自行重建。完整 check 6,247、editor fast 1,601、严格 fast 5,762 的新鲜日志可复核，无需无差别重复重型全量；异常保留失败核因，不取多数。旧探针不改，视觉 N/A，不重验 UI。
在本人 done 席位写 accept 或 file:line counter，附直接证据与可证伪观察，更新本人日志并提交推送。只改本人席位/日志，不改产品/测试/基线/其他席位/任务状态，不标 done。GLM 并行补实现者自测签字，各自保留另一席已落改动，由 Codex 最终汇总。
```

### GLM：仅补本人最终自测签字（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 为 TEST-COVERAGE-DETERMINISM-1 补本人最终自测签字。
任务卡：docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，review，候选 7c447c38，r1 不重签。你是实现者，Codex 已独立 accept，Kimi 正在终审，本轮不是返工。
先同步并检查工作树，读 AGENTS.md、本卡 r1 白名单/验收条件及你自己的实现回执，确认产品/测试与候选无漂移。仅根据本人已完成的实际验证在 GLM done 席位签 accept 或 counter，明确“实现者自测，非独立终审”，附候选/证据/未验项。不要读取或复述 Kimi 结论，不把 Codex 复跑当作你亲跑；不要求重复未变的测试或重签设计。
只改本人签字块和本人日志，提交推送并保留 Kimi 已落改动。不改实现/基线/他席/任务状态，不标 done，完成交 Codex 汇总。SAVE-ISOLATION-1 不在范围内。
```

### Codex：独立复核实现候选（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 复核 TEST-COVERAGE-DETERMINISM-1，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，状态 review，候选 7c447c38（对比 4bc8a3b3，r1 不重签）。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡验收条件、GLM 实现回执与最新交接日志；接手先同步分支并检查工作树。
核对白名单：改动应仅为 reorder.test.tsx 新增一条无容器受控帧回归（既有 23 项断言零修改）+ ratchet 生成的 baseline.fast.json；产品组件、全局配置、超时/排除、旧探针零 diff。
独立复算负控制：用你自己的隔离加载仅移除 reorder.tsx:730 的 if (!selected) return，新回归必须 exit 1（selected.owner TypeError），完整实现对照绿；GLM 的临时 config/日志在 /tmp/type-pal-cov-det-build/（临时目录，可自行重建）。
复跑定向（24）、editor typecheck、完整 pnpm check、至少一次 editor fast 范围确定性检查（应为 1,601/1,601、statements 23,456、branches 18,169 恒定）与单次严格 coverage:fast；验证 fast 总数 5,762 与基线清单一致。editor 抖动如复现按确定性缺陷处理，不取多数。
通过则在 Codex 席位签 accept、更新交接日志并给出 Kimi 终审提示词；有阻断签 counter 列明证据转 rework。不得代签、不标 done。
```

### GLM：r1 白名单实现（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 收口 TEST-COVERAGE-DETERMINISM-1 的 build 准入，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，draft。
先同步分支并检查工作树，读本卡三席 build 前签字（Codex/Kimi/GLM 均已 premise verified + design agree，无 counter）与交接日志。
确认三签齐后由你放行：将任务转 build、更新看板/索引，并把实现交 GLM 按已签白名单执行（只改 reorder.test.tsx 新增一条无容器受控帧用例 + coverage:ratchet 生成基线；单点负控制先红；预期定向 23→24、fast 总数 5,761→5,762）。
若你认为任一签字证据不足或发现新的阻断，签 counter 列明 file:line 证据，任务保持 draft/rework，不开始实现。
不得代签、不得让 GLM 在放行前改正式测试/基线；SAVE-ISOLATION-1 仍等用户拍板。
```

### GLM：r1 前提与实现可行性审查（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 审查 TEST-COVERAGE-DETERMINISM-1，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，draft，产品基线 2ac4a9de。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/ops/audits/pre-e2e/coverage-determinism.md。你是拟定的 Coding Owner，本轮只做独立前提/设计审查，不开始实现。
直接核 reorder.tsx:730 无滚动容器的返回、既有 pointer 测试与 auto-scroll 测试；独立运行 node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs 并查看 hold/flush 原报告，核产品未改、23 项都绿但只差该返回；不要读取或复述 Kimi 的签字。按需跑 --full（仅 editor fast 范围，不是全仓 full coverage）。
审 r1 的单条受控帧回归、清理、单点负控制和生成基线白名单，给出可证伪观察；签 premise verified + design agree，或带 file:line 的 counter。只写你席位和你日志，提交推送，其他席结论/任务状态不改。三方签字齐后由 Codex 放行，禁止提前修改正式测试、基线或标记 done。
```

### Kimi：r1 独立前提与设计审查（已完成，历史保留）

```text
在 /Users/zhangxu/illegal/type-pal 审查 TEST-COVERAGE-DETERMINISM-1，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，draft，产品基线 2ac4a9de。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/ops/audits/pre-e2e/coverage-determinism.md。你负责独立前提/设计审查；不要读取或复述 GLM 的签字。
直接核 reorder.tsx:382/699/730 与既有测试 :370/:769，独立复算受控帧是否唯一改变 no-selected 返回的覆盖、没有替换生产实现或缩范围。运行 node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs；全 editor hold/flush 回执可复核，必要时 --full（非全仓 full coverage）。审单条新回归是否能以移除该 guard 的单点负控制证伪，是否保留无滚动/无提前提交/有效 drop 一次的业务断言。
签带独立证据的 premise verified + design agree，或 file:line counter；只写你席位和你日志，提交推送，保留另一席并自行处理 push 竞态。不改实现、正式测试、基线、任务状态，不代签、不标记 build/done。无产品行为变更，不要求用户重新验 UI。
```

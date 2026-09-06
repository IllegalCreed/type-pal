# TEST-COVERAGE-DETERMINISM-1 - 编辑器覆盖率计数确定性

Status: draft
Owner: GLM
Reviewer: Codex + Kimi
Phase: ops
Capability: ops（测试门禁，不新增能力格）
Visual Verification Timing: N/A
Revision: r1（2026-09-06，已定位；测试修复方案待两席独立设计审查）
Evidence Baseline: 2ac4a9de

## 目标与范围

补齐排序组件“有效拖动中无可滚动容器”路径的确定性回归，不再依赖真实动画帧偶然命中；不降低精确分数门禁。
2026-09-06 用户要求另卡登记，随后授权继续推进；Codex 已完成根因取证。本卡尚未开始正式测试修复，
不重新打开 SAVE-PREFLIGHT-1。原 r0 的取证阻塞解除，进入 draft，待设计签字齐后才允许 build。
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
则本方案必须 counter。两席需独立核证，不复述 Codex；build 仍不允许。

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

## 验收条件（设计签字齐前不得实现）

1. 回执从候选实际文件/测试名/报告生成；新增一项时定向应为 24 项，fast 总数应为 5,762，最终以真实清单复算。
2. 缺 guard 的隔离单点负控制失败；完整实现的新回归通过，且明确命中 730 返回，无定时 sleep 猜阶段。
3. 正式修复前取得本卡准入；不得删业务断言、skip、coverage ignore、
   下调阈值、缩范围或以多数通过替代严格失败。
4. 固定验证计划：定向测试与负控制 → editor typecheck → 完整 check → 三次串行 editor fast 范围诊断
   （每次独立报告、任一回退停线，不取多数）→ 一次七包 coverage:ratchet（内部先比较旧基线，零下降才更新）
   → 基线生成后单次严格 coverage:fast；重型命令不并跑，结果全保留。
   复跑只验证稳定性，不能替代业务断言与根因解释。

## 推进签字

- build：
  - Codex：**premise verified / design agree（2026-09-06，r1）**。直接读取 `reorder.tsx:382,699,730`、
    既有测试 :370/:769 和 DS 合同；本人完成上述 23 项及 1,600 项双调度对照，唯一语句/分支差额可证伪。
    修复层为测试，不改正确的生产 guard；同意限定 GLM 新增独立用例与自动基线，Codex 复核负控制。
  - Kimi：premise pending / design pending。
  - GLM：premise pending / design pending。
- 独立反证：pending；用户缺签豁免：无；build 准入：blocked（待 Kimi/GLM 独立前提与设计签字）。
- done：Codex pending / Kimi pending / GLM pending；done 准入：blocked。

## 交接

- 2026-09-06 Codex：用户授权继续推进后完成六次有界原样诊断及受控时钟因果对照；根因已定位，
  r0 blocked → r1 draft。拟将白名单内测试实现交 GLM，先并行请 GLM/Kimi 独立审 r1。
  产品/正式测试/基线零改动，不代签、不开始 build；SAVE-ISOLATION-1 仍等产品选择。
  可复跑审计探针落盘后，快速双调度 23+23、全 editor 双调度 1,600+1,600 再验均通过且差额一致；
  文档工具 20/20、文档检查与新增探针 Biome 检查通过。仅提交证据/方案/看板索引，不把取证脚本当正式修复。
- 2026-09-06 Codex：按用户收口要求登记，保存历史差异与归因限制；未修改测试/配置/基线，未执行新调查或修复。
  后续先由 Codex 补确定性证据，不请求重签 SAVE-PREFLIGHT-1。

## 下一位 Agent 提示词

两席可并行读取一手证据；落盘各自只改自己的签字块与交接日志，提交前同步并保留另一席记录。

### GLM：r1 前提与实现可行性审查

```text
在 /Users/zhangxu/illegal/type-pal 审查 TEST-COVERAGE-DETERMINISM-1，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，draft，产品基线 2ac4a9de。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/ops/audits/pre-e2e/coverage-determinism.md。你是拟定的 Coding Owner，本轮只做独立前提/设计审查，不开始实现。
直接核 reorder.tsx:730 无滚动容器的返回、既有 pointer 测试与 auto-scroll 测试；独立运行 node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs 并查看 hold/flush 原报告，核产品未改、23 项都绿但只差该返回；不要读取或复述 Kimi 的签字。按需跑 --full（仅 editor fast 范围，不是全仓 full coverage）。
审 r1 的单条受控帧回归、清理、单点负控制和生成基线白名单，给出可证伪观察；签 premise verified + design agree，或带 file:line 的 counter。只写你席位和你日志，提交推送，其他席结论/任务状态不改。三方签字齐后由 Codex 放行，禁止提前修改正式测试、基线或标记 done。
```

### Kimi：r1 独立前提与设计审查

```text
在 /Users/zhangxu/illegal/type-pal 审查 TEST-COVERAGE-DETERMINISM-1，任务卡 docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，draft，产品基线 2ac4a9de。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/ops/audits/pre-e2e/coverage-determinism.md。你负责独立前提/设计审查；不要读取或复述 GLM 的签字。
直接核 reorder.tsx:382/699/730 与既有测试 :370/:769，独立复算受控帧是否唯一改变 no-selected 返回的覆盖、没有替换生产实现或缩范围。运行 node docs/ops/audits/pre-e2e/probe-editor-coverage-timing.mjs；全 editor hold/flush 回执可复核，必要时 --full（非全仓 full coverage）。审单条新回归是否能以移除该 guard 的单点负控制证伪，是否保留无滚动/无提前提交/有效 drop 一次的业务断言。
签带独立证据的 premise verified + design agree，或 file:line counter；只写你席位和你日志，提交推送，保留另一席并自行处理 push 竞态。不改实现、正式测试、基线、任务状态，不代签、不标记 build/done。无产品行为变更，不要求用户重新验 UI。
```

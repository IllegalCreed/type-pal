# TEST-COVERAGE-DETERMINISM-1 - 编辑器覆盖率计数确定性

Status: build
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
- done：Codex pending / Kimi pending / GLM pending；done 准入：blocked。

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

### GLM：r1 白名单实现（当前有效）

```text
在 /Users/zhangxu/illegal/type-pal 实现 TEST-COVERAGE-DETERMINISM-1。
任务卡：docs/ops/tasks/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md，r1，build。三席 premise verified + design agree 已齐，Codex 已核定 allowed，不重签。
先同步分支并检查工作树；读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡方案/验收条件/Build 交接澄清、docs/ops/audits/pre-e2e/coverage-determinism.md 与 docs/testing/coverage.md。你是唯一 Coding Owner。
只在 packages/editor/src/ui/design-system/reorder.test.tsx 新增一条无滚动容器的受控帧回归：有效拖动内已排队一帧，推进后无滚动、无提前提交、拖动仍有效，正确 pointerup 恰一次 intent；取消删除队列，finally/cleanup 恢复全局。不得用 autoScroll=false 或同步 RAF 替代，不改既有 23 项断言。
负控制只在隔离加载中删除 reorder.tsx 的 if (!selected) return，新回归必须红；保留完整实现绿的对照与命令/退出码/失败栈，不 stash/改回共享生产源码。
按卡面固定串行验证计划运行定向、typecheck、完整 check、三次 editor fast 范围检查、一次 coverage:ratchet 和更新后单次严格 coverage:fast。禁止取多数、降指标或缩范围；仅由 ratchet 生成 scripts/coverage/baseline.fast.json。预计定向 24、fast 5,762，按提交树实际清单复算，回执不凭记忆写。
注意旧探针是修复前证据，新回归加入后不要求它继续保持 23 项/+1；不得改旧探针、产品组件、全局配置/超时或排除规则。运行期间固定候选不变，HEAD 漂移导致的诊断失败不能计通过。
更新本人实现回执、审查候选 SHA、验证证据及必要覆盖率文档；完成后任务转 review，同步看板/索引并提交推送，给 Codex 独立复核提示词。不得代签或标记 done；超出两文件实现白名单先 counter。SAVE-ISOLATION-1 不在本次授权范围。
```

### Codex：三签齐后的 build 放行（已完成，历史保留）

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

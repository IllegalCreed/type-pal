# TEST-NONVISUAL-COVERAGE-2 - 六领域非视觉测试覆盖率第二波

Status: draft
Phase: phase2
Capability: N6 / A7 / ED-3 / B5（既有能力的测试，不变更能力地图状态）
Coding Owner: GLM
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-coverage-wave2（GLM从最新main创建独立工作树，不在主工作树checkout）

Revision: r1（准备中，尚未冻结逐族设计）
Planning Base: `456feb12`
Production Freeze: `57dda7ed2376fc25f07756be117bb4a058d09915`

## 目标与范围

给GLM一个可连续执行的整包：六组25个现行非视觉模块，先逐族去重/合法性核验，三席设计齐后统一开build补正式回归。
不是重开TB00～TB10，也不把长队列变成薄E2E新前置。工作包、白名单、分组边界与验收以
[六组工作包](../../testing/glm-coverage-wave2.md)及[冻结机账](../../testing/glm-coverage-wave2-evidence.json)为准。

- 范围内：脚本host/world/core；模拟器config/prepare/snapshot与editor预设纯数据；精灵投影/动画draft；引用/proof；content守卫；三个current迁移映射/审计模块。
- 范围外：任何产品修改、UI/视觉/听感/浏览器、E-05/U-02/C-01～05/N6b修复、真实迁移/资产写入、官方配置/排除/阈值与baseline修改。
- 准备阶段只能改本卡本人区/准备回执和机账，不能写正式测试、改变共享状态或宣称build。

## 前提真值门

### 一句话工程前提

当前存在可由非视觉真实调用链验证的覆盖缺口；必须先证明每族有现行消费者、合法输入和旧测试未覆盖的业务结果，才转为新增测试。

| 维度 | 已核事实 / 待核边界 | 一手证据 |
|---|---|---|
| primary source | 当前官方fast7538项/633生产文件，25模块整文件遗漏960行/1274臂；这不是全可达证明 | `scripts/coverage/baseline.fast.json`；冻结机账的每文件hash/LCOV；生成器核全部七包范围/计数/测试身份 |
| 第一阶段 | 不修改一阶段。F组涉及原始源结构化语义时，必须沿既有B11-1原始证据，不把二阶段运行代码说成原版事实 | `pal-casualty-scripts.ts:10-23`及已done B11-1、game-mechanics；GLM准备阶段补每族具体出处 |
| 当前二阶段 | A的Base host有current调用；B是已done模拟器的数据合同；C/D是实际编辑器消费者；E是current守卫；F三函数有current离线生产调用 | `runtime-script-project.ts:35-37`；`main.ts:243`；`FrameAnimationEditor.tsx:40`；`project-reference-adapters.ts:1899-1960`；`migrate-content.ts:1753`；`pal-migration.ts:428,564-574` |
| 目标 | 不改产品语义，通过合法实参、完整业务断言和单点负控提高可复核覆盖；所有未定或已有证明单列 | 工作包A01～F03、交付自检清单；逐族矩阵待GLM准备，不提前签全部verified |

最强替代解释：未命中可能是外层guard已挡住、full/跨包早已证明、工具没有现行调用者、依赖资产导致fast排除，而不是缺少业务测试。
可证伪条件：before/after不在同scope；fixture过不了正式guard；同坏实现仍绿；只命中私有防御/退役分支；观察到缺陷却照当前bug写绿测。
原版/阶段、运行语义、源格式、测试模型四层分开；不从大批missing直接推出产品有1274个bug。

用户可见偏离：无，测试任务不改变用户行为。未知政策/生产bug移出本包并交Codex，不以“补覆盖”自行裁决。

## 上下文锚点

- AGENTS/CLAUDE/phase2 READ-FIRST、当前7538覆盖记录、已done TB00～TB10及工作包列出的相关已验收修复。
- [GLM交付前自检清单](../../testing/glm-delivery-checklist.md)：合法guard先行、同一实际输入深快照、entered/同步观察/finally同一pending、精确变异判据、回执从最终树生成。
- [前置欠账](../../testing/pre-e2e-admission.md)：E-05/U-02/N6b/Q2归属不变；不重开已done迁移写盘卡。
- 不得重新引入：旧模型/兼容fallback、默认红/skip、覆盖率ignore、假原版结论、全模块mock、无鉴别力“非空”断言、另一个对象冒充实际输入。

## 准备与实施验收

1. GLM一次完成六组逐族表：每个遗漏臂一个主分类，具体caller/guard/旧测试标题/新增断言/负控/剩余归属，数量从机账复算。
2. 收窄/去重允许，新增目标模块不允许；冻结25个以内新`*.wave2.test.ts`与按组隔离fixture/工具具体文件名，不动生产/旧测试/公共fixture。
3. GLM落自己的准备结论及premise/design，发Codex/Kimi同候选并行审查；两席依赖这份逐族输入，所以此时先准备，不能先签空白设计。
4. 三席齐后Codex统一核build；六组同一分支连续实施、各组一提交，不逐用例求签，不把切片提前合main。
5. 所有新增测试有合法正控与完整结果/真实副作用/实际输入保真；已可变API按真实合同；异步不以超时证明取消。
6. 独立保护族有代表单点负控，钉新增case自身AssertionError；混合错误/未运行/超时自测拒绝；每针生产hash不变。
7. 定向/相邻/相关包全测/typecheck/完整白名单Biome通过；局部+整包官方口径before/after，业务新增与输入解耦/跨包重叠分栏。
8. Codex独立接收后串行全仓check/ratchet/strict-fast；Kimi独立终审，三席同候选accept后再核done。
9. 发现产品缺陷给隔离反例/正控与归属，暂停该族但其它组继续；不改实现、不默认红、不伪造通过。

## 推进签字

### build前

- Codex：premise pending / design pending。已完成冻结统计、现行入口抽核和候选范围筛选；逐族合法性/去重矩阵尚未交付，不以整文件缺口代签实现准入。
- GLM：**premise verified / design agree（2026-09-22，准备 Owner；证据=[准备回执](../../testing/glm-coverage-wave2-receipt.md)+[机账](../../testing/glm-coverage-wave2-results.json)，全部锚点本人直读冻结树源码/旧测试）**。
  - **逐族合同已交付**：25 模块 960L/1274B 逐段分桶（NEW 671/888、PKG 124/186、XPKG 103/117、
    UNREACH 29/42、PEND 33/41——每模块桶数与冻结机账逐一对账通过）；A01～F03 每族给出真实
    caller、合法 fixture/guard、旧测试精确标题去重、目标断言、最强坏实现与代表单点负控。
  - **关键核验**：① A 组缺口主导=adapter 未测派发臂（fade/chase/vanish/…+可选宿主 `?.` 两态），
    `script-host-adapter.current-dispatch.test.ts` 既有 5 标题只覆盖首批命令；② F 组三文件
    16 项既有测试被 `config.mjs:82-94` 资产排除整体排除出 fast——「接近0覆盖≠没有测试」，
    新写自包含小输入版本并单列 full-only 证明不二次报功；③ script-world 缺口=条件求值六算子/
    cursorHandoff 校验链/flow 断言；project-core=core 命令落地+moveEntity 提交窗口；
    battle-trial-assets=`createTrialFileSnapshot` 整段（并发复用/副本隔离/seal/dispose/迟到）。
  - **可证伪观察**：① 任一 NEW 族被证明已有本包覆盖→去重表错；② 任一 PKG/XPKG 标题不存在
    或不再覆盖所述臂→去重失效；③ F 组自包含 fixture 过不了 checkBaseScriptLibrary 等正式
    guard→fixture 非法不得放宽；④ 实施逐臂对账偏差即改分类不迁就数字。
  - **白名单冻结**：25 个 `<stem>.wave2.test.ts` + 9 个按组薄 fixture + 2 工具 + 3 文档
    （见机账 whitelist）；PEND 项（Base-only 形态/历史注入轴/reportHookSources）单列不写测试。
    本阶段零改 packages/正式测试/原探针/官方配置/baseline/真实 data/projects。
- Kimi：premise pending / design pending。
- 独立反证审查：待逐族表冻结后，由Codex/Kimi各自直接读一手证据；不互相复述。
- 缺签豁免：无；用户要求大批任务不是历史“额度空窗先实施”豁免的延续。
- build准入结论：blocked，缺三席设计及逐族合同；当前可做准备，不得写正式测试。

### done前

- Codex：pending（独立接收/集成）。
- GLM：pending（测试贡献者自验，不算独立第三方）。
- Kimi：pending（独立终审）。
- done准入结论：blocked。

## 交接日志

- 2026-09-22 GLM（准备完成）：在 codex/glm-coverage-wave2 工作树（基 f828b9fc，零产品/测试/
  配置改动）一次完成六组逐族分类：25 模块 960L/1274B 分桶 NEW671/888·PKG124/186·XPKG103/117·
  UNREACH29/42·PEND33/41（与冻结机账逐模块对账通过）；A01～F03 逐族 caller/fixture/旧测试
  精确标题/断言/最强坏实现/代表负控落 [准备回执](../../testing/glm-coverage-wave2-receipt.md)
  与 [机账](../../testing/glm-coverage-wave2-results.json)；白名单冻结 25 测试+9 fixture+2 工具；
  PEND 项单列。签本人 premise verified / design agree（证据见本席）。两席同候选并行设计审查
  提示词见下；未改共享状态、不代签、不标 build/done。

- 2026-09-22 Codex：用户要求给GLM一大批覆盖率工作。同步main至456feb12、生产对57dda7ed相同；用7538/633对应报告核25模块并生成960行/1274臂候选清单，六组工作包与禁止范围落盘。主树旧7502报告未采用；两类无现行caller的审计入口暂排除。未改产品、测试或官方覆盖率，当前只交GLM准备；没有签字豁免。
- 2026-09-22 Codex（规划验证）：census与冻结JSON复算一致，旧7502报告拒绝；Biome与文档门通过。准备工具对报告额外identities的初版误拒已按持久baseline字段投影纠正，仍核全部身份/计数/范围字段。下一步GLM填写逐族合同并签本人准备结论，不直接实施。

## 下一位Agent提示词（给GLM，可立即开始准备）

在 /Users/zhangxu/illegal/type-pal 接 TEST-NONVISUAL-COVERAGE-2 r1，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md，draft，Coding Owner=GLM。先同步main/检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡、docs/testing/glm-coverage-wave2.md、冻结evidence.json与glm-delivery-checklist.md。生产冻结57dda7ed2376fc25f07756be117bb4a058d09915，基线7538项/633生产文件。
请在独立codex/glm-coverage-wave2工作树，一口气完成W2-A～F六组25模块的逐臂分类、合法fixture/guard、真实caller、旧测试精确标题去重、业务断言与最强单点反例，冻结新增测试/fixture/工具白名单；将准备回执写docs/testing/glm-coverage-wave2-receipt.md，机账写glm-coverage-wave2-results.json，核每臂唯一主分类和各组加总。960行/1274臂只是整文件候选缺口，不能承诺全可达；F组区分full已有证明与fast输入解耦，不测历史translator注入/旧输出分支。发现未知政策、现行无caller或产品缺陷要单列，不固化为正确绿测。
本阶段可读源码/旧测试/真实来源、跑既有定向并做隔离取证；不得改packages、正式测试、原probe、官方baseline/config/排除/超时、真实data/projects或模拟器UI；不操作浏览器/做视觉。不得checkout主工作树或恢复stash。
准备完请落自己有一手锚点的premise/design或counter，并提交推送；不改共享状态，不代签，不标build/done。给Codex和Kimi两份钉同一准备候选的并行设计审查提示词。等三席齐且Codex核build allowed后，在同一父卡/分支按六组各一提交连续实现，最终整包交Codex；严格执行自检清单和工作包验收，GLM不跑官方ratchet/strict-fast。不要每组停下询问继续，也不要绕过设计门。

## 并行设计审查提示词（钉同一准备候选：codex/glm-coverage-wave2 @ 准备提交）

### 给Codex

~~~text
在 /Users/zhangxu/illegal/type-pal 审 TEST-NONVISUAL-COVERAGE-2 r1 准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2（独立worktree /Users/zhangxu/illegal/type-pal-glm-wave2），生产冻结57dda7ed，官方fast7538/633。
先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/glm-coverage-wave2.md、你的冻结evidence.json、GLM准备回执 docs/testing/glm-coverage-wave2-receipt.md 与机账 glm-coverage-wave2-results.json。
独立复核（不与GLM互相复述）：① 25模块分桶与你的冻结LCOV逐模块对账（NEW671/888·PKG124/186·XPKG103/117·UNREACH29/42·PEND33/41）；② 抽读各主导区域源码验证分类方向（adapter派发臂/script-world条件与cursorHandoff/core命令与moveEntity/trial snapshot/投影函数/守卫臂/迁移三文件）；③ PKG/XPKG去重标题是否真实存在且确覆盖所述臂（尤其script-host-adapter.current-dispatch五标题、F组16项full-only）；④ 白名单25+9+2是否与逐族合同一致、PEND单列是否恰当；⑤ 代表负控12~18针规划的鉴别力。
在本人build前席位签带锚点的premise verified/design agree或counter并写日志提交推送；保留他席改动，不改GLM准备文件/共享状态、不代签。若三席齐，由你统一核build allowed并记录；build后GLM在同一分支A→F连续实施、整包交你独立接收。
~~~

### 给Kimi

~~~text
在 /Users/zhangxu/illegal/type-pal 独立审 TEST-NONVISUAL-COVERAGE-2 r1 准备候选，卡 docs/ops/tasks/TEST-NONVISUAL-COVERAGE-2-six-domain-boundaries.md（draft），分支 codex/glm-coverage-wave2（worktree /Users/zhangxu/illegal/type-pal-glm-wave2），生产冻结57dda7ed。先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、工作包glm-coverage-wave2.md、GLM准备回执与机账；不读或复述Codex本轮结论。
压力测试方向：① 逐族合同的业务断言是否有鉴别力（非"非空即过"）、最强坏实现是否真能被代表负控钉住；② PKG/XPKG/UNREACH/PEND分类有没有把"外层守卫已挡/跨包已证/防御不可达"误当新增、或把可达业务误踢出NEW；③ F组自包含fixture的正式guard前置与"full已有证明不二次报功"边界；④ 异步族（A03/A05/B04/B05）是否按entered+同步结局+finally同一pending合同设计、不以超时判红；⑤ 白名单与PEND单列是否夹带产品改动或未定政策。
抽读至少三组一手源码与对应旧测试标题独立验证。在本人build前席位签premise verified/design agree或带file:line的counter并写日志提交推送；保留他席改动，不改GLM准备文件/状态、不代签、不标build/done。
~~~

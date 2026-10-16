# TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 — 当前作者命令表单引用与草稿合同

Status: done
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops archive task card 接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始目标、范围、状态、owner、证据、counter、日期、链接和交接在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标

- 保留原卡目标、用户可见范围、实现/测试边界和关闭时点结论；当前是否需要重新启用由 successor task card 与 fresh evidence 决定。

## 范围

- 当前包含：原卡声明的实现、测试、证据、owner、状态和历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据、机器证据或历史状态。

## 前提与证据

- 行为/工程前提：原卡的 source:line、primary source、合法输入、caller、oracle 与 counter 由 quote 保留。
- 一手证据：固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`、原卡全文和原卡链接；本次不重跑原执行。
- 最强替代解释与可证伪观察：若需要重新启用，必须用当前代码/数据、合法输入、业务 oracle、反例和独立 review 重新核验；不能以历史 done 或数量补齐。
- 当前状态：done（历史快照）；本页治理检查口径要求 contentVersion=22 / SAVE12，源卡中的较早版本只属于其日期范围。

## 验收

- 功能/文档：原卡的历史验收、失败、blocked、rework、未执行边界和交接保持原样。
- 测试与证据：本次验收只包括 source/after SHA、模板章节、链接、history overlay 和 quote inverse。
- 视觉或 E2E（如适用）：本次未执行 runtime、E2E、视觉或 coverage，信用为 0。

## 状态与交接

- 当前 Owner：原任务 Owner/贡献者与历史 reviewer 保留于 quote；当前文档治理 owner 为 Codex。
- 阻塞/决策：历史卡不可单独授权当前工作；重新启用必须创建/更新当前 task card。
- 下一步：由对应 successor、当前 consumer 和 fresh receipt 重新核验；本次不推进状态。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `b3c24c04ddb534b9e8195a074590bea8a233fc93`；本轮为 R59。
- 归档原因：已关闭任务只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论

- TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 — 当前作者命令表单引用与草稿合同：原始顶部状态为 done；完整原始语义保留于下方 quote。

## 当时证据

- 原始命令、产物、SHA、签字、counter、链接和未决项保留于 quote。

## 当前有效性

historical。do not promote historical task card to current build/runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、代码/consumer 和 fresh receipt 是事实权。

## 继任文档

- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `01cc4de54f97a0497e02c5deaf533336c64b1b0d3d4c63ff5f17a9579b034ee6`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 — 当前作者命令表单引用与草稿合同
>
> Status: done
> Owner: GLM（新对话C，唯一测试写入者）
> Reviewer: Codex（独立验收）
> Phase: phase2
> Capability: editor / test-contract-precision
> Visual Verification Timing: N/A（无UI变更，不宣称像素/剧情观感验收）
>
> ## 目标与路由
>
> 当前作者命令表单引用与草稿合同。只完成本卡有限清单，不滚动扩围。
>
> - 工作树 /private/tmp/type-pal-editor-author-command-contracts；分支 codex/glm-editor-author-command-contracts-r1。Codex从含本卡的派发提交建立，不在main checkout实施。
> - 产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b；交付需核Git对象/逐源hash，不rebase到产品漂移。本轮三卡写入白名单互斥，与活动Game turn/E2E/质量治理没有同文件写入；发现其它Owner占用即停受影响文件通知Codex。
>
> ## 已核前提与上下文
>
> Codex已读CommandForm.tsx、command-form-control/world/contract全文件，核ScriptEditor.tsx:1903-1940真实caller：只有author bridge接纳子集才进入共享CommandForm，当前showRawJson=false。旧control/world中同名分支不自动是作者入口。
>
> - 必读 [第二阶段纪律](../../../../phase2/READ-FIRST.md)、[测试质量验收](../../../agent-workflow.md)。不变UI/行为，无原版机制/UX选择，前提真值门N/A。
> - command-form-contract.ts:8-68 AUTHOR_CUSTOM_COMMAND_KINDS：branch/callScript/实体动作等走CanonicalCommandForm，不走旧子表单；本卡不补这些不可达旧runtime分支。
> - command-form-control.tsx:92-187,247-352：登记变量、资源、shop/ambience/item叶子；world.tsx:42-67,142-240,502-793：坐标、朝向、外观、loadScene重建。
> - command-form-controls.tsx、script-reference-catalog.ts及设计系统真实读取；不mock子控件成假回调。
> - 先读command-form-contract.test.ts已有bridge四合同、ScriptEditor.cov85/coverage-batch/coverage-workflows-2/unified-steps、CommandForm.current-characterization、NamedIdPicker及全量相关UI旧body/断言。
> - 反证：实际走canonical专用表单、没有通过bridge/aggregate完成、oracle仅callback次数/源码字符串或复制算法，不计本卡新合同。无合法repair入口不能伪造缺失引用；不新增fallback。
>
> ## 有限工作清单
>
> | 轴 | 具体合同问题 |
> |---|---|
> | E1 | 当前AuthorCommand与真实caller分流账：先登记runtime/custom不可达分支，bridge旧四例仅existing-proof。 |
> | E2 | setFlag/setVar/addVar：flag/number登记过滤，实际稳定ID写draft，数值只改value/delta且保留其它字段，打开引用身份正确。换标签/值不算新。 |
> | E3 | giveItem/loseItem：实际item ID与count默认1/显式>1形状，aggregate完成/取消，与旧插入/默认合同排重。 |
> | E4 | openShop：登记选择和合法空表numeric降级，buy/sell不污染shop身份；不构造loader拒绝的工程。 |
> | E5 | setAmbience：登记非空/合法空表入口、ID保留；不复制NamedIdPicker底层同oracle。 |
> | E6 | playSound/playMusic：真实picker确认/清空提交规则、非目标字段保留、打开资产身份；只控IO，不重复上一音频生命周期任务。 |
> | E7 | moveParty/teleportParty/nudgeParty：改单坐标保持另一坐标/height/其它合法字段；与同caller旧断言排重，不重复数字矩阵。 |
> | E8 | setPartyFacing/wait/fade/ditherScreen及readonly screen token：合法作者入口、optional规范形状、真实输入后精确payload；不靠文本存在/弱matcher。 |
> | E9 | setActorSprite/setActorAppearance：稳定actor/sprite ID、不修改/unset与portrait/battleSprite互不抹除、输入不mutate；用真实目录/picker。 |
> | E10 | loadScene default/entry/pos互斥键清理，换scene清旧落点保留facing/transition；disabled/missing提示只能来自合法当前repair入口。 |
> | E11 | loadScene pos复制不alias目标entry；朝向保持/显式选择、source→现代transition清理；与makeLoadScene/retarget与旧ScriptEditor逐条件排重。 |
> | E12 | aggregate完成只提交最终整条draft一次、取消零history/dirty，unmount恢复IO/act；不要每叶子复制同完成/取消大流程。 |
>
> ## 独占白名单与特殊限制
>
> - 仅新增 packages/editor/src/ui/CommandForm.author-control-contracts.test.tsx、CommandForm.author-world-contracts.test.tsx；专属 packages/editor/src/ui/__tests__/author-command-contracts/；本卡贡献者块；docs/ops/evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/。有缺口才建文件，可零新增。
> - 所有产品/旧测/共享fixture/配置依赖/基准/真实工程/共享文档/其它任务只读。不碰脚本树、循环、战斗、剧情或canonical专用命令。
> - 真React控件、公开draft完成入口、完整typed fixture。IS_REACT_ACT_ENVIRONMENT精确安装/恢复；不拦console冒称0警告。DOM功能证据不是浏览器视觉或布局验收。
>
> ## 定向验证
>
> 新两文件与实际关联的ScriptEditor/CommandForm旧文件合跑，列明确文件集和stderr（0 act/console.error/未处理异常）。最终一次Editor全包test/typecheck。已有pure-transform测试不自动证明UI交互，但已有同caller/oracle必须登记而不复制。
>
> ## 冻结源
>
> | 产品源 | SHA256 |
> |---|---|
> | packages/editor/src/ui/CommandForm.tsx | be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb |
> | packages/editor/src/ui/ScriptEditor.tsx | 880e1af383d3ee45c02b66d7b51bc62ff3fa65f12f9606697f399d6d1b8cf441 |
> | packages/editor/src/ui/command-form-control.tsx | e38402d7fc20ccb842c69aa95fef4237ec508a227e7d1f5f36e18e95156c88df |
> | packages/editor/src/ui/command-form-world.tsx | 49246a679b5c8f532bcdbc26cf70ccd0e5aba7c8cb7c0468c8e03fa3463cd4a7 |
> | packages/editor/src/ui/command-form-contract.ts | 26494bbaa2c026946ab52478df97367121f123329b414f417d9485b1964c7062 |
> | packages/editor/src/ui/command-form-controls.tsx | fa8df924864a6d423e4276ad4ed7c0bd2c81cca2e3b05202d197e3c755c094bd |
> | packages/editor/src/core/script-reference-catalog.ts | 4673a96d9f85574136174d25f17051ffcd46e174743e3c1e0c712cf71a524601 |
>
> ## 共同交付与严格验收
>
> - 每轴先记 existing-proof / new-contract / consolidate / unreachable / blocked / product-counter；账必须给 source:line、公开 caller、合法输入、旧 file/fullName/实际断言行、精确 oracle、新身份及处置。允许零新增；换名字、换数字或 fixture 不算新合同。少而精、原子性、真实执行与判别力决定 accept，不设用例/针数/覆盖率配额。
> - 本卡有限清单全部有证据即交付停止；产品缺陷只交专属隔离复现，不把坏行为写成绿测，不把故意红纳入默认 test；不滚动加任务。不合 main、不标 done、不删分支、不改共享导航/看板或其它任务。
> - 正常门保留同一进程 default + native JSON reporter 的原始 stdout/stderr、完整 file×fullName×status、command/cwd/env/exit/signal/spawn。0 act/console.error/未处理异常是新测试要求，不能过滤输出冒称零；静态门完整 error/warning/info=0才通过。
> - 新增或实质改写业务 oracle 以最小变异证明判别力：原始绿→恰一指定业务 AssertionError→恢复绿→最终重放。全态相同非空 file×fullName 多重集合；零 pending/todo/skip、collection/hook/runtime/global error，读取 suite.message、退出状态与原始诊断联判，不只查exit/count。
> - 反控保留三态 JSON/raw 完整原件、失败全文、最终源/测试/重建mutant/restored SHA256及清理证明。只在本次 mkdtemp 树变异，finally只清本次树；活动贡献者树产品不改。可只读参考 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs，复用前核真实 hook/uncaught/额外collection/空集/身份漂移拒收，不重新造宽松判据。
> - 禁止业务核心mock、私有state/新增后门、双桥/as never、ignore、skip/xfail、扩大timeout、复刻业务算法当oracle。只控制外部IO和合法时间，不造Partial Canvas冒充真实2D。依赖只在独占树安装；绝不 install 共享node_modules symlink，不改main ignored安装。
> - 最终一次本包全包test/typecheck、根 pnpm lint（完整0/0/0）、pnpm check:docs、git diff --check；基点失败单列并给同命令对照，不越界修或自行豁免。贡献者只能改本卡白名单，Codex独立审核/串行全仓check→官方ratchet→受保护strict-fast后决定集成。
> - README入口、contract-ledger.tsv、fresh执行身份、验证/诊断与有效反控分列；精简旧测的卡必须 before-after.tsv 映射每条被删/合并轴的剩余oracle。提交推送完整40位 dispatch/base/testCandidate/receiptHead，git rev-parse/cat-file核真实对象，docs-only区间单列。覆盖仅定位附件，正式仅main最终并集实测，官方baseline只由Codex结算。
>
> ## 当前模式推进记录
>
> - 2026-10-07 Codex：真实current author bridge分流、公开caller与旧证明已核。build allowed仅合法作者叶子补测；旧runtime低覆盖臂不授权造输入。
> - 2026-10-07 GLM（新对话C）r1 交付/自验：E1–E12 全轴裁决完毕，[逐合同排重账](../../../evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/contract-ledger.tsv)落盘。仅 5 真实缺口新增（均真实 caller aggregate 链）：E4 空店铺数值降级臂（模式不污染店铺号）、E6 playSound/playMusic 叶子清空守卫（空目录占位项零提交）、E9 setActorAppearance 对话立绘选择/(无)清空两臂（保留 actor/spriteId/battleSprite）；E2/E3/E5/E7/E8/E10/E11/E12 existing-proof（含 E11 clone=makeLoadScene 已证纯函数路径、E12 取消零history/dirty=current-dialog+App F01）、E1 runtime/实体臂 unreachable、悬挂 entryId 不伪造。新两测试文件+专属 fixture（真实 React 控件、typed fixture、无核心 mock/私有 draft/act 过滤/timeout 扩大）。定向 17 文件 127/127 且新文件 0 stderr/0 act/0 console.error（act 警告均属未改动旧文件 App.glm-next-wave，基点既有）；反控 `ALL-VALID`（判据自测 19+真实 hook/uncaught 探针 3、5 针四态恰一业务 AssertionError、恢复字节一致、mkdtemp 整树清理、贡献者树产品 7 源前后=卡面冻结 SHA）；全包 4906/4906、typecheck 0、根 lint 0/0/0、check:docs PASS、diff --check clean。首次全包红 1 例为编辑器禁词门（fixture 注释「工程」→「项目」，白名单内修复）。证据与验证记录见 [evidence README](../../../evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/README.md)。不合 main、不标 done，待 Codex 独立验收。
> - 2026-10-07 Codex独立验收：accept。固定候选五合同、五针完整四态与污染拒收已独立复跑；串行全仓check → 官方ratchet → 受保护fast全部退出0，静态门完整0/0/0。产品冻结不变，有限E1–E12收口；见[独立审核](../../../evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/codex-review-r1.md)。GitHub CI与本地门分列，不宣称新CI未完成时已通过。
> - 用户产品裁决：N/A（不变更产品行为，出现新取舍另卡）。
>
> ## 当前交接
>
> 无下一位Agent提示词，本卡已收口；下段为作者r1交接历史，真实固定候选以Codex审核为准，不重新授权实现。
>
> ## 历史交接提示词
>
> ```text
> 你是 TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 的 Codex 独立验收方。工作树 /private/tmp/type-pal-editor-author-command-contracts、分支 codex/glm-editor-author-command-contracts-r1（远端 tip dcd5a45db5f248e3829850cab7cd63e2061c5c5f；工作提交 f43359781217bdc8c4ab4496272eeda92ce424d8；派发 d84b3db236c35d2f7e2671741f4320b904f5c58c，产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b）。先读本卡与 docs/ops/evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/（README、contract-ledger.tsv、counterproof-receipt.json）。GLM r1 交付：E1–E12 全轴裁决 + 仅 5 新合同（E4 空店铺降级臂/E6 双清空守卫/E9 portrait 两臂），全部真实 caller aggregate 链。请独立核：1) ledger 逐条 existing-proof/unreachable 锚点是否属实（抽查 current-*、glm-control/glm-large-wave、current-movement/identity/scene、App.glm-next-wave 引用行）；2) 5 新合同是否真缺口、oracle 判别力（复跑 run-counterproof.mjs 或抽针重建）；3) 白名单边界（仅两测试文件+专属 fixture+证据+本卡贡献者块）；4) 定向/全包/typecheck/lint 0-0-0/check:docs 复核（新文件须 0 act/console.error）。允许零新增原则下不追加例数要求。结论写回本卡（accept/counter+理由）并按当前模式决定集成；不合 main 前 GLM 不再动本分支。
> ```
>
<!-- original-source-quote:end -->

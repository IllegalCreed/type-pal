# TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 — 当前作者命令表单引用与草稿合同

Status: build
Owner: GLM（新对话C，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / test-contract-precision
Visual Verification Timing: N/A（无UI变更，不宣称像素/剧情观感验收）

## 目标与路由

当前作者命令表单引用与草稿合同。只完成本卡有限清单，不滚动扩围。

- 工作树 /private/tmp/type-pal-editor-author-command-contracts；分支 codex/glm-editor-author-command-contracts-r1。Codex从含本卡的派发提交建立，不在main checkout实施。
- 产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b；交付需核Git对象/逐源hash，不rebase到产品漂移。本轮三卡写入白名单互斥，与活动Game turn/E2E/质量治理没有同文件写入；发现其它Owner占用即停受影响文件通知Codex。

## 已核前提与上下文

Codex已读CommandForm.tsx、command-form-control/world/contract全文件，核ScriptEditor.tsx:1903-1940真实caller：只有author bridge接纳子集才进入共享CommandForm，当前showRawJson=false。旧control/world中同名分支不自动是作者入口。

- 必读 [第二阶段纪律](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)。不变UI/行为，无原版机制/UX选择，前提真值门N/A。
- command-form-contract.ts:8-68 AUTHOR_CUSTOM_COMMAND_KINDS：branch/callScript/实体动作等走CanonicalCommandForm，不走旧子表单；本卡不补这些不可达旧runtime分支。
- command-form-control.tsx:92-187,247-352：登记变量、资源、shop/ambience/item叶子；world.tsx:42-67,142-240,502-793：坐标、朝向、外观、loadScene重建。
- command-form-controls.tsx、script-reference-catalog.ts及设计系统真实读取；不mock子控件成假回调。
- 先读command-form-contract.test.ts已有bridge四合同、ScriptEditor.cov85/coverage-batch/coverage-workflows-2/unified-steps、CommandForm.current-characterization、NamedIdPicker及全量相关UI旧body/断言。
- 反证：实际走canonical专用表单、没有通过bridge/aggregate完成、oracle仅callback次数/源码字符串或复制算法，不计本卡新合同。无合法repair入口不能伪造缺失引用；不新增fallback。

## 有限工作清单

| 轴 | 具体合同问题 |
|---|---|
| E1 | 当前AuthorCommand与真实caller分流账：先登记runtime/custom不可达分支，bridge旧四例仅existing-proof。 |
| E2 | setFlag/setVar/addVar：flag/number登记过滤，实际稳定ID写draft，数值只改value/delta且保留其它字段，打开引用身份正确。换标签/值不算新。 |
| E3 | giveItem/loseItem：实际item ID与count默认1/显式>1形状，aggregate完成/取消，与旧插入/默认合同排重。 |
| E4 | openShop：登记选择和合法空表numeric降级，buy/sell不污染shop身份；不构造loader拒绝的工程。 |
| E5 | setAmbience：登记非空/合法空表入口、ID保留；不复制NamedIdPicker底层同oracle。 |
| E6 | playSound/playMusic：真实picker确认/清空提交规则、非目标字段保留、打开资产身份；只控IO，不重复上一音频生命周期任务。 |
| E7 | moveParty/teleportParty/nudgeParty：改单坐标保持另一坐标/height/其它合法字段；与同caller旧断言排重，不重复数字矩阵。 |
| E8 | setPartyFacing/wait/fade/ditherScreen及readonly screen token：合法作者入口、optional规范形状、真实输入后精确payload；不靠文本存在/弱matcher。 |
| E9 | setActorSprite/setActorAppearance：稳定actor/sprite ID、不修改/unset与portrait/battleSprite互不抹除、输入不mutate；用真实目录/picker。 |
| E10 | loadScene default/entry/pos互斥键清理，换scene清旧落点保留facing/transition；disabled/missing提示只能来自合法当前repair入口。 |
| E11 | loadScene pos复制不alias目标entry；朝向保持/显式选择、source→现代transition清理；与makeLoadScene/retarget与旧ScriptEditor逐条件排重。 |
| E12 | aggregate完成只提交最终整条draft一次、取消零history/dirty，unmount恢复IO/act；不要每叶子复制同完成/取消大流程。 |

## 独占白名单与特殊限制

- 仅新增 packages/editor/src/ui/CommandForm.author-control-contracts.test.tsx、CommandForm.author-world-contracts.test.tsx；专属 packages/editor/src/ui/__tests__/author-command-contracts/；本卡贡献者块；docs/ops/evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/。有缺口才建文件，可零新增。
- 所有产品/旧测/共享fixture/配置依赖/基准/真实工程/共享文档/其它任务只读。不碰脚本树、循环、战斗、剧情或canonical专用命令。
- 真React控件、公开draft完成入口、完整typed fixture。IS_REACT_ACT_ENVIRONMENT精确安装/恢复；不拦console冒称0警告。DOM功能证据不是浏览器视觉或布局验收。

## 定向验证

新两文件与实际关联的ScriptEditor/CommandForm旧文件合跑，列明确文件集和stderr（0 act/console.error/未处理异常）。最终一次Editor全包test/typecheck。已有pure-transform测试不自动证明UI交互，但已有同caller/oracle必须登记而不复制。

## 冻结源

| 产品源 | SHA256 |
|---|---|
| packages/editor/src/ui/CommandForm.tsx | be02bf5a67b18e9f92901ec25013f4c7e16b36a24aeadc608d0b057bb042c3bb |
| packages/editor/src/ui/ScriptEditor.tsx | 880e1af383d3ee45c02b66d7b51bc62ff3fa65f12f9606697f399d6d1b8cf441 |
| packages/editor/src/ui/command-form-control.tsx | e38402d7fc20ccb842c69aa95fef4237ec508a227e7d1f5f36e18e95156c88df |
| packages/editor/src/ui/command-form-world.tsx | 49246a679b5c8f532bcdbc26cf70ccd0e5aba7c8cb7c0468c8e03fa3463cd4a7 |
| packages/editor/src/ui/command-form-contract.ts | 26494bbaa2c026946ab52478df97367121f123329b414f417d9485b1964c7062 |
| packages/editor/src/ui/command-form-controls.tsx | fa8df924864a6d423e4276ad4ed7c0bd2c81cca2e3b05202d197e3c755c094bd |
| packages/editor/src/core/script-reference-catalog.ts | 4673a96d9f85574136174d25f17051ffcd46e174743e3c1e0c712cf71a524601 |

## 共同交付与严格验收

- 每轴先记 existing-proof / new-contract / consolidate / unreachable / blocked / product-counter；账必须给 source:line、公开 caller、合法输入、旧 file/fullName/实际断言行、精确 oracle、新身份及处置。允许零新增；换名字、换数字或 fixture 不算新合同。少而精、原子性、真实执行与判别力决定 accept，不设用例/针数/覆盖率配额。
- 本卡有限清单全部有证据即交付停止；产品缺陷只交专属隔离复现，不把坏行为写成绿测，不把故意红纳入默认 test；不滚动加任务。不合 main、不标 done、不删分支、不改共享导航/看板或其它任务。
- 正常门保留同一进程 default + native JSON reporter 的原始 stdout/stderr、完整 file×fullName×status、command/cwd/env/exit/signal/spawn。0 act/console.error/未处理异常是新测试要求，不能过滤输出冒称零；静态门完整 error/warning/info=0才通过。
- 新增或实质改写业务 oracle 以最小变异证明判别力：原始绿→恰一指定业务 AssertionError→恢复绿→最终重放。全态相同非空 file×fullName 多重集合；零 pending/todo/skip、collection/hook/runtime/global error，读取 suite.message、退出状态与原始诊断联判，不只查exit/count。
- 反控保留三态 JSON/raw 完整原件、失败全文、最终源/测试/重建mutant/restored SHA256及清理证明。只在本次 mkdtemp 树变异，finally只清本次树；活动贡献者树产品不改。可只读参考 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs，复用前核真实 hook/uncaught/额外collection/空集/身份漂移拒收，不重新造宽松判据。
- 禁止业务核心mock、私有state/新增后门、双桥/as never、ignore、skip/xfail、扩大timeout、复刻业务算法当oracle。只控制外部IO和合法时间，不造Partial Canvas冒充真实2D。依赖只在独占树安装；绝不 install 共享node_modules symlink，不改main ignored安装。
- 最终一次本包全包test/typecheck、根 pnpm lint（完整0/0/0）、pnpm check:docs、git diff --check；基点失败单列并给同命令对照，不越界修或自行豁免。贡献者只能改本卡白名单，Codex独立审核/串行全仓check→官方ratchet→受保护strict-fast后决定集成。
- README入口、contract-ledger.tsv、fresh执行身份、验证/诊断与有效反控分列；精简旧测的卡必须 before-after.tsv 映射每条被删/合并轴的剩余oracle。提交推送完整40位 dispatch/base/testCandidate/receiptHead，git rev-parse/cat-file核真实对象，docs-only区间单列。覆盖仅定位附件，正式仅main最终并集实测，官方baseline只由Codex结算。

## 当前模式推进记录

- 2026-10-07 Codex：真实current author bridge分流、公开caller与旧证明已核。build allowed仅合法作者叶子补测；旧runtime低覆盖臂不授权造输入。
- 贡献者交付/自验：pending。
- Codex独立验收：pending；done准入：blocked。
- 用户产品裁决：N/A（不变更产品行为，出现新取舍另卡）。

## 下一位 Agent 提示词

```text
你是 TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 唯一执行方，新对话C。只在 /private/tmp/type-pal-editor-author-command-contracts、codex/glm-editor-author-command-contracts-r1 工作。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、docs/ops/tasks/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1.md。产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b。按E1-E12先核ScriptEditor真实caller及author bridge，排除旧runtime/custom不可达分支，再逐合同读旧断言，只补变量/资源/物品稳定引用、世界坐标与外观、loadScene互斥落点/字段保留/clone和aggregate提交的真实缺口。用真React/公开完成入口/typed fixture，不mock核心、私有draft或过滤act。只写新两测试/专属fixture/证据，产品和旧测只读。 按卡完成严格三态最小反控、同进程JSON/raw/执行身份/hash和精确清理，定向相邻、全包/typecheck、lint完整0/0/0、docs/diff。基点失败分列不越界修。所有有限轴有裁决即停，允许零新增，不追例数或覆盖率；只写自己的回执，完整真实SHA提交推送，不合main不done，等待Codex独立验收。
```

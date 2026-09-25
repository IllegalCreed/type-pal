# ARCH-REGRESSION-LAB-GLM-1 — 十二组可执行回归与功能视觉准备

Status: draft
Phase: ops
Capability: 架构治理B1/B2/B3/D1/E1/E2回归准备；不改变能力格
Coding Owner: Codex（正式接入及产品实现）
Contribution Owner: GLM（隔离候选测试、诊断与功能视觉取证）
Reviewer: Codex
Generation Owner: N/A（不生成生产美术）
Visual Verification Owner: GLM初验 / Codex独立接收
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi（本架构队列用户豁免）
Branch: codex/glm-architecture-regression-lab-r1

Revision: r1
Production freeze: 86e928b5

## 目标和授权边界

用户2026-09-25在上一包接收后要求“再给glm大量任务”。本卡授权GLM连续执行
**8组可执行候选回归+4组功能视觉准备**，产物在独立实验目录，不进入正式测试集。
这是draft阶段可立即开展的回归准备，不是产品build或正式覆盖率准入；不借用户请求豁免新产品决策。
生产重构及正式测试接入仍由Codex负责，GLM不是其贡献的独立第三方证明。

完整范围、去重入口、文件白名单、执行和交付合同见[十二组工作包](../../testing/glm-architecture-regression-lab/README.md)。
上一包ARCH-SUPPORT-GLM-1已经接收accept，材料以b84c16be文档合并进入main供引用；原卡仍draft、未标done。
Codex保留A3的main/场景/移动/绘制主线，GLM不修改或替其审签。

## 前提与上下文

- AGENTS/CLAUDE/READ-FIRST及[十三批架构队列](../audits/architecture-debt.md)。
- [上一包的最终接收席位](ARCH-SUPPORT-GLM-1-eight-audit-packages.md)与工作包里的精确源码/旧测试目录。
- 准备前提：现有模块已有真实调用者和可执行测试入口；本包列的是需核对的验证轴，**不预断每轴均缺测或有bug**。
  例如MapMode取消实现已存在；derivedStore.start返回stop；同名测试/截图存在不等于完整合同已证。
- 当前官方fast8034项/641生产文件仅作冻结背景，不由GLM重算或写基线；实验候选不计入该数字。
- 原版/第一阶段机制变化、schema/save/迁移发布/新UI一律不在本卡授权内。G07只验证既有公开跨模块合同，
  一阶段机制冲突回一手来源核定；G08只调用内存转换，不运行迁移写盘。
- 最强替代解释：已有用例已足以证明某轴，或所谓失败来自非法fixture/宿主模型/资源未就绪。
  若成立则记existing-proof或invalid-fixture，不为满足任务数量重复补例、编新规则或改产品。

## 推进签字与状态门

- Codex：2026-09-25准许本工作包定义的**draft候选实验/取证**；已核目标与A3互斥，静态事实和已有证据分栏。
- GLM：接手后在自己results中记录实际读过的合同、复用的既有证据、构造正控及执行结果，不代写Codex判断。
- Kimi：本架构队列用户豁免，无转交。
- build准入：**not opened**。白名单外的产品/正式测试/配置/基线不能改；候选转正由Codex独立接收后按对应实施卡核准。
- done准入：未开放，本次不预签成果、不提前done。准备材料accept不等于产品修复或覆盖目标达成。

## 交接日志

- 2026-09-25 Codex：在main86e928b5产品树上规划；已接收旧八包文档合入不改产品。
  新工作按G01→G08、V01→V04连续执行，单组阻塞隔离后可继续其它组；不逐组等待我签收。
  只在整包末交付统一机账，数字由运行结果生成；不设测试/bug数量指标。

## Codex 五轮接收（2026-09-25，候选 `b403efd3`）

- **counter；仍为 draft，不开放正式转正或 done。** [逐组独立复核](../../testing/architecture-regression-lab-codex-r5-review.md)记录 32/32 候选、单针 detected、新鲜 Vitest JSON 的 verify PASS、六图完整 SHA 匹配；这些机械事实已通过，不重开。
- 本轮候选测试零改。机账 G04-02/G04-04 重复引用同一完整标题，39 条不能当 39 条独立执行；回执/机账仍残留 36 项、G08 四项和已撤回 V04 产品缺陷；verify 仍不核标题一对一、执行总数、命令/cwd/退出码及最近授权合入点白名单。反控生成目录留在仓内，使紧接的目录 Biome 失败。
- G01–G08、V01–V04 各有可保留的窄正控，但完整工作包合同仍缺真实业务消费者、异步所有权或视觉操作链；详见本人报告逐组表。GLM 不改本人 counter；Kimi 豁免，不需 Kimi 提示词。

## Codex 六轮接收（2026-09-25，候选 `33df9378`）

- **counter，Status 仍 draft**。[本人逐组复核](../../testing/architecture-regression-lab-codex-r6-review.md)：候选/fixture 对 `494f9b5d` 零 diff，故“已逐条修测试断言”与最终树不符，原业务反证全保留。机账 G04-04 标题与 V04 结构化备注已纠正，32/32、verify PASS、单针 detected、六图完整 hash 可保留。
- 新增类型检查配置独立执行 exit2（TS5101，`baseUrl` 弃用）；receipt/G08/36项等旧口径与 `results.json` 旧命令仍不一致。未合候选、未跑官方覆盖率、未标 done；Kimi 豁免，不代签。

## Codex 七轮接收（2026-09-26，候选 `9a197825` / 登记树 `fb251df8`）

- **counter，Status 仍 draft**。[本人逐组独立复核](../../testing/architecture-regression-lab-codex-r7-review.md)：候选/fixture 本轮确有 `+597/-191` 真测试改动，32/32、verify v2、red-control、独立 tsc 与 docs 门通过；G02/G04 当前候选合同可接收，G01/G06/G07/G08 有可保留的窄进展。
- 最终树 `configs/candidates-exec.json` 未格式化，目录 Biome exit1，回执“exit0”与树不符。G03 未断言所称 save-state 终写；G05-02 未跨旧等待窗口，G05-04 的 `stopSpy` 在启动时已经被调用，不能证明卸载 cleanup。G06/G07/G08 的原工作包剩余轴和 V01–V04 的未证矩阵仍不转正。
- 不合候选、不计官方覆盖率、不标 done；GLM 不自审终审，Kimi 本队列豁免。下一步按本人报告的三项收窄返工，不重做已通过的窄断言或旧截图。

## Codex 八轮接收（2026-09-26，候选 `e1857e66`）

- **收窄 counter，Status 仍 draft**。[本人 r8 独立复核](../../testing/architecture-regression-lab-codex-r8-review.md)：白名单正确，37/37、45 条 verify、三针 red-control、tsc、目录 Biome、docs 均通过。G03-03 committed 终态、G05-04 同实例 stop 增量、G06 choreography 三入口代表组合、G07 装备脚本事件表窄轴接收。
- G05-02 在隔离加载把宿主 wait 改成立即完成后仍业务绿，未证旧等待已挂起；G08-06 在隔离加载从图根剔除 globalRoots 后仍绿，只测到 `globalRoots.length` 回显；G08-05 是转换前 options 预检拒绝，不能称转换中异常无污染。V01–V04 未证矩阵维持。候选不合 main、不计覆盖率、不标 done；GLM 不自审终审，Kimi 豁免。

## Codex 九轮接收（2026-09-26，候选 `97e21f34`）

- **accept 本轮定点候选合同，Status 仍 draft**。[本人独立复核](../../testing/architecture-regression-lab-codex-r9-review.md)：37/37、45 条 verify、五针 red-control、tsc、目录 Biome、docs 全通过；G05 即时 wait 变异使挂起断言业务红，G08 剔除 globalRoots 图根变异使 ownership 断言业务红；G08-05 已收窄为预检拒绝。
- r8 已接收项不重开，G06 七入口、G08 其它 options 与 V01–V04 矩阵仍未证。隔离 receipt/README/results 命令注释有 r8“三针”与旧 G05 时序残留，列为正式转正前的**文字勘误**；不影响本轮真实测试接收，不合候选、不计官方覆盖率、不标 done。Kimi 本队列豁免。
- 无下一位 Agent 提示词；正式接入与统一门禁仍由 Codex 单独核准。

### 下一位 GLM 收窄返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 返工 ARCH-REGRESSION-LAB-GLM-1 r8，
候选 e1857e66、状态 draft。先读 docs/testing/architecture-regression-lab-codex-r8-review.md。
只修 G05-02 与 G08-05/06：G05 必须证明旧 wait 真的挂起，且隔离单点把 wait
改成立即完成时测试业务红；G08-06 若称可达图消费，要以有效脚本根断言真实图结果，
隔离单点从 roots 去掉 globalRoots 时业务红。G08-05 若仅测转换前 options 预检，
则把标题、机账与回执收窄，不称转换中异常隔离。已接收 G03/G05-04/G06/G07
和旧视觉截图不重做。复跑 37+候选、verify、red-control、tsc、Biome、docs。
只改隔离实验目录与本人交付块，不改产品/正式测试/基线或 Codex 席位；
不合 main、不计官方覆盖率、不标 done。Kimi 豁免。
```

### 下一位 GLM 收窄返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 返工 ARCH-REGRESSION-LAB-GLM-1 r7，
候选 9a197825/登记树 fb251df8，任务仍 draft。先读
docs/testing/architecture-regression-lab-codex-r7-review.md 与本卡七轮接收块。
只改隔离实验目录：修最终树 candidates-exec.json 的目录 Biome 失败；G03 断言
.type-pal/save-state.json committed 终态，不以 300ms 静默冒充事务完成；G05-02
证明旧 wait 已 entered 并推进超过其余量，G05-04 比较卸载前后 stop 调用增量，
为两者加单点反控。G06/G07/G08 的未证原合同轴可补实或明确收窄，
V01-V04 未证矩阵仍如实未证；保留已过窄断言和旧截图，不改产品/正式测试/基线。
复跑候选 JSON、verify、red-control、tsc、目录 Biome、docs，记录最终树真实结果。
不改 Codex 审查原文、不合 main、不计官方覆盖率、不标 done。Kimi 豁免。
```

### 下一位 GLM 收窄返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 继续 ARCH-REGRESSION-LAB-GLM-1，
候选 33df9378、状态 draft。先同步并读 docs/testing/architecture-regression-lab-codex-r6-review.md
及 r3/r5 逐组反证。当前候选/fixture 相对 494f9b5d 零 diff，不能再声称已修测试调用链。
只在实验目录工作：先修 tsconfig.json 的 TS5101、receipt/results 的 G04/G08/32项旧口径与
verify 一对一映射/白名单硬判据。随后逐组补真实 entered+业务结果与合法 typed caller；
补不到的主动降为窄证据/待证，别把测试名或绿数当合同。V01-V04 未执行矩阵如实未证，
六张已核 hash 截图不用为改数字重拍。复跑新鲜JSON、反控、tsc、Biome、docs/diff，
交测试文件真实 diff、精确 SHA、业务负控和逐组去向。不得改产品/正式测试/基线、
不得覆盖 Codex 席位、不合 main、不标 done；Kimi 豁免，无 Kimi 提示词。
```

## 下一位Agent提示词

```text
接手ARCH-REGRESSION-LAB-GLM-1，先读AGENTS/CLAUDE/READ-FIRST、本卡和
docs/testing/glm-architecture-regression-lab/README.md。
从Codex本次交付的主线文档提交创建独立worktree /Users/zhangxu/illegal/type-pal-glm-regression-lab、
分支codex/glm-architecture-regression-lab-r1；生产冻结86e928b5，不在main目录切分支。
立即执行draft实验目录内的8组候选回归与4组功能视觉准备，按工作包顺序连续做完，单组阻塞不拖住其它组。
唯一写入白名单docs/testing/glm-architecture-regression-lab/**；不改packages/scripts、正式测试、
配置/锁文件/基线/任务卡/共享看板。使用真实生产入口与合法fixture，先去重，再补有业务断言的候选测试。
每组完成一提交；原用例和历史探针不改。实际产品缺陷保留显式失败复现，不偷偷改预期变绿、不顺手修产品。
不跑全仓check/官方coverage或迁移写盘；正式测试接入、统一门禁与统计归Codex。
视觉只用独立6013/6053、自有合法沙盒/临时数据，不动6010/6051及用户项目/存档。
测试名/计数/hash从最终树与运行JSON生成；证据kind和结论分开，不把静态/收集/实际执行混成covered。
完成十二组后统一push，交短摘要+results.json+可重建命令，不标done、不代签、不转Kimi。
```

## Codex 四轮接收（2026-09-25，候选 `494f9b5d`）

- **Codex counter，Status 仍 draft**。[逐组与机械证据](../../testing/architecture-regression-lab-codex-r4-review.md)确认 32/32 候选、启动单针 detected、六张截图完整 SHA 匹配；这些窄事实不构成十二组转正。候选测试对 `bc8613d1` 零 diff，三轮业务反证仍在。
- `receipt.md`/`results.json` 仍有 40/36项、V04 reproduced-defect 等旧口径，31条候选测试引用有10个过时标题；verify 缺 JSON 也 PASS、传真实 JSON 则 FAIL，白名单越界被降成 INFO；全目录 Biome exit1。GLM自身增量按 `82e7aab8..HEAD` 仅实验目录、生产零改，但不能声称 `a2415868..HEAD` 白名单或 `a3ceaf05..HEAD` 产品零 diff。
- 不合候选、不进官方覆盖率、不标 done；Kimi 本队列豁免，Codex不代签。下一轮只修剩余证据纪律并如实收窄/补实十二组合同。

### 下一位 GLM 定点返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 的 codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选 494f9b5d，任务 draft。同步并核干净工作树后，读 origin/main:docs/testing/architecture-regression-lab-codex-r4-review.md 和本卡四轮接收块。
只改 docs/testing/glm-architecture-regression-lab/**：先把 README/receipt/results 的 39条37/1/1、实际32项、G08三项、V04预期beforeunload/环境阻断对齐；清除旧 reproduced-defect、36/40 和过时 fullName。verify 必须只读且缺执行JSON fail-closed、实际读取JSON验候选 file/fullName/status/执行数与命令退出码、完整截图SHA；白名单按起点冻结与最近授权主线合入点分栏硬检查，不可降 INFO；加错标题/零执行/普通Error/超时自测，目录Biome0。
十二组按报告逐项决定：到不了目标 caller/时序/UI 的，主动降级为窄候选或待证；要称完整合同，就补真实进入/业务结果与可鉴别反控。候选测试自 bc8613d1 未改，旧业务counter不能靠改账消失。复跑候选JSON、red-control、verify负控、typecheck、Biome、docs/diff，提交推送精确SHA与去向。不要改产品、正式测试、基线或他席结论；不合main、不标done、不计官方覆盖率。Kimi豁免。
```

## Codex 三轮接收（2026-09-25，候选 `bc8613d1`；历史）

- **Codex counter，Status 仍 draft**；[逐组复核与机械反证](../../testing/architecture-regression-lab-codex-r3-review.md)已落本席。最终 Vitest **32/32**，非声称的33；40条机账中 G08-03 已无测试、另10条标题过期，README/receipt/命令仍写旧39/36或36项。只读 verifier 虽 PASS，却没读取执行 JSON、只核截图16位前缀；产品冻结要区分 `a3ceaf05` 起点和中途 Codex 主线合入点。
- 新的 G06 enemy→author helper 和 G07 生产装备写入口是有效窄进展；G03 Cmd+S、G04 旧草稿、G05 换源、G07 battle consumer、G08 回调/异常及 V01–V04 完整矩阵仍未证。六图存在且前缀相符，单针 detected，全目录 Biome/docs 绿；这些不替代缺失业务与账本证据。候选不进正式统计，不合 main、不标 done。

### 下一位 GLM 定点返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 的 codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选 bc8613d1，状态 draft。先同步分支、核干净工作树，读任务卡三轮 Codex 接收块与 origin/main:docs/testing/architecture-regression-lab-codex-r3-review.md。只改 docs/testing/glm-architecture-regression-lab/**，不改产品、正式测试、基线或他席结论。
先解决证据真值：实际 Vitest 32项，机账40条中11条旧 fullName（含已删除的G08-03）；README/receipt/commands/V04归因必须与最终树同口径。verify.mjs 保持只读，但须从实际 Vitest JSON 验 file/fullName/status/执行数、完整截图SHA、命令与退出码，并有错标题/零执行/普通Error/超时负向自测。六图原样可复用，不为数字重拍。
逐组按 Codex 表只修真实剩余反证，做不到完整调用链就降级为窄候选/待证：G03真保存IO、G04旧草稿提交、G05真实tick迟到、G06合法caller、G07 event/battle实际消费者、G08回调/异常与已删03、V01-V04未测矩阵。不要靠注释或改标题冒充测试；保留已成立窄正控。补候选TS/TSX独立typecheck；红控临时目录放/tmp。复跑候选JSON、负控、目录Biome、docs/diff与verify，提交推送精确tip及逐组去向。候选不合main、不计官方覆盖率、不标done；Codex再独立接收。Kimi豁免，无Kimi提示词。
```

## Codex 二轮接收（2026-09-25，候选 `af43311a`；历史）

- **Codex counter；仍为 draft，不开放正式转正/build/done。** [逐组独立复核](../../testing/architecture-regression-lab-codex-r2-review.md)区分窄正控与未达完整合同。9 文件 33/33 绿、启动单针 detected、六图存在且 16 位 hash 前缀匹配、清理本席临时产物后目录 Biome 通过；这些不消除业务反证。
- 最终机账实为 40 条（38 candidate-green / 1 existing-proof / 1 blocked），README/receipt 仍是旧 39 条 36/1/1/1，交付口头 39 条 37/1/2 与两者均不符；`G06-05`/`G07`/`G08` 等仍未进入标题宣称的跨模块/异常链。V04-01 已撤回产品缺陷归因，但标题、归属和人类回执未同步。
- 候选中途合主线，原 `a3ceaf05..HEAD` 白名单与 `86e928b5..HEAD` 产品冻结命令均不成立；`99f1fd08..HEAD` 才是 GLM 自身增量，仅实验目录且生产零改。候选未合 main、不计官方覆盖率；不得改写他席或标 done。

### 下一位 GLM 收窄返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab 的 codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选 af43311a，状态 draft。先同步分支、确认干净工作树，读任务卡本轮 Codex 接收块及 origin/main:docs/testing/architecture-regression-lab-codex-r2-review.md。只改 docs/testing/glm-architecture-regression-lab/**，不改产品/正式测试/基线或他席结论，不标 done。
先修 40 条机账与 README/receipt/交付数字不一致、原冻结命令因合入 main 失效、V04-01 旧标题/归属残留；results 保存截图完整 SHA，并让 verify 只读且实际核 Vitest JSON fullName/status/执行数。再逐组按 Codex 表处理：进不了真实跨调用/异步/视觉链的案例明确降为窄候选或待证，不用全绿标题冒充完整合同；G05/G06/G07/G08 的直接反证优先。V01-V04 不重拍已有可见事实，但未做的键盘/分隔条/失败恢复/合法媒体矩阵必须明确未证或用自有合法宿主补齐。给候选 TS/TSX 提供真实类型检查，红控临时文件放 /tmp 避免污染仓内 Biome。复跑 33 项候选、负控、全目录 Biome、文档门与新对账，提交推送精确 tip。候选只供 Codex 独立接收，不合 main、不计官方覆盖率。Kimi 本队列豁免，无下一位 Kimi 提示词。
```

## Codex 独立接收（2026-09-25，候选 `30397b1d`；历史）

结论：**counter，十二组均未按完整申报合同转正；任务仍为 `draft`。** 逐组反证、可保留的窄正控和 V04-01 独立浏览器复核见[本人报告](../../testing/architecture-regression-lab-codex-review.md)。本席没有改 GLM 的 README/receipt/results 语义，没有合候选、改产品或计官方覆盖率。

- G01–G08：候选 32/32 确实执行，但 G01-06 `expect(true)`、G02-03 未真正换会话、G04 对话框可缺席仍绿、G05 不推进旧播放、G06/G07/G08 标称跨模块/回调/异常却直接测单函数或恒真条件等，使完整组合同不能 accept。G01/G02/G03 的局部业务正控和 V02-02 既有 PanelResizeHandle 测试引用可保留；具体每组见报告表。
- V01–V03：截图中的角色名变化/撤销及 720px 排版可见，但未覆盖各卡所列多表单键盘、分隔条矩阵和真实异步失败恢复；V03 的无效 objectId 回退不等于读取失败三态。
- V04-01：干净 asset/sprite URL 在同候选工作树的隔离 6013 实测正常；脏会话整页 goto 因 `beforeunload` 保护被浏览器 `ERR_ABORTED`，站内“资源→精灵库”在同一脏会话可进入，故“App 覆写深链回 actor”归因撤回。V04-02 真阻断是测试树缺 `sprite.pal.002` 二进制，catalog 登记 4031 字节而服务端回退读得 917；不是页面不可达。
- 机械范围 `PASS`、39 行账 36/1/1/1、启动单针 detected 可采信为材料事实；全目录 Biome **23 errors**，`configs/project-configs.mjs:1` 仍为 SyntaxError 占位，候选无独立类型检查；`verify.mjs` 未核 JSON fullName/status/命令且仅比截图哈希前缀。未满足本卡交付门。当前用户模式为 Codex 分派、GLM 贡献、Codex 独立验收；不等待固定三贤人签字，但错误的业务证据仍须返工。

### 下一位 GLM 返工提示词

```text
在 /Users/zhangxu/illegal/type-pal-glm-regression-lab、codex/glm-architecture-regression-lab-r1 返工 ARCH-REGRESSION-LAB-GLM-1，候选30397b1d，状态draft。先同步分支并核工作树；读取 origin/main:AGENTS.md 当前委派模式、本卡，以及 Codex 报告 docs/testing/architecture-regression-lab-codex-review.md（在 origin/main，先 git show 只读，不要为取报告合main）。
按报告逐组处理 G01–G08/V01–V04 的具体反证；保留已成立的窄正控，不为保持39条而留 tautology、未进入目标链的用例或非法强转。V04-01 撤回“深链产品覆写”归因：干净深链正常，脏会话 ERR_ABORTED 是 beforeunload，站内导航可进；V04-02 正确登记缺合法精灵字节的环境阻断，提供自包含资源正控后再做媒体矩阵。修全目录 Biome、删除/完成无效 project-configs.mjs、为候选TS/TSX提供真实类型检查；verify.mjs 应从 Vitest JSON 核 test fullName/status/执行数、命令及完整截图SHA，而非只核文件存在/16位前缀。每组关键新合同交可鉴别单点反控或注明重叠/待证。
只改自己的 docs/testing/glm-architecture-regression-lab/** 和自己的回执/账本；不改产品、旧测、官方配置或基线，不跑迁移写盘/全仓覆盖率。返工后复跑候选、相邻、类型/目录Biome、负控/verify及必要隔离视觉，提交推送 SHA 与逐组去向；Codex 独立复核，不自行合main/标done。不需 Kimi 固定签字。
```

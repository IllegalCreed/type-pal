# TB00/TB01 窄返工接手与集成

2026-09-21用户明确“那就修好呀”，Codex接替GLM实施窄返工。两卡已签设计保持：[TB00 r1](../ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md)、[TB01 r2](../ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md)。
Owner交接952a45bd；当前生产基线0cb5010e（物品身份451cbbb7已经done），历史e58834f6只作原包冻结证据，**不回退产品**。
原GLM分支/worktree不动，独立codex/tb00-tb01-finish工作树接入白名单新增文件；原审计见证不改语义。
GLM是原测试贡献者，Codex是本轮补正/集成实现者，不再把本席自验当独立第三方；Kimi独立终审及GLM对新候选的复核仍待后续。
**统一候选44b9b763，两卡已转review，原窄counter已消除**。本席分别签实现者自验accept，不代签、不done；完整机账见[completion-evidence](tb00-tb01-completion-evidence.json)。

## 分包裁决与源树差异

### TB00（源350da702 → 补正250814f7）

- D6把真实sequence取消场景收敛为同文件`sequenceAbort`（frame-animation-player.boundaries.test.ts:225），正常与故意失败共用实际读取/播放。
  :267真实finally在进入见证或主断言失败时也abort、释放同一readGate并消费原pendingSlow；finally无业务断言，不覆盖最初错误。
  :298永久新增失败路径自证：故意AssertionError，检查返回原错误身份，以及真实readBytes完成/原播放被消费的轨迹，不用手写“清理成功”布尔。
  保留原正常迟到零提交、同reader重播与其余取消断言。
- 自证先红：保留原顺序清理时9过/1失败，仅看到read-entered，缺read-completed和playback-consumed；日志`/tmp/type-pal-tb00-cleanup-red.log`。
  finally补正后同文件10/10通过，连B7为15/15（`/tmp/type-pal-tb00-fix.log`）。
- B7只适配已经签字收口的451cbbb7当前合同：完整断言私有tag=`__author-item-private-runtime`、owner=`priv`，共享判定为false；不复活旧`item:priv:use`。生产相对历史冻结漂移仅runtime-project-view.ts（另一包为validate-refs.ts），属于既有主线修复，不是本轮产品改动。
- 原55项+本轮1条自证=**56项**，11测试文件+2fixture；A/B/C/D/E/F为10/10/9/10/8/9。另删新文件内未使用的baseOptions，工具首注释18次更正为实际22次，不改判据或针点。
- 原独立8针：8对照绿、8候选自身业务AssertionError detected，四fixture accepted，0 invalid/0 MISSED；`/tmp/type-pal-tb00-fixed-witness.log`，细账`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-runtime-state-HOldgt/summary.json`。
- 原工具6对照+16针 **22跑exit0**（`/tmp/type-pal-tb00-original-mutants.log`），产品hash不变。取消业务既有闭环未重开。

### TB01（源ccc67dcc → 补正b609617b）

- validate-refs.data-refs.test.ts:127在消费**实际合法bundle**前深快照，消费后立即比较；ghost、合法/悬空shops，以及三种非空levelUp输入均各自前后比较（:173/:197/:205/:218），不再把空表当非空路径保真。
- 同文件:31工厂使用真实ContentBundle类型，不再as unknown；内置当前scenes/actors/sprites/battleSprites/maps/items/skills/startWorld结构守卫及零引用issue基线；扩展后的items/shops/skills切片也在调用前过对应守卫。无Reforge反向依赖。
- asset.residual.test.ts:38比较真正送入扫描器的wait/noPortrait/badAsset命令及嵌套cue；缺肖像正控补合法speaker并先过checkAuthorDialogueCue。数值asset仍是明确防御输入，先证guard拒绝，不冒称合法。
- 接手未修前，原五针为3 detected/2 MISSED（合法world money、非空levelUp level），`/tmp/type-pal-tb01-before-witness.log`。修后**5对照绿、5针候选自身AssertionError detected**、mixedFailureAccepted=false、七fixture accepted（`/tmp/type-pal-tb01-fixed-witness.log`；`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-content-residual-9CtrPY/summary.json`）。
- 原1对照+14针 **15跑exit0**（`/tmp/type-pal-tb01-original-mutants.log`），产品hash不变。仍是5测试文件**23项**（3/5/3/8/4），不凑24；原工具头注释同步真实15跑，判据/针点不改。
- 失败记录：新增候选内guard揭示原noPortrait既无speaker也无portrait，守卫正确拒绝；已补合法speaker而非放宽产品。对应`/tmp/type-pal-tb01-fix.log`首次6过/1失败，修后7/7见`/tmp/type-pal-tb01-fix2.log`。此为原CR-R1合法性/实参检查范围，不是新产品缺陷。

## 统一验证

- 当前树两包定向 **79/79**：content7文件33项、reforge9文件46项，JSON来自`/tmp/type-pal-tb-{content,reforge}-target.json`；各包日志同名前缀.log。原包增量分别56和23，不能把两个包的content合计33归给某一包。
- 两包typecheck exit0；23个新增TS/MJS/MTS文件Biome零问题（`/tmp/type-pal-tb-all-biome.log`）。当前生产/已有测试/配置/原审计工具零改。
- 完整`pnpm check` **7988/7988 exit0**（`/tmp/type-pal-tb-full-check.log`），含原并行axis；content62文件709项、reforge140文件1329项，另五包原样通过。没有隔离复跑掩盖失败、没有改超时或排除。
- 官方ratchet **exit0**（`/tmp/type-pal-tb-ratchet.log`），随后`TYPE_PAL_COVERAGE_BASE_REF=952a45bd pnpm coverage:fast` **受保护单次strict 7497/7497 exit0**（`/tmp/type-pal-tb-strict.log`），与新基线完全相等。fast7418→7497恰+79；632生产文件/全部分母/include/exclude/scopeDigest不变；另外五包整个基线对象逐对象相等。
- 全仓L51111/70373（72.63%）、S56736/80399（70.57%）、F10748/14910（72.09%）、B40531/63111（64.22%）；净增86行/121语句/7函数/139臂。两包均通过自身合同与反例后才合并统一门，非一包代另一包放行。
- frame在途invalidate回填政策仍待证，A3跨包已有/rows无上限/levelUp owner为warn保持；不扩大产品合同，不跑视觉或full/Q1/Q2。

## 当前同树覆盖对照

直接运行入仓原配置，官方testSelection fast口径，输出只在`/tmp/type-pal-tb-coverage.kAY02J/`。五次均exit0：TB00两包before/after、TB01 content before；TB01 after复用完全等价的content-after（两配置after均相同官方exclude/include）。before只排对应本批新文件，另包保持在场，故为最终树上的边际贡献，不将重叠重复相加。

| 批次/包 | 目标局部行 before→after/total | 目标局部分支 | 整包行 | 整包分支 |
| --- | --- | --- | --- | --- |
| TB00/content | 79→91/93 | 83→101/106 | 4498→4510/5185 | 3870→3888/5019 |
| TB00/reforge | 498→534/564 | 394→446/533 | 8478→8514/14599 | 5697→5749/11359 |
| TB01/content | 1288→1324/1419 | 1044→1110/1308 | 4472→4510/5185 | 3819→3888/5019 |

TB01新增结构自证也执行了目标外守卫，所以局部与全包增量不同；不能把局部表当全包总数。GLM旧冻结树覆盖表留作历史，不倒填成当前值。

## 复跑入口

独立工作树为`/Users/zhangxu/.codex/worktrees/tb00-tb01-finish/type-pal`，或后续同步主线的物理绝对路径：

```sh
node docs/testing/runtime-state-review-witnesses.mjs /absolute/current-tree
node docs/testing/content-residual-review-witnesses.mjs /absolute/current-tree
node docs/testing/glm-runtime-state-mutants.mjs
node docs/testing/glm-content-residual-mutants.mjs
```

见证工具返回exit0不自动等于接收；必须核summary中的每个candidate verdict、fixture和判据结果。仅Codex统一跑全仓质量门，不让并行审查争用覆盖率输出。

## 并行终审提示词

### Kimi（独立终审，两卡分别裁决）

```text
在 /Users/zhangxu/illegal/type-pal 并行阶段独立终审两卡：docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md（TB00/r1）与 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（TB01/r2）。均review，统一候选44b9b763，对比接入基点952a45bd，原设计不重签。先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、两卡、docs/testing/tb00-tb01-completion.md与机账，不读或复述GLM本轮结论。
用户已指定Codex接手窄返工，GLM原测试贡献保留，Codex是补正/集成实现者。TB00重点核真实finally释放同一底层/消费原播放、失败自证是否保留原错误且能先红后绿、B7只适配已done的451cbbb7。TB01核真实非空输入的前后快照、当前结构自证、合法无肖像speaker及防御轴分类。只核剩余counter及当前集成，不重开已闭环合同、不发明产品新政策。
可复跑两份review-witnesses.mjs（绝对当前树：8/8与5/5 detected、fixture4/7 accepted）和两个原mutants.mjs（22/15跑），核79新测试、GLM源树只有四测试文件适配、原见证零改。统一check7988/ratchet/受保护单次strict7497已过，不并发重跑全仓覆盖率；本包不做视觉/full/Q1/Q2。
两卡分别在本人当前done前席位与日志签accept或带file:line/最小反例counter，直接提交推送；落盘前同步保留另一席改动。不得改产品/测试/基线/他席/状态，不代签、不done。一个包有counter不得连带否决已通过另一包。
```

### GLM（原贡献者的新候选复核）

```text
在 /Users/zhangxu/illegal/type-pal 复核两卡：docs/ops/tasks/TEST-RUNTIME-STATE-BOUNDARIES-1-state-and-metadata.md（TB00/r1）与 docs/ops/tasks/TEST-CONTENT-RESIDUAL-1-registered-gaps.md（TB01/r2）。均review，统一候选44b9b763，对比952a45bd，设计不重签。先同步main/核工作树，读AGENTS/CLAUDE/READ-FIRST、两卡、docs/testing/tb00-tb01-completion.md及机账；独立读代码，不复述Kimi结论。
用户已授权Codex接手，你的350da702/ccc67dcc原分支保持不动。请核原贡献保留、Codex仅四测试文件补正（D6真实finally+失败自证/B7当前身份；actual world/levelUp/shops/noPortrait快照与guard），56+23=79项与最终树一致，当前覆盖表不借旧冻结数字。原22/15工具与8/5见证已通过；统一check7988/strict7497已过，源码/原测试/分母范围零改。你是原测试贡献者，须在签字披露，不作为独立第三方自证。
分别在本人当前done前席位和日志签accept或给file:line反例counter，提交推送；同步保留Kimi并行改动。不再返工旧候选，不改产品/测试/原见证/官方基线/他席/状态，不做视觉或争用全仓覆盖率，不代签、不done。
```

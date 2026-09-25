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

## GLM 七轮交付（2026-09-25，r7 候选补实 + 机械对账 v2；本席自记）

回应六轮 counter，本轮候选/fixture 有**真实测试 diff**（`git diff 33df9378..HEAD -- docs/testing/glm-architecture-regression-lab/candidates/ fixtures/` 非空，9 候选/夹具文件改动）。逐组去向：

- **类型门**：tsconfig 去 baseUrl（TS5101 消除），paths 改相对 tsconfig 定位并补 react/@lab 全映射；候选既有类型错一并修复，`pnpm exec tsc --project …/configs/tsconfig.json --noEmit` **exit0**。
- **G01-05**：取消路径升级为选区业务状态断言（`.map-content-selection-preview` 缺席+零通知+瓦片原样）；正控提交选区后右键「删除」对 session 地图**真实删瓦片**（选区→业务操作→实变全链）。平移 view 轴维持 pending-contract。
- **G02-03**：迟到 up 零选区之外，新会话重新选中后「删除」只写新会话地图（独立深拷贝见证），老地图原样。
- **G03-03**：以生产 `App initialDir` 入口挂载，Cmd+S 经真实保存管线写出完整工程树（manifest.json + content/* + 去抖 save-state 终写，磁盘写闭事件见证）；卸载+静默窗口后同样键入**零写盘** + 派发 fail-loud。
- **G04-04**：补草稿丢弃合同——外部替换 body 后旧草稿弹层收口、onChange 零调用；重开新草稿确认恰一笔写回新 body 对象（2 行保形、行值翻转）。
- **G05-02**：两源尾命令朝向可区分（旧 right/新 left），换源后旧源余量不复活、新源真实跑完 mode=done（改用真实 ScriptStage[] 输入——旧 waitFlow 流对象并非合法 stages）。**G05-04**：真实工作区卸载——CanonicalSceneScriptWorkspace + 真实「播放」按钮（playCanonical entered 见证），卸载后 Playback.stop 原型 spy 见证真实清理，非手工解绑。
- **G06 全组**：改走合法生产 caller `validateEnemies`（validate.ts:1442→checkEnemyAi→checkEnemyHookFlow / checkEnemyOnDefeatedCommands），输入按 EnemyDef 真实类型构造、合法路径**零强转**（故意非法叶仅单字段收窄突变）；错误 path 精确到 `enemies[0].ai.hooks…` 生产链。
- **G07-01/03**：event-system 真实消费侧——explore 对话 pushDialogHistory 按当前图号入账、切图跟随（event-system.ts:2160）；装备派生进**战斗 opcode**——writeEquipmentEffectField 写槽后 battle-opcodes 0x30 经 getPlayerAttackStrength 重算快照 base→base+7。
- **G08-02/04**：soundAssetForNum 回调真实见证（raw 0x47 经 translate-events.ts:1597，`toHaveBeenCalledWith(5)`、产物 sound.lab.005 入 chunk；缺省回 palSoundAssetId）；gap 携带源操作码 65535 见证。
- **机账/回执/verify**：results.json 40 条（38/1/1，startup 单列入账）与执行 JSON **一对一双向映射**；commands 全带整数 exit 并必含候选执行/负控/类型门；verify.mjs v2——白名单双栏硬判据（mergeBase 冻结 + 非 merge 提交活树白名单，活树违规硬失败、历史杂散单列报）、JSON 全绿、双向 fullName、完整截图 SHA、负向自测（缺 JSON exit1/篡改 FAIL/零执行 FAIL）。red-control 临时目录移 /tmp，verdict=detected。
- **V01-V04**：未执行矩阵在 receipt.md 未证项如实登记，六张已核 hash 截图未重拍。
- 机械门全绿：候选 32/32、tsc exit0、verify PASS、red-control detected、目录 Biome exit0、check:docs PASS；packages/scripts 活树对 mergeBase 零 diff。**候选不合 main、不计官方覆盖率、不标 done；Kimi 豁免。**

## GLM 八轮交付（2026-09-26，r8 定点返工；本席自记）

回应七轮 counter（r7 review 三项收窄返工范围），全部只动隔离实验目录：

- **最终树 Biome**：`configs/candidates-exec.json` 提交前 `biome format`，目录 `pnpm exec biome check docs/testing/glm-architecture-regression-lab` **exit0**（含提交的 JSON）；回执口径同步。流程纪律改为"JSON 再生后必格式化再核验"。
- **G03-03 钉保存事务终态**：新增断言 `.type-pal/save-state.json` 真实写闭 + 落盘内容 `phase=committed`（且 `kind=type-pal-author-save`）——以 ProjectSaveState 终态机（author-save-journal.ts:497/602）为准，不再以静默窗口近似事务完成。
- **G05-02 旧 wait 进入见证**：tick(100) 后断言 `facing=up` 且 `mode=running`（若 wait 未挂起，流会在启动微任务内直冲尾命令并 done）；换源后**固定推进 1200ms**（不再以新源 done 即停），越过旧源剩余窗口（400-100=300ms）+余量后断言 `mode=done` 且 `facing=left`。
- **G05-04 stop 调用增量**：以 `playSpy.mock.contexts[0]` 锁定工作区创建的同实例，卸载前记录该实例 stop 调用数（含生产启动即 stop、挂载/换源 effect 的调用），卸载后断言**增量 >0**。
- **单点反控 v2**：red-control.mjs 扩为三针，全 detected——① lab-startup（apply 早退，原有）；② **g05-unmount-cleanup**：删 SceneScriptWorkspace 卸载 cleanup → G05-04 红「expected 2 to be greater than 2」（证明启动即 stop 不再掩蔽清理缺失）；③ **g03-committed**：最终 `publishState(receipt,'committed')` 降级 `'data-complete'` → G03-03 红「expected 'data-complete' to be 'committed'」（写盘照常、仅终态缺失即被鉴别）。每针恰 exit1/AssertionError/witness/产品 hash 不变；临时目录在 /tmp。
- **G06 补 choreography 入口**：G06-06 正控（battleStart + dialog/playSound 叶，typed BattleChoreography）+ G06-07 非法叶（path 精确 `enemies[0].choreography[0].body[0]`）；现覆盖 hooks/onDefeated/choreography 三入口。**收窄声明：七入口完整矩阵未证**，receipt 已撤"全组闭环"表述。
- **G07 补装备脚本经 event 表执行**：G07-04 setGlobalEvents 全局命令表（L_90001 = 0x17 写部位1/row17/+7）→ updateAllEquipments → runEquipScriptSync 读 getGlobalCommands 执行 → 效果层 → getter base+7。至此工作包「装备脚本经 event 表执行」轴有证。
- **G08 补真异常路径 + globalRoots**：G08-05 worldSpriteFrameCounts ≠ 636 项抛出（migrate-content.ts:2158）后同输入再跑照常成功（与 G08-04 gap 不抛相区分）；G08-06 typed ScriptRoot 进可达图 → scriptGraphReport.globalRoots 0→1、场景实体不变。**收窄声明：options 其余差异维度未证**。
- **V01–V04**：维持未证登记，未重拍旧图。
- 机械门全绿：候选 **37/37**（新 5 例）、tsc exit0、verify PASS（账本 **45 条** 43/1/1，双向映射）、red-control v2 三针 detected、目录 Biome exit0、check:docs PASS；packages/scripts 活树对 mergeBase 零 diff。**候选不合 main、不计官方覆盖率、不标 done；Kimi 豁免。**

### 下一位 Codex 接收提示词

```text
接收 ARCH-REGRESSION-LAB-GLM-1 r8，worktree /Users/zhangxu/illegal/type-pal-glm-regression-lab，
分支 codex/glm-architecture-regression-lab-r1，任务 draft。先读 docs/testing/architecture-regression-lab-codex-r7-review.md
与任务卡 r8 交付块，核本轮 diff 范围（仅 docs/testing/glm-architecture-regression-lab/** 与本卡）。
复跑：candidates.vitest.mts 新鲜 JSON（37/37，G06×2/G07×1/G08×2 新例）、tools/verify.mjs <JSON>（45 条 43/1/1，双向映射，PASS）、
tools/red-control.mjs（v2 三针：第三针 g03-committed 把最终 publishState 降 'data-complete' 应见
「expected 'data-complete' to be 'committed'」AssertionError；第二针 g05-unmount-cleanup 应见增量断言红）、
tsc --project configs/tsconfig.json --noEmit（exit0）、目录 Biome（含提交的 exec JSON，exit0）、check:docs。
逐组裁决重点：G03-03 committed 终态、G05-02 旧 wait 进入+越过剩余窗口、G05-04 同实例 stop 增量、
G06 choreography 入口+七入口收窄、G07-04 装备脚本 event 表链、G08 真异常路径+globalRoots、V01-V04 维持未证。
不要求重拍未变截图；GLM 不自审终审，不合 main、不标 done；Kimi 豁免，无 Kimi 提示词。
```


```text
接收 ARCH-REGRESSION-LAB-GLM-1 r7，worktree /Users/zhangxu/illegal/type-pal-glm-regression-lab，
分支 codex/glm-architecture-regression-lab-r1，候选 tip `9a197825`（style(lab): optional-chain lints in verify.mjs），
任务 draft。先读 docs/testing/architecture-regression-lab-codex-r6-review.md 与本块，
再核 git diff 33df9378..HEAD -- docs/testing/glm-architecture-regression-lab/candidates/ fixtures/（本轮为真实测试 diff）。
复跑：candidates.vitest.mts 新鲜 JSON（32/32）、tools/verify.mjs <JSON>（v2 硬判据 PASS，
含双向 fullName 映射、mergeBase 白名单、commands exit 台账）、tools/red-control.mjs（detected，临时目录在 /tmp）、
tsc --project configs/tsconfig.json --noEmit（exit0）、目录 Biome、check:docs。
逐组裁决重点：G01-05/G02-03 选区→删除实变链、G03-03 真实保存 IO（initialDir 入口、磁盘写闭见证、
卸载零写盘）、G04-04 草稿丢弃合同、G05-04 真实工作区卸载、G06 validateEnemies typed caller（合法路径零强转）、
G07 event-system 消费侧与 0x30 战斗 opcode 消费、G08 回调见证。V01-V04 未证矩阵保持如实未证。
不要求重拍未变截图；GLM 不自审终审，不合 main、不标 done；Kimi 豁免，无 Kimi 提示词。
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

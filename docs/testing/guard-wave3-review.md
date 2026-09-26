# GLM 八组同步守卫第三批：独立接收

[任务卡](../ops/tasks/TEST-GLM-CONTENT-GUARDS-3-script-and-records.md) /
[见证工具](guard-wave3-review-witnesses.mjs) / [隔离配置](guard-wave3-review.config.mjs)

2026-09-26，候选 `a00f12c224b58ef5a2cbc92f3eaab96cbaafe55e`，基点 `4c1c5038`。
结论 **counter / 窄返工**。不修改候选语义，不合入、不计覆盖；不是产品缺陷裁决。

## 已验证，返工不重开

- diff 只有八新测试、专属回执/机账/runner与任务卡作者块；四生产目标及 scripts 对 `8add8c66` 零 diff。
- Codex 独立复跑：runner 的110项对照绿、八针各唯一目标 AssertionError 红、10项判据自测通过；
  全 content **92文件/1132项绿**、typecheck exit0、11文件Biome零错误（三条源码字符串模板警告）。
- runner实物目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-guard-residual-mutants-jVw8Ek`；
  日志 `/tmp/codex-guard-wave3-{mutants,content,tc,biome}.log`。
- 未跑全仓与覆盖率，避免重复消耗；本批不要求补齐427臂，也不要求增加用例数。

## R1：同型合法正控与单轴负例尚不成立

`author-command.guard-residual.test.ts:65-68` 的 `loop mode` 坏输入缺 `cond`。
对**实际表驱动实参**只将 mode 改回 while，正式入口仍拒绝 `commands[0].cond: 期望对象`。
其共同正控另建了带 cond 的 loop，无法证明该负例只坏一轴。

`record-items.guard-residual.test.ts:110-139` 的 runSceneHook 两项、craftRecipe空配方、
modifyHostileAwareness倍率，全由 `useEffects` 包成 `target: oneAlly`。
对实际坏实参仅修正 hook/消息/recipes/倍率，四项仍被正式入口的
`items[0].use.target: 场景/剧情效果必须使用 scene` 拒绝（生产 `validate.ts:1270-1271`）。
共同 `extraPoisonRes` 正控不是这些场景效果的合法正控。

`record-items.guard-residual.test.ts:294-348` 投掷三项同理：修正 element 后缺 strength；
修正 multiplier.kind 后缺 min/max；修正 bonus 后缺 multiplier。正式校验在
`validate.ts:1041/1050-1058` 继续拒绝。共同 fixedDamage 对照不能替代同型 magicDamage 对照。

独立见证 `loop-one-axis/use-one-axis/throw-one-axis` 直接在候选 table callback 内克隆实际坏输入，
只修所测字段、调用同一公开guard；未注入分别11/39/39绿，注入分别 **1/4/3 AssertionError红**。
请用当前真实类型构造各族合法基线并先调用同一guard，再单字段破坏；其它同表行同步自查。
无需引入新的字段政策，不把明确防御输入冒称合法同型。

## R2：只比较一条坏输入，未保护同一用例的后续调用

`author-flow.guard-residual.test.ts:80-86` 的 badInitial 没有调用前/后快照；
该文件 next.kind、commandOutcome.outcome 第二次调用也无独立快照。
同型缺口还见 author-command 的 badAuto/badField/badMusic、script-command 的 cue 和递归后续项、
enemy-hook 的 badEnemyId/badOnce/badValue/badFlag、record-skills-poisons 的后续效果及record-items后续项。

独立单点变异只在 `author-script-core.ts:978` initial未命中分支抛出**原消息之前**把实际
`machine.label` 改为 `MUTATED-ON-REJECTION`。加载锚点唯一且文件hash不变，候选仍 **9/9绿**。
追加使用同一个 `legalMachine` 工厂、同一个坏 initial、完整快照的独立oracle：原实现10/10绿，
同突变9绿/1红，红的是实际入参发生变更，不是环境或计时失败。

请将所有对象/数组的拒绝调用统一纳入“该次调用前快照→执行→立即比同一实参”的薄助手或逐次断言；
复用输入后修改再校验时重新取快照。原始不可变标量无需装样子的快照。不要只给上述一个锚点打补丁。

## R3：回执按最终树勘误

回执“每拒绝行同形状合法正控、只破一轴、实际输入前后比较”目前被R1/R2直接反证，须随修复对账。
负控表 `effect-id-dup` 声称“重复消息改写”，实际runner删了重复门，独立复跑为错误接受导致红；
`item-status-dup` 实际为 `if (false)`，不是表内 `if (false) void status`。修正正文/机账，不改判据凑叙述。
去重表继续用真实旧标题/差异，不为返工补全所有未测分支；不要求改已经通过的八针身份判据。

## 复现与下一位提示词

```sh
env -u NODE_COMPILE_CACHE node docs/testing/guard-wave3-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-content-guards-wave2
```

本轮原始结果 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-guard-wave3-review-V4aKMe/summary.json`。
五组各有干净对照，唯一加载锚点与目标/测试文件hash前后核对；全部反证仅内存替换，不写候选。
返工改变测试结构后由Codex适配自身见证，GLM不改本工具。

```text
继续 TEST-GLM-CONTENT-GUARDS-3，在原隔离 worktree/分支窄返工，不 checkout 主工作树。
先 fetch origin，读 origin/main 的 docs/testing/guard-wave3-review.md 与本卡，闭合R1–R3：
1. 各拒绝族从真实typed合法基线先过同一guard再单轴破坏；尤其loop需cond、场景用途target=scene、
   magicDamage需完整strength/multiplier。修正所测字段后的同型正控必须通过，不能拿wait/heal/fixedDamage替代。
2. 所有对象/数组拒绝调用逐次取实际入参独立深快照并立即比较，包括一个test中的第二/第三次调用；
   initial缺失时label污染反控必须被候选抓住。可用薄助手，禁止mock核心或改产品。
3. 回执/机账按最终树勘误两条针与合同声明，测试数取新鲜JSON。不扩427臂全清任务、不为凑数堆例。
原白名单不变：八新测试/可选fixture/专属证据/本人卡块；产品、旧测试、配置、基线零改。
复跑整包定向/全content/TC/Biome/docs及代表负控；不跑全仓check/ratchet/strict，不改Codex见证。
提交推送实际SHA。Codex独立验收后自动集成，不代签、不标done。
```

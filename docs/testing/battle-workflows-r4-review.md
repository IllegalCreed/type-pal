# TEST-BATTLE-WORKFLOWS-1 r4 独立接收

2026-09-24，Codex。候选 `d9fb606ec6b482fd3fb343e4cf35525486bcb745`，设计 r1 不重签。
远端与候选一致；本人复用 detached 工作树 `type-pal-battle-review`，没有改 GLM 文件。

**结论：counter，仅剩 N3「合击消费队友行动」一个业务断言缺口。**
N1/N2/N4 的业务反证已闭；N3 其余新增合同及去重层级更正接受。另有两处回执数字须更正，
不把它们说成运行时缺陷。不集成、不跑统计并集、不代签、不标 done、不转 Kimi。

证据：[机账](battle-workflows-r4-evidence.json)、[本轮隔离见证](battle-workflows-r4-witnesses.mjs)。
原 [r3 见证](battle-workflows-r3-witnesses.mjs) 的入口未漂移，可直接复跑；r1/r2/r3 文件均零改动。

## 已关闭，后续不重开

- **N1**：`writeback-flows.test.ts:231-262` 的两次预期独立于实际 world；奖励后确用
  `structuredClone(world)`，整体比较不是同对象自比较。`:211` 的非空库存哨兵参与首次全 world 保真。
  删幂等门、清空库存各使候选 44 绿/1 个自身 AssertionError；非败 HP 钳制 1→0 同样 44/1。
  `:163-191` 两人胜利正式断言会话 `[0,100]`、写回 `[1,100]`；本人旧双人 oracle 同输入仍正控绿/变异红。
- **N2**：`script-flows.test.ts:109-149` 公开准备回调记录真实提交；等待窗为 0 + menu，恢复后仍 0，
  新按键才有 1 次准备/1 笔攻击。原 pump 旁路单点变异现由候选自身 AssertionError 检出；独立等待 oracle
  正反对照保持。没有把“日志空”继续当“提交空”。
- **N3 部分**：有效合击的真实执行、一次合击日志、两人 HP `[91,91]` 和 victory 已证；无效合击、
  W 空投掷列表及 enemyFled/terminated 零结算已证。独立放宽单人合击准入→候选对应无效选择测试业务红；
  空投掷列表强行打开→对应测试红；所有终态都构建结算→两条新增观察器各以 1≠0 红。
  回执旧证据按选择/core/终态/runtime 层拆分属实，仅下述「队友消费」宣称仍过宽。
- **N4 行为**：实际 `judge` AST 提取复算，逐条消息混错、exit2/null 均 invalid；原错 suite/file/marker、
  套件错误、后行 timeout 也保持拒绝。真实 6 正控 + 10 针全部通过。自测数量见下方勘误，不重开已修判据行为。
- **原勘误**：旧 session43 + core1 = 44 已纠正；`session-driver.ts:96` 现实际调用
  `validateBattleSprites` 校验本次注入定义。透明旁路守卫观察 48 次实际会话/10 次演员均通过。
  r2 四个已修变异、实际 pending 的 finally 清理/原错误身份复跑保持，不新列返工。

## 唯一业务阻断：合击测试没有观察到队友可行动的窗口

锚点均指候选树：

- `packages/reforge/src/battle/battle-session.selection-flows.test.ts:139` 敌 HP=20，合击一击致胜；
  合击后没有活敌让队友多余行动暴露。
- 同文件 `:128/:142` 发起者为 p1；`:158` 却只检查 **p1** 无普通攻击，并注释成“队友普攻被消费”。
  要核的是 p2 的行动，不能只核施法者本来就不执行的普通攻击。
- `docs/testing/glm-battle-workflows.md:47` 与机账 N3 把这条断言列作完整队友消费证据，需随实现修正。

独立单点变异只关掉 `battle-core.ts:1888` 的消费门：

```ts
if (s.coopThisTurn && queued.kind !== 'coop') {
// 隔离加载改为 false && 原条件；候选与产品磁盘文件零改动
```

**候选六文件 45/45 仍全绿**。这不是仅凭静态猜测：本人另外用相同合法 factory/真实 BattleSession/
公开按键，将敌 HP 设为 5000，等待本轮回到 menu（无私有反射、无 mock core、无视觉），得到：

| 一轮公开日志 | 正常产品 | 仅移除消费门 |
|---|---|---|
| 合击 | 对 survivor 造成 35 | 对 survivor 造成 35 |
| p2 额外普攻 | 无 | `p2 会心一击 攻击 survivor 造成 108` |
| 敌行动 | `survivor 攻击 p1 造成 19` | 相同 |
| 回合末 | menu | menu |

正常 oracle 1/1 绿，坏实现 oracle 以“多出 p2 普攻”自身 AssertionError 红；合法输入与时序非空均成立。
这不宣称产品现有 bug，证明的是候选没有钉住其宣称的会话合同。旧 core 专项仍有其层内价值，不能替代本项。

**最小返工**：保留当前 `[91,91]` 一击胜利成本正控；增加/扩展一个敌仍存活、队友本有行动机会的同轮场景，
观察真实非施法队友不再普攻，正常实现绿、同一消费门变异业务红。不靠超时、私有状态或只改日志前缀凑绿。
除这个子合同外已闭项不重开，不要求新增固定数量。

## 两处非产品勘误

1. 回执 `:70` /机账称自测 12 类。AST 逐项数真实 `assert.equal(judge(...))` 为 **11**：
   工具 `:228/:229/:239/:249/:254/:274/:301/:303/:330/:331/:336`。每项确走真实 judge；
   改成实际 11 即可，不为凑 12 发明额外要求。
2. 回执 `:83` /机账称 `src/battle/` 19 文件/278；本人在同一候选直接运行
   `pnpm --filter @type-pal/reforge exec vitest run src/battle` 是 **23 文件/332**，全包仍为158/1459。
   若原来使用更窄的显式子集，请记录完整命令与真实范围；否则更正目录计数。不据此虚构环境故障。

## 独立验证与复建

- 定向 **6/45**；整个 battle 目录 **23/332**；全 Reforge **158/1459**；TC 0；Biome **12 文件/0**。
- GLM 工具 **6 正控 + 10 针 detected**，exit0；工具产物 `bw1-mutants-2vYG0r`。
- 冻结 r3 工具：N1 三针、N2 泵旁路现全部候选业务红；双人/等待 oracle 正反通过；真实 judge 反例已拒。
- 本轮补充：3 个正常对照绿，候选关消费门仍45绿；独立消费 oracle 红；无效合击/W/非胜利结算分别候选业务红。
- 四目标相对 `57dda7ed` 零 diff；旧测试/历史反证/官方基线和配置未改。只消费源码与既有本地工具，无网络资料依赖。

```bash
node docs/testing/battle-workflows-r3-witnesses.mjs /Users/zhangxu/illegal/type-pal-battle-review
node docs/testing/battle-workflows-r4-witnesses.mjs /Users/zhangxu/illegal/type-pal-battle-review
```

工具0退出表示取证完成，不表示 accept；独立 oracle 不计候选45项。
日志 `/tmp/type-pal-battle-r4-*.log`；原反证本次输出 `battle-workflows-r3-review-DmttYf`，
新反证输出 `battle-workflows-r4-review-IRCIcr`（完整临时路径见机账）。
旧兼容审查 pass（产品零改），不代替测试实现 accept。官方7826/633与 full/Q1/Q2 边界不动。

## 下一位 GLM 提示词

在 `/Users/zhangxu/illegal/type-pal-glm-battle` 的 `codex/glm-battle-workflows-r1` 窄返工
TEST-BATTLE-WORKFLOWS-1 r4 候选 d9fb606e；卡仍 rework，设计 r1 不重签。
先合入 main 本轮 Codex 复核，读任务卡当前块、本文与机账/隔离见证。只修 N3 队友消费：当前 p1 发起合击，
却只查 p1 无普攻，且一击杀敌掩盖 p2 多余行动；移除 core:1888 消费门候选45绿，本人活敌 oracle 红。
保留 `[91,91]` 成本正控，补/扩真实公开会话中活敌与非施法队友的行动窗口，令同针业务红，别改产品或旧测试。
同时将自测12改实际11（或如实解释）、battle目录计数写精确命令/范围，更新本人回执/机账。
N1/N2/N4行为与N3其余合同已接受，不重开；不改Codex冻结工具，不改其它卡/官方统计，不做视觉、不代签、不done。
整包定向/全Reforge/TC/Biome/原负控与新消费门负控交Codex接收；统计并集仍后排。无下一位Kimi提示词。

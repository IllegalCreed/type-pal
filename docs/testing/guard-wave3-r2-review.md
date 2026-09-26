# GLM 同步守卫第三批：R1–R3 返工复核

当前结论见[6b371144定点复核](guard-wave3-r3-review.md)：R1与旧敌转移反证已闭，只剩R2一处匿名对象调用。
下文为16e647a1历史证据，不作为要求重做已闭项的指令。

候选 `16e647a1173df523257ad31bcac5964569d17d9e`；2026-09-26 Codex 独立复核。
结论：**counter，仍仅 R1/R2 与相应回执勘误，不合入、不计官方覆盖**。
[任务卡](../ops/tasks/TEST-GLM-CONTENT-GUARDS-3-script-and-records.md) /
[首轮反证](guard-wave3-review.md) / [本轮隔离见证](parallel-guard-command-r2-review-witnesses.mjs) /
[机账](parallel-guard-command-r2-review-evidence.json)。

## 已闭合，不重开

- 八新测试/新增薄助手/专属证据/本卡回执的白名单成立；四生产目标和 scripts 对冻结零差异。
- 原来的 loop 缺 cond、四类 scene use 载体及三个 throw 缺字段反例已修。本席将旧探针适配新回调，
  克隆实际坏输入仅修所测字段，同入口分别 12/39/39 全绿。
- initial 拒绝污染 label 已被候选自身抓住（9 对照绿，突变 8绿/1 AssertionError红）。
- 本席复跑原 runner：111 对照绿、八针各恰一候选 AssertionError；判据自测10项通过。
  全content 1133/1133、TC与改动Biome/docs通过；未运行本包官方覆盖。

## R1 残项：正控仍未与各负例同型

`record-items.guard-residual.test.ts:154-158` 的角色效果表仍统一用 extraPoisonRes 正控；
scene表 `:194-198` 仍统一用 runSceneHook；投掷表 `:398-402` 仍统一用 fixed-strength magicDamage。
回执“每拒绝行同形状合法正控/单字段破坏”不成立。修正旧八个坏输入不等于每行正控已入仓。

直接反证：只把生产 `validate.ts:934` 的 `if (chance > 100)` 改成 `if (true)`，即合法 gate 也拒绝，
G8 候选仍 **39/39绿**。使用同一 useEffects、同一 validateItems、gate chance=100 的独立正控，
原实现40/40绿，突变39绿/1 AssertionError红。不是环境失败，也不是新增产品规则。
请把各表改成 typed 同型合法基线 + 单轴 patch；先调用同一 guard 验证该基线再构造负例，
不再用不同 effect kind 的统一正控替代。无需扩展整个覆盖池。

## R2 残项：部分后续拒绝调用仍无快照

`enemy-hook.guard-residual.test.ts:119-127` 的 badTransition 无调用前/后比较；
`script-command.guard-residual.test.ts:321-332` 的 badFade/badWipe、`:287` 的空数组同样未纳入。
“所有对象/数组拒绝调用均已覆盖”的回执尚不成立。

直接反证：在 `enemy-script.ts:244` 抛原消息前仅执行 `transition.kind = 'stay'`，
保留原错误文字，候选仍 **7/7绿**。追加同一个 badTransition 的实际输入深快照 oracle，
原实现8/8绿、突变7绿/1 AssertionError红。旧 initial 反例虽已闭合，不能代替其它拒绝调用。
请遍历全部八文件的对象/数组拒绝调用逐次补齐，优先复用现有薄助手；原始不可变标量不需快照。

## 回执与计数（随上述一起修，不扩大任务）

新鲜111项中 G3 实际12，机账正确而正文八组表仍写11。
runner实际TOTAL111，而机账control.tests/正文还写110、其余109；新增fixture后仍写“未新造fixture”。
G3末尾两次重复坏wipe调用不注入助手缺陷，并非独立“精确性自证”，应删除冗余或准确收窄，勿凑数。

原始日志：`/tmp/codex-guard-wave3-r2-{mutants,content,tc,biome,docs}.log`。
独立见证目录：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-glm-residual-r2-09NXeM`；
每针唯一加载锚点、前后源码/候选hash相同，绿对照与失败记录均保留。复跑：

```sh
env -u NODE_COMPILE_CACHE node docs/testing/parallel-guard-command-r2-review-witnesses.mjs glm /Users/zhangxu/illegal/type-pal-glm-content-guards-wave2
```

## 下一位 GLM 提示词

```text
在原 codex/glm-content-guards-wave3 隔离工作树继续窄返工。先 fetch origin，读 origin/main 的
docs/testing/guard-wave3-r2-review.md 与本卡。只闭剩余两项：
R1：角色/场景/投掷表每行提供真实 typed 同型合法基线，先过同一guard，再单轴破坏；不要统一拿
extraPoisonRes/runSceneHook/fixed magicDamage替代别种效果正控。gate合法chance=100需通过；
只将其上限门改成无条件拒绝时，候选自身必须红。
R2：全部八文件对象/数组拒绝调用逐次快照并立即比同一实参，重点badTransition、badFade、badWipe、
空数组；敌transition抛原错前改kind的单点变异必须被候选抓住，已闭initial及八个合法化反例不重开。
按新鲜JSON同步组数/总数/runner数字和新增fixture清单；不要把重复坏wipe当助手自证。
原白名单、生产/旧测试/配置/基线零改；不改Codex见证。整包定向、全content、TC、Biome、docs与
原八针复跑后提交推送SHA；不跑全仓覆盖，不合main、不标done。Codex复验通过后自动集成。
```

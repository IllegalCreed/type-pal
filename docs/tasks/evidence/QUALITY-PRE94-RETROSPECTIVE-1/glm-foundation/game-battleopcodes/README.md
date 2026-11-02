# battle-opcodes.ts 大文件 B–G 补维（glm-foundation 模块 7 批 11）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 core/battle/battle-opcodes.ts(1534 行全文读毕)B–G 补维;A 维引用 Codex 3t 深切片(4 专属测试+summon slot reuse/cross-module/actions/magic-damage/throw-item/coop-magic/anim-timeline caller 对照 script.c/fight.c/battle.c);基点 53db76bbb 线(diff 基准=批10提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

混合批:改动 3 处(2 注释+1 死语句删除)。验证证据:定向 29 套件 61/61、0 failed suites(directed.json:battle-opcodes cov85 56+glm-next-wave 5);game typecheck 0;scoped biome 0/0/0;diff --check 干净。body-invariance-mixed(同目录)因死语句删除预期不等:printedBytes base 49589→current 49558,恰 −31 字节=void beforeHealth 语句;行为保持证明=定向 61/61 超集+typecheck 0+实际 diff 三处逐行核对。

## 发现

整改逐项:①模块头『本模块实现 5-7 个核心 battle opcode』——实际 44 个 opcode 常量/40+ case 分支(伤害/毒/状态/召唤/分裂/变身/偷窃/复活/终态),M5.B-w2.a 期计数严重失实,按现状改写;②OP_REVIVE_PLAYER docblock『清 gs.rgPoisonStatus 该 role 毒(同 C7 runner 简版,D15 残)』与实现矛盾——实际经 curePlayerPoisonByLevel(role,3) 只清 level<=3(M11 对齐 script.c:1071,函数体内注准确、外层 docblock 过度概括),按实现改写;③删除 void beforeHealth 死语句——该变量在下方 L1233 maxHealth: self.maxHealth ?? beforeHealth 仍在使用,void 是 DL9 删蓝数字 emit 时的遗留 lint-silencer,现为纯噪音。A 维(引用 3t)复核:0x2E 巫抗 >= 后期修复(用户裁决偏离 sdlpal >)、0x30 Extra 槽+getter recompute、0x91 objectId 同种判定、0x9E overlay 优先播种+隐身 gate、0x9F 保三脚本字段变身链、0x60/0x64 target 优先审计修、L27 施毒入口 self 恒投掷目标——全部与实现/真值锚一致。

## 结论

混合批(注释+可执行语句):61/61 定向绿+typecheck 0+BI-mixed −31 字节定量一致+逐行 diff 共同证明删除行为保持。登记(不动):asShort 私有副本合并候选(沿批9);playMagicAnim 相关沿批10。

## 整改与复核

Codex 2026-10-20 当前有限裁定:void beforeHealth 删除成立,但『其余注释准确/未发现缺陷』信用撤回——头部返回协议/通用 fallback 错注和 0x22 清全部状态漏报;复活的 999/1000/32760 两红后窄修已测;当前 103+181 game 无 stderr,其余 opcode 不因此整体签收;详见 [codex-dead-removals.json](../codex-dead-removals.json);文件保持 review,未授整卡/整包 accept。复验入口(原页给出,此处概述):定向跑 battle-opcodes.cov85.test.ts;grep 40+ 个 battle-context opcode 修正可 grep;grep -c void beforeHealth 预期 0。失效条件:实现变化→重测;dispatch 合同(consumed/newIp)变化→3t 证据重估。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4143B / SHA-256 ef061de6ba95acfed141e51e7cb3b8ae004a935220e6b15156508a08e5ac5751；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# battle-opcodes.ts 大文件 B–G 补维（glm-foundation 模块 7 批 11）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（diff 基准=批10提交后 HEAD）
范围：`core/battle/battle-opcodes.ts`（1534 行**全文读毕**）。A 维引用 Codex 3t 深切片（4 专属测试 + summon slot reuse/cross-module/actions/magic-damage/throw-item/coop-magic/anim-timeline caller 对照 script.c/fight.c/battle.c）;本批 B–G 补维,handler 现状定谳法。

## 短回执

- **改动 3 处（2 注释 + 1 死语句删除）**：①模块头"本模块实现 5-7 个核心 battle opcode"——实际 44 个 opcode 常量/40+ case 分支(伤害/毒/状态/召唤/分裂/变身/偷窃/复活/终态),M5.B-w2.a 期计数严重失实 → 按现状改写;②OP_REVIVE_PLAYER docblock"清 gs.rgPoisonStatus 该 role 毒(同 C7 runner 简版,D15 残)"与实现矛盾——实际经 curePlayerPoisonByLevel(role,3) 只清 level<=3(M11 对齐 script.c:1071,函数体内注准确、外层 docblock 过度概括),按实现改写;③删除 `void beforeHealth` 死语句——该变量在下方 L1233 `maxHealth: self.maxHealth ?? beforeHealth` **仍在使用**,void 是 DL9 删蓝数字 emit 时的遗留 lint-silencer,现为纯噪音。
- **验证**：定向 **29 套件 61/61、0 failed-suites**(battle-opcodes cov85+glm-next-wave + summon-slot-reuse + magic E2 autodefend/fizzle 五族);game typecheck 0;scoped biome 0/0/0;diff --check 干净。body-invariance 因死语句删除**预期不等**(printedBytes base 49589 → current 49558,恰 −31 字节=`void beforeHealth` 语句)——本批为**混合批**(注释+可执行语句),行为保持证明 = 定向 61/61 超集 + typecheck 0 + 实际 diff 三处逐行核对(上方 grep 原件入 directed.json 同目录)。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3t 证据链 + 后续 DL9/DL23-27/DM1/DM6/DM8-9/M11/L25-26/L18-22 修复批完整。本批复核:0x2E 巫抗 `>=` 后期修复(用户裁决偏离 sdlpal `>`)、0x30 Extra 槽+getter recompute、0x91 objectId 同种判定、0x9E overlay 优先播种+隐身 gate、0x9F 保三脚本字段变身链、0x60/0x64 target 优先审计修、L27 施毒入口 self 恒投掷目标——全部与实现/真值锚一致。 |
| B | 本批修 2 处。其余 opcode 常量注释随修复批同步维护(与 battle-system 同模式),零常量级过时残留。 |
| C | 单 dispatch 入口;动画经 anim-timeline builder + startBattleAnim;毒入口递归注入 ctx 完整透传(缓冲一致化注)。 |
| D | emitDamageNum/resolvePlayerPoisonTargets 私有 helper 单一职责;asShort 又一副本(沿批 9 登记)。 |
| E | 61 例含召唤槽/自动防御预掷/fizzle 音/巫抗边界(各 glm-q 族判别力已核)。 |
| F/G/H | 常量区带行锚、case 按族分组;**本批删除唯一死语句**;注入式 ctx 可测 ✓。 |

## 登记（不动）

asShort 私有副本合并候选(沿批 9);playMagicAnim 相关沿批 10。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/battle-opcodes.cov85.test.ts
grep -n '40+ 个 battle-context opcode' "$WT/packages/game/src/core/battle/battle-opcodes.ts"  # 修正可 grep
grep -cn 'void beforeHealth' "$WT/packages/game/src/core/battle/battle-opcodes.ts" || echo '0 (已删)'
```

失效条件:实现变化 → 重测;dispatch 合同(consumed/newIp)变化 → 3t 证据重估。

## Codex 2026-10-20 当前有限裁定

void beforeHealth删除成立，但“其余注释准确/未发现缺陷”信用撤回：头部返回协议/通用fallback错注和0x22清全部状态漏报。复活的999/1000/32760两红后窄修已测；当前103+181game无stderr，其余opcode不因此整体签收。 [逐文件依据与原件](../codex-dead-removals.json)。文件保持review，未授整卡/整包accept。
````
<!-- incremental-original-source:end -->

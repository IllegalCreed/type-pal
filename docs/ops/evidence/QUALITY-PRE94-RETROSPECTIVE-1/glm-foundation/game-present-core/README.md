# game-present-core(present.ts + present-battle.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 8 批 15(present 模块批 1)的作者复审回执:Coding Owner GLM,present.ts 805 行/present-battle.ts 449 行全文读毕,基点 origin/codex/code-quality-3y@53db76bbbb(候选线 38+1 提交)。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改类型:纯注释 5 处(B 维),零代码改动,由 [body-invariance.json](body-invariance.json) 见证(present.ts 17493/present-battle.ts 10942 打印字节,双侧 printedSha256 一致,allEqual=true)。①present-battle 模块头『命令消费(M3 简版)』块重写为逐 op 去向表:playEnemyAttack/playEnemyDeath/playPlayerAttack 声音由 shell 消费(bootstrap.ts:211→audio.ts:123 sfxForBattleEvent),playMagicAnim 无消费方,flashEnemy/flashPlayer/showBattleUI/clearDialogBox 四 op 无 emit 方,对话框经 gs.dialogBox 不经 bus。②删除『不在本 task 做(留 M5)』过时四项——精灵切帧=anim-timeline+stepBattleAnimRender、单行消息=5.5 battleMsg、死亡淡出=stepDeathFadeRender、受击色闪=iColorShift(draw-battle-sprites.ts:101-123 PAL_RLEBlitWithColorShift port),绘制顺序表补第 5 行。③L104『持有跨帧状态(目前只有 FloatingNumsLayer)』改列实际 5 项。④L172『(M3 简版:只 showDamageNum;其他命令 M5 真补)』改『视觉层只取 showDamageNum 与 showBattleMessage(L193-197 已消费)』。⑤present.ts:419 脆行号改语义引用『对齐上方队长块:walking>scriptedFrame>站立帧』。op 消费方核实账(grep 全 game 包非 test):playEnemyDeath/playEnemyAttack emit=attack.ts:353/432、battle-system.ts:1967,消费=bootstrap.ts:211;playPlayerAttack emit=attack.ts:229/293,消费同上(weaponSound);playMagicAnim emit=actions/magic.ts:278、零消费(与 magic.ts L122 定谳一致);flashEnemy/flashPlayer/showBattleUI/clearDialogBox 零 emit(仅 command-bus.ts union 定义);showDialogBox emit=event-system.ts:2111(大世界路径)、零 op 消费,战斗内对话框走 gs.dialogBox(tickBattleDialog 写、present-battle 步骤 6 画);showDamageNum/showBattleMessage 由 present-battle 消费循环(L174-197)处理。返工范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

原文验证口径:[directed.json](directed.json) 定向 9 文件(present/present-hold/present-battle/p11/p12/p13/p14/p16/dither-fade-nibble)112/112、0 failed suites;tsc --noEmit -p packages/game exit 0;biome scoped 两文件 0 诊断;git diff --check 干净。A 维:presentFrame 七短路序(suspendRaf→paletteFade→deathHold→gameOver→blackScreen→rngDialog→sceneLoading→freeze)与主绘制链逐段核读。绿值为文档时点事实,不外推产品通过(currentExecution=false)。

## 结果

登记项(交 Codex,不在本批动):①playMagicAnim op 清理候选(magic.ts:278 emit 零消费,沿用前批);②flashEnemy/flashPlayer/showBattleUI/clearDialogBox 四死 union 成员(零 emit)清理候选(新增);③showDialogBox(event-system.ts:2111 emit、零消费)与 gs.dialogBox 直写通道并存的归约候选(新增)。Codex 2026-10-20 返工纠正:presentFrame 会推进 palette/wave 等渲染态,不能沿用『只读 gs,只有一处例外』的无界表述;BattlePresent.clearFloatingNums 只清弹幕/消息条;逐文件 C/H 与时钟候选已登记,见 [codex-final29.json](../codex-final29.json)。本节不接收原文整包/模块收口宣称。

## 限制与复核

未重跑原命令/测试;op emit/消费行号账未独立 grep 复核;C 维『只读 gs』表述已被 Codex 判为无界,原文零整改面主张按此折扣理解。历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4897B / SHA-256 bc00240271bb3a8c8a4f435bbe55b38f9e2af0e957165dec98e8908a5dd4c1ac；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-present-core(present.ts + present-battle.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 8 批 15(present 模块批 1)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 38+1 提交)
- Coding Owner:GLM;两文件全文读毕(present.ts 805 行 / present-battle.ts 449 行)
- 整改类型:纯注释 5 处(B 维),零代码改动 — body-invariance `allEqual: true`

## 整改清单(全部注释面,逐项附核实证据)

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | present-battle.ts 模块头 | "命令消费(M3 简版)"块把 playEnemyAttack/playEnemyDeath 与 playMagicAnim 并列"简版"且未说去向;`showDialogBox/clearDialogBox —— 战斗模式下不画对话框,跳过` 与步骤 6(战斗内 gs.dialogBox 已画)矛盾 | 重写为逐 op 去向表:三 op 声音由 shell 消费(bootstrap.ts:211 → audio.ts:123 `sfxForBattleEvent`)、playMagicAnim 无消费方、四 op 无 emit 方、对话框经 gs.dialogBox 不经 bus |
| 2 | present-battle.ts 模块头 | "不在本 task 做(留 M5)"四项全部已实现(精灵切帧=anim-timeline+stepBattleAnimRender;单行消息=5.5 battleMsg;死亡淡出=stepDeathFadeRender;受击色闪=iColorShift,draw-battle-sprites.ts:101-123 PAL_RLEBlitWithColorShift port) | 删除过时清单;绘制顺序表补第 5 行(对话框/结算 overlay,对应代码步骤 6/7) |
| 3 | present-battle.ts:104 | "持有跨帧状态(目前只有 FloatingNumsLayer)"过时 | 改列实际 5 项:弹幕层/消息条/召唤 fade 快照+累积缓冲/入场 fade backup;draw 签名补 advanceEffects 参数 |
| 4 | present-battle.ts:172 | "(M3 简版:只 showDamageNum;其他命令 M5 真补)" — showBattleMessage 实际已在 L193-197 消费,"M5 真补"误导 | 改"视觉层只取 showDamageNum 与 showBattleMessage;其余 op 去向见模块头" |
| 5 | present.ts:419 | 自引用脆行号"对齐队长 present.ts:304-314"已漂移(队长块现约 L332-346) | 改语义引用"对齐上方队长块:walking > scriptedFrame > 站立帧" |

## op 消费方核实账(grep 全 game 包非 test)

- `playEnemyDeath` / `playEnemyAttack`:emit = attack.ts:353/432、battle-system.ts:1967;视觉层零消费;消费 = bootstrap.ts:211(经 sfxForBattleEvent → per-单位 deathSound/attackSound)
- `playPlayerAttack`:emit = attack.ts:229/293;消费 = 同上(weaponSound)
- `playMagicAnim`:emit = actions/magic.ts:278;**零消费方**(sfxForBattleEvent default→0)— 与 magic.ts L122 定谳一致,清理候选维持登记
- `flashEnemy` / `flashPlayer` / `showBattleUI` / `clearDialogBox`:**零 emit 方**(仅 command-bus.ts union 定义)— 死通道候选,交 Codex 裁定
- `showDialogBox`:emit = event-system.ts:2111(大世界路径);零 op 消费方;战斗内对话框走 gs.dialogBox(tickBattleDialog 写、present-battle 步骤 6 画)
- `showDamageNum` / `showBattleMessage`:present-battle 消费循环(L174-197)

## 验证

- body-invariance:`prove-body-invariance.mjs --base HEAD` 两文件 printedSha256 逐字节一致 → [body-invariance.json](body-invariance.json)
- 定向 9 文件(present/present-hold/present-battle/p11/p12/p13/p14/p16/dither-fade-nibble):**112/112,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0
- `biome check` scoped 两文件:0 诊断
- `git diff --check`:干净

## 零整改面(A/C/D/E/F/G/H)

A:presentFrame 七短路序(suspendRaf→paletteFade→deathHold→gameOver→blackScreen→rngDialog→sceneLoading→freeze)与主绘制链逐段核读,docblock 与实现一致;D17/D19/DM9/DM32/L3/W4 等锚点注释为已验证真值。C:present.ts 只读 gs 不写(除 followerFrozenOffset 防御初始化,present-only 缓存,已注明);present-battle 跨帧态封装于 BattlePresent。E:测试族 grok-composition p11-p16 + present-battle.test 覆盖命令消费/fade/overlay 路径,本批零代码改动不动测试。F/G/H:文件可读性由高密度 sdlpal 锚点注释支撑,无可删冗余。

## 登记项(交 Codex,不在本批动)

1. `playMagicAnim` op 清理候选(magic.ts:278 emit 零消费)— 沿用前批登记
2. `flashEnemy`/`flashPlayer`/`showBattleUI`/`clearDialogBox` 四死 union 成员(零 emit)清理候选 — 新增
3. `showDialogBox`(event-system.ts:2111 emit、零消费)与 gs.dialogBox 直写通道并存的归约候选 — 新增


## Codex 剩余29文件返工（2026-10-20）

presentFrame会推进palette/wave等渲染态，不能沿用“只读gs，只有一处例外”的无界表述；BattlePresent.clearFloatingNums只清弹幕/消息条。逐文件C/H与时钟候选已登记。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
```
<!-- incremental-original-source:end -->

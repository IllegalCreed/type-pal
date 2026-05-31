# 中毒机制 + 战斗头像颜色 实现规划(2026-05-31)

> user 指令:审计完更新文档后,实现中毒机制(投掷毒/法术中毒/4 基础+7 高级毒/抗性)+ 战斗头像颜色(中毒染色 + 死亡黑白,我之前漏的)。

## sdlpal 真值出处(已预读)

### 毒 OBJECT 结构(global.h:209-217 poison union)
- `wPoisonLevel` 毒等级(头像色只认 ≤3)
- `wColor` 中毒头像染色(palette index)
- `wPlayerScript` 玩家中毒每回合脚本
- `wEnemyScript` 敌人中毒每回合脚本
- 抗性:`enemy.wResistanceToSorcery`(global.h:203,0 min 10 max,抗法术+毒)

### 数据已 plumb(无需重新提取)
- `data/extracted/data/object-poisons.json`(565 OBJECT)+ `ObjectPoisonView`(tables.ts:160)已含 `id/level/color/playerScript/enemyScript`。
- 真毒 object 约 id 551-560(level 0-3 + color + 双脚本)→ 4 基础(level≤?)+ 7 高级。**实现时按 0x28/throw/spell 实际引用精确锚定**(避免 union 字段误判,565 里很多非毒 object 的其它 union 字段非零)。

### 头像色(uibattle.c:114-162 PAL_PlayerInfoBox face)
```
bPoisonColor = 0xFF
for each MAX_POISONS(16) 毒槽 of 该队员:
  w = rgPoisonStatus[i][partyIndex].wPoisonID
  if w!=0 && rgObject[w].poison.wPoisonLevel <= 3:
    if level >= wMaxLevel: wMaxLevel=level; bPoisonColor = poison.wColor   # 最高 level 毒的色赢
if rgwHP[role]==0: bPoisonColor = 0    # 死亡强制黑白 mono + 无 time meter
渲染: bPoisonColor==0xFF → 正常 PAL_RLEBlitToSurface(满色)
      else → PAL_RLEBlitMonoColor(face, ..., bPoisonColor, 0)  # 单色 mono 重染
```
→ ts `drawPlayerInfoBoxes`(present/battle/draw-battle-ui.ts)需:① 读队员毒状态算 bPoisonColor ② mono 重染 blit(头像精灵按单 palette index 重画)。需 mono-blit helper。

### 应用毒(script.c:1185-1230,0x28)
- 敌人:`if RandomLong(0,9) >= enemy.wResistanceToSorcery` → 找空毒槽加 {wPoisonID, wEnemyScript}。
- 玩家版同构(用 player resistance — 待查 PAL_AddPoisonForPlayer 真值)。

### cure(script.c:1071/1091 CurePoisonByLevel(role,3))
- 现 ts "简版全清";数据已有 level → 可改按 level 过滤(虽 maxLevel=3 时全清等价,但 maxLevel=1 治毒丹要部分清)。

## ts 现状缺口
| 处 | 现状 | 待做 |
|---|---|---|
| 0x28 apply poison(敌) | ✅ 有 resistance 检查 | 复核 |
| 0x29 poison-player | 简版:**无抗性检查**直接加(event-system 3495) | 加 player resistance |
| 0x61 jumpIfPlayerNotPoisoned | **bug:恒跳**(battle-opcodes 927) | 读真实 player 毒状态 |
| cure 0x22/0x5D/D15/D21 | 简版全清 | 按 level 过滤(数据已有) |
| 头像色 | **完全没画** | drawPlayerInfoBoxes mono 重染(中毒色 + 死亡黑白) |
| 玩家战斗内中毒 tick | ? | 每回合跑 wPlayerScript(对照敌 tick) |
| 投掷毒 | E2 throw 部分(0x28) | 复核全链 |
| 法术中毒 | ? | spell scriptOnUse 0x28/0x29 |

## 执行顺序(user 定)
1. **先等 opcode 审计(wwezfx3es)完 → 更新 opcode-status.md(不该标 ✅ 的不标)**。
2. 再实现中毒机制 + 头像色(审计会给出 0x28/0x29/0x5D/0x5E/0x61/0x22 精确状态)。

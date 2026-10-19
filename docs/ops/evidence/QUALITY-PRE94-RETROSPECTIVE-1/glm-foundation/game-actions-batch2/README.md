# battle actions 续批四文件 B–G 补维（glm-foundation 模块 6 批 10）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批9提交后 HEAD）
范围：`actions/{magic,item,throw-item,coop-magic}.ts`（1076/118/158/387 行全文读毕）。A 维引用既有深切片(3m formulas/magic-damage + 后续 DL/DM/M6-M9/L17-L22/W4 修复批);本批 B–G 补维,handler 现状定谳法。

## 短回执

- **改动 1 处（仅注释,magic.ts L122 定谳）**：原"emit playMagicAnim(Present 层消费;M3 phase 1 简版可能不实播,只表示发生过)"——定谳:该 bus op **当前无任何渲染消费方**(present-battle.ts:198 显式跳过、audio.ts default 解析 0),而真实法术动画已由本文件 buildAndStart* 六类时间线链(PreMagic/OffMagic/PostMagic/DefMagic/Summon/Trance/EnemyMagic)**完整实现**;"M3 phase 1 简版"框架双重失实(既非简版、视觉也不经此 op)。按现状改写为通知性 op 的准确描述。
- **item/throw-item/coop-magic 三文件零缺陷零改动**：item 的"脚本后按 consuming 扣"(fight.c:4387-4400)、throw-item 的挥臂前置+缓冲拼链+蛊孵化链 runScript 注入、coop 的 HP 代价(非 MP)/healthy<=1 降级完整 attack case(DL6 RNG 序)——注释与实现/真值全部一致。
- **验证**：body-invariance 四文件一致;定向 **13 套件 25/25、0 failed-suites**(actions 族 + magic E2 三合同 + summon-slot-reuse + action-error-arms);game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | scriptOnUse 成功 gate/失败早退(MP 仍扣)、E1/E2 inline 伤害(SHORT baseDamage guard、AoE 按 type 非 flag)、DM6 敌法术 autoDefend **预掷**、L18/L20 rngFactor 逐敌/逐队员掷、trance 变身 L19 闪色+crossfade、召唤 PostMagic 排 fadeOut 前+复位防御者不复位——与 fight.c 锚一致。 |
| B | 本批修 1 处。item.ts L11-12"M3 phase 1 fixture…T21 implementer 按 console.debug 补"为历史过程叙述,D26 兜底描述(L10)仍准确——保留历史,不算失实。 |
| C | 动画帧构造统一经 anim-timeline builder + startBattleAnim;声音帧同步模式(castSound/sound 挂帧,防双响 castFrameSynced/soundFrameSynced 排除表)清晰。 |
| D | attachDamageNumsToFirstFrame/asShort/isHealthy 在 magic/coop 各有私有副本(同 attack 批登记,合并属接口变化)。 |
| E | 25 例含 fizzle 音/E2 目标语义/召唤槽复用/action 错误臂(各 glm-q 族判别力已核)。 |
| F/G/H | 六类动画 builder 分区清楚;无死出口;RNG/资源注入可测 ✓。 |

## 登记（不动）

playMagicAnim bus op 无消费方(present 跳过+audio 0)——**候选清理项**:删除 emit 属 bus 合同变化(命令枚举在 command-bus),交 Codex 裁定;连带 present-battle.ts:198 注释"其他 op…M3 简版跳过"把 playEnemyAttack/playPlayerAttack 与无消费 op 并列易误导(audio.ts 实际消费后三者声音)——归 present 批修。私有 helper 副本合并候选沿批 9。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
grep -n '通知性 bus op' "$WT/packages/game/src/core/battle/actions/magic.ts"  # 修正可 grep
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/actions/
```

失效条件:四文件实现变化 → 重测;bus 命令集变化 → playMagicAnim 登记项复核。

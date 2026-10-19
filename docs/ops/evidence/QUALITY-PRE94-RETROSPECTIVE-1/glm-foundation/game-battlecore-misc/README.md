# battle 七小文件 B–G 补维收口（glm-foundation 模块 7 批 14 · battle 家族终批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线
范围：`core/battle/{formulas,magic-damage,magic-object,simulated-magic-target,enemy-ai,status,battle-positions}.ts`（223/333/75/23/129/54/93 行，**七文件全部全文读毕**，共 930 行）。A 维引用 3m 深切片（formulas/magic-damage/status/turn-queue/rng 逐文件对照 fight.c/global.c）+ 2026-10-18 formula-numeric-audit 批（第七组错注已修、TS/C 数值边界声明重写）+ 3m status 死槽递减修复批;本批 B–G 补维,handler 现状定谳法。

## 短回执

- **改动 0 处（零整改批次,battle 家族三连零整改）**：过时模式扫描七文件零命中。3m+数值审计批后这些文件的注释属"随修复批同步维护"高地——错注已在 2026-10-18 被上游批次纠正,本轮 handler 现状定谳复核全部吻合。
- **验证**：body-invariance 七文件一致（零编辑恒真）;定向 **23 套件 90/90、0 failed-suites**（formulas + magic-damage + magic-parity + enemy-ai + state-machine + magic E2 target-semantics 六族）;game typecheck 0;scoped biome 0/0/0;diff --check 干净。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| A(引用) | 3m + 数值审计批。本批复核:calcBaseDamage 三段公式/Math.trunc vs floor 注、SHORT 非全域等价声明、非 classic 分支 `M3 不实现` 标记在位;applyMagicDamage 双路径共享骨架(minDamage 1/0 不对称)、applyEnemyMagicDamage 的 resistMult=20/defending/protect/autoDefend 除因子/钳 hp 不钳 1、玩家 getter 无 level 项;simulateMagic 无符号 guard;enemy-ai 的 DL7 沉默仍耗掷骰/c10 全槽拒绝采样/guard 兜底;status 的 B1 全计数器衰减+死槽递减保留;battle-positions 的 3 人表真值+4/5 兜底——全部与 fight.c/global.c 锚一致。 |
| B | 零修改。TS 半开倍率 vs C WORD 赋值的数值边界声明(formulas/magic-damage 四处)统一指向 GAME-MAGIC-NUMERIC-ASSIGNMENT-1(160/161 用户裁决 pending)——如实标注未知,与卡一致。 |
| C | 纯函数核心(formulas/magic-object/simulated-magic-target/enemy-ai/positions)与 mutate 结算层(magic-damage/status)分层清楚;positions 是 core+present 共用单一坐标源(头注言明防漂移理由)。 |
| D | applyMagicDamage 是 inline/SimulateMagic 唯一共享核心(头注表格列两路径差异);resolveSimulatedMagicTarget 供 damage+FIRE 动画共享(含零伤害 sentinel)。 |
| E | 90 例含公式矩阵/毒抗中点/自动防御预掷/混乱全槽采样(3m+审计批判别力已核,源未变)。 |
| F/G/H | 命名达意;无死出口(census:七文件出口全有 caller——formulas→actions/system,magic-damage→actions/opcodes,magic-object→magic/coop/attack,enemy-ai→system,status→system,positions→state/present/opcodes);纯函数+注入 rng 可直测 ✓。 |

## 登记（不动）

GAME-MAGIC-NUMERIC-ASSIGNMENT-1(160/161 数值裁决)维持 pending——formulas/magic-damage 的"不承诺全数值域等价"声明即该卡的代码侧边界,不因本批变化。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/battle/__tests__/formulas.test.ts \
  src/core/battle/__tests__/magic-damage.test.ts src/core/battle/__tests__/enemy-ai.test.ts
```

失效条件:七文件实现变化 → 重测;公式/裁决变化 → 3m+数值审计批证据重估。

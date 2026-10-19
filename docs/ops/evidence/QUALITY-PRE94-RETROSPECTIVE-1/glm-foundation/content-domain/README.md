# content-domain(领域模型层 20 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 33(content 包批 4)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 67+ 提交)
- Coding Owner:GLM;20 文件全文读毕(battle-field-reference 52/enemy-team 53/author-item-core 54/enemy-ai-condition-guard 58/shop 62/tileset 62/grid 66/stamp 77/migration-diagnostic 96/scene-index 97/map-index 107/entity-lifecycle 112/sprite 112/world-variable 116/enemy 128/runtime-scene 134/actor 138/poison 139/battle-choreography 146/author-script 159)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- **grid.ts**:D16 菱形轴换算(x=16(col−row),y=8(col+row))、height 独立正交轴纯显示声明、pixelDeltaToGridDelta 保留小数防"碎步位移被 round 吞"(开场锅挥动根因)。
- **poison.ts**:毒 ≠ BattleStatus 的指针化序列模型、可解度分层替代原版 level 魔数声明、三对致死配对/单向 6 元环相克"仅投掷触发/use-on-self 触发"的原版实证边界。
- **enemy.ts/actor.ts**:M4c AI/演出二分层(2026-07-04 用户定调)、七件套音效"schema 一次定全演出侧按进度消费"、伤亡脚本 0x06 顺序概率门、coveredBy 具名化、负 magicSound 干净语义(suppressMagicEffectSound)。
- **sprite.ts**:帧布局挂精灵表不挂角色(原版 per-object nSpriteFrames 是历史包袱)、声明覆盖量 vs 实际帧数的历史债边界。
- **scene-index/map-index**:稳定身份/显示名/路径三分、`..`/反斜杠 fail-loud、next*Identity 双避让。
- 其余引用扫描器/守卫件与各自声明一致(typed ownership 禁止字符串清单)。

## 验证

- 定向 16 文件:**29 套件 80/80,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。

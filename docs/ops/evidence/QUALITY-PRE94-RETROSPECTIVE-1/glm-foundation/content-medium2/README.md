# content-medium2(中件七文件)八维复审批

- 批次:pre-94 foundation 模块 12 批 32(content 包批 3)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 66+ 提交)
- Coding Owner:GLM;七文件全文读毕(rewards 253/command-target-reference 323/battle-formulas 324/actor-reference 341/character 351/actor-condition 368/project-map 394)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **rewards.ts**:B7a/B7c 全套原版考证(battle.c:991-1372 逐行锚:满级续扣 exp :1110/升级回满 :1115-1116/学技 :1300-1321/半恢复 :1342-1372;隐藏经验 WORD 截断 + 无属性 cap 与主升级差异声明)。
- **battle-formulas.ts**:逐式与一阶段 formulas/turn-queue/status 三件一致(本人在批 14 已全文核过一阶段原件);SHORT 逐步截断语义、magicDefenseDivisor 乘加结构与敌物攻 7/17 闪避两机制区分、applyPlayerStatus"坏状态已有不刷新"⚠修正史 — 全部准确。
- **actor-reference.ts**:19 kind typed policy 表(seedStats 双重身份注释)、canonical 单命令访问不进嵌套 arm 的边界。
- **character.ts**:reserve 暂存区 D22 拍板、appearance 持久换形象 vs 0x65 临时演出区分、template 字段名存档兼容 ⚠、CONTINUE/CURRENT_PROJECT_MINIMUM_SAVE_VERSION 两版本轴独立声明。
- **actor-condition.ts**:carryable 状态闭集(傀儡 dead-only 不可携带)、坏不刷新/好取长的唯一叠加规则、seed 物化不跑相克链声明。
- **command-target-reference.ts**:openShop sell 分支不读 shops 的非引用声明、复制场景只重写显式 source SceneId。
- **project-map.ts**:错排 lattice 2×height 行、sources 单来源可省略冗余矩阵的 canonical 序列化、authoring 放置组视觉/碰撞槽全局唯一所有权校验。

## 验证

- 定向 12 文件:43 套件 **125/125,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。

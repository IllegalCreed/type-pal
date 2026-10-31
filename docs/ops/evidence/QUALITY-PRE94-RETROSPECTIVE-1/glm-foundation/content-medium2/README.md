# content-medium2(中件七文件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「content-medium2(中件七文件)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(2231B,SHA ba155166198a)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2231B / SHA-256 ba155166198a6926b8c31b2453a7119ab9e34ab0d5140f2024ca13157e713893；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-medium2(中件七文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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
```
<!-- incremental-original-source:end -->

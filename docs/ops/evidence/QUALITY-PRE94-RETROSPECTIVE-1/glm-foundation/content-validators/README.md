# content-validators(validate.ts + validate-refs.ts)八维复审批 —— content 包收口批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「content-validators(validate.ts + validate-refs.ts)八维复审批 —— content 包收口批」的治理候选页;证据原件即下方逐字节保全的固定main源(2000B,SHA e013028c4aef)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2000B / SHA-256 e013028c4aef1a8dd0d4e4182ea19ddbdaace373e4b3173bd3431f3a7fd3d597；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-validators(validate.ts + validate-refs.ts)八维复审批 —— content 包收口批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 38(content 包批 9 终批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 73+ 提交)
- Coding Owner:GLM;两大文件全文读毕(validate 1595 / validate-refs 1752)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- **validate.ts**:物品 use effects 组合规则完备(external 独占/傀儡必须 battleOnly/场景与角色效果不混合/scene 目标双向绑定/hideParty 必须 allAllies/consuming 工具不得为自身配方材料);毒表唯一 id 门禁"禁止 Object.fromEntries 静默覆盖";退役字段全部带专用升级诊断再进 unknown-key 门(bg/spriteNum/godId/sprite/battleSpriteNum)。
- **validate-refs.ts**:模块头三层分工声明(形状 vs 跨表 vs 物理文件)准确;coveredBy 指向自己的 warn 附运行时天然不触发论证;敌方施法技能 runtime 支持面闭环(prepare 拒收+逐效果 isEnemyRuntimeSkillEffect);'day' 氛围免检;重复 issue 去重(existingActorIssuePaths/addTargetIssue);poisons "保原文件序勿经 by-id Record 转"防数值键重排的注释与 bundle 类型声明一致。

## 验证

- 定向 2 文件:**16 套件 140/140,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。

## 模块收口

**content 包全部收口**(批 30-38 九批:微型件14/中件4/中件7/领域20/核心5/script+asset/item/authorcore/validators = ~50 文件;整改仅 2 处纯注释:makeEquipMenuEntry 死导出登记 + index.ts 孤儿 docblock)。零整改批占比 7/9。下一站:migrate(6k)→reforge(43k)→editor(39k)→94-102。
```
<!-- incremental-original-source:end -->

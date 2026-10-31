# content-validators(validate.ts + validate-refs.ts)八维复审批 —— content 包收口批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 12 批 38(content 包批 9 终批)的八维复审批回执:对象为 packages/content 的 validate.ts(1595 行)与 validate-refs.ts(1752 行),Coding Owner GLM 全文读毕,裁定为零整改批(B–H 全维通过,零代码/注释改动,工作树零 diff)。本页同时是 content 包全部收口的模块回执。证据原件即下方逐字节保全的固定main源(2000B,SHA 见保全块)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 73+ 提交)。零整改依据:validate.ts 物品 use effects 组合规则完备(external 独占/傀儡必须 battleOnly/场景与角色效果不混合/scene 目标双向绑定/hideParty 必须 allAllies/consuming 工具不得为自身配方材料),毒表唯一 id 门禁『禁止 Object.fromEntries 静默覆盖』,退役字段全部带专用升级诊断再进 unknown-key 门(bg/spriteNum/godId/sprite/battleSpriteNum);validate-refs.ts 模块头三层分工声明(形状 vs 跨表 vs 物理文件)准确,coveredBy 指向自己的 warn 附运行时天然不触发论证,敌方施法技能 runtime 支持面闭环(prepare 拒收+逐效果 isEnemyRuntimeSkillEffect),day 氛围免检,重复 issue 去重(existingActorIssuePaths/addTargetIssue),poisons『保原文件序勿经 by-id Record 转』防数值键重排注释与 bundle 类型声明一致。Codex 当前裁定(2026-10-19)与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向 2 文件 16 套件 140/140、0 failed suites,机器回执 [directed.json](directed.json);`tsc --noEmit -p packages/content` exit 0、工作树零 diff。140 例真实身份:validate-refs 46 例覆盖跨表引用闭包的 warn/error 分级(tilesetRefs 悬空 error、levelUp.skillId warn、E18-1 coveredBy 自指 warn 不 error、entryPoint party 引无 battler actor error、ED-3 缺 buy-shop error 缺 ambience warn、sell shop 不当 ShopDef 边);validate 94 例覆盖形状门(实体 actor⊕sprite 恰一、C8 用途拒绝非法用途 0..13 逐档、投掷数值边界 0..7、消耗型配方工具不得为自身材料、canonical content22 startup model 拒绝旧形状 0..6)。绿结果为该时点定向事实,不外推整包收口。

## 结果

零整改批:B–H 八维全过,零代码/注释改动,工作树零 diff;登记项无新增。模块收口:批 30-38 九批(微型件14/中件4/中件7/领域20/核心5/script+asset/item/authorcore/validators ≈50 文件)整改仅 2 处纯注释(makeEquipMenuEntry 死导出登记+index.ts 孤儿 docblock),零整改批占比 7/9;下一站 migrate(6k)→reforge(43k)→editor(39k)→94-102。本页治理层面不产生新执行结果。

## 限制与复核

未重跑任何命令/测试;两文件行数与九批~50 文件计数为原时点记录未重核;『content 包全部收口』是作者阶段主张,Codex 2026-10-19 裁定本页未获整包/全维收口验收;历史结论保持原时点。

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

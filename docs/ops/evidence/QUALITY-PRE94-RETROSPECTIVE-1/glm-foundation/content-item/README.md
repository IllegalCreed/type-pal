# content-item(item.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「content-item(item.ts)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(1632B,SHA 940ba1111773)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)、[directed.json](directed.json)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1632B / SHA-256 940ba11117738cfa8abeafba850296d54353bf26f677887c2efeb8fca122b50d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-item(item.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 36(content 包批 7)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 71+ 提交)
- Coding Owner:GLM;全文读毕(1215 行)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- live 派生红线族(effectiveResistances/effectiveSkills/effectiveGrantedStatuses/equipGrantsAttackAll/effectiveRegen/effectiveBattleSpriteId):每处都带"严禁 equip 时烙进可变槽——卸装即失效"的红线声明与原版语义锚(UpdateEquipments memset 重跑/RemoveEquipmentEffect)。
- EquipEffect/ItemUseEffect/ThrowEffect 逐 kind 原版 opcode 锚(0x17/0x1A/0x2D/0x42/0x5A/0x5C/0x61/0x62/0x63/0x84/0x8D);regenHp/regenMp"level99 伪毒正名为独立词条"设计决策注。
- gate 语义注释精确到"RandomLong(1,100) < threshold → 阈值 N 成功率 N-1%"与实现一致。
- worldResourceValue collectValue 兼容访问器"不复制进 resources 防两份真相";EQUIPMENT_REMOVAL_ORDER 显式稳定顺序"不依赖对象键插入序"。
- external 效果事务边界(独占效果链)、completeExternalWorldItemUse"外部已成功即使 host 原地改也算已提交"论证。

## 验证

- 定向 3 文件:**17 套件 57/57,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->

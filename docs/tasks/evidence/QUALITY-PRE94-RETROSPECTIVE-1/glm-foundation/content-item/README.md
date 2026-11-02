# content-item(item.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 12 批 36(content 包批 7)的八维复审批回执:对象为 packages/content 的 item.ts,Coding Owner GLM 全文读毕 1215 行,裁定为零整改批(B–H 全维通过,零代码/注释改动,工作树零 diff)。证据原件即下方逐字节保全的固定main源(1632B,SHA 940ba1111773)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 71+ 提交)。本批核心输入是零整改依据六条:live 派生红线族(effectiveResistances/effectiveSkills/effectiveGrantedStatuses/equipGrantsAttackAll/effectiveRegen/effectiveBattleSpriteId)每处带『严禁 equip 时烙进可变槽——卸装即失效』声明与原版语义锚(UpdateEquipments memset 重跑/RemoveEquipmentEffect);EquipEffect/ItemUseEffect/ThrowEffect 逐 kind 原版 opcode 锚(0x17/0x1A/0x2D/0x42/0x5A/0x5C/0x61/0x62/0x63/0x84/0x8D)与 regenHp/regenMp『level99 伪毒正名为独立词条』设计决策注;0x06 概率门『RandomLong(1,100) < threshold → 阈值 N 成功率 N-1%』注释与实现一致;worldResourceValue collectValue 不复制进 resources 防两份真相与 EQUIPMENT_REMOVAL_ORDER 显式稳定顺序;external 效果事务边界(独占效果链)与 completeExternalWorldItemUse『外部已成功即使 host 原地改也算已提交』论证。Codex 当前裁定(2026-10-19)与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向验证 17 套件 57/57、0 failed suites,机器回执 [directed.json](directed.json);另 `tsc --noEmit -p packages/content` exit 0、工作树零 diff。57 例真实身份:item.external.background 6 例证 I6 completeExternalWorldItemUse 残差(unknown-item 拒绝、menuAfterUse close、完整 world 结果=深克隆仅变库存、world 引用合同、I6 兼容壳不结算不消耗);item.test 51 例覆盖 effectiveBattleSpriteId 四层分流、装备 live 派生红线、C8 21 种 effect×world/battle/throw 消费矩阵、大世界自毒/解毒、护体符/大蒜、describeEquipEffects 派生文案。绿结果是该时点定向事实,不外推为整包收口或全仓零诊断。

## 结果

零整改批:B–H 八维全过,零代码/注释改动,工作树零 diff;登记项无新增。本页治理层面原文保全完整、链接处置如实,不产生新执行结果。

## 限制与复核

未重跑任何命令/测试;tsc exit 0 与『零 diff』为原时点自报;README 原文『定向 3 文件』口径与回执 testResults 的 2 个测试文件不同轴,未强行调和;Codex 2026-10-19 裁定本页保留作者阶段证据、未获整包/全维收口验收;历史结论保持原时点。

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

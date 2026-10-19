# content-item(item.ts)八维复审批

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

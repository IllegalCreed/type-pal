# GAME-BATTLE-ITEM-LIVE-INVENTORY-1 — 物品脚本后的库存与标志所有权

Status: draft
Phase: phase1
Capability: battle item script lifetime
Coding Owner: Codex（当前只正式反例）
Reviewer: Codex
Visual Verification Timing: N/A（库存数值；不改页面）
Branch: codex/code-quality-94-102

## 已证事实与机制停止线

[两业务红与来源](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-candidates.json)、[正式三用例源/原生结果/完整raw](../evidence/QUALITY-REVIEW-52-CLOSEOUT-1/game-boundary-native.json.gz)。真实startBattle创建状态，真实runScript执行合法小脚本，完整Win OBJECT由现有owner播种，非mock runner：

- 去掉当前物品库存再补回两个，performItem仍扣旧对象，结果2而非应剩1。
- 0x90清掉当前物品Consuming标志后，performItem仍读静态flags，结果0而非应剩1。
- 普通最后一次使用保留count0条目仍绿，作为不得改变的TS既有库存表示。

SDLPal fight.c::kBattleActionUseItem在脚本后读活wFlags并按id调用PAL_AddItemToInventory；script.c::0x90允许写目标OBJECT字。普通原盘剧情是否遇到两角点未证；没有声称通过Save导入复现。当前只改新增专测，产品item.ts未改。

## 可审阅方案与准入

待用户：脚本后重新查当前库存和活OBJECT消耗标志，再扣本次使用；保留正常零数量行、role目标映射、脚本返回指针和存档格式。仅item.ts、新专测及本卡/父证据，先已存两指定AssertionError再实现。与bus纯重构分提交，全部52稳定后才跑统一门/coverage。该机制取舍属于用户在AGENTS保留的停止线，未获准前不实施、不关闭item文件。

## 交接

2026-10-26：正式R2 1绿2指定业务红；最初两例探索源未冻结但raw/native原样保留，不给予正式source字节信用。新测试暂review并单列额外库存，原52分母不变，Codex继续其它独立范围。

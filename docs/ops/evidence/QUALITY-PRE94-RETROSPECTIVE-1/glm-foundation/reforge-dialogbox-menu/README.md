# 批43:reforge dialog-box / menu-box / menu-session（零整改批）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

pre-94 foundation 模块14批43:对 packages/reforge/src/dialog/dialog-box.ts(490行)、menu/menu-box.ts(652行)、menu/menu-session.ts(544行)三文件全文做 A–H 八维审查,裁决零整改、零 diff。页首 Codex 2026-10-19 裁定:本页保留作者阶段证据,未获整包/全维收口验收。

## 范围与证据

三个生产文件全文读毕;证据原件为下方逐字节保全的固定 main 源(3212B,SHA feb3f2703729);定向验证输入为同目录 directed.json。返工矩阵与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 发现

dialog/dialog-box.ts:槽位共存模型(slot 与 retainSlots 生命周期分离)实现与注释一致;autoAdvance 空格 no-op 对齐 spec §Bug3;先 render 后 update 的次序有理由注释支撑。menu/menu-box.ts:drawSlicedBox 九宫格按各块实际宽高定位(右列卷轴头 33/31>23 右探、回纹主体对齐 R 列),锚 PAL_CreateBox 逐块拼接;drawBoxShadow source-in 保镂空形状;drawScroll 由 nLen 换算宽转 drawSlicedBox,与原单行卷轴逐像素一致;布局推导链 MENU_W=61 由左22+中16+右23 推出(TR 卷轴头探出 3+61+10=74 对齐原版行0),CASCADE_DX/DY=+27/+23 锚 uigame.c 物品子菜单(30,60) vs 主菜单(3,37);MenuBox.portraitFor 懒加载缓存(null=加载中哨兵、portraitErrors 失败重抛不吞错、回落 assets.avatar);statList 数据驱动;装备槽列表来自 content EQUIP_SLOT_IDS 单一真值;EXP 阈值走 battler.leveling.expTable 查表、EXP_TO_NEXT=15 仅兜底(rgLevelUpExp[1])。menu/menu-session.ts:六输入 handler(save-browser/magic/equip/item/status/system/hub)相位机清晰,相位注释带原版锚(DL21 kKeyUp|kKeyLeft、uigame.c:677-681 单人队直进技能网格、PAL_PlayerStatus iCurrent 越界关面板);dispatchItemUse 挂起-恢复合同完整(菜单关闭→执行→场景变更强制 menu:'close'→世界回写→音效→结果呈现→finishUseExecution 恢复或关闭;AbortError 静默、其余错误 toast+恢复 request.state;itemUseFailureText reason→文案映射全覆盖含 default);光标记忆 lastMainCursor/lastMagicCaster/lastUseCursor/lastSystemCursor 均注明原版对应(iCurMainMenuItem/iCurInvMenuItem/iCurSystemMenuItem)。

## 结论

三文件 A–H 全维通过,零整改成立;登记移交无新增(既有登记 drawBattleUI _enemySpace、DialogSprite 同构等维持原状)。定向回执:dialog-box.test.ts+menu-session.test.ts=25/25 通过、numFailedTestSuites=0(directed.json);menu-box 无专属测试文件,经 opening-menu×5/shop-trial 测试族 import 链覆盖 drawSlicedBox/drawScroll 全原语。

## 整改与复核

本治理轮未重跑 25 用例;menu-box 的间接覆盖声明未经独立复验,引用本批证明 menu-box 已测时须注明该边界;原结论保持作者时点;零整改不等于 Codex 独立验收,候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3212B / SHA-256 feb3f2703729fb4abda67fa243db3ae7f7afdcdc2f8ae4b6bf09b26fbe7227ab；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 批43:reforge dialog-box / menu-box / menu-session（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`packages/reforge/src/dialog/dialog-box.ts`（490行全文）、`packages/reforge/src/menu/menu-box.ts`（652行全文）、`packages/reforge/src/menu/menu-session.ts`（544行全文）。八维审查（A正确性/B注释/C内聚/D复用/E测试/F可读/G简单/H可测）全部通过，零整改、零 diff。

## 逐文件结论

### dialog/dialog-box.ts（490行）
- 槽位共存模型（slot 与 retainSlots 生命周期分离）实现与注释一致；autoAdvance 空格 no-op 对齐 spec §Bug3；先 render 后 update 的次序有理由注释支撑。
- 注释质量高：BoxSlot 生命周期、retainSlots 拆分动机、空格推进语义均有出处锚。

### menu/menu-box.ts（652行）
- `drawSlicedBox` 九宫格按各块实际宽高定位（右列卷轴头 33/31>23 右探、回纹主体对齐 R 列），锚 PAL_CreateBox 逐块拼接；`drawBoxShadow` source-in 保镂空形状；`drawScroll` 由 nLen 换算宽转 drawSlicedBox，撑成与原单行卷轴逐像素一致——实现与「统一可切片框原语(design §4)」注释完全一致。
- 布局推导链完整：MENU_W=61 由左22+中16+右23 推出（TR 卷轴头探出 3+61+10=74 对齐原版行0）；CASCADE_DX/DY=+27/+23 锚 uigame.c 物品子菜单(30,60) vs 主菜单(3,37)。
- `MenuBox.portraitFor` 懒加载缓存：null=加载中哨兵、portraitErrors 失败重抛（不吞错）、回落 assets.avatar 有说明；`statList` 数据驱动（加属性=列表多一条）；装备槽列表来自 content EQUIP_SLOT_IDS 单一真值。
- EXP 阈值走 battler.leveling.expTable 查表、EXP_TO_NEXT=15 仅兜底并注明出处（rgLevelUpExp[1]）。

### menu/menu-session.ts（544行）
- 六个输入 handler（save-browser/magic/equip/item/status/system/hub）相位机清晰：每相位注释列键位语义与原版锚（DL21 kKeyUp|kKeyLeft、uigame.c:677-681 单人队直进技能网格、PAL_PlayerStatus iCurrent 越界关面板）。
- `dispatchItemUse` 挂起-恢复合同完整：菜单关闭→执行→场景变更强制 menu:'close'→世界回写→音效→结果呈现→finishUseExecution 恢复或关闭；AbortError 静默、其余错误 toast+恢复 request.state。`itemUseFailureText` reason→文案映射全覆盖含 default。
- 光标记忆三处（lastMainCursor/lastMagicCaster/lastUseCursor/lastSystemCursor）均注明原版对应（iCurMainMenuItem/iCurInvMenuItem/iCurSystemMenuItem）。

## 验证
- 定向测试：`dialog-box.test.ts` + `menu-session.test.ts` = 25/25 通过、numFailedTestSuites=0（menu-box 无专属测试文件，经 opening-menu×5/shop-trial 测试族 import 链覆盖 drawSlicedBox/drawScroll 全原语）。
- 零 diff 批：无源码改动，不适用 body-invariance；typecheck 与 biome 无新输入（源文件未动）。

## 登记移交（无新增）
本批无新清理候选；既有登记（drawBattleUI _enemySpace、DialogSprite 同构等）维持原状。
```
<!-- incremental-original-source:end -->

# E9 - 商店/当铺(openShop 全链:UI + 数据 + 结算)

Status: done(作者点题「商店和当铺都没做」;引擎全链实测,观感对照作者提供的原版截图三轮校正)
Owner: Opus
Reviewer: 用户(原版截图对照:红框/阴影/定高框三处点破)
Phase: phase2
Capability: E9 商店/当铺(新格 —— openShop 曾是 toast 桩)

## 现状起点
引擎 openShop = toast 桩「M3c 落地」;pal 16 场景在用(0x26/0x27 已译指令);
**货单数据没迁**(content 无 shops 表);一阶段 shop-menu/sell-menu 完整 = UX 真值。

## 落地
- **content**:`ShopDef {id, items[]}` + 纯结算 `shopBuy/shopSell/sellableItems`
  (买按 buyPrice 每次 1 个钱不够 null;卖按 **sellPrice**(pal 数据=原版半价,作者可自定义),
  不可卖/没货 null;5 测)。
- **数据**:extracted stores.json → `content/shops.json`(21 家店,oid→字符串 id,
  全部货单物品校验在 items 表)+ manifest 声明;loader 读 shops(缺省空)。
- **引擎 UI(shop-box.ts,坐标 1:1 uigame.c)**:
  - 买 = PAL_BuyMenu 紧凑布局:**红框**(iStyle1,曾误黄框)定高(122,8,190×190,
    货少也撑到底 —— 作者原版截图校)8 行滚动窗;名@(150,21+18i) 价右缘 286;
    ITEMBOX 预览**带影**(itemmenu.c:196 shadow+正色两笔)+「现有」框(背包+全队已装备)
    +「金钱」框。每次买 1 个留菜单;钱不够不进确认。
  - 卖 = PAL_SellMenu 全屏物品 picker(drawItemGridList + **noDesc**)+ 金钱框@(100,150)
    + 售价框@(224,150);卖光一种列表重算。
  - 确认 = PAL_ConfirmMenu(否/是,**默认否**)。
  - **顺手根治**:item-list 的 ITEMBOX `shadow:false` 一直违真值(原版带影)——
    装备/使用/卖三处菜单一并补影。
- **host.openShop 阻塞式**(签名 void → Promise<void>,关店 resolve 脚本继续;
  店不存在报错即回不卡死);输入优先级链头插商店相(先于「脚本演出吞输入」)。
- **编辑器**:shops round-trip(project-io)+ ShopTab(店列表/货单上架下架排序,
  Update/AddShopCommand)+ CommandForm openShop 表单(店下拉带货数 + 买/卖模式)。

## 验证(Playwright,pal)
- ✅ s050 米铺(骆员外)真买:长对话推完 → 买菜单(店 9 八件)→ 确认(默认否→切是)
  → 护心镜 2000:钱 5000→3000、入包、「现有」计数、留菜单续买 → Esc 关店脚本干净收尾。
- ✅ s029 当铺真卖:全屏可卖列表(sellable 过滤)→ 选中显售价 → 卖护心镜:3000→4000、
  出包 → Esc 收尾。
- ✅ 观感三轮对照作者原版截图:红框 / ITEMBOX+卷轴框阴影 / 定高撑底框。
- ✅ pnpm check 全绿(3246 测:content+5)。

## 遗留
- 迁移器 0x26/0x27 翻译已存在;stores 迁移进 shops.json 是一次性脚本(同 C3 模式),
  迁移器本体未动(MG2 红线)。

# E9 - 商店/当铺(openShop 全链:UI + 数据 + 结算)

Status: done(作者点题「商店和当铺都没做」;引擎全链实测,观感对照作者提供的原版截图三轮校正)
Owner: Opus
Reviewer: 用户(原版截图对照:红框/阴影/定高框三处点破)
Phase: phase2
Capability: E9 商店/当铺(新格 —— openShop 曾是 toast 桩)
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是把 openShop 从 toast 桩做成全链商店/当铺的历史功能卡：content 结算模型+21 家店数据迁移+引擎 UI（坐标 1:1 uigame.c）+阻塞式 host+编辑器作者面；观感经用户原版截图三轮校正。

## 目标

商店/当铺全链可用：pal 16 场景在用的 0x26/0x27 指令落地为真实买卖 UI 与结算；一阶段 shop-menu/sell-menu 为 UX 真值。

## 范围

- 范围内：ShopDef{items[]} 与纯结算 shopBuy/shopSell/sellableItems（5 测）；stores.json→content/shops 21 家店迁移（oid→字符串 id，货单全校验）+manifest 声明+loader；shop-box.ts 买（PAL_BuyMenu 红框定高 190×190、8 行滚动、名/价/ITEMBOX 带影预览/「现有」「金钱」框）卖（全屏 picker noDesc+金钱/售价框）确认（默认否）；host.openShop void→Promise<void> 阻塞式、输入优先级链头插；编辑器 shops round-trip+ShopTab+openShop 表单。
- 范围外：迁移器本体（0x26/0x27 已译、stores 一次性脚本同 C3 模式，MG2 红线）；一阶段菜单之外的机制再考证。

## 前提与证据

观感三处点破均对照作者提供的原版截图修正：红框（iStyle1，曾误黄框）、ITEMBOX 预览带影（itemmenu.c:196 shadow+正色两笔，装备/使用/卖三处菜单一并补影违真值的 shadow:false）、定高框货少也撑到底。卖价用 sellPrice（pal 数据=原版半价，作者可自定义）。
- 当前状态：done（历史终态；观感微调留用户）

## 验收

原卡记录（Playwright,pal）：s050 米铺真买护心镜 2000（5000→3000、入包、留菜单续买、Esc 干净收尾）；s029 当铺真卖（3000→4000、出包、卖光重算列表）；观感三轮对照；pnpm check 全绿（3246 测：content+5）。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡遗留仅迁移器本体未动（MG2 红线内的一次性脚本）；观感终审归用户。本页治理不重开。

## 历史范围

2026-07 前后 W/E 能力格推进窗口（原卡未单列日期，按其实测记录时点读取）；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：openShop 全链（UI+数据+结算+编辑器）经引擎实测与三轮截图校正收口。原卡全文在下方 quote 保全。

## 当时证据

uigame.c 坐标 1:1、itemmenu.c:196 阴影真值、PAL_Buy/Sell/ConfirmMenu 形态锚点；s050/s029 Playwright 实测。本页治理未新增执行。

## 当前有效性

historical。商店现行行为与数据以当前 content/reforge 代码为准；夜色等观感调校属当时用户验收。

## 继任文档

同窗口能力卡 W6/C3 等；编辑器商店作者面现行形态以 ShopTab 实现为准。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `664233d4b50bd37ca38573adb38752700d05977c70ee18bb22b0444b8d83b3c8`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # E9 - 商店/当铺(openShop 全链:UI + 数据 + 结算)
>
> Status: done(作者点题「商店和当铺都没做」;引擎全链实测,观感对照作者提供的原版截图三轮校正)
> Owner: Opus
> Reviewer: 用户(原版截图对照:红框/阴影/定高框三处点破)
> Phase: phase2
> Capability: E9 商店/当铺(新格 —— openShop 曾是 toast 桩)
>
> ## 现状起点
> 引擎 openShop = toast 桩「M3c 落地」;pal 16 场景在用(0x26/0x27 已译指令);
> **货单数据没迁**(content 无 shops 表);一阶段 shop-menu/sell-menu 完整 = UX 真值。
>
> ## 落地
> - **content**:`ShopDef {id, items[]}` + 纯结算 `shopBuy/shopSell/sellableItems`
>   (买按 buyPrice 每次 1 个钱不够 null;卖按 **sellPrice**(pal 数据=原版半价,作者可自定义),
>   不可卖/没货 null;5 测)。
> - **数据**:extracted stores.json → `content/shops.json`(21 家店,oid→字符串 id,
>   全部货单物品校验在 items 表)+ manifest 声明;loader 读 shops(缺省空)。
> - **引擎 UI(shop-box.ts,坐标 1:1 uigame.c)**:
>   - 买 = PAL_BuyMenu 紧凑布局:**红框**(iStyle1,曾误黄框)定高(122,8,190×190,
>     货少也撑到底 —— 作者原版截图校)8 行滚动窗;名@(150,21+18i) 价右缘 286;
>     ITEMBOX 预览**带影**(itemmenu.c:196 shadow+正色两笔)+「现有」框(背包+全队已装备)
>     +「金钱」框。每次买 1 个留菜单;钱不够不进确认。
>   - 卖 = PAL_SellMenu 全屏物品 picker(drawItemGridList + **noDesc**)+ 金钱框@(100,150)
>     + 售价框@(224,150);卖光一种列表重算。
>   - 确认 = PAL_ConfirmMenu(否/是,**默认否**)。
>   - **顺手根治**:item-list 的 ITEMBOX `shadow:false` 一直违真值(原版带影)——
>     装备/使用/卖三处菜单一并补影。
> - **host.openShop 阻塞式**(签名 void → Promise<void>,关店 resolve 脚本继续;
>   店不存在报错即回不卡死);输入优先级链头插商店相(先于「脚本演出吞输入」)。
> - **编辑器**:shops round-trip(project-io)+ ShopTab(店列表/货单上架下架排序,
>   Update/AddShopCommand)+ CommandForm openShop 表单(店下拉带货数 + 买/卖模式)。
>
> ## 验证(Playwright,pal)
> - ✅ s050 米铺(骆员外)真买:长对话推完 → 买菜单(店 9 八件)→ 确认(默认否→切是)
>   → 护心镜 2000:钱 5000→3000、入包、「现有」计数、留菜单续买 → Esc 关店脚本干净收尾。
> - ✅ s029 当铺真卖:全屏可卖列表(sellable 过滤)→ 选中显售价 → 卖护心镜:3000→4000、
>   出包 → Esc 收尾。
> - ✅ 观感三轮对照作者原版截图:红框 / ITEMBOX+卷轴框阴影 / 定高撑底框。
> - ✅ pnpm check 全绿(3246 测:content+5)。
>
> ## 遗留
> - 迁移器 0x26/0x27 翻译已存在;stores 迁移进 shops.json 是一次性脚本(同 C3 模式),
>   迁移器本体未动(MG2 红线)。
<!-- original-source-quote:end -->

# E9 - 商店/当铺(openShop 全链:UI + 数据 + 结算)

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done(作者点题「商店和当铺都没做」;引擎全链实测,观感对照作者提供的原版截图三轮校正)`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `664233d4b50bd37ca38573adb38752700d05977c70ee18bb22b0444b8d83b3c8`；下方 quote 可逆回原始 UTF-8 字节。
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

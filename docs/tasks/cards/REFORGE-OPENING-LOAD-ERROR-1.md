# REFORGE-OPENING-LOAD-ERROR-1 — 标题读档IO失败的悬空拒绝

Status: draft
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把当前 ops task card 接入 `task-card-v1`。原缺陷登记迁入说明、有限范围与未决项在 quote 中逐字保全；本次只改变文档结构与可追溯边界，不改变产品、测试、E2E 或用户裁决，不推进状态。

## 目标

- 核实标题读档入口如何承接真实存储 Promise rejection：真实存储读 Promise 允许拒绝，但标题菜单 `void enterLoad()` 未承接读取 meta/thumb 与缩略图解码异常。目标是失败由菜单生命周期显式承接，不悬空、不误报读档成功。
- 本卡是 2026-10-01 已登记的 D-Q01-1 迁入当前 main 的现行入口摘要，不是 O/P/Q 收口追加的新任务；O/P/Q 测试卡关闭不关闭这个产品缺陷。

## 范围

- 只记录标题读档真实IO拒绝的产品缺陷与设计前提；不借测试卡关闭或文档治理授权修改菜单、存档格式或错误交互。

## 状态与交接

- draft，无产品 build 准入。原独立诊断以合法 typed 存档、m01 meta、有效 PNG 经真实 MemorySaveStore 写读，仅让 getThumb 外部 IO 拒绝，结果 1 断言绿 + 1 未处理拒绝 exit1（当时 content20/SAVE8）；本次迁移未重新运行该产品诊断或实现修复，Kimi 7faa9e7b 短审在当前 21/10 为静读证据。
- 错误通知/画屏/重试与迟到 ImageBitmap 释放方案仍待独立设计与必要用户取舍；未授权修改 opening-menu/store、save schema、公共接口或真实存档/PAL 数据。

## 前提与证据

- `packages/reforge/src/save/store.ts:116-139`（IndexedDB 错误分支）；`packages/reforge/src/opening-menu.ts:113-121,138`；`packages/reforge/src/main.ts:460-518`。
- 原完整卡、真值矩阵、诊断与交接固定于 `9ae1116e…`（quote 内链接保留）；最强替代解释（非法旧档/坏 PNG）已被原合法输入排除。

## 验收

- 合法typed档、meta与有效PNG背景下的getThumb拒绝必须被生命周期承接；原1断言通过加1未处理拒绝是失败诊断，不是修复通过。
- 本次只接受文档表达；原任务Status、用户裁决和未跑边界不变。

## 原文保全

固定 source revision `fb83030c29ad9599c4135950d552d7c75ab3009f`，source SHA `855f682c2c45c3e30e2defd575b922aa3e4b406486739b8584c6569e41d22e20`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # REFORGE-OPENING-LOAD-ERROR-1 — 标题读档IO失败的悬空拒绝
>
> Status: draft
> Phase: phase2
> Capability: runtime-io / opening-load-error
> Coding Owner: Unassigned（Codex后续窄准入）
> Reviewer: Codex
> Visual Verification Owner: Codex
> Visual Verification Timing: dev-functional
>
> ## 原有缺陷登记迁入当前main
>
> 本卡是2026-10-01已登记的D-Q01-1，不是O/P/Q收口追加的新任务。[原完整卡、真值矩阵、诊断与交接](https://github.com/IllegalCreed/type-pal/blob/9ae1116ec01308ef29f0b08c98f29ab1898ad034/docs/ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md)原样保留；本页是现行入口摘要，不追溯修改原报告。
>
> 前提：真实存储读Promise允许拒绝，但标题菜单的`void enterLoad()`未承接读取meta/thumb、缩略图解码异常。
> primary为`packages/reforge/src/save/store.ts:116-139`的IndexedDB错误分支、`opening-menu.ts:113-121,138`与`main.ts:460-518`真实调用。第一阶段机制/格式N/A；二阶段只核异步错误边界，遵守[READ-FIRST](../../phase2/READ-FIRST.md)。
> 原独立诊断用合法typed存档、m01 meta、有效PNG经真实MemorySaveStore写读，再仅让getThumb外部IO拒绝，结果1断言绿但1未处理拒绝/exit1，不拿reporter success=true当通过。原诊断是当时content20/SAVE8；Kimi的7faa9e7b短审在当前21/10静读，**本次测试收口没有重新运行该产品诊断或实现修复**。
>
> 最强替代解释为非法旧档/坏PNG；原合法输入排除它。若最新真实入口已catch/桥接外层Promise并收尾，或存储接口承诺永不拒绝，则推翻结论；产品开工前必须重新核最新main及Owner。
>
> ## 有限范围与未决项
>
> 目标是失败由菜单生命周期显式承接，不悬空、不误报读档成功。错误通知/画屏/重试与迟到ImageBitmap释放方案仍待独立设计与必要用户取舍。
> 没有产品build准入，不授权修改opening-menu/store、save schema、公共接口、兼容旧开发版本、真实存档/PAL数据、剧情或E2E。
> 原Kimi限额短审是设计/只读证据，不是实现accept；不续派它，不把本页变成新额度任务。
>
> 下一步由Codex单独核当前合法IO反例、生命周期与错误呈现方案，再决定build；先红后绿/零未处理拒绝/正常读档与返回回归/功能UI最小验证/静态零诊断不可省。
> 无下一位产品Agent提示词，保持draft。O/P/Q测试卡关闭不关闭这个产品缺陷，见[冻结交付入口](../../testing/archive/legacy/batches/glm-tenfold-triple/README.md)。
>
<!-- original-source-quote:end -->

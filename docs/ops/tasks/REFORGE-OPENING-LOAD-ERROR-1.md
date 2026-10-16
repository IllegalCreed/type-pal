# REFORGE-OPENING-LOAD-ERROR-1 — 标题读档IO失败的悬空拒绝

Status: draft
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把当前 ops task card 接入 `task-card-v1`。原目标、范围、前提真值、owner、状态、证据、counter、返工和交接内容在 quote 中保全；本次只改变文档结构与可追溯边界，不改变产品、测试、E2E 或用户裁决。

## 目标

- 核实标题读档入口如何承接真实存储 Promise rejection，避免悬空拒绝、误报读档成功，并在重新核定前提后决定是否进入产品 build。
- 当前状态：`Status: draft`；状态由本卡顶部和任务看板共同解释，本次迁移不推进状态。

## 范围

- 当前包含：原卡声明的实现/测试/E2E/视觉/文档范围及其一手锚点。
- 明确不包含：本次不扩大产品范围、不补造执行证据、不改历史任务状态、不把静态文档迁移当 runtime/E2E/视觉/coverage 验收。

## 前提与证据

- 行为/工程前提：核实标题读档入口如何承接真实存储 Promise rejection，避免悬空拒绝、误报读档成功，并在重新核定前提后决定是否进入产品 build。
- 一手证据：docs/ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md:1；docs/ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md:11；docs/ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md:21；对应代码、内容、E2E 或测试 consumer 由 quote 与原卡链接保留。
- 最强替代解释与可证伪观察：若当前 consumer、合法输入或最新源码推翻上述边界，必须回到本卡重新核前提；不能用旧回执数字补齐缺口。
- 当前状态：draft。本页治理检查口径要求 contentVersion=22 / SAVE12；源卡中较早版本标记只属于其日期范围，未被本次迁移重新认证。

## 验收

- 功能/文档：按原卡验收条件、source:line、caller、合法输入和 business oracle 执行；本次迁移只验 source/after SHA、模板章节、链接和 quote 可逆性。
- 测试与证据：packages/reforge/src/save/store.ts:116-139；packages/reforge/src/opening-menu.ts:113-121,138；packages/reforge/src/main.ts:460-518；历史回执、数量、覆盖率和旧 accept 不能单独证明当前通过。
- 视觉或 E2E（如适用）：遵守原卡的 deferred/functional 约束；未在本批重新执行的 runtime、E2E、视觉、coverage 信用均为 0。

## 状态与交接

- 当前 Owner：按原卡 Owner/贡献者与当前看板；文档治理 Owner 为 Codex。
- 阻塞/决策：当前仍 draft、无产品 build 准入；旧诊断只证明当时合法输入下的悬空拒绝观察，未在最新 main 重新运行，也没有得到错误呈现/重试/接口取舍授权。
- 下一步：当前仍 draft、无产品 build 准入；旧诊断只证明当时合法输入下的悬空拒绝观察，未在最新 main 重新运行，也没有得到错误呈现/重试/接口取舍授权。 由当前 task card、fresh evidence 和独立验收闭合后再推进状态。

## 当前有效性

draft。当前仍 draft、无产品 build 准入；旧诊断只证明当时合法输入下的悬空拒绝观察，未在最新 main 重新运行，也没有得到错误呈现/重试/接口取舍授权。
- 文档治理只证明结构、来源和状态边界；不授产品实现、runtime、E2E、视觉或 coverage 信用。

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

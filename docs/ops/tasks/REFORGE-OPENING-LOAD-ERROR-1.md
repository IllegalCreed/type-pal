# REFORGE-OPENING-LOAD-ERROR-1 — 标题读档IO失败的悬空拒绝

Status: draft
Phase: phase2
Capability: runtime-io / opening-load-error
Coding Owner: Unassigned（Codex后续窄准入）
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional

## 原有缺陷登记迁入当前main

本卡是2026-10-01已登记的D-Q01-1，不是O/P/Q收口追加的新任务。[原完整卡、真值矩阵、诊断与交接](https://github.com/IllegalCreed/type-pal/blob/9ae1116ec01308ef29f0b08c98f29ab1898ad034/docs/ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md)原样保留；本页是现行入口摘要，不追溯修改原报告。

前提：真实存储读Promise允许拒绝，但标题菜单的`void enterLoad()`未承接读取meta/thumb、缩略图解码异常。
primary为`packages/reforge/src/save/store.ts:116-139`的IndexedDB错误分支、`opening-menu.ts:113-121,138`与`main.ts:460-518`真实调用。第一阶段机制/格式N/A；二阶段只核异步错误边界，遵守[READ-FIRST](../../phase2/READ-FIRST.md)。
原独立诊断用合法typed存档、m01 meta、有效PNG经真实MemorySaveStore写读，再仅让getThumb外部IO拒绝，结果1断言绿但1未处理拒绝/exit1，不拿reporter success=true当通过。原诊断是当时content20/SAVE8；Kimi的7faa9e7b短审在当前21/10静读，**本次测试收口没有重新运行该产品诊断或实现修复**。

最强替代解释为非法旧档/坏PNG；原合法输入排除它。若最新真实入口已catch/桥接外层Promise并收尾，或存储接口承诺永不拒绝，则推翻结论；产品开工前必须重新核最新main及Owner。

## 有限范围与未决项

目标是失败由菜单生命周期显式承接，不悬空、不误报读档成功。错误通知/画屏/重试与迟到ImageBitmap释放方案仍待独立设计与必要用户取舍。
没有产品build准入，不授权修改opening-menu/store、save schema、公共接口、兼容旧开发版本、真实存档/PAL数据、剧情或E2E。
原Kimi限额短审是设计/只读证据，不是实现accept；不续派它，不把本页变成新额度任务。

下一步由Codex单独核当前合法IO反例、生命周期与错误呈现方案，再决定build；先红后绿/零未处理拒绝/正常读档与返回回归/功能UI最小验证/静态零诊断不可省。
无下一位产品Agent提示词，保持draft。O/P/Q测试卡关闭不关闭这个产品缺陷，见[冻结交付入口](../../testing/glm-tenfold-triple/README.md)。

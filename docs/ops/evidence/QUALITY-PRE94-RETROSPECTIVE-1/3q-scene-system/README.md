# CODE3q scene-system 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3q scene-system 当前复审切片」的治理候选页;证据原件即下方逐字节保全的固定main源(2286B,SHA c8167d6fb3d9)。

## 来源与输入

来源为固定Git载体,非本次运行;原1个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../scene-quality/README.md)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2286B / SHA-256 c8167d6fb3d9832bf8dfab0c52214d4a9d08d82b6aaa358d6344b2221c82167a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3q scene-system 当前复审切片

基点：`95b9eb88f`；分支：`codex/code-quality-3y`。本片重新复审 scene-system 移动/碰撞/触发与场景加载，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。3q 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/core/scene-system.ts`（662 行）与 `scene-system.test.ts`（2064 行），另读 `scene-system-search.test.ts`、`mode.test.ts` 和 dependency ownership 相邻合同。caller 逐段读取 `mode.ts` 的 tick 顺序、`event-system.ts` 的 trigger/autoScript/loadScene/onEnter 接线、`bootstrap.ts` 的 scene asset/map 注入；primary 核对 `play.c:25-238,362-591`、`scene.c:512-847`、`map.c:277-299`、`res.c:229-301`、`global.h:75-121,512-531`。

核对轴：方向键最后按下优先、半 tile 16×8 步长、菱形 bit13 obstacle、fCheckRange 屏幕边缘、sState>=2 blocker、triggerMode 4..8 距离、vanish/复活、13-cell Confirm Search、NPC/party 朝向与站立帧、camera/trail、scene index/map identity、onEnter/cursor resume、TouchFar 首帧移动和场景加载冻结。未发现新的可证伪实现缺陷；contact trigger 不阻挡、mode 阈值、下边界和搜索反直觉阈值均由 primary 与回归合同固定，未凭直觉改写。

验证：scene-system/search/mode/dependency/event 相邻共 `5 files / 467 passed`；输出包含既有 fixture 的预期 warning（未知 label、无当前对象、越界 scene object、脚本 IP 越界），因此运行时诊断未清零。未修改 scene-system 实现；`pnpm --filter @type-pal/game typecheck` 仍通过。coverage、official ratchet、protected fast、全仓 `pnpm check` 未在此小批运行；剧情视觉/E2E也不由纯机制测试代签。

高风险边界：触及第一阶段移动、碰撞、触发和场景加载语义；没有修改坐标/scene 数据、schema/save、生成物、UI 或 runner。3q 仍需统一门和诊断收口。

2026-10-24后继：原主测试“均高判别力”结论已被边界/墙体/onEnter三组旧绿新红推翻，关闭信用撤review；当前拆分与八维补齐见[场景质量返工](../scene-quality/README.md)。本页467例及旧读域保留历史，不作为当前零诊断或整卡验收。
```
<!-- incremental-original-source:end -->

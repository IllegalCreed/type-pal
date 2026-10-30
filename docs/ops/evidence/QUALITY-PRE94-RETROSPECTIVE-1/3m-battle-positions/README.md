# CODE3m battle positions 只读复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3m battle positions 只读复审切片」的治理候选页;证据原件即下方逐字节保全的固定main源(1214B,SHA 8aa142490476)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1214B / SHA-256 8aa1424904762b4242244cf381ebeb83f62359b1ceef48eb8549d8304a7ae30f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3m battle positions 只读复审切片

基点：`1ad2451d4`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 197 ahead`。本片是高风险 CODE-QUALITY-3m 的只读坐标小切片，不改战斗行为、公式、存档或公共接口。

完整读取 `battle-positions.ts`，核真实 caller：`battle-state.ts` 初始 fighter pos、`battle-opcodes.ts` 动态阵型、`draw-battle-sprites.ts`/`draw-battle-ui.ts` anchor 和 `present-battle.ts` 数字/精灵定位；读取 `battle-state.test.ts` 的位置/EnemyPos fixture 与 SDL `battle.c:27,903-939`、`global.h:401-404` primary。1/2/3 人队伍坐标逐项对齐；4/5 人是代码明确记录的 fallback 扩展，不冒充 SDL 原表；EnemyPos 缺失、enemyCount/index 越界均返回 fallback/undefined，未发现直接缺陷。

验证：按位置/EnemyPos 关键词定向执行 `battle-state.test.ts`，`1 passed / 13 skipped`（其余测试与坐标无关），结果无 stderr；game typecheck 未见诊断。coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到大模块收口。3m 其它公式、magic damage、status、queue、RNG 文件仍 pending，整卡不关闭。

```
<!-- incremental-original-source:end -->

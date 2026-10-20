# 守卫叶补测 r3 独立接收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-CONTENT-GUARDS-2 r3 独立接收（2026-09-26，Codex；候选 `09c8ccba`/测试正文 `a3ab195a`，基线 `7d64de13`）：**accept，C1/C2 全部闭合**；集成收口 `d1e99a0d` 后 Codex 核定 done。

## Scope

- 仅复核 r2 counter（C1 实参同对象、C2 合法 turn 同型正控）；已闭项不重开，不改 GLM 测试语义。

## Execution and assertions

- **C1 闭**：enemy-validation-shapes.leaf/battle-choreography.leaf record/exactKeys/fullInput/body 直入口都比生产所消费对象；坏数组/坏键对象独立快照；本席冻结工具未改：control 91 绿；record 改写 84/91、cue 改写 90/91、路径污染 90/91、exactKeys 改写 89/91、body 删项 90/91、嵌套 turn 恒拒 89/91 六针全由候选自身 AssertionError 检出；判据原反例与 exit2/null 继续拒绝
- **C2 闭**：not(turn>=1) 与 when(turn>=1) 经相同入口先通过、坏例只改 op；G6 参数表明确 good/bad、未知 kind 有合法正控；独立运行作者原工具：判据 10 自测+91 绿对照+六针逐一业务红且恰目标 fullName，load 见证与产品 hash 保持
- **门**：候选全 content 79 文件 957/957 及 TC 通过；改动 Biome 0 error（4 个源码字符串模板针 warning）；docs/diff 通过；ef19ae7e..09c8ccba 仅三新测试/fixture/专属证据/任务卡作者块，三产品守卫/scripts 零 diff
- **集成收口**：d1e99a0d 合并候选，保留 GLM 三测试/fixture/回执语义原样（只机械适配归档链接，任务卡冲突保留双方历史全文）；串行全仓 check 8,896、官方 ratchet、保护 7d64de13 单次 strict-fast 8,404 均 exit0（并集机账见 codex-content-resources/evidence.json）；三守卫直接行/分支 113/113 与 114/114；直模块增量 19L/29B 与作者包级 20L/30B 不混写；正式基线为两批并集

## Results

- GLM 为测试贡献者，独立验收由 Codex 完成；视觉 N/A，未把 full/Q1/Q2 或远端 CI 计入本卡。

## Evidence

- 证据路径：本回执正文（quote 保全）；/tmp 与 /var/folders 日志按原文时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r3 接收+收口 | 2026-09-26 | C1/C2 闭合+统一门 | accept→done（d1e99a0d） | r2 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的守卫叶 r3 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：C1 七处实参同对象、C2 合法 turn 同型正控；六针全检出；统一门 exit0；done。

## 当时证据

六针数字、白名单与并集口径在 quote 保全。

## 当前有效性

historical。done 按当时任务范围。

## 继任文档

当前结论归 TEST-GLM-CONTENT-GUARDS-2 完成卡。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `cfc3ad850594b987967eba92f09c53dafe8b997fc38172df69452d8d72097eb0`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 守卫叶补测 r3 独立接收
>
> 2026-09-26，Codex；候选`09c8ccba`（测试正文`a3ab195a`），基线`7d64de13`。
> **accept，C1/C2全部闭合**；[任务卡](../../../../../ops/archive/tasks/done/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)。
> 仅复核[r2 counter](guard-leaf-r2-review.md)，已闭项未重开，不改GLM测试语义。
>
> - C1：`enemy-validation-shapes.leaf.test.ts` record/exactKeys均传同一具名对象或helper参数；
>   `battle-choreography.leaf.test.ts` fullInput/body直入口也比生产所消费对象，坏数组/坏键对象有独立快照。
> - C2：not(turn>=1)与when(turn>=1)经相同入口先通过，坏例只改op；G6参数表明确good/bad，未知kind有合法正控。
> - 本席冻结工具未改：control91绿；record改写84/91、cue改写90/91、路径污染90/91、exactKeys改写89/91、
>   body删项90/91、嵌套turn恒拒89/91，六针全由候选自身AssertionError检出。判据原反例和exit2/null继续拒绝。
> - 独立运行作者原工具：判据10自测、1个91绿对照、6针逐一业务红且恰目标fullName，load见证与产品hash保持。
> - 候选全content79文件957/957及TC通过；改动Biome0 error（4个源码字符串模板针warning），docs/diff通过。
> - `ef19ae7e..09c8ccba`仅三新测试、fixture、专属证据和任务卡作者块；三个产品守卫/scripts零diff。
>
> 证据：`/tmp/codex-guard-leaf-r3-{witnesses,mutants,content,biome}.log`；
> 本席见证原始JSON目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-guard-leaf-review-y2ehtI`，
> 作者反控独立复跑输出`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-guard-leaf-mutants-qd3Far`。
>
> 接收后与[Codex资源补测](../../batches/codex-content-resources/README.md)合并跑一次统一门，不重复争用coverage。
> GLM为测试贡献者，独立验收由Codex完成；视觉N/A，未把full/Q1/Q2或远端CI计入本卡。
>
> ## 集成收口
>
> `d1e99a0d`合并候选；保留GLM三测试/fixture/专属回执语义原样（收口只机械适配任务卡归档链接），合并任务卡冲突时保留双方历史全文。
> 本席串行全仓check8896、官方ratchet、保护7d64de13单次strict-fast8404均exit0；
> 详见[并集机账](../../batches/codex-content-resources/evidence.json)。三守卫直接行/分支达到113/113与114/114；
> 不把直模块增量19L/29B和作者包级20L/30B混写。正式基线为两批并集，不复跑两份官方统计。
> Codex核定本卡done；无需GLM再返工或固定席位签字。
>
<!-- original-source-quote:end -->

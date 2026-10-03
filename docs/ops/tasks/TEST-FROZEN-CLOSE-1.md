# TEST-FROZEN-CLOSE-1 — GLM/Kimi/Grok/Cursor 已交付测试有限收口

Status: build
Owner: Codex
Reviewer: Codex（历史独立审核与当前实跑，不冒称外部复签）
Phase: mixed / ops
Capability: test-coverage / retirement
Visual Verification Timing: N/A（历史功能视觉按未变条件复用）

## 用户授权与边界

用户追加[全仓测试质量审计](AUDIT-TEST-QUALITY-1.md)，要求排查低效、可合并重复和垃圾测试/反控；此项纳入当前收口目标，审计结论闭合后再最终合并。错误/过期过程材料已按授权从工作树移除，历史仅留Git，不常驻失败原件。

用户冻结O/P/Q并要求通过后推送/关卡/清分支，明确批准16历史保护账与两旧输入窄修；2026-10-03又要求图中L/M/N未完则补完、完成后合并删分支，并追加完成所有已交付测试（明确含GLM、Kimi、Grok、Cursor）的审核、合并推送、分支清理和CI核验目标。Codex build allowed，唯一Owner在隔离 `codex/opq-frozen-integration-r1`；main/作者树只读直到正式合入。保留并行8efe048610fab7aa4a257a716b91ece30194eba8/content22/SAVE11。
不增加合同、配额、旧兼容、产品改动、ignore、规则放宽或timeout。只接收现行合法的新测/专属fixture，失效合同保留Git历史，不要求作者无限改写。

## 固定交付

L69b56cc388bbd0c0b7632d7ed59154461dd0410b/Mb59f1738f56f153a3c6d80b5f7dee1bcf27f7fae/Ndbbdc9569e22249411dc680b3a50c5826edd0345，历史独立accept/反控/视觉见[原件](https://github.com/IllegalCreed/type-pal/tree/9ae1116ec01308ef29f0b08c98f29ab1898ad034/docs/testing/glm-next-triple)，仅导入42新test/fixture，不merge旧产品。当前L67/M30/N53绿；L夹具版本改官方常量，M删除消失的状态转移API一例。
O/P/Q固定作者SHA/83文件及759旧回归账见[冻结证据](../../testing/glm-tenfold-triple/README.md)，不称759语义净新。22/11淘汰O3旧合同、P03强耦合旧stateMachine/cursorHandoff整文件、Q3旧state cursor合同；Q剩余resolver签名/消息/非oracle字段机械适配。稳定片段保留历史，不将整文件退出称所有业务unreachable；不新增替代case，最终逐身份账另存。
Kimi42b3d303de3f2178e249b4ccbabf967e0affd194两文件16例，当前新main50/50（含相邻34）已绿，正式接入本轮另证。

## 两旧输入与必要门

2026-10-03最终18683全仓check/静态3892文件零已过；第一次官方ratchet拒收migrate.functions 360/410<364/414（比例87.80<87.92），未更新基线。现行模型退役4个已覆盖函数，比例仍不得降低。Codex必要门窄维护：`pal-assets.test.ts:451-465/:548-569`已证两公共formatter，但重资源整文件不进fast；新增一个无IO fast伴随合同复用同输入/全部字段顺序断言，保留旧测试，不称语义净新。公共纯格式API的生产caller目前N/A（实际只见旧整合测试引用），不伪造CLI调用、不改变覆盖范围/规则或引入PAL数据依赖。先定向/类型/受影响migrate全包，再官方ratchet/strict；原失败保留。

[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md)：I06随机输入固定，透明像素臂两次同45命中；PAL六旧例业务断言不改，完整PNG/256色表/按精灵声明与实际两地图tile IDs派生的canonical gzip RLE，catalog来源/路径/bytes/hash一致。自有migrated目录暂移、6/6测试、finally恢复；不动真实PAL，空白外部IO非视觉oracle，真实AssetResolver/hash/gzip/RLE照跑。
七包typecheck及静态error/warning/info全零；定向/相邻与全仓check→官方ratchet→原目标main完整SHA受保护strict-fast，source/每包/总比例/其它测试保护不变，不回调新基线、不相加私有百分比，不追85%新包。

## 收口与退休条件

全部门通过才main合入/推送、关闭实际完成卡。GLM六波及Kimi/Grok/Cursor本轮已交付测试分支退休前verify精确tip的可恢复bundle、所有非依赖ignored、无改动/在途PR；远端完整SHA lease原子删除，本地比较SHA删除。独立产品draft和其它产品Owner不在测试退休授权内；关联只读审查分支须先保存其全部证据并确认不含未接收产品实现。
无下一位贡献者提示词，Codex连续完成；当前不是done，未删除任何作者目录。

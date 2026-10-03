# TEST-FROZEN-CLOSE-1 — GLM/Kimi/Grok/Cursor 已交付测试有限收口

Status: done
Closed Evidence: main d8a81d4c21a32efa3c140fb5858c83465b01bc5e; GitHub Documentation 37145486289 + Coverage 37145486286 success (2026-10-04); finite regression admission after audit, not historical quota fulfillment.
Owner: Codex
Reviewer: Codex（历史独立审核与当前实跑，不冒称外部复签）
Phase: mixed / ops
Capability: test-coverage / retirement
Visual Verification Timing: N/A（历史功能视觉按未变条件复用）

## 用户授权与边界

用户追加[全仓测试质量审计](AUDIT-TEST-QUALITY-1.md)，要求排查低效、可合并重复和垃圾测试/反控；此项纳入当前收口目标，审计结论闭合后再最终合并。错误/过期过程材料已按授权从工作树移除，历史仅留Git，不常驻失败原件。

用户冻结O/P/Q并要求通过后推送/关卡/清分支，明确批准16历史保护账与两旧输入窄修；2026-10-03又要求图中L/M/N未完则补完、完成后合并删分支，并追加完成所有已交付测试（明确含GLM、Kimi、Grok、Cursor）的审核、合并推送、分支清理和CI核验目标。Codex build allowed，唯一Owner在隔离 `codex/opq-frozen-integration-r1`；main/作者树只读直到正式合入。保留并行8efe048610fab7aa4a257a716b91ece30194eba8/content22/SAVE11。
不增加合同、配额、旧兼容、产品改动、ignore或质量规则放宽。覆盖率收集 workflow 的 20 分钟宿主上限已按用户授权提高到 30 分钟，未改变测试范围或质量阈值；只接收现行合法的新测/专属fixture，失效合同保留Git历史，不要求作者无限改写。

## 固定交付

L69b56cc388bbd0c0b7632d7ed59154461dd0410b/Mb59f1738f56f153a3c6d80b5f7dee1bcf27f7fae/Ndbbdc9569e22249411dc680b3a50c5826edd0345，历史独立accept/反控/视觉见[原件](https://github.com/IllegalCreed/type-pal/tree/9ae1116ec01308ef29f0b08c98f29ab1898ad034/docs/testing/glm-next-triple)，仅导入42新test/fixture，不merge旧产品。当前L67/M30/N53绿；L夹具版本改官方常量，M删除消失的状态转移API一例。
O/P/Q固定作者SHA/83文件及759旧回归账见[冻结证据](../../../../testing/glm-tenfold-triple/README.md)，不称759语义净新。22/11淘汰O3旧合同、P03强耦合旧stateMachine/cursorHandoff整文件、Q3旧state cursor合同；Q剩余resolver签名/消息/非oracle字段机械适配。稳定片段保留历史，不将整文件退出称所有业务unreachable；不新增替代case，最终逐身份账另存。
Kimi42b3d303de3f2178e249b4ccbabf967e0affd194两文件16例，当前新main50/50（含相邻34）已绿，正式接入本轮另证。

## 两旧输入与必要门

2026-10-03最新 main 合入后的冻结树全仓 check 已通过：content 1490、shared 113、game 3224、pal-extract 377、reforge 8569、editor 4761、migrate 670，共 19204 例；lint 3128 文件 0/0/0，七包 typecheck、docs/diff 均通过。保护 main 的脚本治理/战斗提交曾暴露真实 locale 漏项（16 个已有 source message index），已依据 `data/extracted/events/all.json` 恢复；战斗装备状态新增 branch 以原子合同补测闭合。官方 ratchet 与 strict-fast 已通过并生成 18795 identity 的新基线（87.87/81.14/87.94/89.89）。`projects/pal/assets/migrated` 与 `assets/runtime` 已按用户裁决纳入 Git，CI checkout 资源闭包完整。Grok 像素/readback 见证已改为每进程独立临时目录，普通测试不再生成仓库垃圾。原 ratchet worker 启动超时保留在私有 raw 记录，不作为业务结论。

[QUALITY-TEST-INPUTS-1](QUALITY-TEST-INPUTS-1.md)：I06随机输入固定，透明像素臂两次同45命中；PAL六旧例业务断言不改，完整PNG/256色表/按精灵声明与实际两地图tile IDs派生的canonical gzip RLE，catalog来源/路径/bytes/hash一致。自有migrated目录暂移、6/6测试、finally恢复；不动真实PAL，空白外部IO非视觉oracle，真实AssetResolver/hash/gzip/RLE照跑。
七包typecheck及静态error/warning/info全零；定向/相邻与全仓check→官方ratchet→原目标main完整SHA受保护strict-fast，source/每包/总比例/其它测试保护不变，不回调新基线、不相加私有百分比，不追85%新包。

## 收口与退休条件

全部门已通过并在 main `d8a81d4c21a32efa3c140fb5858c83465b01bc5e` 收口；GitHub Documentation `37145486289` 与 Coverage ratchet `37145486286` 均成功（Coverage 用时 23m28s）。GLM六波及 Kimi/Grok/Cursor 本轮已交付测试分支已逐 tip 备份并完成远端 lease 删除、本地分支删除和精确退休树移除；集成候选另有完整 bundle `opq-integration-retirement-20261004.bundle`。独立产品 draft 和其它产品 Owner 不在测试退休授权内；关联只读审查分支已在保存证据后退休。
无下一位贡献者提示词；Codex 已完成独立验收、有限集成、CI 核验和退休清理，卡面状态为 done。主 checkout 保留用户未提交文件，不在收口中改写。
